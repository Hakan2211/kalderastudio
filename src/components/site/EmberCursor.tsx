import { useEffect, useRef } from "react";
import gsap from "gsap";
import { damp } from "#/lib/scroll-store";

/**
 * The ember-dot cursor (PRD §4 global interactions, `UI detail moodboard`):
 * a small hot dot with a soft halo, trailing the pointer with mass, and a
 * magnetic pull toward anything marked `data-magnetic` (the CTAs).
 *
 * Rules from the ref frame: ONE lit thing at a time, and the native cursor
 * stays put on touch and under reduced motion. It also stays put whenever a
 * text caret matters — over inputs and text selections the OS cursor is the
 * correct affordance, so the dot fades instead of competing with it.
 *
 * Runs entirely on the gsap ticker with direct style writes — no React state
 * per frame, which would re-render the tree 60×/s (the P1 gotcha).
 */
export function EmberCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Pointer must be a real mouse: `hover: hover` + `pointer: fine` excludes
    // touch and most pen input, where a fake cursor is pure noise.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    const dot = dotRef.current;
    const halo = haloRef.current;
    if (!dot || !halo) return;

    document.documentElement.classList.add("has-ember-cursor");

    let px = window.innerWidth / 2;
    let py = window.innerHeight / 2;
    let dx = px;
    let dy = py;
    let hx = px;
    let hy = py;
    let scale = 1;
    let targetScale = 1;
    let alpha = 0;
    let targetAlpha = 0;
    let magnet: HTMLElement | null = null;
    // The magnet's centre, cached. Reading a rect every frame is a forced
    // layout every frame, on a page that is already running a WebGL scene
    // and a scrub timeline — so it is refreshed only when the target or the
    // scroll position actually changes.
    let magnetX = 0;
    let magnetY = 0;
    let magnetAtY = -1;
    let last = performance.now();

    const measureMagnet = () => {
      if (!magnet) return;
      const r = magnet.getBoundingClientRect();
      magnetX = r.left + r.width / 2;
      magnetY = r.top + r.height / 2;
      magnetAtY = window.scrollY;
    };

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      targetAlpha = 1;

      // `e.target` is the topmost element under the pointer already — asking
      // for it again with elementFromPoint would force a hit-test per move.
      const el = e.target as HTMLElement | null;
      const hit = el?.closest?.<HTMLElement>("[data-magnetic]") ?? null;
      if (hit !== magnet) {
        magnet = hit;
        measureMagnet();
      }
      targetScale = hit ? 2.6 : 1;

      // Over a text field the caret is the affordance — get out of its way.
      const texty = el?.closest?.("input, textarea, [contenteditable='true']");
      if (texty) targetAlpha = 0;
    };

    const onLeave = () => (targetAlpha = 0);
    const onEnter = () => (targetAlpha = 1);
    const onDown = () => (targetScale = magnet ? 2.1 : 0.6);
    const onUp = () => (targetScale = magnet ? 2.6 : 1);

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;

      // Magnetic pull: the dot is drawn a short way toward the CTA's centre,
      // capped so it never leaves the pointer's neighbourhood (a cursor that
      // outruns the hand feels broken, not magnetic).
      let tx = px;
      let ty = py;
      if (magnet) {
        if (magnetAtY !== window.scrollY) measureMagnet();
        tx = px + (magnetX - px) * 0.32;
        ty = py + (magnetY - py) * 0.32;
      }

      // Two speeds: the core is nearly locked to the hand, the halo lags —
      // that gap is what reads as heat trailing behind the point.
      dx = damp(dx, tx, 26, dt);
      dy = damp(dy, ty, 26, dt);
      hx = damp(hx, tx, 9, dt);
      hy = damp(hy, ty, 9, dt);
      scale = damp(scale, targetScale, 12, dt);
      alpha = damp(alpha, targetAlpha, 10, dt);

      dot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
      dot.style.opacity = String(alpha);
      halo.style.transform = `translate3d(${hx}px, ${hy}px, 0) translate(-50%, -50%) scale(${scale})`;
      halo.style.opacity = String(alpha * 0.9);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    gsap.ticker.add(tick);

    return () => {
      document.documentElement.classList.remove("has-ember-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]" aria-hidden="true">
      <div
        ref={haloRef}
        className="absolute left-0 top-0 h-8 w-8 rounded-full opacity-0"
        style={{
          background:
            "radial-gradient(circle, rgba(255,217,160,0.30) 0%, rgba(255,85,31,0.22) 38%, transparent 68%)",
        }}
      />
      <div
        ref={dotRef}
        className="absolute left-0 top-0 h-[7px] w-[7px] rounded-full opacity-0"
        style={{
          background: "#ff551f",
          boxShadow: "0 0 8px 1px rgba(255,85,31,0.75), 0 0 2px 0 #ffd9a0 inset",
        }}
      />
    </div>
  );
}
