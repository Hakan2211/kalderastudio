import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "#/components/site/SiteFooter";
import { SiteNav } from "#/components/site/SiteNav";
import { ScrubVideo } from "#/components/site/ScrubVideo";
import { RegTicks, SpecRow, Stat, StatusDot, useReveals } from "#/components/tools/kit";

export const Route = createFileRoute("/tools/aurea")({
  component: AureaPage,
  head: () => ({
    meta: [
      { title: "Aurea: the desktop studio for cinematic AI video" },
      {
        name: "description",
        content:
          "Aurea is Kaldera's desktop studio: director chat, cast-true storyboards, three render engines on your own GPU, plus image, voice and music labs. Proven in production on our own original series.",
      },
    ],
  }),
});

/**
 * The build. Everything the download button says lives here, so shipping a new
 * version is one edit in one place.
 *
 * Facts taken from the app repo's own packaging config
 * (apps/desktop/electron-builder.yml): the only target is `nsis`, so Windows
 * only, and `forceCodeSigning: false` means the installer is unsigned and
 * SmartScreen will say so. The page says both out loud rather than letting a
 * visitor discover them at the security prompt.
 *
 * `href` points at the releases page rather than a pinned asset filename, so a
 * new version does not 404 the button. Swap it for the direct
 * `.../releases/download/vX/Aurea-Setup-X.exe` asset URL if you would rather
 * the click start the file immediately.
 */
const BUILD = {
  href: "https://github.com/Hakan2211/aurea/releases/latest",
  version: "0.0.1",
  platform: "Windows · 64-bit",
  size: "NSIS installer",
};

/* DIRECT / BOARD / RENDER — the pipeline as three numbered moves. */
const MOVES = [
  {
    n: "01",
    title: "DIRECT",
    body: "Describe the scene; the director chat argues back, writes coverage and hands the writers room a script. Formats keep a running show repeatable: seed a new episode from the shape of the last.",
    meta: "director chat · writers room · formats",
  },
  {
    n: "02",
    title: "BOARD",
    body: "Storyboards with real cinematography: lens, blocking, light. Keyframes stay on-model because the cast lives in the bible: reference decks and character sheets the boards draw from every time.",
    meta: "storyboard · cinematography · bible",
  },
  {
    n: "03",
    title: "RENDER",
    body: "Three engines behind one queue, running on the GPU under your desk. Draft fast, then commit: keyframes, end-frames, native audio, upscale. The queue keeps the history of every take.",
    meta: "3 engines · job history · upscale",
  },
] as const;

const ENGINES = [
  {
    name: "LTX 2.3",
    kind: "Local · image-to-video",
    specs: ["Keyframes + end-frames", "Audio-driven lipsync (ia2v)", "48 fps · draft mode · LoRA slots"],
    status: "molten" as const,
  },
  {
    name: "MINIMAX H3",
    kind: "Local · native audio",
    specs: ["Picture and sound in one pass", "Reference head: stills, clips, sounds", "AAC stereo out of the box"],
    status: "molten" as const,
  },
  {
    name: "SEEDANCE 2.0",
    kind: "API · text-to-video",
    specs: ["Text straight to motion", "No start frame required", "2K delivery"],
    status: "molten" as const,
  },
];

/**
 * The interface tour. The slab beside this list is one continuous capture of
 * the real app, so the rooms are listed in the order the footage walks them —
 * the reader's eye and the scrub stay in step.
 */
