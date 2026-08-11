import { useEffect, useRef } from "react";
import gsap from "gsap";
import { TRACKS, useMusicStore } from "#/lib/music";
import { useScrollStore } from "#/lib/scroll-store";
import { setSoundDepth, useSoundStore } from "#/lib/sound";

/**
 * The sound switch (PRD §4): explicit, off by default, and honest about what
 * it is. Four bars that sit flat when muted and breathe when live — the same
 * "one lit thing" rule as the CTAs, so it reads as a state, not a button.
 *
 * It also owns the descent→sound coupling, because it is the only component
 * that knows whether the graph exists at all.
 *
 * Once the score is running the switch grows a second half: the cue that is
 * playing, and a skip. Credited by name because these are real tracks by real
 * people — an unattributed loop would be the one dishonest thing on the page.
 */
export function SoundToggle() {
  const enabled = useSoundStore((s) => s.enabled);
  const pending = useSoundStore((s) => s.pending);
  const toggle = useSoundStore((s) => s.toggle);
  const resume = useSoundStore((s) => s.resume);
  const hydrate = useSoundStore((s) => s.hydrate);
  const trackIndex = useMusicStore((s) => s.index);
  const skip = useMusicStore((s) => s.next);
  const barsRef = useRef<HTMLDivElement>(null);
  const track = trackIndex >= 0 ? TRACKS[trackIndex] : null;
  /** On AND actually making noise — `pending` is on-but-waiting for a gesture. */
  const live = enabled && !pending;

  useEffect(() => hydrate(), [hydrate]);

  // Scroll depth → filter cutoff. Subscribing outside React (no re-render per
  // frame) is the same rule the canvas follows.
  useEffect(() => {
    setSoundDepth(useScrollStore.getState().progress);
    return useScrollStore.subscribe((s) => setSoundDepth(s.progress));
  }, []);

  useEffect(() => {
    const root = barsRef.current;
    if (!root) return;
    const bars = Array.from(root.children) as HTMLElement[];
    if (!live) {
      gsap.killTweensOf(bars);
      gsap.to(bars, { scaleY: 0.18, duration: 0.35, ease: "power2.out" });
      return;
    }
    const tweens = bars.map((bar, i) =>
      gsap.to(bar, {
        scaleY: () => 0.35 + (i % 2 ? 0.5 : 0.35),
        duration: 0.6 + i * 0.17,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: i * 0.09,
      }),
    );
    return () => tweens.forEach((t) => t.kill());
  }, [live]);

  return (
    <div
      data-magnetic
      data-sound-switch
      className="flex items-stretch border border-charcoal bg-obsidian/70 backdrop-blur-sm transition-colors hover:border-ember"
    >
      <button
        type="button"
        onClick={pending ? resume : toggle}
        aria-pressed={live}
        aria-label={
          pending ? "Resume sound" : enabled ? "Turn sound off" : "Turn sound on"
        }
        className="group flex min-h-10 min-w-10 items-center justify-center gap-2.5 px-2.5 py-2 sm:min-h-0 sm:min-w-0 sm:justify-start sm:px-3"
      >
        <div ref={barsRef} className="flex h-3.5 items-center gap-[3px]">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="block h-3.5 w-[2px] origin-center"
              style={{
                background: live
                  ? "var(--color-ember)"
                  : pending
                    ? "var(--color-magma-deep)"
                    : "var(--color-ash)",
                transform: "scaleY(0.18)",
              }}
            />
          ))}
        </div>
        {/* Collapsed to bars-only on phones — the state is already carried by
            their colour and motion, and `aria-label` carries it for anyone the
            colour does not reach. */}
        <span className="u-mono hidden !text-pumice opacity-60 transition-opacity group-hover:opacity-100 sm:inline">
          {pending ? "Sound paused" : enabled ? "Sound on" : "Sound off"}
        </span>
      </button>

      {/* Skip only — the nav stays an instrument, not a now-playing bar. The
          cue is credited where credits belong, never in the chrome. */}
      {live && track ? (
        <button
          type="button"
          onClick={skip}
          aria-label="Skip to the next cue"
          title="Next cue"
          className="group hidden items-center gap-2 border-l border-charcoal px-3 py-2 sm:flex"
        >
          <span className="u-mono !text-ember opacity-80 transition-opacity group-hover:opacity-100">
            ▸▸
          </span>
        </button>
      ) : null}
    </div>
  );
}
