import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ClientOnly } from "#/components/ClientOnly";
import { Preloader } from "#/components/site/Preloader";
// Held until the show is announced — see the Scene 5 comment below.
// import { ProofStrip } from "#/components/site/ProofStrip";
import { ScrollCue } from "#/components/site/ScrollCue";
import { ScrubVideo } from "#/components/site/ScrubVideo";
import { SiteFooter } from "#/components/site/SiteFooter";
import { SiteNav } from "#/components/site/SiteNav";
import { StaticHero } from "#/components/site/StaticHero";
import { useScrollStore } from "#/lib/scroll-store";
import { usePointerRig, useScrollRig } from "#/lib/useScrollRig";
import { useTierC } from "#/lib/useTier";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "KALDERA: The AI studio that builds its own tools." },
      {
        name: "description",
        content:
          "Kaldera Studio makes films, art and video with AI, and hands creators the tools it builds. Aurea for desktop and Cinevido for the web, built in production on a single GPU.",
      },
    ],
  }),
});

// Keep the 3D payload (three + postprocessing, ~320 kB gz) out of the shell
// chunk — copy and CTAs render first, the canvas streams in behind them.
// The P3 preloader will front this gap by design (PRD §4 Scene 0).
const CalderaCanvas = lazy(() =>
  import("#/components/caldera/CalderaCanvas").then((m) => ({ default: m.CalderaCanvas })),
);

// The story, three beats down the descent: what we make, how we make it,
// and why it matters to the visitor — the tools end up in their hands.
const THESIS = [
  "We make films, art and video with AI.",
  "Every tool we use, we built in production, on one GPU.",
  "When a tool survives the studio, we hand it to you.",
];

/**
 * Scene 5's stand-in while the show is unannounced (see the section comment
 * below). Named models only — the argument is that these are the real steps
 * we run, so a generic "AI magic" list would defeat the point.
 */
const METHOD = [
  {
    stage: "Script",
    tool: "Aurea · Director + Studio",
    note: "The shot is argued out in chat, then written into a scene.",
  },
  {
    stage: "Board",
    tool: "Aurea · storyboard",
    note: "Beats become frames on a board before a pixel is spent.",
  },
  {
    stage: "Plate",
    tool: "Krea2 · text-to-image",
    note: "The set is built empty and lit, so it can be reused all season.",
  },
  {
    stage: "Keyframe",
    tool: "Qwen-Image-Edit · cast refs",
    note: "The cast is staged onto the plate, on-model every time.",
  },
  {
    stage: "Render",
    tool: "LTX 2.3 · image-to-video",
    note: "The keyframe starts moving, at 24 fps, on local silicon.",
  },
  {
    stage: "Voice · Score",
    tool: "Aurea · voice + music labs",
    note: "Lines and cues are cut in the same room as the picture.",
  },
] as const;

/**
 * P1 gotcha carried forward: never subscribe to scroll progress in the route
 * component — it re-renders <Canvas> every frame and tears down the composer.
 * The canvas reads the store in useFrame; DOM readers must be leaf components.
 */