const PANELS = [
  {
    room: "DIRECTOR",
    where: "Chat left, scene right",
    body: "You talk to the director in plain language. It pushes back, proposes coverage, and writes the result straight into the scene beside it. No prompt syntax, no weights, no parentheses.",
  },
  {
    room: "STUDIO",
    where: "The script, in full",
    body: "Scenes, beats and dialogue in one editable document. Change a line here and everything downstream knows what changed: boards, keyframes, voice.",
  },
  {
    room: "STORYBOARD",
    where: "A board of shots",
    body: "Every shot is a card with a lens, a blocking note and a light. The cast comes out of the bible, so a face stays the same face from the first card to the last.",
  },
  {
    room: "IMAGE LAB",
    where: "Decks and sheets",
    body: "Set plates, reference decks, character sheets. Generate, then edit the result in a second pass, the way you'd retouch rather than re-roll.",
  },
  {
    room: "VOICE · MUSIC",
    where: "Sound, same window",
    body: "Cast voices read the lines. Score cues are generated to length and mood. Nothing leaves the app to get its audio.",
  },
  {
    room: "QUEUE · TIMELINE",
    where: "Jobs and the cut",
    body: "One queue for all three render engines, with the full history of every take, and a timeline that assembles them into the sequence you actually deliver.",
  },
] as const;

/** What comes out the other end — outputs, not features. */
const OUTPUTS = [
  { title: "Episodes", body: "A running series with a fixed cast and reusable sets, season after season." },
  { title: "Short films", body: "Scripted scenes with coverage, cut and scored end to end." },
  { title: "Music videos", body: "Beat-driven sequences with generated score or your own track." },
  { title: "Ads & trailers", body: "Short-form spots and title sequences, on-brand and on-model." },
  { title: "Character scenes", body: "Talking performances with lipsync driven by real audio." },
  { title: "Key art & covers", body: "Posters, album art and stills chained off the same references." },
] as const;

const LABS = [
  {
    name: "IMAGE LAB",
    body: "Reference decks, character sheets, set plates. Two-pass generate-then-edit keeps a face the same face across a season.",
    meta: "refs · decks · sheets",
  },
  {
    name: "VOICE LAB",
    body: "Text-to-speech through cast voices, voice conversion with automatic pitch match. Every character reads their own lines.",
    meta: "tts · conversion · pitch match",
  },
  {
    name: "MUSIC LAB",
    body: "Score cues generated to length and mood, cover art chained straight off the track.",
    meta: "score · cues · cover art",
  },
  {
    name: "FORMATS & BIBLE",
    body: "The canon store: cast, sets, running gags, episode shapes. New work inherits the world instead of re-describing it.",
    meta: "canon · formats · continuity",
  },
];

/**
 * The argument against the node graph, drawn rather than asserted. Left: what
 * a wired-up graph costs you before you have made a single frame. Right: the
 * same job as three rooms you can name. Inline SVG on the page's own tokens so
 * it costs nothing and stays legible against obsidian.
 */
function GraphVsRooms() {
  return (
    <svg
      viewBox="0 0 640 220"
      className="h-auto w-full"
      role="img"
      aria-label="A tangle of wired nodes on the left, versus three clearly named panels on the right."
    >
      {/* ── Left: the tangle ── */}
      <g stroke="var(--color-ash)" strokeWidth="1" fill="none" opacity="0.85">
        <path d="M74 58 C 130 58, 118 112, 172 112" />
        <path d="M74 96 C 132 96, 120 44, 172 44" />
        <path d="M74 134 C 140 134, 130 168, 186 168" />
        <path d="M226 44 C 268 44, 250 130, 292 130" />
        <path d="M226 112 C 262 112, 268 62, 292 62" />
        <path d="M240 168 C 276 168, 270 96, 292 96" />
        <path d="M74 172 C 120 172, 104 76, 172 76" />
      </g>
      {[
        [30, 46],
        [30, 84],
        [30, 122],
        [30, 160],
        [172, 32],
        [172, 64],
        [172, 100],
        [186, 156],
        [292, 50],
        [292, 84],
        [292, 118],
      ].map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="44"
          height="24"
          rx="2"
          fill="var(--color-basalt)"
          stroke="var(--color-charcoal)"
        />
      ))}
      <text
        x="30"
        y="206"
        fill="var(--color-ash-lit)"
        fontFamily="var(--font-mono)"
        fontSize="11"
        letterSpacing="2"
      >
        NODE GRAPHS
      </text>

      {/* The divider — the wall between the two ways of working. */}
      <line x1="368" y1="24" x2="368" y2="196" stroke="var(--color-charcoal)" />

      {/* ── Right: three rooms ── */}
      {[
        { y: 32, label: "DIRECT" },
        { y: 84, label: "BOARD" },
        { y: 136, label: "RENDER" },
      ].map(({ y, label }, i) => (
        <g key={label}>
          <rect
            x="410"
            y={y}
            width="200"
            height="38"
            rx="2"
            fill="var(--color-basalt)"
            stroke="var(--color-ember)"
            strokeOpacity={0.55 - i * 0.12}
          />
          <text
            x="426"
            y={y + 24}
            fill="var(--color-pumice)"
            fontFamily="var(--font-mono)"
            fontSize="12"
            letterSpacing="2"
          >
            {label}
          </text>
        </g>
      ))}
      {/* One straight line down, because that is the whole point. */}
      <path
        d="M510 70 L510 84 M510 122 L510 136"
        stroke="var(--color-ember)"
        strokeWidth="1"
        opacity="0.7"
      />
      <text
        x="410"
        y="206"
        fill="var(--color-ember)"
        fontFamily="var(--font-mono)"
        fontSize="11"
        letterSpacing="2"
      >
        AUREA
      </text>
    </svg>
  );
}

