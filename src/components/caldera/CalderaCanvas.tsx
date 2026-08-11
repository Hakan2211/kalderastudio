import { Suspense, lazy, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Terrain } from "./Terrain";
import { Embers } from "./Embers";
import { HandoffVeil } from "./HandoffVeil";
import { ScrollCamera } from "./ScrollCamera";
import { WordmarkParticles } from "./WordmarkParticles";
import { useScrollStore } from "#/lib/scroll-store";

// postprocessing + its wrapper are ~250 kB raw that three/fiber do not need in
// order to draw. Splitting them here lets both chunks come down the wire at the
// same time instead of the browser parsing one megabyte before the first frame.
//
// React does not request this chunk until the Suspense boundary below first
// renders, which lands after the 896-segment terrain build — measured ~7s into
// a cold load. Hoisting the import to module scope to overlap that gap is
// tempting and untested; it is left alone because the chunk is ~1 kB and Vite
// already modulepreloads the 250 kB postprocessing chunk beside index.js, so
// the only cost here is one round trip for the shim.
const CalderaPost = lazy(() =>
  import("./CalderaPost").then((m) => ({ default: m.CalderaPost })),
);

/**
 * Reports the first RENDERED frame to the store — the preloader's real
 * "ready" signal. onCreated fires before shaders have compiled; the first
 * useFrame tick only runs once the scene actually drew, which is the moment
 * the hero is genuinely behind the crack.
 */
function ReadySignal() {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    useScrollStore.getState().setCanvasReady();
  });
  return null;
}

/**
 * Parks the render loop while the canvas is off screen. A leaf INSIDE the
 * canvas on purpose: it subscribes to the store here rather than in the route
 * body, which would re-render the whole <Canvas> subtree (see the note in
 * proto.caldera.tsx). Nothing on screen changes when this flips — the GPU just
 * stops redrawing 1.6M triangles that nobody can see.
 */
function RenderGate() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const visible = useScrollStore((s) => s.canvasVisible);
  useEffect(() => {
    setFrameloop(visible ? "always" : "never");
  }, [visible, setFrameloop]);
  return null;
}

/**
 * PRD §5.2: ONE canvas, fixed behind the DOM. It renders with alpha so the
 * hero wordmark — real DOM text underneath — is physically occluded by the
 * crater rim, which is the "text in the world" trick without giving up SEO.
 */

export type CalderaCanvasProps = {
  /** Terrain resolution — lower for the tier-B ladder (PRD §5.4). */
  segments?: number;
  dpr?: [number, number];
  /** Sandbox escape hatch: `?post=0` renders the raw scene. */
  post?: boolean;
  /** Sandbox bitmask for isolating effect cost: 1 bloom, 2 tonemap, 4 CA, 8 grain, 16 vignette. */
  fx?: number;
  /** Sandbox only: `?parts=0` drops the wordmark cloud to price its overdraw. */
  parts?: boolean;
};

export function CalderaCanvas({
  // 896, not 512. The hero camera sits close enough that a 512-segment plane
  // puts ~8px quads along the bottom of frame and the tessellation shows as
  // stair-steps on every displaced edge. Sandbox override: `?seg=512`.
  segments = 896,
  dpr = [1, 1.75],
  post = true,
  fx = 31,
  parts = true,
}: CalderaCanvasProps) {
  return (
    <Canvas
      className="!fixed inset-0"
      dpr={dpr}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
        toneMapping: THREE.NoToneMapping,
      }}
      // fov 20 and an 81-unit standoff: the only pair that fits the whole
      // crater ellipse in frame while keeping the ring at 68% of frame width.
      // See the framing note in ScrollCamera.
      camera={{ fov: 20, near: 0.1, far: 400, position: [0, 44, 53] }}
      onCreated={({ gl }) => gl.setClearAlpha(0)}
    >
      <RenderGate />
      <ScrollCamera />
      {parts && <WordmarkParticles />}
      <Terrain segments={segments} />
      <Embers />
      <HandoffVeil />

      {/* ReadySignal sits INSIDE the boundary on purpose. With post on it must
          not report a frame until the effects are actually live, or the
          preloader lifts on an ungraded scene and bloom snaps in a beat later;
          suspending it alongside CalderaPost keeps the handoff honest. With
          post off there is nothing to wait for and it mounts immediately. */}
      <Suspense fallback={null}>
        {post ? (
          <>
            <CalderaPost fx={fx} />
            <ReadySignal />
          </>
        ) : (
          <ReadySignal />
        )}
      </Suspense>
    </Canvas>
  );
}
