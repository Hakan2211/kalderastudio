import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { heatForProgress, useScrollStore } from "#/lib/scroll-store";

/**
 * Sparse rising embers (PRD §4 Scene 1). Points, additive, GPU-animated —
 * position is a pure function of (seed, time), so there is no CPU work per
 * frame beyond two uniforms.
 */
const COUNT = 1400;

const VERT = /* glsl */ `
uniform float uTime;
uniform float uHeat;
uniform float uPixelRatio;
attribute vec3 aSeed;   // x: angle, y: radius, z: speed
attribute float aScale;
varying float vAlpha;
varying float vHot;

void main() {
  float life = fract(uTime * aSeed.z * 0.06 + aSeed.x);
  float rise = life * 9.0;

  float ang = aSeed.x * 6.2831853;
  float rad = aSeed.y;
  // Embers drift outward and wobble as they climb.
  float wob = sin(uTime * 0.5 + aSeed.x * 20.0) * 0.5 * life;
  vec3 p = vec3(
    cos(ang) * rad + wob,
    -1.4 + rise,
    sin(ang) * rad + wob * 0.7
  );

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float fade = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.45, 1.0, life));
  vAlpha = fade * (0.25 + 0.75 * uHeat);
  vHot = 1.0 - life;

  gl_PointSize = aScale * uPixelRatio * (18.0 / max(-mv.z, 0.5)) * (0.6 + 0.6 * uHeat);
}
`;

const FRAG = /* glsl */ `
uniform vec3 uEmber;
uniform vec3 uHeatWhite;
varying float vAlpha;
varying float vHot;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float core = 1.0 - smoothstep(0.0, 0.5, d);
  vec3 col = mix(uEmber, uHeatWhite, pow(core, 3.0) * vHot);
  gl_FragColor = vec4(col, core * core * vAlpha);
}
`;

export function Embers() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { seeds, scales } = useMemo(() => {
    const seeds = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT);
    // Deterministic PRNG so the field is identical every load.
    let s = 1337;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    for (let i = 0; i < COUNT; i++) {
      seeds[i * 3 + 0] = rnd();
      // Cluster around the rim and the pit — where the veins are.
      seeds[i * 3 + 1] = rnd() < 0.45 ? rnd() * 3.5 : 6.5 + rnd() * 5.0;
      seeds[i * 3 + 2] = 0.35 + rnd() * 1.5;
      scales[i] = 1.2 + rnd() * 3.4;
    }
    return { seeds, scales };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeat: { value: 0.12 },
      uPixelRatio: { value: 1 },
      uEmber: { value: new THREE.Color("#ff551f") },
      uHeatWhite: { value: new THREE.Color("#ffd9a0") },
    }),
    [],
  );

  useFrame((state) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uHeat.value = heatForProgress(useScrollStore.getState().progress);
    mat.uniforms.uPixelRatio.value = state.viewport.dpr;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(COUNT * 3), 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
