import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CalderaCanvas } from "#/components/caldera/CalderaCanvas";
import { StatsHud } from "#/components/caldera/StatsHud";
import { ClientOnly } from "#/components/ClientOnly";
import { usePointerRig, useScrollRig } from "#/lib/useScrollRig";

type ProtoSearch = { post?: number; seg?: number; fx?: number; parts?: number };

export const Route = createFileRoute("/proto/caldera")({
  validateSearch: (s: Record<string, unknown>): ProtoSearch => ({
    post: s.post === undefined ? undefined : Number(s.post),
    seg: s.seg === undefined ? undefined : Number(s.seg),
    fx: s.fx === undefined ? undefined : Number(s.fx),
    // `?parts=0` drops the wordmark cloud. Segments only bill vertex work, so
    // it is the only way to separate the two per-pixel costs in this scene:
    // the terrain's fragment shader and the cloud's overdraw.
    parts: s.parts === undefined ? undefined : Number(s.parts),
  }),
  component: CalderaProto,
  head: () => ({
    meta: [{ title: "KALDERA · P1 caldera shader prototype" }],
  }),
});

/**
 * IMPORTANT: anything that subscribes to scroll progress must be its own leaf
 * component. Subscribing in the route body re-renders the whole tree — including
 * <Canvas> — on every scroll frame, which tears down and rebuilds the effect
 * composer 60x/sec and takes the page out. Keep the canvas subtree render-stable
 * and let the canvas read the store inside useFrame instead.
 */
/**
 * The visible wordmark is now a particle cloud inside the canvas
 * (`WordmarkParticles`), so that the rim crest can genuinely occlude it and
 * the letters can pick up ember light and come apart on the descent — none of
 * which a DOM node behind a transparent canvas can do.
 *
 * This heading is what remains in the document: real text, in the right
 * position in the outline, hidden visually but not from assistive tech or
 * crawlers. It is the whole reason the particle version is affordable.
 */
function HeroHeading() {
  return <h1 className="sr-only">KALDERA, film studio</h1>;
}

const THESIS = [
  "Every studio needs a hundred people.",
  "We needed a hundred watts.",
  "We built the tools. We shipped the show.",
];

function CalderaProto() {
  const { post, seg, fx, parts } = Route.useSearch();
  useScrollRig();
  usePointerRig();

  const thesisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = thesisRef.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const lines = gsap.utils.toArray<HTMLElement>("[data-thesis-line]");
      gsap.set(lines, { autoAlpha: 0, y: 28 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.1,
        },
      });

      lines.forEach((line, i) => {
        // One thought per beat — mass, not bounce (PRD §2.5). Strictly
        // sequential: a line's fade-out fully completes (ends at i*2 + 2.3)
        // before the next fades in (starts at i*2 + 2.4). The old 1.35 spacing
        // had lines 2 and 3 on screen simultaneously for half a beat.
        tl.to(line, { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out" }, i * 2.0 + 0.4);
        if (i < lines.length - 1) {
          tl.to(line, { autoAlpha: 0, y: -24, duration: 0.6, ease: "power2.in" }, i * 2.0 + 1.7);
        }
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <main id="main" className="relative bg-obsidian text-pumice">
      <HeroHeading />

      <ClientOnly>
        <div className="fixed inset-0 z-10">
          <CalderaCanvas
            post={post !== 0}
            segments={seg ?? 896}
            fx={fx}
            parts={parts !== 0}
          />
        </div>
      </ClientOnly>

      {/* ── Chrome ──────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-8 py-6">
        <div className="flex items-baseline gap-3">
          <span
            className="text-sm tracking-[0.28em]"
            style={{ fontFamily: '"Archivo Expanded", "Arial Black", sans-serif', fontWeight: 800 }}
          >
            KALDERA
          </span>
          <span className="u-mono">Film Studio</span>
        </div>
        <span className="u-mono">P1 · Shader prototype</span>
      </header>

      <div className="pointer-events-none fixed bottom-6 right-6 z-30 u-mono text-right">
        <div>54.2°N · RTX 3090 Ti</div>
        <div className="mt-1">Scroll to descend</div>
      </div>

      <StatsHud />

      {/* ── Scene 1: hero hold ──────────────────────────────────────── */}
      <section className="relative z-20 h-screen">
        <div className="absolute bottom-24 left-8 max-w-xs">
          <p className="u-mono !text-pumice">Forged on a single GPU.</p>
        </div>
      </section>

      {/* ── Scene 2: the thesis, over the rim and down ──────────────── */}
      <section ref={thesisRef} className="relative z-20 h-[260vh]">
        <div className="sticky top-0 flex h-screen items-center justify-center px-8">
          <div className="relative w-full max-w-3xl text-center">
            {THESIS.map((line, i) => (
              <p
                key={line}
                data-thesis-line
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-balance text-3xl leading-tight md:text-5xl"
                style={{ fontWeight: i === 2 ? 700 : 400 }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Tail so the descent can finish before the page ends. */}
      <section className="relative z-20 h-[80vh]" />
    </main>
  );
}
