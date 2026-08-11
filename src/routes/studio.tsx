import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "#/components/site/SiteFooter";
import { SiteNav } from "#/components/site/SiteNav";
import { RegTicks, Stat, StatusDot, useReveals } from "#/components/tools/kit";

export const Route = createFileRoute("/studio")({
  component: StudioPage,
  head: () => ({
    meta: [
      { title: "The Studio · Kaldera" },
      {
        name: "description",
        content:
          "Kaldera Studio makes films, art and video with AI on a single GPU, and delivers the tools it builds to creators.",
      },
    ],
  }),
});

/**
 * One shot, three states. The stills that used to illustrate this are frames
 * from the unreleased series, so they are held until it is announced — restore
 * `src` on each row and put the <img> back (see the section below) on launch
 * day. Until then the triad is stated rather than shown.
 *
 *   { src: "/media/proof-02-plate.webp", ... }
 *   { src: "/media/proof-02-board.webp", ... }
 *   { src: "/media/proof-02-render-poster.webp", ... }
 */
const METHOD = [
  {
    state: "01 · Plate",
    note: "The empty set, lit",
    body: "The location is built and lit with nobody in it, so one plate carries every scene shot there.",
  },
  {
    state: "02 · Board",
    note: "Cast staged on the plate",
    body: "The cast is placed into that plate from reference, on-model, before a single frame moves.",
  },
  {
    state: "03 · Render",
    note: "The finished frame",
    body: "The board becomes 24 fps of motion on the GPU in the room. The take, not a preview.",
  },
] as const;

const WORK = [
  {
    name: "AUREA",
    kind: "Tool · desktop studio",
    line: "Direct, board and render cinematic AI video on your own GPU.",
    to: "/tools/aurea",
    status: "molten" as const,
  },
  {
    name: "CINEVIDO",
    kind: "Tool · browser studio",
    line: "The same pipeline, nothing to install.",
    to: "/tools/cinevido",
    status: "molten" as const,
  },
  // The show holds no row here until it is announced — an "UNTITLED" line in
  // an index of shipped work reads as a placeholder, not as anticipation. It
  // gets its title, its row and its door on the same day:
  //   { name: "ZOOLOGIC", kind: "Show · nature-documentary sitcom",
  //     line: "Ten animals. Zero humans harmed. In production." }
] as { name: string; kind: string; line: string; to?: string; status: "molten" | "cooling" }[];

function StudioPage() {
  const ref = useReveals();

  return (
    <main id="main" ref={ref} className="relative min-h-screen bg-obsidian text-pumice">
      <SiteNav />

      {/* Hero — the crater story. */}
      <section className="px-8 pt-44">
        <div className="mx-auto max-w-6xl">
          <p className="u-mono text-ember">Who we are</p>
          <h1 className="u-display mt-5 text-5xl sm:text-7xl md:text-8xl">
            THE <span className="text-ember">CRATER</span>
            <br />
            WHERE IT&rsquo;S FORGED.
          </h1>
          <p className="mt-8 max-w-xl text-lg text-pumice/80">
            Kaldera Studio makes films, art and video with AI, all of it on one
            GPU, in the room where it was written. We build every tool in our
            pipeline ourselves, prove it on our own productions, and then hand
            it to creators. The studio is the test; the tools are the gift.
          </p>
          <div className="u-mono mt-10 flex flex-wrap gap-x-8 gap-y-2">
            <span>Founded · MMXXVI</span>
            <span>1× RTX 3090 Ti</span>
            <StatusDot state="molten" />
          </div>
        </div>
      </section>

      {/* The method — one shot, three states. */}
      <section className="px-8 pt-32">
        <div className="mx-auto max-w-6xl">
          <div data-reveal>
            <p className="u-mono text-ember">The method</p>
            <p className="mt-4 max-w-xl text-pumice/80">
              Every shot survives three states: an empty plate, a boarded
              keyframe, a rendered take. Nothing on this site is a mockup.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {METHOD.map((m) => (
              <figure key={m.state} data-reveal className="u-slab relative m-0">
                {/* Where the still goes when the show opens: the same box, the
                    same ticks — swap this block for the <img> and nothing
                    around it has to move. */}
                <div
                  className="flex aspect-[16/10] w-full items-end p-6"
                  style={{
                    background:
                      "radial-gradient(120% 130% at 18% 118%, rgba(140,29,4,0.30), rgba(255,85,31,0.06) 46%, transparent 72%)",
                  }}
                >
                  <p className="text-pumice/75">{m.body}</p>
                </div>
                <RegTicks />
                <figcaption className="flex items-baseline justify-between border-t border-charcoal px-4 py-3">
                  <span className="u-mono !text-pumice">{m.state}</span>
                  <span className="u-mono">{m.note}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* The work index. */}
      <section className="px-8 pt-32">
        <div data-reveal className="mx-auto max-w-6xl">
          <p className="u-mono text-ember">The work</p>
          <div className="mt-8 border-t border-charcoal">
            {WORK.map((w) => {
              const row = (
                <>
                  <span className="u-display text-2xl text-pumice md:text-3xl">{w.name}</span>
                  <span className="u-mono col-span-2 sm:col-span-1">
                    {w.kind} · {w.line}
                  </span>
                  <span className="hidden sm:inline">
                    <StatusDot state={w.status} />
                  </span>
                  {w.to ? (
                    <span className="text-ember transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  ) : (
                    <span className="u-mono">soon</span>
                  )}
                </>
              );
              const rowClass =
                "group grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 border-b border-charcoal py-6 sm:grid-cols-[auto_1fr_auto_auto]";
              return w.to ? (
                <Link
                  key={w.name}
                  to={w.to}
                  data-magnetic
                  className={`${rowClass} no-underline transition-colors hover:bg-basalt/50`}
                >
                  {row}
                </Link>
              ) : (
                <div key={w.name} className={rowClass}>
                  {row}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* The numbers. */}
      <section className="px-8 pt-32">
        <div data-reveal className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
          <Stat label="Render hardware" value="1×" unit="RTX 3090 Ti" />
          <Stat label="Tools in the forge" value="2" unit="aurea · cinevido" />
          <Stat label="Shows in production" value="1" unit="original series" />
        </div>
      </section>

      {/* Contact — the page's one lit element. */}
      <section className="px-8 pb-32 pt-32">
        <div
          data-reveal
          className="mx-auto max-w-6xl border border-charcoal px-8 py-14 md:px-14"
          style={{
            background:
              "radial-gradient(ellipse 80% 120% at 50% 120%, rgba(140,29,4,0.28), transparent 70%)",
          }}
        >
          <p className="u-mono text-ember">Contact</p>
          <h2 className="u-display mt-4 max-w-2xl text-4xl md:text-5xl">
            THE FIELD LINE IS OPEN.
          </h2>
          <p className="mt-5 max-w-md text-pumice/80">
            Working on something that should render on one GPU? Write to the
            crater.
          </p>
          <a
            href="mailto:hbilgic1992@gmail.com"
            data-magnetic
            className="group mt-10 inline-flex items-baseline gap-3 border border-ember/60 px-6 py-4 text-pumice no-underline transition-colors hover:border-ember"
            style={{ boxShadow: "0 0 24px -8px rgba(255,85,31,0.45)" }}
          >
            <span className="u-mono !text-ember">Write to the studio</span>
            <span className="text-ember transition-transform group-hover:translate-x-1">→</span>
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