function Landing() {
  const tierC = useTierC();
  const calderaRef = useRef<HTMLDivElement>(null);
  // State, not a ref: the wrapper lives inside <ClientOnly>, which renders null
  // until its own mount effect runs. A ref would still be null when the GSAP
  // effect below fires, which is exactly why the canvas cross-fade never got
  // built — `if (wrap && track)` was silently false on every load. Holding the
  // node in state re-runs that effect once, when the node actually exists.
  const [canvasWrap, setCanvasWrap] = useState<HTMLDivElement | null>(null);
  const moRef = useRef<MutationObserver | null>(null);

  useScrollRig({ track: calderaRef });
  usePointerRig();

  const thesisRef = useRef<HTMLDivElement>(null);

  // Park the render loop once the handoff has faded the canvas out, so the
  // scene stops drawing behind the whole rest of the page. This watches the
  // RESULT of the autoAlpha tween below rather than recomputing its scroll
  // math, so the two can never drift apart.
  //
  // The visibility itself rides the store, not route state, because route-body
  // state re-renders the <Canvas> subtree (see the note in proto.caldera.tsx).
  const observeCanvasWrap = useCallback((wrap: HTMLDivElement | null) => {
    setCanvasWrap(wrap);
    moRef.current?.disconnect();
    if (!wrap) {
      useScrollStore.getState().setCanvasVisible(true);
      return;
    }
    const read = () => {
      const cs = getComputedStyle(wrap);
      useScrollStore
        .getState()
        .setCanvasVisible(cs.visibility !== "hidden" && Number(cs.opacity) > 0.01);
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(wrap, { attributes: true, attributeFilter: ["style", "class"] });
    moRef.current = mo;
  }, []);
  useEffect(() => () => moRef.current?.disconnect(), []);

  useEffect(() => {
    if (tierC) return;
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
        // One thought per beat, strictly sequential (P1 pass 4).
        tl.to(line, { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out" }, i * 2.0 + 0.4);
        if (i < lines.length - 1) {
          tl.to(line, { autoAlpha: 0, y: -24, duration: 0.6, ease: "power2.in" }, i * 2.0 + 1.7);
        }
      });

      // The corner HUD belongs to the caldera scenes only — it is fixed, so it
      // has to be faded out once the descent ends and Scenes 3–6 scroll in.
      const hud = document.querySelector("[data-caldera-hud]");
      const track = calderaRef.current;
      if (hud && track) {
        ScrollTrigger.create({
          trigger: track,
          start: "top top",
          end: "bottom bottom",
          onLeave: () => gsap.to(hud, { autoAlpha: 0, duration: 0.4 }),
          onEnterBack: () => gsap.to(hud, { autoAlpha: 1, duration: 0.4 }),
        });
      }

      // The other half of the 3D-to-2D handoff (the WebGL half is
      // HandoffVeil): by the end of the track the veil has cooled the whole
      // frame to page obsidian, so the fixed canvas can cross-fade away under
      // the arriving sections instead of being hard-occluded by them. Scrubbed,
      // so scrolling back re-lights the scene symmetrically.
      if (canvasWrap && track) {
        gsap.fromTo(
          canvasWrap,
          { autoAlpha: 1 },
          {
            autoAlpha: 0,
            ease: "none",
            scrollTrigger: {
              trigger: track,
              start: "bottom 60%",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      }

      // Sections below the descent rise out of the cooled surface rather than
      // sliding in as flat cards.
      for (const el of gsap.utils.toArray<HTMLElement>("[data-enter]")) {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 36 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 82%" },
          },
        );
      }
    }, root.ownerDocument.body);

    return () => ctx.revert();
  }, [tierC, canvasWrap]);

  return (
    // No `text-pumice` here any more: it hard-set one colour on every
    // descendant that did not override it, which is exactly what the
    // --text-* roles are for. The body default now flows through.
    <main id="main" className="relative bg-obsidian">
      <SiteNav />

      {/* ── Scenes 1–2: the caldera (tier A) or static art (tier C) ──── */}
      {tierC ? (
        <>
          <StaticHero />
          <section className="relative px-8 py-32">
            <div className="mx-auto max-w-4xl space-y-16 text-center">
              {THESIS.map((line, i) => (
                <p key={line} className="u-statement" style={{ fontWeight: i === 2 ? 600 : 400 }}>
                  {line}
                </p>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <h1 className="sr-only">KALDERA, the AI art and film studio</h1>

          {/* Scene 0. Client-only: it locks scroll and tracks real loads,
              neither of which exists during SSR. */}
          <ClientOnly>
            <Preloader />
          </ClientOnly>

          <ClientOnly>
            <div ref={observeCanvasWrap} className="fixed inset-0 z-10">
              <Suspense fallback={null}>
                <CalderaCanvas post segments={896} />
              </Suspense>
            </div>
          </ClientOnly>

          <div
            data-caldera-hud
            className="pointer-events-none fixed bottom-6 right-6 z-30"
          >
            <ScrollCue />
          </div>

          {/* The tracked span: exact P1 proportions (100 + 260 + 80 vh) so the
              camera path, beats and wordmark placement carry over unchanged.
              The 80vh tail is where HandoffVeil plays: no DOM content there on
              purpose — the veil needs a clean frame to cool. */}
          <div ref={calderaRef}>
            <section className="relative z-20 h-screen">
              {/* The one line that has to land before the visitor scrolls: what
                  this studio actually is. Hardware bragging moved further down
                  the page, where it is evidence rather than an opening. */}
              <div className="absolute bottom-24 left-8 max-w-md">
                <p className="u-mono text-ember">Kaldera Studio</p>
                <p className="u-mono mt-2 !text-pumice">
                  We build AI creation tools.<br />
                  Then we make the films with them.
                </p>
              </div>
            </section>

            <section ref={thesisRef} className="relative z-20 h-[260vh]">
              <div className="sticky top-0 flex h-screen items-center justify-center px-8">
                <div className="relative w-full max-w-4xl text-center">
                  {THESIS.map((line, i) => (
                    <p
                      key={line}
                      data-thesis-line
                      className="u-statement absolute inset-x-0 top-1/2 -translate-y-1/2"
                      style={{ fontWeight: i === 2 ? 600 : 400 }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </section>

            <section className="relative z-20 h-[80vh]" />
          </div>
        </>
      )}

      {/* ── Scene 3 — DOOR ONE: THE TOOLS (P4: real UI footage, scroll-scrubbed).
          No top border here — this section emerges from the veil's cooled
          obsidian, and a hard rule would put the curtain seam back. ── */}
      <section className="relative z-20 bg-obsidian px-8 py-32 md:py-44">
        <div className="mx-auto max-w-6xl">
          <div data-enter>
            <p className="u-mono text-ember">Door one</p>
            <h2 className="u-display u-h2 mt-4">THE TOOLS</h2>
            <p className="u-lede mt-5">
              One studio, two apps. Built for our productions, delivered to yours.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            <div data-enter className="border border-charcoal bg-basalt p-7">
              <div className="flex items-baseline justify-between">
                <h3 className="u-display text-2xl">AUREA</h3>
                <span className="u-mono">Desktop</span>
              </div>
              <p className="u-copy mt-3">The desktop studio for cinematic AI video.</p>
              {/* Scrubbed by scroll: real captures — Director, Studio, board, labs. */}
              <div className="u-slab mt-6 aspect-[16/10]">
                <ScrubVideo
                  src="/media/aurea-scrub.mp4"
                  poster="/media/aurea-poster.jpg"
                  className="h-full w-full object-cover"
                  label="Aurea: Director chat, Studio script, storyboard, Image lab and Timeline"
                />
              </div>
            </div>
            <div data-enter className="border border-charcoal bg-basalt p-7">
              <div className="flex items-baseline justify-between">
                <h3 className="u-display text-2xl">CINEVIDO</h3>
                <span className="u-mono">Web app</span>
              </div>
              <p className="u-copy mt-3">The studio that runs in your browser.</p>
              <div className="u-slab mt-6 aspect-[16/10]">
                <ScrubVideo
                  src="/media/cinevido-scrub.mp4"
                  poster="/media/cinevido-poster.jpg"
                  className="h-full w-full object-cover"
                  label="Cinevido: image generation, gallery, 3D model viewer and model lineup"
                />
              </div>
            </div>
          </div>

          <Link
            to="/tools"
            data-magnetic
            className="group mt-12 inline-flex items-baseline gap-3 border border-charcoal px-6 py-4 text-pumice no-underline transition-colors hover:border-ember"
          >
            <span className="u-mono !text-ember">Open the tools</span>
            <span className="text-ember transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </section>

      {/* ── Scene 4 — IN PRODUCTION. The show itself is unannounced: it gets
          named, cast and linked when it releases, not before. Until then the
          section holds the spot with the fact of the work, nothing else —
          no footage, no cast rail, no door. ── */}
      <section className="relative z-20 overflow-hidden border-t border-charcoal bg-obsidian px-8 py-32 md:py-44">
        {/* A banked glow instead of show footage: heat under the floor. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-72"
          aria-hidden
          style={{
            background:
              "radial-gradient(110% 100% at 50% 120%, rgba(255,85,31,0.14) 0%, rgba(140,29,4,0.08) 40%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl" data-enter>
          <p className="u-mono text-ember">In production</p>
          <h2 className="u-display u-h2 mt-4">
            AN ORIGINAL SERIES
          </h2>
          <p className="mt-5 max-w-md text-lg text-pumice/80">
            Our first show is rendering now, made start to finish with the tools
            above, on the same machine. We will name it when it is ready.
          </p>

          <div className="u-mono mt-8">Written, staged and rendered on 1× RTX 3090 Ti</div>

          {/* Deliberately not a link: the show opens its door when episode
              one is cut, not before. */}
          <div className="mt-10 inline-flex items-baseline gap-3 border border-charcoal/70 px-6 py-4">
            <span
              className="inline-block h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-ember"
              style={{ boxShadow: "0 0 8px rgba(255,85,31,0.8)" }}
              aria-hidden
            />
            <span className="u-mono !text-pumice">First look coming soon</span>
          </div>
        </div>
      </section>

      {/* ── Scene 5 — THE METHOD.
          Held for the show's launch: <ProofStrip reduced={tierC} /> is the
          pinned horizontal strip of real frames at three pipeline stages. Every
          frame in it is from the unreleased series, so it cannot run until the
          show is announced — the import and the component are kept intact so
          this is a one-line restore on launch day. Until then the same argument
          is made without footage: the stages themselves, named with the model
          that does each one. ── */}
      <section className="relative z-20 border-t border-charcoal bg-obsidian px-8 py-32 md:py-40">
        <div className="mx-auto max-w-6xl">
          <div data-enter>
            <p className="u-mono text-ember">The method</p>
            <h2 className="u-display u-h2 mt-4">
              SIX STAGES, ONE MACHINE
            </h2>
            <p className="u-lede mt-5 !max-w-[42ch]">
              Every shot walks the same spine, and every stage of it runs on the
              hardware under the desk. No render farm, no outsourced pass.
            </p>
          </div>

          <ol className="mt-14 grid gap-px border border-charcoal bg-charcoal sm:grid-cols-2 lg:grid-cols-3">
            {METHOD.map(({ stage, tool, note }, i) => (
              <li key={stage} data-enter className="group relative bg-obsidian p-7">
                {/* The spine runs along the top of each cell and banks stage
                    by stage — the shot cooling as it moves down the pipeline.
                    Along the top rather than the left edge: a left hairline
                    lands on the grid's own gap line and disappears into it. */}
                <span
                  className="absolute inset-x-0 top-0 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--color-ember), rgba(255,85,31,0.06))",
                    opacity: 1 - i * 0.13,
                  }}
                  aria-hidden
                />
                <div className="u-mono flex items-baseline gap-3">
                  <span className="!text-ember">{String(i + 1).padStart(2, "0")}</span>
                  <span className="!text-pumice">{stage}</span>
                </div>
                <p className="u-copy mt-4">{note}</p>
                <div className="u-mono mt-6 opacity-55">{tool}</div>
              </li>
            ))}
          </ol>

          <div className="u-mono mt-8 opacity-55">
            Every stage rendered on 1× RTX 3090 Ti
          </div>
        </div>
      </section>

      <section className="relative z-20 bg-obsidian px-8 pb-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 border-t border-charcoal pt-8 md:flex-row md:items-center md:justify-between">
          <p className="u-copy max-w-md">
            Six stages, one machine. How the pipeline was actually built, and
            what it is cutting right now, lives in the studio.
          </p>
          <Link
            to="/studio"
            data-magnetic
            className="group inline-flex items-baseline gap-3 border border-charcoal px-6 py-4 no-underline transition-colors hover:border-ember"
          >
            <span className="u-mono !text-ember">Studio</span>
            <span className="text-ember transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
