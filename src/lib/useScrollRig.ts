import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useScrollStore } from "./scroll-store";

/**
 * PRD §5.2 ScrollRig: Lenis drives smooth scroll, GSAP's ticker drives Lenis,
 * ScrollTrigger stays in sync, and normalised progress lands in the store.
 * `prefers-reduced-motion` drops Lenis entirely and falls back to native
 * scroll (tier C), which the canvas reads identically.
 *
 * `track`: scope the store's 0..1 progress to one element instead of the whole
 * page. The landing tracks only the caldera scenes (hero + thesis + tail) so
 * the camera path keeps the exact P1 mapping while Scenes 3–6 DOM continues
 * below; past the track, progress clamps at 1 and the final frame holds.
 */
export function useScrollRig(opts: { track?: React.RefObject<HTMLElement | null> } = {}) {
  const track = opts.track;
  useEffect(() => {
    const setProgress = useScrollStore.getState().setProgress;
    const setReducedMotion = useScrollStore.getState().setReducedMotion;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduced = mq.matches;
    setReducedMotion(reduced);

    gsap.registerPlugin(ScrollTrigger);

    const el = track?.current ?? null;
    const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

    if (reduced) {
      const onScroll = () => {
        if (el) {
          const limit = el.offsetHeight - window.innerHeight;
          setProgress(limit > 0 ? clamp01((window.scrollY - el.offsetTop) / limit) : 0);
        } else {
          const limit = document.documentElement.scrollHeight - window.innerHeight;
          setProgress(limit > 0 ? window.scrollY / limit : 0);
        }
        ScrollTrigger.update();
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        ScrollTrigger.killAll();
      };
    }

    const lenis = new Lenis({
      // Geological weight — long, heavy ease-out, no rubber band.
      duration: 1.35,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.4,
      wheelMultiplier: 0.9,
    });

    // Scene 0: the preloader claims the viewport before the rig mounts (its
    // effect runs first) — honour the lock at creation and watch for release.
    if (useScrollStore.getState().bootLock) lenis.stop();
    const unsubBoot = useScrollStore.subscribe((s, prev) => {
      if (s.bootLock !== prev.bootLock) {
        if (s.bootLock) lenis.stop();
        else lenis.start();
        // Everything measured under the lock is measured WITHOUT a vertical
        // scrollbar (`.lenis-stopped { overflow: hidden }`), so pinned widths
        // come out one scrollbar too wide and the page gains a phantom
        // horizontal scroll. Re-measure the moment Scene 0 lets go.
        if (!s.bootLock) requestAnimationFrame(() => ScrollTrigger.refresh());
      }
    });

    if (el) {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => setProgress(self.progress),
      });
    }

    lenis.on("scroll", (e: { progress: number }) => {
      if (!el) setProgress(e.progress);
      ScrollTrigger.update();
    });

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Lenis drives real window scroll, so ScrollTrigger needs no proxy —
    // only the `update` call above to stay in step with the smoothing.
    return () => {
      unsubBoot();
      gsap.ticker.remove(raf);
      lenis.destroy();
      ScrollTrigger.killAll();
    };
  }, [track]);
}

/** Pointer tracking for the parallax camera + ember cursor light. */
export function usePointerRig() {
  useEffect(() => {
    const setPointer = useScrollStore.getState().setPointer;
    const onMove = (e: PointerEvent) => {
      setPointer(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
}
