import { create } from "zustand";

/**
 * The score. Real tracks, streamed from R2, sitting UNDER the synthesised
 * geological bed in `sound.ts` — the bed is the room, this is the music in it.
 *
 * Why a bare <audio> element and not a WebAudio node:
 *
 *   CORS. Routing a cross-origin media element through an AudioContext taints
 *   the graph unless the origin sends `Access-Control-Allow-Origin` AND the
 *   element sets `crossOrigin`. Get either wrong and the element plays SILENCE
 *   with no error anywhere — the worst possible failure for a thing whose only
 *   symptom is "no sound". An element driven by its own `.volume` needs no CORS
 *   at all, and everything the score actually wants (fades, ducking with scroll
 *   depth) is a gain ramp, which `.volume` does perfectly well.
 *
 * The tracks are never preloaded: `preload="none"` until the visitor asks for
 * sound, so a page that is already spending its budget on WebGL and footage
 * does not also pull megabytes of audio nobody switched on.
 */

const CDN = "https://pub-01f248851ba744928d24bbbef8159f8f.r2.dev";

export type Track = { title: string; artist?: string; file: string };

export const TRACKS: Track[] = [
  { title: "A Moment of Love", artist: "ZISO", file: "A Moment of Love - ZISO.mp3" },
  { title: "Just Watch", artist: "Instrumental", file: "Just Watch (Instrumental Version).mp3" },
  { title: "Late Night Dreams", file: "Late Night Dreams.mp3" },
];

const url = (t: Track) => `${CDN}/${encodeURIComponent(t.file)}`;

/** Ceiling for the score. Under the copy, never over it. */
const LEVEL = 0.32;
/** Long fades — the same geological mass as everything else on the page. */
const FADE_IN = 2.4;
const FADE_OUT = 0.7;
/**
 * Seconds of no forward progress before a cue is written off. A stalled R2
 * object is the one failure the element reports NOTHING for: no `error`, no
 * `ended`, just `networkState = LOADING` and a clock that never moves. Without
 * this the score dies mid-set and never comes back.
 */
const STALL_LIMIT = 12;

type MusicState = {
  /** Index into TRACKS, or -1 before the first track is chosen. */
  index: number;
  playing: boolean;
  next: () => void;
};

export const useMusicStore = create<MusicState>((_set, get) => ({
  index: -1,
  playing: false,
  next: () => {
    if (get().index < 0) return;
    play((get().index + 1) % TRACKS.length);
  },
}));

let el: HTMLAudioElement | null = null;
/** 0..1 scroll depth — the descent lifts the score slightly. */
let depth = 0;
/** Where the fade is heading, as a fraction of the depth-corrected ceiling. */
let target = 0;
let raf = 0;
let last = 0;
/** Stall watchdog: a 1s interval, because rAF is frozen in a hidden tab and a
 *  backgrounded tab is exactly where a stall goes unnoticed longest. */
let watchdog = 0;
let seen = -1;
let stuck = 0;
/** Cues abandoned back-to-back without a single second of audio between them. */
let dead = 0;

function ceiling() {
  return LEVEL * (0.82 + depth * 0.18);
}

function pump(now: number) {
  raf = 0;
  if (!el) return;
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  const want = target * ceiling();
  const rate = want > el.volume ? 1 / FADE_IN : 1 / FADE_OUT;
  const step = rate * ceiling() * dt;
  const v = want > el.volume ? Math.min(want, el.volume + step) : Math.max(want, el.volume - step);
  el.volume = Math.min(1, Math.max(0, v));

  if (target === 0 && el.volume <= 0.0005) {
    el.pause();
    unwatch();
    useMusicStore.setState({ playing: false });
    return;
  }
  if (Math.abs(el.volume - want) > 0.0005 || target > 0) {
    raf = requestAnimationFrame(pump);
  }
}

function schedule() {
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(pump);
}

function unwatch() {
  if (!watchdog) return;
  clearInterval(watchdog);
  watchdog = 0;
}

/**
 * Advance if the current cue has stopped making progress. `paused` counts as
 * stalled too: while the score is meant to be running there is no legitimate
 * paused state, so a cue the browser dropped (or one whose `ended` never
 * arrived) is picked up here instead of hanging the rest of the set.
 */
function watch() {
  if (watchdog) return;
  seen = -1;
  stuck = 0;
  watchdog = window.setInterval(() => {
    if (!el || target === 0) return;
    if (!el.paused && el.currentTime > seen + 0.05) {
      seen = el.currentTime;
      stuck = 0;
      dead = 0;
      return;
    }
    if ((stuck += 1) < STALL_LIMIT) return;
    seen = -1;
    stuck = 0;
    // Two full passes with nothing audible means the CDN is gone, not that one
    // object is bad. Stop, rather than re-request the whole set every 12s
    // forever; the switch is still lit, so the visitor can ask again.
    if ((dead += 1) > TRACKS.length * 2) {
      musicDisable();
      return;
    }
    useMusicStore.getState().next();
  }, 1000);
}

function ensure(): HTMLAudioElement {
  if (el) return el;
  const a = new Audio();
  a.preload = "none";
  a.volume = 0;
  // One track at a time, advanced by hand — `loop` would trap the visitor on
  // whichever cue happened to come up first.
  a.addEventListener("ended", () => {
    dead = 0;
    useMusicStore.getState().next();
  });
  // A dead CDN object must not silence the whole score: skip to the next cue.
  a.addEventListener("error", () => {
    const i = useMusicStore.getState().index;
    if (i >= 0 && target > 0) play((i + 1) % TRACKS.length);
  });
  el = a;
  return a;
}

function play(index: number) {
  const a = ensure();
  // No `currentTime = 0` here: assigning `src` only QUEUES the load algorithm,
  // so a seek on this tick still lands on the outgoing track. A fresh source
  // starts at zero on its own.
  a.src = url(TRACKS[index]);
  a.volume = 0;
  useMusicStore.setState({ index, playing: true });
  target = 1;
  seen = -1;
  stuck = 0;
  // Rejects if the gesture has expired or the object 404s — the error handler
  // above moves on, and a silent catch here keeps it out of the console.
  void a.play().catch(() => {});
  schedule();
  watch();
}

/** Start (or resume) the score. Must be called from a user gesture. */
export function musicEnable() {
  const i = useMusicStore.getState().index;
  if (i < 0) {
    // Which cue opens is deliberately not fixed — a returning visitor should
    // not get the same eight bars every single time.
    play(Math.floor(Math.random() * TRACKS.length));
    return;
  }
  const a = ensure();
  target = 1;
  useMusicStore.setState({ playing: true });
  void a.play().catch(() => {});
  schedule();
  watch();
}

export function musicDisable() {
  if (!el) return;
  target = 0;
  schedule();
}

/** Descent coupling, mirroring `setSoundDepth` in sound.ts. */
export function setMusicDepth(d: number) {
  depth = Math.min(Math.max(d, 0), 1);
  if (target > 0) schedule();
}
