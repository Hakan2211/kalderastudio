import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Shared vocabulary for the /tools side (P6). Tools pages share components
 * with each other — the no-sharing rule is only across the show-site wall.
 * No WebGL here: the landing owns the canvas; heat on these pages is slab
 * edges, hover glow and one gradient moment per page.
 */

/**
 * Scroll reveal for everything marked [data-reveal] inside the container.
 * Content is visible by default (SSR / tier C / reduced motion see the page
 * whole); when motion is allowed, elements are hidden in the same tick they
 * are measured, then rise 28px on entry. Geological: power3.out, ~1s, once.
 */
export function useReveals() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = ref.current;
    if (!root) return;

    gsap.registerPlugin(ScrollTrigger);
    const targets = gsap.utils.toArray<HTMLElement>(
      root.querySelectorAll("[data-reveal]"),
    );
    const triggers = targets.map((el) =>
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 28 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        },
      ),
    );
    return () => {
      for (const t of triggers) {
        t.scrollTrigger?.kill();
        t.kill();
      }
    };
  }, []);

  return ref;
}

/** `molten` = in active development (ember), `cooling` = built, hardening. */
export function StatusDot({ state }: { state: "molten" | "cooling" }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{
          background: state === "molten" ? "var(--color-ember)" : "var(--color-ash)",
          boxShadow: state === "molten" ? "0 0 8px rgba(255,85,31,0.8)" : "none",
        }}
      />
      <span className="u-mono">{state}</span>
    </span>
  );
}

/** Mono spec row under a hero: `Desktop · Electron / Local GPU / status`. */
export function SpecRow({
  items,
  status,
}: {
  items: string[];
  status?: "molten" | "cooling";
}) {
  return (
    <div className="u-mono flex flex-wrap items-baseline gap-x-8 gap-y-2">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
      {status ? <StatusDot state={status} /> : null}
    </div>
  );
}

/** Feature tick list, from `Direction A - 3`: ember diamond, hairline under. */
export function Ticks({ items }: { items: { title: string; detail?: string }[] }) {
  return (
    <ul className="mt-8 space-y-0">
      {items.map(({ title, detail }) => (
        <li
          key={title}
          className="flex items-baseline gap-3 border-b border-charcoal/60 py-3"
        >
          <span className="text-[8px] text-ember" aria-hidden>
            ◆
          </span>
          <span className="text-sm text-pumice">{title}</span>
          {detail ? <span className="u-mono ml-auto hidden text-right sm:inline">{detail}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** Survey stat block, from the UI moodboard: label / big value / unit. */
export function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="border-t border-charcoal pt-4">
      <div className="u-mono">{label}</div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <span className="u-display text-3xl md:text-4xl">{value}</span>
        {unit ? <span className="u-mono !text-ember">{unit}</span> : null}
      </div>
    </div>
  );
}

/** Corner registration ticks over a slab — the survey-board motif from P5. */
export function RegTicks() {
  const corner = "absolute h-3 w-3 border-ember/70";
  return (
    <div className="pointer-events-none absolute inset-2" aria-hidden>
      <span className={`${corner} left-0 top-0 border-l border-t`} />
      <span className={`${corner} right-0 top-0 border-r border-t`} />
      <span className={`${corner} bottom-0 left-0 border-b border-l`} />
      <span className={`${corner} bottom-0 right-0 border-b border-r`} />
    </div>
  );
}
