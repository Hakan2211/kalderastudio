import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Scene 4 specimen cards (PRD §4, ref `Zoologic Hinge - Landing page section`):
 * a rail of portrait cards — image, name, role, one field-note quote — with
 * the lead elevated in the center and heavy parallax layers: each card
 * drifts at its own rate as the section transits the viewport. The renders
 * are the real S1 hero stills (light studio plates), framed as field-guide
 * specimen plates against the obsidian.
 */
const CAST = [
  {
    id: "milo",
    name: "MILO",
    role: "Meerkat · the anxious engine",
    note: "Double-checks everything. Twice.",
    speed: -18,
  },
  {
    id: "bruno",
    name: "BRUNO",
    role: "Gorilla · the gentle giant",
    note: "Shares the good chips.",
    speed: 10,
  },
  {
    id: "sterling",
    name: "STERLING",
    role: "Lion · the lead",
    note: "There is a correct way to do everything.",
    speed: -30,
    lead: true,
  },
  {
    id: "jax",
    name: "JAX",
    role: "Eagle · the visionary",
    note: "Sees the bigger picture. Literally.",
    speed: 14,
  },
  {
    id: "barney",
    name: "BARNEY",
    role: "Snake · the narrator",
    note: "Delighted by every disaster.",
    speed: -12,
  },
] as const;

export function EruptionCards() {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      for (const card of gsap.utils.toArray<HTMLElement>("[data-specimen]")) {
        const speed = Number(card.dataset.speed ?? 0);
        gsap.fromTo(
          card,
          { y: -speed },
          {
            y: speed,
            ease: "none",
            scrollTrigger: { trigger: rail, start: "top bottom", end: "bottom top", scrub: 0.8 },
          },
        );
      }
    }, rail);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={railRef} className="grid grid-cols-2 gap-4 md:grid-cols-5 md:items-center">
      {CAST.map((c, i) => (
        <div
          key={c.id}
          data-specimen
          data-speed={c.speed}
          className={`border border-charcoal bg-basalt p-3 ${
            "lead" in c && c.lead
              ? "col-span-2 md:col-span-1 md:scale-110 md:border-ember/40 md:shadow-[0_0_60px_-20px_rgba(255,85,31,0.45)]"
              : ""
          }`}
        >
          <div className="relative overflow-hidden border border-charcoal">
            <img
              src={`/media/cast-${c.id}.webp`}
              alt={`${c.name} · ${c.role}`}
              loading="lazy"
              className="aspect-[2/3] w-full object-cover object-top"
            />
            {/* warm grade so the light studio plates sit in the ember world */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-magma-deep/25 via-transparent to-transparent" />
            <span className="u-mono absolute right-2 top-2 !text-pumice/70">
              {String(i + 1).padStart(2, "0")}/10
            </span>
          </div>
          <div className="mt-3">
            <div className="u-mono !text-pumice">{c.name}</div>
            <div className="u-mono mt-1">{c.role}</div>
            <p className="mt-2 text-sm leading-snug text-pumice/70">“{c.note}”</p>
          </div>
        </div>
      ))}
    </div>
  );
}
