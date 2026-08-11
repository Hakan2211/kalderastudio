import { create } from "zustand";
import { musicDisable, musicEnable, setMusicDepth } from "./music";

/**
 * PRD §4: "a low geological rumble bed + UI ticks, behind an explicit toggle.
 * Never autoplay."
 *
 * The bed is a caldera, not a drone: filtered noise + two detuned subs, with
 * the low-pass opening as the descent deepens, so the ground gets louder the
 * further into the crater you scroll. All of it is synthesised in WebAudio, so
 * the room itself costs zero bytes.
 *
 * The SCORE — real tracks off the CDN — lives in `music.ts` and rides the same
 * switch. One control, because a visitor who wants silence wants all of it:
 * the bed is the room the music is playing in, and offering them separately
 * would be two decisions where the page only ever poses one.
 */

const STORAGE_KEY = "kaldera.sound";

type Engine = {
  ctx: AudioContext;
  master: GainNode;
  bedGain: GainNode;
  bedFilter: BiquadFilterNode;
  stop: () => void;
};

let engine: Engine | null = null;

/** ~2 s of brown noise, looped. Brown (not white) is the geological one. */
function brownNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  // Cross-fade the seam so the loop point does not click.
  const fade = Math.floor(ctx.sampleRate * 0.05);
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    data[i] = data[i] * t + data[len - fade + i] * (1 - t);
  }
  return buf;
}

function build(): Engine {
  const Ctor: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();

  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // ── The bed ──────────────────────────────────────────────────────────
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.5;
  bedGain.connect(master);

  const bedFilter = ctx.createBiquadFilter();
  bedFilter.type = "lowpass";
  bedFilter.frequency.value = 90;
  bedFilter.Q.value = 0.8;
  bedFilter.connect(bedGain);

  const noise = ctx.createBufferSource();
  noise.buffer = brownNoiseBuffer(ctx);
  noise.loop = true;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.55;
  noise.connect(noiseGain).connect(bedFilter);
  noise.start();

  // Two subs a hair apart — the beating between them is the "breathing".
  const subs = [38, 45.5].map((f) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0.18;
    osc.connect(g).connect(bedFilter);
    osc.start();
    return { osc, g };
  });

  // Slow swell, ~26 s period. Mass, never pulse.
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 1 / 26;
  const lfoAmt = ctx.createGain();
  lfoAmt.gain.value = 0.22;
  lfo.connect(lfoAmt).connect(bedGain.gain);
  lfo.start();

  const stop = () => {
    try {
      noise.stop();
      subs.forEach((s) => s.osc.stop());
      lfo.stop();
      void ctx.close();
    } catch {
      /* already torn down */
    }
  };

  return { ctx, master, bedGain, bedFilter, stop };
}

/**
 * Master level when on. Deliberately low — a bed you notice only when it
 * stops. Lower than it would be alone, because the score now sits on top of
 * it and two things fighting for the sub is just mud.
 */
const BED_LEVEL = 0.085;

async function enable() {
  if (!engine) engine = build();
  if (engine.ctx.state === "suspended") await engine.ctx.resume();
  const t = engine.ctx.currentTime;
  engine.master.gain.cancelScheduledValues(t);
  engine.master.gain.setValueAtTime(engine.master.gain.value, t);
  engine.master.gain.linearRampToValueAtTime(BED_LEVEL, t + 1.6);
}

function disable() {
  if (!engine) return;
  const t = engine.ctx.currentTime;
  const e = engine;
  e.master.gain.cancelScheduledValues(t);
  e.master.gain.setValueAtTime(e.master.gain.value, t);
  e.master.gain.linearRampToValueAtTime(0, t + 0.5);
  // Keep the graph alive but silent: re-enabling should be instant, and
  // rebuilding the noise buffer on every toggle is a needless GC spike.
}

/**
 * Descent coupling: 0 at the rim, 1 at the throat. Opens the low-pass and
 * lifts the bed a little, so scrolling into the crater is audible.
 */
export function setSoundDepth(depth: number) {
  const d = Math.min(Math.max(depth, 0), 1);
  setMusicDepth(d);
  if (!engine) return;
  const t = engine.ctx.currentTime;
  engine.bedFilter.frequency.setTargetAtTime(70 + d * 180, t, 0.4);
}

/** A short, dry tick — the UI's own voice. Nothing plays if sound is off. */
export function tick(kind: "hover" | "press" = "hover") {
  if (!engine || engine.ctx.state !== "running") return;
  if (useSoundStore.getState().enabled === false) return;
  const ctx = engine.ctx;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(kind === "press" ? 320 : 900, t);
  osc.frequency.exponentialRampToValueAtTime(kind === "press" ? 120 : 520, t + 0.07);

  const g = ctx.createGain();
  const peak = kind === "press" ? 0.16 : 0.05;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === "press" ? 0.16 : 0.075));

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 180;

  osc.connect(g).connect(hp).connect(engine.master);
  osc.start(t);
  osc.stop(t + 0.2);
}

type SoundState = {
  enabled: boolean;
  /**
   * The preference is on, but no gesture has landed yet, so nothing is
   * actually making noise. Only a restored session is ever in this state, and
   * the switch has to SAY so — a control reading "sound on" over silence is
   * the one lie the page cannot afford.
   */
  pending: boolean;
  /** Toggling is user-gesture driven — that is what lets the context resume. */
  toggle: () => void;
  /** Spend the gesture we were waiting for. Safe to call twice. */
  resume: () => void;
  hydrate: () => void;
};

/** Detaches the arming listeners; null once they are gone. */
let disarm: (() => void) | null = null;

export const useSoundStore = create<SoundState>((set, get) => ({
  enabled: false,
  pending: false,
  toggle: () => {
    const next = !get().enabled;
    set({ enabled: next, pending: false });
    disarm?.();
    try {
      localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      /* private mode — the preference just does not persist */
    }
    if (next) {
      void enable().then(() => tick("press"));
      // Called synchronously inside the click handler, NOT after enable()
      // resolves: an <audio>.play() only counts as gesture-driven while the
      // gesture's task is still on the stack, and awaiting the context resume
      // first is exactly long enough to lose it on Safari.
      musicEnable();
    } else {
      disable();
      musicDisable();
    }
  },
  resume: () => {
    if (!get().pending) return;
    set({ enabled: true, pending: false });
    disarm?.();
    void enable();
    // Synchronous, for the same Safari reason as in toggle().
    musicEnable();
  },
  /**
   * Restores the stored preference but NEVER starts audio: browsers require a
   * gesture, and more importantly the PRD says never autoplay.
   *
   * So a restored session lands in `pending`: the preference is remembered,
   * the switch says "sound paused", and the first click or keypress anywhere
   * on the page spends its gesture and brings the room up. Previously this
   * showed a lit "sound on" over total silence until the visitor happened to
   * click something — and scrolling, which is what people actually do here,
   * is not a gesture that unlocks audio, so it could stay that way forever.
   */
  hydrate: () => {
    let stored = false;
    try {
      stored = localStorage.getItem(STORAGE_KEY) === "on";
    } catch {
      stored = false;
    }
    if (!stored || get().enabled || get().pending) return;
    set({ enabled: true, pending: true });

    const arm = (e: Event) => {
      // A click ON the switch is its own business: the button resumes from
      // its own handler, and arming here first would clear `pending` before
      // that handler reads it, turning the resume into a toggle-off.
      const target = e.target;
      if (target instanceof Element && target.closest("[data-sound-switch]")) return;
      useSoundStore.getState().resume();
    };
    disarm = () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
      disarm = null;
    };
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);
  },
}));
