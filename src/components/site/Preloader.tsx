import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { CLIP_BOTTOM, CLIP_TOP, pointAt, seamPoints } from "#/lib/fissure";
import { damp, useScrollStore } from "#/lib/scroll-store";

/**
 * Scene 0 — the preloader (PRD §4, ref: `Preloader design`, approved as-is).
 *
 * A single ember crack-line draws itself across an obsidian field, with a
 * bright leading tip and a mono `HEATING NN%` counter. The counter is honest:
 * it tracks the two loads that actually gate the hero — the display/mono
 * faces and the R3F canvas's first rendered frame — and only ever eases, so
 * it reads as heat building rather than as a progress bar ticking.
 *
 * The reveal IS the crack: the screen is two obsidian halves whose clip-path
 * boundary is the same polyline the line was drawn along, so when they pull
 * apart the page literally splits along the fissure.
 *
 * While mounted, the viewport is locked: `bootLock` in the scroll store keeps
 * Lenis stopped (the rig honours it at creation — this component's effect
 * runs first because child effects fire before parent effects).
 */

/** Once per session. Client-side nav back to `/` must not replay Scene 0. */
let hasBootedOnce = false;

export function Preloader() {
  const [active, setActive] = useState(() => !hasBootedOnce);
  const [pct, setPct] = useState(0);

  const skip = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // The crack SVG is authored in PIXEL space, not a stretched viewBox: the
  // draw-on animation needs dash lengths, and Chrome computes dashes in
  // screen units when vector-effect: non-scaling-stroke is set — which
  // silently breaks pathLength normalisation (the line renders as a dashed
  // ruler across the full width). Pixel coordinates need no vector-effect.
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!active || skip) return;
    const measure = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<SVGPolylineElement>(null);
  const maskRef = useRef<SVGPolylineElement>(null);
  const glowRef = useRef<SVGPolylineElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || skip) return;
    const store = useScrollStore.getState();

    hasBootedOnce = true;
    store.setBootLock(true);
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    // ── The two honest signals ─────────────────────────────────────────
    let fontsDone = false;
    let canvasDone = useScrollStore.getState().canvasReady;

    if (document.fonts) {
      void Promise.all([
        document.fonts.load('900 100px "Archivo Expanded"'),
        document.fonts.load('400 12px "JetBrains Mono"'),
      ]).then(
        () => (fontsDone = true),
        () => (fontsDone = true),
      );
    } else {
      fontsDone = true;
    }

    const unsubCanvas = useScrollStore.subscribe((s) => {
      if (s.canvasReady) canvasDone = true;
    });

    // Backstop: never trap the visitor behind a loader. If a signal wedges
    // (extension-blocked font, GPU that stalls on shader compile), open
    // anyway — the page behind is real DOM either way.
    const bail = window.setTimeout(() => {
      fontsDone = true;
      canvasDone = true;
    }, 9000);

    // ── Drive the line ─────────────────────────────────────────────────
    let displayed = 0;
    let finished = false;
    let last = performance.now();

    const paint = (p: number) => {
      const core = coreRef.current;
      if (core) {
        const L = core.getTotalLength();
        const dash = String(L);
        const off = String((1 - p) * L);
        core.setAttribute("stroke-dasharray", dash);
        core.setAttribute("stroke-dashoffset", off);
        glowRef.current?.setAttribute("stroke-dasharray", dash);
        glowRef.current?.setAttribute("stroke-dashoffset", off);
      }
      const tip = tipRef.current;
      if (tip) {
        const [x, y] = pointAt(p);
        tip.style.left = `${x}%`;
        tip.style.top = `${y}%`;
        tip.style.opacity = p > 0.005 && p < 0.999 ? "1" : "0";
      }
      setPct(Math.min(99, Math.floor(p * 100)));
    };

    const finish = () => {
      finished = true;
      gsap.ticker.remove(tick);
      window.clearTimeout(bail);
      window.clearInterval(watchdog);
      setPct(100);

      const tl = gsap.timeline({
        onComplete: () => {
          useScrollStore.getState().setBootLock(false);
          setActive(false);
        },
      });
      // The whole line flashes toward heat-white as the last of it closes…
      tl.to([coreRef.current, glowRef.current], {
        attr: { "stroke-dashoffset": 0 },
        duration: 0.3,
        ease: "power2.in",
      });
      tl.to(glowRef.current, { opacity: 1, duration: 0.22, ease: "power2.in" }, "<");
      tl.to(tipRef.current, { scale: 2.6, opacity: 0, duration: 0.4, ease: "power2.out" }, "<");
      tl.to(counterRef.current, { opacity: 0, duration: 0.3 }, "<");
      // …then the field gives way along it. Mass, not bounce (§2.5).
      tl.to(topRef.current, { yPercent: -103, duration: 1.05, ease: "power3.inOut" }, "+=0.12");
      tl.to(bottomRef.current, { yPercent: 103, duration: 1.05, ease: "power3.inOut" }, "<");
      tl.to([coreRef.current, glowRef.current], { opacity: 0, duration: 0.45 }, "<+0.25");
      // The seam-cover line has no seam to cover once the halves part.
      tl.set(maskRef.current, { opacity: 0 }, "<");
    };

    /**
     * rAF does not run in a hidden tab, and the whole of Scene 0 — counter,
     * flash, split — is driven by the gsap ticker. A visitor who opens the
     * site in a background tab and comes back a minute later would otherwise
     * find the loader frozen mid-count with the page locked behind it.
     * Timers DO still fire, so: if we are hidden, there is nothing to watch,
     * and the honest thing is to be already open when they arrive.
     */
    const finishInstantly = () => {
      if (finished) return;
      finished = true;
      gsap.ticker.remove(tick);
      window.clearTimeout(bail);
      window.clearInterval(watchdog);
      gsap.set(topRef.current, { yPercent: -103 });
      gsap.set(bottomRef.current, { yPercent: 103 });
      useScrollStore.getState().setBootLock(false);
      setActive(false);
    };
    const watchdog = window.setInterval(() => {
      if (document.hidden) finishInstantly();
    }, 1200);

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      // Honest target, damped: 18% for arriving, fonts carry to 40%, the
      // rendered hero carries the rest. Damping means the number never sits
      // still and never jumps.
      const target = 0.18 + (fontsDone ? 0.22 : 0) + (canvasDone ? 0.6 : 0);
      displayed = damp(displayed, target, 1.9, dt);
      paint(displayed);
      if (!finished && target >= 1 && displayed > 0.992) finish();
    };
    gsap.ticker.add(tick);
    paint(0);

    return () => {
      gsap.ticker.remove(tick);
      unsubCanvas();
      window.clearTimeout(bail);
      window.clearInterval(watchdog);
      useScrollStore.getState().setBootLock(false);
    };
  }, [active, skip]);

  if (!active || skip) return null;

  return (
    <div ref={rootRef} className="fixed inset-0 z-[70]" aria-hidden="true">
      {/* The two halves of the field — their shared boundary is the crack. */}
      <div
        ref={topRef}
        className="absolute inset-0 bg-obsidian"
        style={{ clipPath: CLIP_TOP, willChange: "transform" }}
      />
      <div
        ref={bottomRef}
        className="absolute inset-0 bg-obsidian"
        style={{ clipPath: CLIP_BOTTOM, willChange: "transform" }}
      />

      {/* The fissure. Drawn via dashoffset against the measured pixel length;
          the initial dasharray shows nothing until the first paint(). */}
      {dims && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${dims.w} ${dims.h}`}
        >
          {/* The two halves meet along this exact line, and their antialiased
              clip edges leave a hairline of the page showing through — which
              reads as a ghost of the crack running ahead of the drawn tip.
              Lay the ground back over the seam before drawing anything hot. */}
          <polyline
            ref={maskRef}
            points={seamPoints(dims.w, dims.h)}
            fill="none"
            stroke="#0b0b0d"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            ref={glowRef}
            points={seamPoints(dims.w, dims.h)}
            fill="none"
            stroke="#ff551f"
            strokeWidth={6}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="0 1000000"
            opacity={0.5}
            style={{ filter: "blur(6px)" }}
          />
          <polyline
            ref={coreRef}
            points={seamPoints(dims.w, dims.h)}
            fill="none"
            stroke="#ffb377"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="0 1000000"
          />
        </svg>
      )}

      {/* The leading tip — the hottest point on the line (ref frame). */}
      <div
        ref={tipRef}
        className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
        style={{
          background:
            "radial-gradient(circle, #fff4e0 0%, #ffd9a0 22%, rgba(255,85,31,0.55) 48%, transparent 70%)",
        }}
      />

      <div
        ref={counterRef}
        className="u-mono absolute left-1/2 top-[58%] -translate-x-1/2 !text-ember"
        style={{ fontSize: 11, letterSpacing: "0.34em" }}
      >
        HEATING {String(pct).padStart(2, "0")}%
      </div>
    </div>
  );
}
