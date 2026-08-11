/**
 * The descent cue (Scenes 1–2). Replaces the old static "Scroll to descend"
 * caption with something that behaves like the rest of the page: a rail with
 * a molten drop falling down it, on the same geological cadence as everything
 * else. It fades itself out the moment the visitor takes the hint — a prompt
 * that keeps prompting after it has been obeyed is noise.
 *
 * Motion is CSS-only (no rAF, no scroll subscription per frame) so this can
 * sit over the canvas without costing it anything; the global
 * prefers-reduced-motion rule in styles.css flattens the animation and leaves
 * the label, which is the part that carries the information.
 */
import { useEffect, useState } from "react";

export function ScrollCue() {
  const [taken, setTaken] = useState(false);

  useEffect(() => {
    const onScroll = () => setTaken(window.scrollY > 140);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="pointer-events-none flex flex-col items-center gap-4 transition-opacity duration-700"
      style={{
        opacity: taken ? 0 : 1,
        transitionTimingFunction: "var(--ease-mass)",
      }}
      aria-hidden
    >
      <span
        className="u-mono !text-pumice/70"
        style={{ writingMode: "vertical-rl", letterSpacing: "0.42em" }}
      >
        Descend
      </span>

      {/* The rail: cold basalt, with one drop of magma running down it. */}
      <span className="relative block h-20 w-px overflow-hidden bg-charcoal">
        <span className="u-cue-drop" />
      </span>

      {/* Three chevrons cascading — the drop's echo, offset down the stack. */}
      <span className="flex flex-col items-center gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="u-cue-chevron block h-[5px] w-[5px] rotate-45 border-b border-r border-ember"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </span>
    </div>
  );
}
