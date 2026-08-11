import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "#/components/site/SiteFooter";
import { SiteNav } from "#/components/site/SiteNav";
import { ScrubVideo } from "#/components/site/ScrubVideo";
import { RegTicks, SpecRow, StatusDot, Ticks, useReveals } from "#/components/tools/kit";

export const Route = createFileRoute("/tools/cinevido")({
  component: CinevidoPage,
  head: () => ({
    meta: [
      { title: "Cinevido: the studio that runs in your browser" },
      {
        name: "description",
        content:
          "Cinevido is Kaldera's browser studio: generate cinematic AI video from a prompt, keep every take in the gallery, inspect in 3D. No install required.",
      },
    ],
  }),
});

function CinevidoPage() {
  const ref = useReveals();

  return (
    <main id="main" ref={ref} className="relative min-h-screen bg-obsidian text-pumice">
      <SiteNav />

      {/* Hero */}
      <section className="px-8 pt-44">
        <div className="mx-auto max-w-6xl">
          <p className="u-mono text-ember">The forge · tool two</p>
          <h1 className="u-display mt-5 text-6xl sm:text-8xl md:text-9xl">CINEVIDO</h1>
          <p className="mt-8 max-w-xl text-lg text-pumice/80">
            The studio that runs in your browser. The same pipeline as the
            desktop forge, with nothing to install and nothing to configure.
          </p>
          <div className="mt-10">
            <SpecRow items={["Browser · webapp", "No install", "Works on the machine you have"]} status="molten" />
          </div>

          {/* The page's whole point: the tool is live and one click away, so
              the door goes above the fold rather than after the tour. External
              host, hence <a> and not <Link>. */}
          <a
            href="https://cinevido.com"
            target="_blank"
            rel="noopener noreferrer"
            data-magnetic
            className="group mt-10 inline-flex items-baseline gap-3 border border-ember/60 px-6 py-4 text-pumice no-underline transition-colors hover:border-ember"
            style={{ boxShadow: "0 0 24px -8px rgba(255,85,31,0.45)" }}
          >
            <span className="u-mono !text-ember">Open Cinevido</span>
            <span className="u-mono opacity-50">cinevido.com</span>
            <span className="text-ember transition-transform group-hover:translate-x-1">↗</span>
          </a>
        </div>
      </section>

      {/* The slab */}
      <section className="px-8 pt-20">
        <div data-reveal className="mx-auto max-w-6xl">
          <div className="u-slab relative aspect-[8/5]">
            <ScrubVideo
              src="/media/cinevido-scrub.mp4"
              poster="/media/cinevido-poster.jpg"
              className="h-full w-full object-cover"
              label="A scroll-driven tour of Cinevido in the browser: gallery, interactive 3D viewer and model lineup."
            />
            <RegTicks />
          </div>
          <p className="u-mono mt-3 flex justify-between">
            <span>The product surface, in a real browser</span>
            <span className="hidden sm:inline">Scroll to scrub</span>
          </p>
        </div>
      </section>

      {/* What it does — one column of ticks + a quiet counterpart panel. */}
      <section className="px-8 pt-32">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[6fr_5fr]">
          <div data-reveal>
            <p className="u-mono text-ember">What it does</p>
            <Ticks
              items={[
                { title: "Generate from a prompt, refine in place", detail: "generate" },
                { title: "Every take lands in the gallery, nothing lost", detail: "library" },
                { title: "Turn stills into models, inspect them in 3D", detail: "viewer" },
                { title: "A lineup of engines behind one surface", detail: "models" },
              ]}
            />
          </div>
          <div data-reveal className="border border-charcoal bg-basalt p-8">
            <p className="u-mono">Same forge, lighter door</p>
            <p className="mt-4 text-sm leading-relaxed text-pumice/75">
              Aurea is the heavy tool: it wants your GPU and gives you a whole
              studio. Cinevido is the door you can walk through today: open a
              tab, make a shot. When a project outgrows the browser, it moves
              to the desktop without changing language.
            </p>
            <Link
              to="/tools/aurea"
              data-magnetic
              className="u-mono mt-6 inline-block !text-ember no-underline"
            >
              Meet the heavy tool →
            </Link>
          </div>
        </div>
      </section>

      {/* Status band */}
      <section className="px-8 pb-32 pt-32">
        <div
          data-reveal
          className="relative mx-auto max-w-6xl overflow-hidden border border-charcoal px-8 py-16"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 140% at 50% 130%, rgba(140,29,4,0.5), rgba(255,85,31,0.12) 45%, transparent 70%)",
            }}
            aria-hidden
          />
          <div className="relative">
            <p className="u-mono flex items-baseline gap-3">
              Status <StatusDot state="molten" />
            </p>
            <p className="mt-5 max-w-2xl text-2xl leading-snug text-pumice md:text-3xl">
              Cinevido is molten. The surface is live, the studio behind it is
              still being forged. It hardens in public.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <a
                href="https://cinevido.com"
                target="_blank"
                rel="noopener noreferrer"
                data-magnetic
                className="group inline-flex items-baseline gap-3 border border-ember/60 px-6 py-4 text-pumice no-underline transition-colors hover:border-ember"
                style={{ boxShadow: "0 0 24px -8px rgba(255,85,31,0.45)" }}
              >
                <span className="u-mono !text-ember">Open Cinevido</span>
                <span className="text-ember transition-transform group-hover:translate-x-1">↗</span>
              </a>
              <Link to="/tools" data-magnetic className="u-mono !text-pumice no-underline">
                ← Back to the forge
              </Link>
              <Link to="/studio" data-magnetic className="u-mono !text-pumice no-underline">
                Meet the studio →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
