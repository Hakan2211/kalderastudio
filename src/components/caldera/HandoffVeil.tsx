import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NOISE_GLSL } from "#/lib/glsl/noise";
import { damp, smoothstep, useScrollStore } from "#/lib/scroll-store";

/**
 * The 3D-to-2D handoff. The old cut was DOM-only: an opaque section with a
 * border slid over the held throat frame, which read as a curtain. This is
 * the WebGL half of the replacement: over the last beat of the track a
 * molten veil rises from the throat, its leading edge glowing, and cools to
 * page obsidian behind itself. By p = 1 the whole frame IS the page
 * background, so the DOM sections arrive over a surface that already matches
 * them (the canvas wrapper then cross-fades out in the route, see index.tsx).
 *
 * Fullscreen quad in clip space — no camera involvement, so it holds through
 * the fov ramp and the nose-down end frame. Runs before the composer, which
 * is deliberate: bloom catches the hot edge (it crosses the 0.95 threshold)
 * and grain/vignette keep the veil in the same grade as the scene it covers.
 */
const HANDOFF_START = 0.86;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform float uHandoff;
uniform float uTime;
varying vec2 vUv;
${NOISE_GLSL}

void main() {
  // Ragged leading edge — basalt tears, it does not wipe in a straight line.
  float n = fbm(vec3(vUv.x * 3.2, vUv.y * 2.1 - uTime * 0.05, uTime * 0.09), 4);
  float front = uHandoff * 1.7;
  float rise = front - vUv.y + n * 0.22;

  float cover = smoothstep(0.0, 0.16, rise);

  // Hot band at the edge, cooling to stone behind it. Flicker is spatial
  // noise advected slowly — a strobe here would read as a glitch.
  float heat = smoothstep(0.0, 0.1, rise) * (1.0 - smoothstep(0.1, 0.44, rise));
  heat *= 0.8 + 0.2 * snoise(vec3(vUv * 6.0, uTime * 0.3));

  vec3 obsidian = vec3(0.052, 0.052, 0.06);
  vec3 magma = vec3(0.549, 0.114, 0.016);
  vec3 ember = vec3(1.2, 0.42, 0.14);

  vec3 col = obsidian;
  col = mix(col, magma, smoothstep(0.0, 0.55, heat));
  col = mix(col, ember, smoothstep(0.5, 1.0, heat));

  gl_FragColor = vec4(col, cover);
}
`;

export function HandoffVeil() {
  const meshRef = useRef<THREE.Mesh>(null);
  const p = useRef(0);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uHandoff: { value: 0 },
          uTime: { value: 0 },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );

  useFrame((state, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const d = Math.min(dt, 1 / 20);
    // Same damping constant as the camera, so the veil arrives WITH the
    // dolly, not ahead of it.
    p.current = damp(p.current, useScrollStore.getState().progress, 6, d);
    const handoff = smoothstep(HANDOFF_START, 1.0, p.current);
    material.uniforms.uHandoff.value = handoff;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    mesh.visible = handoff > 0.001;
  });

  return (
    <mesh ref={meshRef} material={material} renderOrder={10} frustumCulled={false} visible={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
