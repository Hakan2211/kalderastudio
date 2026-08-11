import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AmbientLoop } from "#/components/site/AmbientLoop";

/**
 * Scene 5 — THE PROOF STRIP (PRD §4).
 *
 * A pinned section that scrolls sideways through the pipeline, three shots
 * deep. Each shot is the SAME set at three stages, so the argument makes
 * itself with no explanatory copy: an empty plate, the same plate with the
 * cast staged into it, then the frame moving. The captions only name the
 * tool that did each step.
 *
 * Everything here is real production output from the Zoologic debate scenes —
 * the plates and boards came out of Aurea's Image lab, the renders out of
 * LTX 2.3 on the 3090 Ti. Nothing is a mockup, which is the whole point of
 * the section.
 */

type Stage = {
  stage: string;
  tool: string;
  /** `image` cells are stills; the third cell of each shot moves. */
  kind: "image" | "video";
  src: string;
  poster?: string;
  alt: string;
};

type Shot = { id: string; title: string; meta: string; stages: Stage[] };

const SHOTS: Shot[] = [
  {
    id: "01",
    title: "The Coffee Fund",
    meta: "Breakroom · three-hander",
    stages: [
      {
        stage: "Plate",
        tool: "Krea2 · text-to-image",
        kind: "image",
        src: "/media/proof-01-plate.webp",
        alt: "An empty office breakroom in warm afternoon light: the bare set plate.",
      },
      {
        stage: "Board",
        tool: "Qwen-Image-Edit · cast refs",
        kind: "image",
        src: "/media/proof-01-board.webp",
        alt: "The same breakroom with three characters staged into it.",
      },
      {
        stage: "Render",
        tool: "LTX 2.3 · image-to-video",
        kind: "video",
        src: "/media/proof-01-render.mp4",
        poster: "/media/proof-01-render-poster.webp",
        alt: "The breakroom shot, animated: three characters talking over coffee.",
      },
    ],
  },
  {
    id: "02",
    title: "The Committee",
    meta: "Meeting room · four-hander",
    stages: [
      {
        stage: "Plate",
        tool: "Krea2 · text-to-image",
        kind: "image",
        src: "/media/proof-02-plate.webp",
        alt: "An empty meeting room in cool daylight: the bare set plate.",
      },
      {
        stage: "Board",
        tool: "Qwen-Image-Edit · contact sheet",
        kind: "image",
        src: "/media/proof-02-board.webp",
        alt: "The same meeting room with four characters seated around the table.",
      },
      {
        stage: "Render",
        tool: "LTX 2.3 · image-to-video",
        kind: "video",
        src: "/media/proof-02-render.mp4",
        poster: "/media/proof-02-render-poster.webp",
        alt: "The meeting-room shot, animated: four characters around the table.",
      },
    ],
  },
  {
    id: "03",
    title: "The Loft",
    meta: "Evening loft · five-hander",
    stages: [
      {
        stage: "Plate",
        tool: "Krea2 · text-to-image",
        kind: "image",
        src: "/media/proof-03-plate.webp",
        alt: "An empty warehouse loft strung with festoon lights: the bare set plate.",
      },
      {
        stage: "Board",
        tool: "Qwen-Image-Edit · chained passes",
        kind: "image",
        src: "/media/proof-03-board.webp",
        alt: "The same loft with five characters staged across the room.",
      },
      {
        stage: "Render",
        tool: "LTX 2.3 · image-to-video",
        kind: "video",
        src: "/media/proof-03-render.mp4",
        poster: "/media/proof-03-render-poster.webp",
        alt: "The loft shot, animated: five characters mid-argument.",
      },
    ],
  },
];

/** Corner registration ticks — the survey-board motif from the moodboards. */
function Registration() {
  const corner = "pointer-events-none absolute h-2 w-2 border-ember/70";
  return (
    <>
      <span className={`${corner} left-0 top-0 border-l border-t`} />
      <span className={`${corner} right-0 top-0 border-r border-t`} />
      <span className={`${corner} bottom-0 left-0 border-b border-l`} />
      <span className={`${corner} bottom-0 right-0 border-b border-r`} />
    </>
  );
}

