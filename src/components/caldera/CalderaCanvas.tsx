import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { Terrain } from "./Terrain";
import { Embers } from "./Embers";
import { HandoffVeil } from "./HandoffVeil";
import { ScrollCamera } from "./ScrollCamera";
import { WordmarkParticles } from "./WordmarkParticles";
import { heatForProgress, useScrollStore } from "#/lib/scroll-store";

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
 * PRD §5.2: ONE canvas, fixed behind the DOM. It renders with alpha so the
 * hero wordmark — real DOM text underneath — is physically occluded by the
 * crater rim, which is the "text in the world" trick without giving up SEO.
 */

/** Chromatic aberration only ramps in during the descent (PRD §5.1). */
function HeatDrivenAberration() {
  const ref = useRef<{ offset: THREE.Vector2 }>(null);
  useFrame(() => {
    if (!ref.current) return;
    const heat = heatForProgress(useScrollStore.getState().progress);
    const a = 0.00035 + heat * 0.0012;
    ref.current.offset.set(a, a * 0.6);
  });
  return (
    <ChromaticAberration
      ref={ref as never}
      offset={new THREE.Vector2(0.0004, 0.0002)}
      radialModulation
      modulationOffset={0.35}
    />
  );
}

export type CalderaCanvasProps = {
  /** Terrain resolution — lower for the tier-B ladder (PRD §5.4). */
  segments?: number;
  dpr?: [number, number];
  /** Sandbox escape hatch: `?post=0` renders the raw scene. */
  post?: boolean;
  /** Sandbox bitmask for isolating effect cost: 1 bloom, 2 tonemap, 4 CA, 8 grain, 16 vignette. */
  fx?: number;
};

export function CalderaCanvas({
  // 896, not 512. The hero camera sits close enough that a 512-segment plane
  // puts ~8px quads along the bottom of frame and the tessellation shows as
  // stair-steps on every displaced edge. Sandbox override: `?seg=512`.
  segments = 896,
  dpr = [1, 1.75],
  post = true,
  fx = 31,
}: CalderaCanvasProps) {
  const on = (bit: number) => (fx & bit) !== 0;
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
      <ReadySignal />
      <ScrollCamera />
      <WordmarkParticles />
      <Terrain segments={segments} />
      <Embers />
      <HandoffVeil />

      {post && (
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <>
          {on(1) && (
            // Threshold 0.95, not 0.15. Bloom is for the VEINS — they run at
            // 13-22x white and are meant to blow. The wordmark is pumice
            // (#EBE5DF, luminance ~0.9) and at a low threshold it bloomed
            // too, wrapping the type in a soft halo that read as a cheap
            // glow filter and cost the letterforms their edge. Sitting the
            // threshold just above paper-white lets the emissive through and
            // leaves everything that is merely LIT alone.
            <Bloom
              intensity={1.6}
              luminanceThreshold={0.95}
              luminanceSmoothing={0.35}
              mipmapBlur
              radius={0.82}
            />
          )}
          {on(2) && <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />}
          {on(4) && <HeatDrivenAberration />}
          {on(8) && (
            <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.42} />
          )}
          {on(16) && <Vignette offset={0.18} darkness={1.05} eskil={false} />}
        </>
      </EffectComposer>
      )}
    </Canvas>
  );
}
