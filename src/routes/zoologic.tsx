import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AmbientLoop } from "#/components/site/AmbientLoop";
import { SiteFooter } from "#/components/site/SiteFooter";
import { SiteNav } from "#/components/site/SiteNav";

export const Route = createFileRoute("/zoologic")({
  component: ZoologicPage,
  head: () => ({
    meta: [
      { title: "Zoologic: a nature-documentary sitcom" },
      {
        name: "description",
        content:
          "Zoologic: a nature-documentary sitcom. Ten animals. Zero humans harmed. The first eruption from the Kaldera pipeline.",
      },
      // The show is unannounced: this page is built and reachable, but it is
      // linked from nowhere and must not be indexed or previewed until launch.
      // Drop this line — and put the show back into the nav, footer, /studio
      // work index and the landing proof strip — on announcement day.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

/*
 * PRD §3: no shared components with /tools/* — this page carries its own
 * reveal util and card vocabulary; only site chrome (nav, footer, AmbientLoop)
 * and tokens are shared. The heat here comes from the footage and the
 * renders themselves, framed by obsidian — not from ember product slabs.
 */

function useZooReveals() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // Reduced motion: skip entirely — content is never CSS-hidden.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 88%",
        once: true,
        onEnter: (els) =>
          gsap.fromTo(
            els,
            { autoAlpha: 0, y: 28 },
            { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.08 },
          ),
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return ref;
}

/** Canon cast table — roles from the show bible (zoo-logic-intros.md). */
const FEATURED = [
  {
    id: "milo",
    name: "MILO",
    species: "Meerkat",
    role: "The Overthinker",
    note: "Asks the question everyone was avoiding. Then twelve more.",
    speed: -14,
  },
  {
    id: "bruno",
    name: "BRUNO",
    species: "Gorilla",
    role: "The Anchor",
    note: "The room calms down when he enters it. The chairs do not.",
    speed: 10,
  },
  {
    id: "sterling",
    name: "STERLING",
    species: "Lion",
    role: "The Self-Appointed Leader",
    note: "Has never once been heard to speak. Somehow still chairs every meeting.",
    speed: -24,
    lead: true,
  },
  {
    id: "jax",
    name: "JAX",
    species: "Eagle",
    role: "The Visionary",
    note: "Pitches the five-year plan daily. Cannot say where the snacks are.",
    speed: 14,
  },
  {
    id: "barney",
    name: "BARNEY",
    species: "Snake",
    role: "The Critic",
    note: "Has notes. Always has notes.",
    speed: -10,
  },
] as const;

const ROSTER = [
  { name: "Sterling", species: "Lion", role: "The Self-Appointed Leader", onFile: true },
  { name: "Grant", species: "Giraffe", role: "The Actual One", onFile: false },
  { name: "Bruno", species: "Gorilla", role: "The Anchor", onFile: true },
  { name: "Jax", species: "Eagle", role: "The Visionary", onFile: true },
  { name: "Milo", species: "Meerkat", role: "The Overthinker", onFile: true },
  { name: "Barney", species: "Snake", role: "The Critic", onFile: true },
  { name: "Omar", species: "Elephant", role: "The Sage", onFile: false },
  { name: "Valentino", species: "Hippo", role: "The Diva", onFile: false },
  { name: "Allistaire “Alli”", species: "Emperor Penguin", role: "The Commander", onFile: false },
  { name: "Silas", species: "Tiger", role: "The Survivor", onFile: false },
] as const;

const SCENES = [
  {
    id: "breakroom",
    slate: "FIELD RECORDING 01",
    place: "The breakroom",
    cast: "Sterling · Bruno · Milo",
    length: "12s",
  },
  {
    id: "meeting",
    slate: "FIELD RECORDING 02",
    place: "The meeting room",
    cast: "Alli · Omar · Valentino · Silas",
    length: "10s",
  },
  {
    id: "warehouse",
    slate: "FIELD RECORDING 03",
    place: "The loft, after hours",
    cast: "Grant · Barney · Sterling · Jax · Milo",
    length: "11s",
  },
] as const;

function ZoologicPage() {
  const ref = useZooReveals();
  const railRef = useRef<HTMLDivElement>(null);

  // Specimen-card parallax drift (landing Scene 4 device, page-local copy).
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
    <main id="main" ref={ref} className="relative min-h-screen bg-obsidian text-pumice">
      <SiteNav />

      {/* Hero — the warm world seen through the obsidian frame. */}
      <section className="relative flex min-h-[92svh] items-end overflow-hidden">
        <AmbientLoop
          src="/media/zoologic-loop.mp4"
          poster="/media/zoologic-loop-poster.jpg"
          className="absolute inset-0 h-full w-full object-cover"
          label="Ambient scene from Zoologic: the cast in the lounge, warm evening light."
        />
        {/* Crater walls: obsidian closes in from every edge; the show burns in the middle. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 42%, transparent 30%, rgba(11,11,13,0.72) 72%, var(--color-obsidian) 100%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
          style={{
            background: "linear-gradient(to top, var(--color-obsidian), transparent)",
          }}
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-6xl px-8 pb-20 pt-44">
          <p className="u-mono text-ember">The first eruption</p>
          <h1 className="u-display mt-4 text-7xl sm:text-8xl md:text-9xl">ZOOLOGIC</h1>
          <div className="mt-5 h-[3px] w-24 bg-ember" aria-hidden />
          <p className="mt-6 max-w-md text-lg text-pumice/90">
            A nature-documentary sitcom. Ten animals. Zero humans harmed.
          </p>
          <div className="u-mono mt-10 flex flex-wrap gap-x-8 gap-y-2 !text-pumice/80">
            <span>10 characters</span>
            <span>Rendered on 1× RTX 3090 Ti</span>
            <span className="inline-flex items-center gap-2">
              <span
                className="h-[7px] w-[7px] rounded-full bg-ember"
                style={{ boxShadow: "0 0 8px rgba(255,85,31,0.7)" }}
                aria-hidden
              />
              Status · erupting
            </span>
          </div>
        </div>
      </section>

      {/* Featured cast — the specimen five. */}
      <section className="px-8 pt-32">
        <div className="mx-auto max-w-6xl">
          <div data-reveal>
            <p className="u-mono text-ember">The cast · featured specimens</p>
            <h2 className="u-display mt-4 text-4xl md:text-5xl">
              TEN ANIMALS. ONE WORKPLACE.
            </h2>
            <p className="mt-5 max-w-xl text-pumice/80">
              A documentary crew embedded itself in an animal-run office. These
              are the five it managed to photograph first.
            </p>
          </div>

          <div ref={railRef} className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-5 md:items-center">
            {FEATURED.map((c, i) => (
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
                    alt={`${c.name} · ${c.species}, ${c.role}`}
                    loading="lazy"
                    className="aspect-[2/3] w-full object-cover object-top"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-magma-deep/25 via-transparent to-transparent" />
                  <span className="u-mono absolute right-2 top-2 !text-pumice/70">
                    {String(i + 1).padStart(2, "0")}/10
                  </span>
                </div>
                <div className="mt-3">
                  <div className="u-mono !text-pumice">{c.name}</div>
                  <div className="u-mono mt-1">
                    {c.species} · {c.role}
                  </div>
                  <p className="mt-2 text-sm leading-snug text-pumice/70">{c.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The full survey — ten-strong field roster. */}
      <section className="px-8 pt-32">
        <div data-reveal className="mx-auto max-w-6xl">
          <p className="u-mono text-ember">The full survey</p>
          <div className="mt-8 border-t border-charcoal">
            {ROSTER.map((r, i) => (
              <div
                key={r.name}
                className="grid grid-cols-[2rem_1fr_1fr] items-baseline gap-x-4 border-b border-charcoal py-4 sm:grid-cols-[3rem_1fr_1fr_1fr_auto]"
              >
                <span className="u-mono">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-pumice">{r.name}</span>
                <span className="u-mono">{r.species}</span>
                <span className="u-mono col-start-2 sm:col-start-4 !text-pumice/70">{r.role}</span>
                <span className="u-mono col-start-3 text-right sm:col-start-5">
                  <span
                    className={`mr-2 inline-block h-[6px] w-[6px] rounded-full align-middle ${
                      r.onFile ? "bg-ember" : "border border-ash bg-transparent"
                    }`}
                    style={r.onFile ? { boxShadow: "0 0 6px rgba(255,85,31,0.6)" } : undefined}
                    aria-hidden
                  />
                  {r.onFile ? "on file" : "under survey"}
                </span>
              </div>
            ))}
          </div>
          <p className="u-mono mt-6 !text-pumice/50">
            ● on file: hero photography complete · ○ under survey: sighted, sheet stage
          </p>
        </div>
      </section>

      {/* Field recordings — real rendered scenes. */}
      <section className="px-8 pt-32">
        <div className="mx-auto max-w-6xl">
          <div data-reveal>
            <p className="u-mono text-ember">Field recordings</p>
            <p className="mt-4 max-w-xl text-pumice/80">
              Straight from the pipeline. Rendered scenes, not concept art.
              Sound is being mixed; the footage is real.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {SCENES.map((s) => (
              <figure key={s.id} data-reveal className="border border-charcoal bg-basalt p-3">
                <div className="relative overflow-hidden border border-charcoal">
                  <AmbientLoop
                    src={`/media/zoologic-scene-${s.id}.mp4`}
                    poster={`/media/zoologic-scene-${s.id}-poster.jpg`}
                    className="aspect-[896/704] w-full object-cover"
                    label={`${s.place} · ${s.cast}`}
                  />
                </div>
                <figcaption className="mt-3">
                  <div className="u-mono !text-pumice">
                    {s.slate} · {s.length}
                  </div>
                  <div className="u-mono mt-1">{s.place}</div>
                  <div className="u-mono mt-1 !text-pumice/60">{s.cast}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* The format — what the show is. */}
      <section className="px-8 pt-32">
        <div
          data-reveal
          className="mx-auto max-w-6xl border border-charcoal px-8 py-14 md:px-14"
          style={{
            background:
              "radial-gradient(ellipse 80% 120% at 50% 120%, rgba(140,29,4,0.28), transparent 70%)",
          }}
        >
          <p className="u-mono text-ember">The format</p>
          <h2 className="u-display mt-4 max-w-2xl text-4xl md:text-5xl">
            EVERY EPISODE IS A FIELD STUDY.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div>
              <p className="u-mono !text-pumice">Observed, not staged</p>
              <p className="mt-2 text-sm text-pumice/70">
                A nature-documentary crew embedded in an animal-run office.
                Narrated like wildlife. Behaves like a workplace.
              </p>
            </div>
            <div>
              <p className="u-mono !text-pumice">Talking heads</p>
              <p className="mt-2 text-sm text-pumice/70">
                Nine of the ten speak to camera. Sterling has never said a
                word, and has never needed to.
              </p>
            </div>
            <div>
              <p className="u-mono !text-pumice">The kingdom is a mess</p>
              <p className="mt-2 text-sm text-pumice/70">
                Predators, prey and middle management share one breakroom.
                Nature takes its course.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Forge band — made in-house; the page's one lit CTA. */}
      <section className="px-8 pb-32 pt-28">
        <div
          data-reveal
          className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-10 gap-y-6 border-t border-charcoal pt-10"
        >
          <p className="max-w-md text-pumice/80">
            Every frame boarded, rendered, voiced and scored in our own forge,
            on one GPU.
          </p>
          <span className="flex flex-wrap gap-6">
            <Link
              to="/tools"
              data-magnetic
              className="group inline-flex items-baseline gap-3 border border-ember/60 px-6 py-4 text-pumice no-underline transition-colors hover:border-ember"
              style={{ boxShadow: "0 0 24px -8px rgba(255,85,31,0.45)" }}
            >
              <span className="u-mono !text-ember">Survey the tools</span>
              <span className="text-ember transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              to="/studio"
              data-magnetic
              className="u-mono self-center !text-pumice no-underline"
            >
              The studio →
            </Link>
          </span>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
