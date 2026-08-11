import { useEffect, useRef } from "react";

/**
 * Scene 6 — COOLING (PRD §4). The end of the page is the end of an eruption:
 * the glow dims to a few embers and the particles settle.
 *
 * A plain 2D canvas, not WebGL — the R3F canvas is a fixed layer far above,
 * behind opaque sections, and spinning up a second GL context for forty dots
 * would cost more than it shows. Everything is gated: no work off-screen, no
 * work in a hidden tab, none at all under reduced motion.
 *
 * Easter egg (PRD §4): idle ten seconds down here and a single ember flares.
 */

type Ember = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  heat: number;
};

const MAX = 46;

export function CoolingEmbers() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      // 1.5× is the honest ceiling for soft dots — 3× on a retina panel is
      // four times the fill rate for no visible gain.
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = r.width;
      h = r.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const embers: Ember[] = [];
    const spawn = (hot = false) => {
      if (embers.length >= MAX) return;
      const max = hot ? 3400 + Math.random() * 1200 : 4800 + Math.random() * 3600;
      embers.push({
        x: Math.random() * w,
        // Born along the floor of the field, not below it: an ember that
        // spends its whole short life climbing back into frame is an ember
        // nobody sees.
        y: h - Math.random() * h * 0.14,
        vx: (Math.random() - 0.5) * 6,
        vy: -(14 + Math.random() * (hot ? 46 : 30)),
        life: 0,
        max,
        size: hot ? 2.2 + Math.random() * 1.4 : 0.8 + Math.random() * 1.5,
        heat: hot ? 1 : 0.35 + Math.random() * 0.5,
      });
    };

    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), {
      rootMargin: "10% 0px",
    });
    io.observe(canvas);

    // ── The easter egg: ten seconds of stillness down here earns one flare ──
    let idleAt = performance.now();
    const stir = () => (idleAt = performance.now());
    window.addEventListener("scroll", stir, { passive: true });
    window.addEventListener("pointermove", stir, { passive: true });
    window.addEventListener("keydown", stir);

    let raf = 0;
    let last = performance.now();
    let accum = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible || document.hidden) return;

      // The field cools as it settles: fewer embers the longer it is still.
      const idle = (now - idleAt) / 1000;
      const rate = 7 * Math.max(0.22, 1 - idle / 14);
      accum += dt * rate;
      while (accum >= 1) {
        accum -= 1;
        spawn();
      }

      if (idle > 10) {
        // One bright one, then the clock resets — it must feel like a rarity,
        // not a pulse. Six hot particles read as a single flare.
        for (let i = 0; i < 6; i++) spawn(true);
        idleAt = now + 9000;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life += dt * 1000;
        if (e.life >= e.max || e.y < -20) {
          embers.splice(i, 1);
          continue;
        }
        const t = e.life / e.max;
        // Rise, slow, drift — an updraft dying out, not gravity. The decay
        // is gentle on purpose: at 0.4 the whole field stalls in the first
        // twenty pixels and reads as a smudge along the edge.
        e.vy *= 1 - 0.12 * dt;
        e.vx += Math.sin(e.life / 700 + e.x) * 1.6 * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;

        const alpha = Math.sin(Math.PI * Math.min(1, t)) * e.heat;
        const r = e.size * (1 + t * 0.6);
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 4);
        g.addColorStop(0, `rgba(255, 244, 224, ${alpha})`);
        g.addColorStop(0.18, `rgba(255, 217, 160, ${alpha * 0.85})`);
        g.addColorStop(0.42, `rgba(255, 85, 31, ${alpha * 0.5})`);
        g.addColorStop(1, "rgba(255, 85, 31, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", stir);
      window.removeEventListener("pointermove", stir);
      window.removeEventListener("keydown", stir);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] w-full"
      aria-hidden="true"
    />
  );
}
