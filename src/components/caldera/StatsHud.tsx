import { useEffect, useRef, useState } from "react";
import { heatForProgress, useScrollStore } from "#/lib/scroll-store";

/**
 * P1 exit criterion is "60fps scroll-through of Scenes 1–2", so the sandbox
 * shows the number. Doubles as a first pass at the mono "field survey" voice.
 */
export function StatsHud() {
  const [fps, setFps] = useState(0);
  const [min, setMin] = useState(999);
  const progress = useScrollStore((s) => s.progress);
  const frames = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      frames.current++;
      if (!last.current) last.current = t;
      if (t - last.current >= 500) {
        const v = Math.round((frames.current * 1000) / (t - last.current));
        setFps(v);
        setMin((m) => (t > 3000 ? Math.min(m, v) : m));
        frames.current = 0;
        last.current = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const heat = heatForProgress(progress);

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-30 u-mono leading-relaxed">
      <div>
        FPS {String(fps).padStart(3, "0")} · MIN {min === 999 ? "···" : min}
      </div>
      <div>SCROLL {(progress * 100).toFixed(1)}%</div>
      <div>
        HEAT{" "}
        <span style={{ color: `color-mix(in oklab, #8a8d93, #ff551f ${heat * 100}%)` }}>
          {(heat * 100).toFixed(0)}%
        </span>
      </div>
      <div className="mt-2 h-px w-40 bg-charcoal">
        <div
          className="h-px bg-ember"
          style={{ width: `${progress * 100}%`, transition: "width 120ms linear" }}
        />
      </div>
    </div>
  );
}