function AureaPage() {
  const ref = useReveals();

  return (
    <main id="main" ref={ref} className="relative min-h-screen bg-obsidian text-pumice">
      <SiteNav />

      {/* Hero */}
      <section className="px-8 pt-44">
        <div className="mx-auto max-w-6xl">
          <p className="u-mono text-ember">The forge · tool one</p>
          <h1 className="u-display mt-5 text-6xl sm:text-8xl md:text-9xl">AUREA</h1>
          <p className="mt-8 max-w-2xl text-lg text-pumice/80">
            The desktop studio for cinematic AI video. It installs on your
            machine, runs local models on your own GPU, and takes a scene from
            an argument in chat to a finished, scored take, with no node
            graph, no cloud queue and no per-second bill.
          </p>
          <div className="mt-10">
            <SpecRow
              items={[
                "Desktop app · Electron",
                "Local models · your GPU",
                "Works offline",
                "Made for series, not clips",
              ]}
              status="molten"
            />
          </div>

          {/* The download is the page's reason to exist, so it sits with the
              hero rather than at the bottom of the tour. */}
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-5">
            <a
              href={BUILD.href}
              data-magnetic
              className="group inline-flex items-baseline gap-3 border border-ember/60 px-7 py-4 text-pumice no-underline transition-colors hover:border-ember"
              style={{ boxShadow: "0 0 28px -8px rgba(255,85,31,0.5)" }}
            >
              <span className="u-mono !text-ember">Download Aurea</span>
              <span className="text-ember transition-transform group-hover:translate-y-0.5">
                ↓
              </span>
            </a>
            <div className="u-mono">
              <div>
                {BUILD.platform} · v{BUILD.version}
              </div>
              {/* Unsigned dev build: say so here, not at the security prompt. */}
              <div className="mt-1 opacity-55">
                {BUILD.size} · unsigned build, SmartScreen will warn
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* The slab: real footage, full width. */}
      <section className="px-8 pt-20">
        <div data-reveal className="mx-auto max-w-6xl">
          <div className="u-slab relative aspect-[8/5]">
            <ScrubVideo
              src="/media/aurea-scrub.mp4"
              poster="/media/aurea-poster.jpg"
              className="h-full w-full object-cover"
              label="A scroll-driven tour of the Aurea desktop app: director chat, script, storyboard, image lab and timeline."
            />
            <RegTicks />
          </div>
          <p className="u-mono mt-3 flex justify-between">
            <span>Captured from the live app · not a mockup</span>
            <span className="hidden sm:inline">Scroll to scrub</span>
          </p>
        </div>
      </section>

      {/* ── THE INTERFACE. The footage is pinned beside the list so the reader
          walks the rooms and the capture walks with them: one scroll, two
          halves of the same tour. ── */}
      <section className="px-8 pt-32">
        <div className="mx-auto max-w-6xl">
          <div data-reveal>
            <p className="u-mono text-ember">The interface</p>
            <h2 className="u-display u-h2 mt-4">ONE WINDOW, SIX ROOMS</h2>
            <p className="u-lede mt-5 !max-w-[48ch]">
              Aurea is laid out like a studio, not like a circuit board. Every
              room is a place you can name, and the work moves between them in
              one direction, the way a production actually runs.
            </p>
          </div>

          <div className="mt-14 grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <div data-reveal className="u-slab relative aspect-[16/10]">
                <ScrubVideo
                  src="/media/aurea-scrub.mp4"
                  poster="/media/aurea-poster.jpg"
                  className="h-full w-full object-cover"
                  label="The Aurea window moving through its rooms: director chat, script, storyboard, image lab, labs and timeline."
                />
                <RegTicks />
              </div>
              <p className="u-mono mt-3">
                The real window · scrub through the rooms as you read
              </p>
            </div>

            <ol className="border-t border-charcoal">
              {PANELS.map(({ room, where, body }, i) => (
                <li key={room} data-reveal className="border-b border-charcoal py-7">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="u-display text-2xl">{room}</h3>
                    <span className="u-mono !text-ember">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="u-mono mt-2">{where}</p>
                  <p className="mt-4 text-sm leading-relaxed text-pumice/75">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── NOT A NODE GRAPH. The objection everyone arrives with, answered
          before the feature list rather than after it. ── */}
      <section className="px-8 pt-32">
        <div className="mx-auto max-w-6xl">
          <div data-reveal>
            <p className="u-mono text-ember">The difference</p>
            <h2 className="u-display u-h2 mt-4">NO NODES. NO SPAGHETTI.</h2>
          </div>

          <div className="mt-8 grid gap-10 md:grid-cols-2">
            <p data-reveal className="u-lede">
              A node graph makes you build the machine before you make the shot.
              Aurea already is the machine.
            </p>
            <p data-reveal className="text-sm leading-relaxed text-pumice/75">
              There is nothing to wire, no sampler to tune, no custom node to
              install at midnight because a workflow you downloaded expects it.
              You write, you board, you render. The pipeline underneath is the
              same pipeline a graph would give you. We just built it once, in
              production, so you never have to.
            </p>
          </div>

          {/* The diagram gets the full column: at half width the node tangle
              collapses into a smudge and the labels drop under legible size. */}
          <div data-reveal className="mt-12 border border-charcoal bg-basalt p-8 md:p-12">
            <GraphVsRooms />
            <p className="u-mono mt-8 border-t border-charcoal/60 pt-5">
              Same pipeline · one of them is already assembled
            </p>
          </div>
        </div>
      </section>

      {/* ── ONE GPU. The studio's whole thesis, stated on the tool's own page:
          the constraint is not a limitation to apologise for, it is the proof
          the thing works. ── */}
      <section className="px-8 pt-32">
        <div className="mx-auto max-w-6xl">
          <div
            data-reveal
            className="relative overflow-hidden border border-charcoal px-8 py-14 md:px-14"
          >
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden
              style={{
                background:
                  "radial-gradient(100% 130% at 12% 130%, rgba(140,29,4,0.34), rgba(255,85,31,0.07) 46%, transparent 70%)",
              }}
            />
            <div className="relative">
              <p className="u-mono text-ember">One machine</p>
              <h2 className="u-display u-h2 mt-4 max-w-3xl">
                ONE GPU IS ENOUGH.
              </h2>
              <p className="u-lede mt-5 !max-w-[52ch]">
                Everything on this site was rendered on a single RTX 3090 Ti
                sitting under a desk: every frame of the series in production,
                every capture above. Not a farm. Not a cluster. One card.
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-pumice/75">
                Aurea is built for exactly that machine. The models run locally,
                so your footage never leaves the room, nothing is metered by the
                second, and the app keeps working when the internet does not.
                Draft at speed, commit when the take is right, and let the queue
                run overnight. The results are the ones you have been watching.
              </p>

              <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Render hardware" value="1×" unit="RTX 3090 Ti" />
                <Stat label="Runs" value="100%" unit="on your machine" />
                <Stat label="Cloud credits" value="0" unit="none, ever" />
                <Stat label="Delivery" value="2K" unit="24 / 48 fps" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT IT MAKES. Outputs, not features — the question a visitor
          actually arrived with. ── */}
      <section className="px-8 pt-32">
        <div className="mx-auto max-w-6xl">
          <div data-reveal>
            <p className="u-mono text-ember">What it makes</p>
            <h2 className="u-display u-h2 mt-4">FROM A LINE TO A CUT</h2>
          </div>
          <div className="mt-10 grid gap-px border border-charcoal bg-charcoal sm:grid-cols-2 lg:grid-cols-3">
            {OUTPUTS.map(({ title, body }) => (
              <article key={title} data-reveal className="bg-obsidian p-7">
                <h3 className="u-display text-xl">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-pumice/75">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* DIRECT / BOARD / RENDER */}
      <section className="px-8 pt-32">
        <div className="mx-auto max-w-6xl">
          <p data-reveal className="u-mono text-ember">
            How it moves
          </p>
          <div className="mt-10 grid gap-px overflow-hidden border border-charcoal bg-charcoal md:grid-cols-3">
            {MOVES.map(({ n, title, body, meta }) => (
              <article key={n} data-reveal className="bg-basalt p-8">
                <div className="flex items-baseline justify-between">
                  <h2 className="u-display text-3xl">{title}</h2>
                  <span className="u-mono !text-ember">{n}</span>
                </div>
                <p className="mt-5 text-sm leading-relaxed text-pumice/75">{body}</p>
                <p className="u-mono mt-6 border-t border-charcoal/60 pt-4">{meta}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Engine strip — specimen cards. */}
      <section className="px-8 pt-32">
        <div className="mx-auto max-w-6xl">
          <div data-reveal className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="u-mono text-ember">The engines</p>
            <p className="u-mono">One queue · your GPU is the magma chamber</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {ENGINES.map(({ name, kind, specs, status }) => (
              <article
                key={name}
                data-reveal
                data-magnetic
                className="border border-charcoal bg-obsidian p-7 transition-colors hover:border-ember/70"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="u-display text-2xl">{name}</h2>
                  <StatusDot state={status} />
                </div>
                <p className="u-mono mt-2 !text-ember">{kind}</p>
                <ul className="mt-6 space-y-2.5">
                  {specs.map((s) => (
                    <li key={s} className="flex items-baseline gap-3 text-sm text-pumice/75">
                      <span className="text-[7px] text-ember" aria-hidden>
                        ◆
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* The labs */}
      <section className="px-8 pt-32">
        <div className="mx-auto max-w-6xl">
          <p data-reveal className="u-mono text-ember">
            The labs
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {LABS.map(({ name, body, meta }) => (
              <article key={name} data-reveal className="border border-charcoal bg-basalt p-8">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="u-display text-2xl">{name}</h2>
                  <span className="u-mono hidden sm:inline">{meta}</span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-pumice/75">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Status band — the one gradient moment + the page's lit CTA. */}
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
              Aurea is still in the forge, cutting our own series in
              production right now. What you saw above is the working tool, not
              a trailer.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              {/* The visitor who read the whole page should not have to scroll
                  back up to act on it. */}
              <a
                href={BUILD.href}
                data-magnetic
                className="group inline-flex items-baseline gap-3 border border-ember/60 px-6 py-4 text-pumice no-underline transition-colors hover:border-ember"
                style={{ boxShadow: "0 0 24px -8px rgba(255,85,31,0.45)" }}
              >
                <span className="u-mono !text-ember">Download Aurea</span>
                <span className="u-mono opacity-50">{BUILD.platform}</span>
                <span className="text-ember transition-transform group-hover:translate-y-0.5">
                  ↓
                </span>
              </a>
              {/* The show is unannounced, so the studio page carries the story
                  until it has a door of its own. */}
              <Link to="/studio" data-magnetic className="u-mono !text-pumice no-underline">
                Meet the studio →
              </Link>
              <Link to="/tools" data-magnetic className="u-mono !text-pumice no-underline">
                ← Back to the forge
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
