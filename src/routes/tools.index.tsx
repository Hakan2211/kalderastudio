import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "#/components/site/SiteFooter";
import { SiteNav } from "#/components/site/SiteNav";
import { ScrubVideo } from "#/components/site/ScrubVideo";
import { RegTicks, SpecRow, Stat, Ticks, useReveals } from "#/components/tools/kit";

export const Route = createFileRoute("/tools/")({
  component: ToolsPage,
  head: () => ({
    meta: [
      { title: "The Forge · Kaldera Tools" },
      {
        name: "description",
        content:
          "Two tools, one pipeline. Aurea, the desktop studio for cinematic AI video. Cinevido, the studio that runs in your browser. Both proven in production on our own original series.",
      },
    ],
  }),
});

const PIPELINE = ["Script", "Board", "Keyframe", "Render", "Voice", "Score"];

function ToolsPage() {
  const ref = useReveals();

  return (
    <main id="main" ref={ref} className="relative min-h-screen bg-obsidian text-pumice">
      <SiteNav />

      {/* Hero — A-3's accent-word move: one word carries the ember. */}
      <section className="px-8 pt-44">
        <div className="mx-auto max-w-6xl">
          <p className="u-mono text-ember">The forge</p>
          <h1 className="u-display mt-5 text-5xl sm:text-7xl md:text-8xl">
            TWO TOOLS.
            <br />
            ONE <span className="text-ember">PIPELINE.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-pumice/80">
            We didn&rsquo;t build these to sell seats. We built them to ship our own
            productions on one GPU, then opened the forge.
          </p>
        </div>
      </section>

      {/* Tool one — Aurea. Media right, copy left; the page's one lit CTA. */}
      <section className="px-8 pt-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[5fr_7fr]">
          <div data-reveal>
            <p className="u-mono">Tool one · desktop</p>
            <h2 className="u-display mt-3 text-5xl md:text-6xl">AUREA</h2>
            <p className="mt-5 max-w-md text-pumice/80">
              The desktop studio for cinematic AI video. Direct, board and
              render on your own GPU.
            </p>
            <Ticks
              items={[
                { title: "Director chat boards the shot", detail: "direct" },
                { title: "Cast-true storyboards & cinematography", detail: "board" },
                { title: "Three render engines, local GPU", detail: "render" },
                { title: "Image, voice and music labs", detail: "labs" },
              ]}
            />
            <div className="mt-8">
              <SpecRow items={["Desktop · Electron", "Local GPU"]} status="molten" />
            </div>
            <Link
              to="/tools/aurea"
              data-magnetic
              className="group mt-10 inline-flex items-baseline gap-3 border border-ember/60 px-6 py-4 text-pumice no-underline transition-colors hover:border-ember"
              style={{ boxShadow: "0 0 24px -8px rgba(255,85,31,0.45)" }}
            >
              <span className="u-mono !text-ember">Survey Aurea</span>
              <span className="text-ember transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
          <div data-reveal className="u-slab relative aspect-[8/5]">
            <ScrubVideo
              src="/media/aurea-scrub.mp4"
              poster="/media/aurea-poster.jpg"
              className="h-full w-full object-cover"
              label="A scroll-driven tour of the Aurea desktop app: director chat, script, storyboard, image lab and timeline."
            />
            <RegTicks />
            <span className="u-mono absolute bottom-3 left-4">Aurea · captured live</span>
          </div>
        </div>
      </section>

      {/* Tool two — Cinevido. Mirrored, charcoal CTA (one lit button per screen). */}
      <section className="px-8 pt-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[7fr_5fr]">
          <div data-reveal className="u-slab relative order-last aspect-[8/5] md:order-first">
            <ScrubVideo
              src="/media/cinevido-scrub.mp4"
              poster="/media/cinevido-poster.jpg"
              className="h-full w-full object-cover"
              label="A scroll-driven tour of Cinevido in the browser: gallery, 3D viewer and model lineup."
            />
            <RegTicks />
            <span className="u-mono absolute bottom-3 left-4">Cinevido · in the browser</span>
          </div>
          <div data-reveal>
            <p className="u-mono">Tool two · browser</p>
            <h2 className="u-display mt-3 text-5xl md:text-6xl">CINEVIDO</h2>
            <p className="mt-5 max-w-md text-pumice/80">
              The studio that runs in your browser. The same pipeline, nothing to
              install.
            </p>
            <Ticks
              items={[
                { title: "Generate from a prompt, refine in place", detail: "generate" },
                { title: "Gallery of every take, nothing lost", detail: "library" },
                { title: "Interactive 3D viewer", detail: "inspect" },
                { title: "A lineup of models, one surface", detail: "engines" },
              ]}
            />
            <div className="mt-8">
              <SpecRow items={["Browser · webapp", "No install"]} status="molten" />
            </div>
            <Link
              to="/tools/cinevido"
              data-magnetic
              className="group mt-10 inline-flex items-baseline gap-3 border border-charcoal px-6 py-4 text-pumice no-underline transition-colors hover:border-ember"
            >
              <span className="u-mono !text-ember">Survey Cinevido</span>
              <span className="text-ember transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* The pipeline strip — the shared spine, drawn as a thin ember line. */}
      <section className="px-8 pt-36">
        <div data-reveal className="mx-auto max-w-6xl">
          <p className="u-mono text-ember">The pipeline</p>
          <p className="mt-4 max-w-xl text-pumice/80">
            Both tools run the same spine. Start anywhere, hand off anywhere.
          </p>
          <div className="relative mt-10">
            <div
              className="absolute left-0 right-0 top-[3px] h-px"
              style={{
                background:
                  "linear-gradient(90deg, var(--color-ember), rgba(255,85,31,0.15))",
              }}
              aria-hidden
            />
            <ol className="relative grid grid-cols-3 gap-y-8 sm:grid-cols-6">
              {PIPELINE.map((stage, i) => (
                <li key={stage} className="pr-4">
                  <span
                    className="block h-[7px] w-[7px] rounded-full"
                    style={{
                      background: "var(--color-ember)",
                      boxShadow: "0 0 8px rgba(255,85,31,0.7)",
                      opacity: 1 - i * 0.12,
                    }}
                    aria-hidden
                  />
                  <span className="u-mono mt-3 block">
                    {String(i + 1).padStart(2, "0")} · {stage}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Proof band — the numbers, then the show that proves them. */}
      <section className="px-8 pb-32 pt-32">
        <div data-reveal className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-3">
            <Stat label="Render hardware" value="1×" unit="RTX 3090 Ti" />
            <Stat label="Video engines" value="3" unit="local + api" />
            {/* Was `unit="zoologic"` — the show is unannounced, so the number
                stands on its own until it has a name to carry. */}
            <Stat label="Characters on screen" value="10" unit="one series" />
          </div>
          <div className="mt-14 flex flex-wrap items-baseline gap-x-10 gap-y-6 border-t border-charcoal pt-10">
            <p className="max-w-md text-pumice/80">
              Not a demo reel. Our first show is being cut, voiced and scored
              with these tools right now.
            </p>
            <span className="flex items-baseline gap-6">
              {/* Unannounced: it gets its title here the day it releases. */}
              <span className="u-mono">Original series · in production</span>
              <Link to="/studio" data-magnetic className="u-mono !text-ember no-underline">
                The studio →
              </Link>
            </span>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
