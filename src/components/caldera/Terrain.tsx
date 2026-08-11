import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CALDERA_FRAG, CALDERA_VERT } from "#/lib/glsl/caldera";
import { damp, descendForProgress, heatForProgress, useScrollStore } from "#/lib/scroll-store";

const TOKENS = {
  obsidian: new THREE.Color("#0b0b0d"),
  // Brand ASH is #3C3F45; the shader wants a slightly hotter, less blue top
  // end so the lit striation crests can reach the reference's silver without
  // the whole frame drifting to slate.
  ash: new THREE.Color("#55565b"),
  ember: new THREE.Color("#ff551f"),
  magmaDeep: new THREE.Color("#8c1d04"),
  heatWhite: new THREE.Color("#ffd9a0"),
  // Aerial-perspective target. Barely off black and slightly COOL, so the
  // distance ramp reads as air rather than as a grey wash — a warm haze here
  // fights the ember and the whole frame goes muddy.
  haze: new THREE.Color("#0e1013"),
};

export type TerrainProps = {
  /** Plane edge length in world units. */
  size?: number;
  /** Grid resolution per side. Drop this for tier B. */
  segments?: number;
};

// The plane only has to reach past the alpha fade ring (R_RIM + 16 = 31); the
// edge-midpoint of a 70-unit plane is 35, so the ring closes before the plane
// runs out. Anything larger just spends vertices on terrain nobody sees.
export function Terrain({ size = 70, segments = 896 }: TerrainProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const pointerWorld = useRef(new THREE.Vector3(0, 0, 0));
  const pointerAmt = useRef(0);
  const heat = useRef(0.12);
  const descend = useRef(0);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  // The pointer light rides an imaginary ground plane just under the rim,
  // which is close enough to the terrain to read as "the cursor lights it".
  const groundPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.6),
    [],
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeat: { value: 0.12 },
      // End-of-descent throat (P3, ref "Direction B - 3"). Shared by vertex
      // (opens the vent) and fragment (rings, shard light, core).
      uDescend: { value: 0 },
      uPointer: { value: new THREE.Vector3(0, 0, 0) },
      uPointerAmt: { value: 0 },
      uObsidian: { value: TOKENS.obsidian },
      uAsh: { value: TOKENS.ash },
      uEmber: { value: TOKENS.ember },
      uMagmaDeep: { value: TOKENS.magmaDeep },
      uHeatWhite: { value: TOKENS.heatWhite },
      uHaze: { value: TOKENS.haze },
      // Both depth ramps are driven off how far the camera currently is from
      // the crater, not off fixed world distances. The camera travels 55 units
      // to 3 during the descent; a fixed near-crush distance would swallow the
      // whole frame by the time it arrives. Scaling with the standoff keeps
      // "the front edge of the picture" meaning the same thing throughout.
      uNearFade: { value: 50 },
      uFarFade: { value: 41 },
      // Key comes from over the camera's LEFT shoulder, and it is LOW — 17deg
      // of elevation, not 27.
      //
      // Elevation is the value-structure dial for the whole frame. Up-facing
      // ground (the plateau outside the ring, and the crater floor) gets
      // dot(N, L) = sin(elev), so dropping the key from 27deg to 17deg takes
      // the plateau from 0.45 to 0.29 and, after the 1.45 contrast power, from
      // 0.33 to 0.18 — it goes to near-black. The crater's inner wall faces
      // sideways, so it barely changes. That single number is what separates
      // "a lit ring sitting in a dark plain", which is the reference, from
      // "one continuous grey field with a dent in it", which is what a high
      // key gives you no matter how the geometry is shaped.
      //
      // Lighting from BEHIND the crater silhouettes it and the bowl inverts to
      // convex — the one thing that kills the shot outright.
      uKeyDir: { value: new THREE.Vector3(-0.88, 0.30, 0.37).normalize() },
    }),
    [],
  );

  useFrame((state, dt) => {
    const mat = matRef.current;
    if (!mat) return;
    const d = Math.min(dt, 1 / 20);

    const { progress, pointer, pointerActive } = useScrollStore.getState();

    mat.uniforms.uTime.value = state.clock.elapsedTime;

    // Depth ramps ride the camera standoff (see the uniform declarations).
    const standoff = state.camera.position.length();
    mat.uniforms.uNearFade.value = standoff * 0.92;
    mat.uniforms.uFarFade.value = Math.max(standoff * 0.75, 8);

    heat.current = damp(heat.current, heatForProgress(progress), 3.5, d);
    mat.uniforms.uHeat.value = heat.current;

    // Damped a touch harder than heat: this one moves GEOMETRY, and the
    // camera it has to stay in step with damps its own t at lambda 6.
    descend.current = damp(descend.current, descendForProgress(progress), 4.5, d);
    mat.uniforms.uDescend.value = descend.current;

    // Project the pointer onto the ground plane for the local ember light.
    raycaster.setFromCamera(
      new THREE.Vector2(pointer.x, pointer.y),
      state.camera,
    );
    const hit = raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3());
    if (hit) {
      pointerWorld.current.lerp(hit, 1 - Math.exp(-9 * d));
      (mat.uniforms.uPointer.value as THREE.Vector3).copy(pointerWorld.current);
    }
    pointerAmt.current = damp(pointerAmt.current, pointerActive && hit ? 1 : 0, 4, d);
    mat.uniforms.uPointerAmt.value = pointerAmt.current;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} frustumCulled={false}>
      <planeGeometry args={[size, size, segments, segments]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={CALDERA_VERT}
        fragmentShader={CALDERA_FRAG}
        uniforms={uniforms}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
}