function Frame({ stage, index }: { stage: Stage; index: number }) {
  return (
    // Sized off the SHORT axis as well as the long one: the strip lives inside
    // a pinned viewport, so a frame that only respects vw goes off the bottom
    // on a laptop and leaves half the screen empty on a tall monitor.
    <figure className="m-0 w-[clamp(232px,min(30vw,58vh),480px)] shrink-0">
      <div className="relative border border-charcoal bg-basalt">
        <Registration />
        <div className="relative aspect-[896/704] overflow-hidden">
          {stage.kind === "video" ? (
            <AmbientLoop
              src={stage.src}
              poster={stage.poster}
              className="h-full w-full object-cover"
              label={stage.alt}
            />
          ) : (
            <img
              src={stage.src}
              alt={stage.alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          )}
          {/* The last cell is the one that moves — mark it. */}
          {stage.kind === "video" && (
            <span className="u-mono absolute right-2 top-2 flex items-center gap-1.5 !text-pumice">
              <span className="h-1.5 w-1.5 rounded-full bg-ember" />
              24 fps
            </span>
          )}
        </div>
      </div>
      <figcaption className="mt-3">
        <div className="u-mono !text-pumice">
          <span className="!text-ember">{String(index + 1).padStart(2, "0")}</span> · {stage.stage}
        </div>
        <div className="u-mono mt-1 opacity-55">{stage.tool}</div>
      </figcaption>
    </figure>
  );
}

/** The ember hairline that joins one stage to the next inside a shot. */
function StageLink() {
  return (
    <div className="flex w-8 shrink-0 items-center self-start pt-[18%] md:w-12" aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-ember/10 via-ember/60 to-ember/10" />
      <span className="-ml-1 text-[10px] leading-none text-ember">▸</span>
    </div>
  );
}

export function ProofStrip({ reduced: reducedProp }: { reduced?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  // The pin is the only way to travel this section, so a visitor who never
  // gets the tween must never get the pinned markup either — otherwise the
  // last six frames sit outside an `overflow: hidden` box with no way in.
  // Decided here rather than trusting the caller's prop.
  const [flat, setFlat] = useState(!!reducedProp);
  useEffect(() => {
    if (reducedProp || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFlat(true);
    }
  }, [reducedProp]);

  useEffect(() => {
    if (flat) return;
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Travel is measured, not guessed: the strip is fluid (clamp widths), so
      // the pin duration has to be recomputed on every refresh or the section
      // either cuts the last frame off or holds on an empty rail.
      const travel = () => Math.max(0, track.scrollWidth - window.innerWidth + 64);

      const tween = gsap.to(track, {
        x: () => -travel(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${travel()}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress})`;
          },
        },
      });

      return () => tween.scrollTrigger?.kill();
    }, section);

    return () => ctx.revert();
  }, [flat]);

  const shots = SHOTS.map((shot) => (
    <div key={shot.id} className="flex shrink-0 flex-col gap-5">
      <div className="flex items-baseline gap-3">
        <span className="u-display text-2xl text-ember">{shot.id}</span>
        <span className="u-mono !text-pumice">{shot.title}</span>
        <span className="u-mono opacity-45">{shot.meta}</span>
      </div>
      <div className="flex items-start">
        {shot.stages.map((stage, i) => (
          <div key={stage.stage} className="flex items-start">
            {i > 0 && <StageLink />}
            <Frame stage={stage} index={i} />
          </div>
        ))}
      </div>
    </div>
  ));

  // Reduced-motion / tier C: the same content as an honest scrollable rail.
  if (flat) {
    return (
      <section className="relative z-20 border-t border-charcoal bg-obsidian px-8 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="u-mono text-ember">The proof</p>
          <h2 className="u-display mt-4 text-4xl text-pumice md:text-6xl">
            ONE SHOT, THREE STAGES
          </h2>
          <div className="u-strip mt-10 flex gap-16 overflow-x-auto pb-6">{shots}</div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      aria-label="The proof strip: one shot at three stages of the pipeline"
      className="relative z-20 h-screen overflow-hidden border-t border-charcoal bg-obsidian"
    >
      <div className="flex h-full flex-col justify-center">
        <div className="px-8 pt-20">
          <p className="u-mono text-ember">The proof</p>
          <h2 className="u-display mt-3 text-4xl text-pumice md:text-6xl">
            ONE SHOT, THREE STAGES
          </h2>
        </div>

        {/* The rail. `will-change` is set on the tweened node only. */}
        <div
          ref={trackRef}
          className="mt-8 flex gap-20 px-8 md:gap-28"
          style={{ willChange: "transform" }}
        >
          {shots}
        </div>

        <div className="mt-8 flex items-center gap-4 px-8 pb-10">
          <span className="u-mono shrink-0">Pipeline</span>
          <span className="relative h-px flex-1 bg-charcoal">
            <span
              ref={barRef}
              className="absolute inset-0 origin-left bg-ember"
              style={{ transform: "scaleX(0)" }}
            />
          </span>
          <span className="u-mono shrink-0 opacity-45">Rendered on 1× RTX 3090 Ti</span>
        </div>
      </div>
    </section>
  );
}
