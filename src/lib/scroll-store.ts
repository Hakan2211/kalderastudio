import { create } from "zustand";

/**
 * The single bridge between DOM scroll and the WebGL scene (PRD §5.2).
 * DOM writes `progress`; the canvas reads it every frame. Nothing else
 * crosses the boundary.
 */
export type ScrollState = {
  /** 0..1 across the whole prototype scroll. */
  progress: number;
  /** Pointer in NDC-ish space, -1..1. */
  pointer: { x: number; y: number };
  /** True once the user has moved the pointer at least once. */
  pointerActive: boolean;
  reducedMotion: boolean;
  /**
   * Scene 0 (P3): while true, the preloader owns the viewport and the rig
   * keeps Lenis stopped. Set synchronously by the preloader's mount effect,
   * which runs BEFORE the rig's (child effects fire first), so the rig can
   * simply read it at Lenis creation time and subscribe for the release.
   */
  bootLock: boolean;
  /** First real frame has been rendered by the R3F canvas. */
  canvasReady: boolean;
  /**
   * Whether the canvas is still on screen. The handoff fades the wrapper with
   * autoAlpha, and `visibility: hidden` only stops COMPOSITING — WebGL happily
   * keeps drawing the whole scene behind the rest of the page. This rides the
   * store rather than route state so the canvas subtree stays render-stable
   * (see the leaf-component note in proto.caldera.tsx).
   */
  canvasVisible: boolean;
  setProgress: (p: number) => void;
  setPointer: (x: number, y: number) => void;
  setReducedMotion: (v: boolean) => void;
  setBootLock: (v: boolean) => void;
  setCanvasReady: () => void;
  setCanvasVisible: (v: boolean) => void;
};

export const useScrollStore = create<ScrollState>((set) => ({
  progress: 0,
  pointer: { x: 0, y: 0 },
  pointerActive: false,
  reducedMotion: false,
  bootLock: false,
  canvasReady: false,
  canvasVisible: true,
  setProgress: (p) => set({ progress: p }),
  setPointer: (x, y) => set({ pointer: { x, y }, pointerActive: true }),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setBootLock: (v) => set({ bootLock: v }),
  setCanvasReady: () => set({ canvasReady: true }),
  setCanvasVisible: (v) => set({ canvasVisible: v }),
}));

/**
 * Scene 1 (hero) holds until `SCENE_2_START`, then Scene 2 (thesis) runs
 * the descent. Kept here so DOM and canvas agree on the beat map.
 */
export const BEATS = {
  scene1End: 0.28,
  scene2Start: 0.28,
  scene2End: 1.0,
} as const;

/** Heat curve: calm A-state at rest, molten B-state on the descent (§7). */
export function heatForProgress(p: number): number {
  const descent = smoothstep(BEATS.scene2Start, 0.92, p);
  const idle = 0.18;
  return idle + descent * 0.72;
}

/**
 * The final commit of the descent (P3, ref `Direction B - 3`): the last beat
 * where the camera tips over the vent and the vent opens into a throat.
 * Separate from heat — heat is the whole descent breathing from A to B;
 * this is the end-frame transformation only, and it must be fully resolved
 * by p = 1 because progress clamps there and the frame HOLDS.
 */
export function descendForProgress(p: number): number {
  return smoothstep(0.7, 0.97, p);
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Frame-rate independent damping (Lerp that behaves at any dt). */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}
