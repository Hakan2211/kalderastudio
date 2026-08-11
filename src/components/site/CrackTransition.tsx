import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import gsap from "gsap";
import { CLIP_BOTTOM, CLIP_TOP, seamPoints } from "#/lib/fissure";
import { tick } from "#/lib/sound";

/**
 * Page transitions (PRD §4): the crack-line wipe, which is Scene 0's split
 * played backwards and then forwards again — the two obsidian halves slam
 * shut along the fissure, the seam flashes, and the new route opens along
 * the same line.
 *
 * Driven off router events rather than a route component, so the overlay
 * lives above every page and survives the swap. The close is not allowed to
 * finish faster than the load: `onResolved` opens it, and a floor keeps a
 * cached instant navigation from reading as a flicker.
 */
const CLOSE = 0.5;
const HOLD = 0.16;

export function CrackTransition() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<SVGPolylineElement>(null);
  const maskRef = useRef<SVGPolylineElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const top = topRef.current;
    const bottom = bottomRef.current;
    const seam = seamRef.current;
    const svg = svgRef.current;
    if (!root || !top || !bottom || !seam || !svg) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Pixel-space viewBox for the seam, remeasured on resize (same reason as
    // the preloader: dashes and clip percentages must agree with real px).
    const measure = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const pts = seamPoints(w, h);
      seam.setAttribute("points", pts);
      maskRef.current?.setAttribute("points", pts);
    };
    measure();
    window.addEventListener("resize", measure);

    let closing: gsap.core.Timeline | null = null;
    let closedAt = 0;
    let armed = false;

    const open = () => {
      if (!armed) return;
      armed = false;
      // The seam only exists while the halves touch — take the cover line
      // away the instant they part, or it hangs over the new page as a dark
      // scratch for the length of the reveal.
      gsap.set(maskRef.current, { opacity: 0 });
      const wait = Math.max(0, HOLD - (performance.now() - closedAt) / 1000);
      const tl = gsap.timeline({
        delay: wait,
        onComplete: () => {
          root.style.visibility = "hidden";
          gsap.set(seam, { opacity: 0 });
        },
      });
      tl.to(seam, { opacity: 1, duration: 0.12 });
      tl.to(top, { yPercent: -103, duration: 0.75, ease: "power3.inOut" }, 0.04);
      tl.to(bottom, { yPercent: 103, duration: 0.75, ease: "power3.inOut" }, 0.04);
      tl.to(seam, { opacity: 0, duration: 0.4 }, 0.28);
    };

    const close = () => {
      if (armed) return;
      armed = true;
      root.style.visibility = "visible";
      gsap.set(top, { yPercent: -103 });
      gsap.set(bottom, { yPercent: 103 });
      gsap.set(seam, { opacity: 0 });
      closing?.kill();
      closing = gsap.timeline({
        onComplete: () => {
          closedAt = performance.now();
          // The page lands at the top of the new route while it is covered —
          // never let the visitor watch the scroll position snap.
          window.scrollTo(0, 0);
        },
      });
      gsap.set(maskRef.current, { opacity: 0 });
      closing.to([top, bottom], { yPercent: 0, duration: CLOSE, ease: "power3.in" });
      closing.set(maskRef.current, { opacity: 1 }, CLOSE - 0.02);
      closing.to(seam, { opacity: 1, duration: 0.14 }, CLOSE - 0.1);
      tick("press");
    };

    const unsubBefore = router.subscribe("onBeforeNavigate", (e) => {
      // Hash-only and same-path navigations are not scene changes.
      if (e.pathChanged === false) return;
      if (reduced) {
        window.scrollTo(0, 0);
        return;
      }
      close();
    });
    const unsubResolved = router.subscribe("onResolved", () => {
      if (reduced) return;
      open();
    });

    return () => {
      window.removeEventListener("resize", measure);
      unsubBefore();
      unsubResolved();
      closing?.kill();
    };
  }, [router]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-[80]"
      style={{ visibility: "hidden" }}
      aria-hidden="true"
    >
      <div
        ref={topRef}
        className="absolute inset-0 bg-obsidian"
        style={{ clipPath: CLIP_TOP, transform: "translateY(-103%)", willChange: "transform" }}
      />
      <div
        ref={bottomRef}
        className="absolute inset-0 bg-obsidian"
        style={{ clipPath: CLIP_BOTTOM, transform: "translateY(103%)", willChange: "transform" }}
      />
      <svg ref={svgRef} className="absolute inset-0 h-full w-full">
        {/* Cover the hairline the two antialiased clip edges leave behind
            (same reason as Scene 0) before the hot line goes over it. */}
        <polyline
          ref={maskRef}
          points=""
          fill="none"
          stroke="#0b0b0d"
          strokeWidth={2.5}
          opacity={0}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          ref={seamRef}
          points=""
          fill="none"
          stroke="#ffb377"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0}
          style={{ filter: "drop-shadow(0 0 6px rgba(255,85,31,0.85))" }}
        />
      </svg>
    </div>
  );
}
