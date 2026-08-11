import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { damp, descendForProgress, useScrollStore } from "#/lib/scroll-store";

/**
 * The camera path (PRD §4, Scenes 1–2): a low aerial hold on the rim that
 * dollies over the lip and down toward the glow. CatmullRom for position and
 * for the look-at target, so the move stays dolly-like — never a whip-pan.
 * Reference: `Direction A - 1` (start) -> `Direction B - 3` (end).
 */
/**
 * FRAMING — solved from the reference, not eyeballed.
 *
 * The previous pass held that the crater must OVER-fill the frame or the shot
 * reads as an island floating in black. That was the wrong reading. In
 * `Direction A - 1` the crater spans about 70% of frame width and there is
 * plateau visible to left and right; the island problem is solved by
 * surrounding LAND, not by cropping the crater. Over-filling it had a much
 * worse cost: from close in and low down, the only thing on screen is the near
 * OUTER flank, and an outer flank is convex. No lighting makes a convex
 * surface read as a hole. Every "it still looks like a mound" note traces back
 * to that one decision.
 *
 * THE WHOLE ELLIPSE HAS TO CLOSE. This is the constraint everything else is
 * solved around, and it is the one that took the longest to find. If the NEAR
 * rim falls off the bottom of frame, the picture is: far rim across the top,
 * walls converging downward, and nothing at the bottom but darkness. That is a
 * funnel, and it reads as one however it is lit, textured or shaded — the eye
 * has no evidence the surface ever comes back UP toward the camera. Seeing the
 * near wall rise again at the bottom edge is what turns a vortex into a bowl.
 *
 * Both rim crests are at y = 3.3, r = 15, so from a camera at (0, H, Cz) they
 * sit at atan((H - 3.3) / (Cz +/- 15)) below horizontal. At (0, 52, 62) that
 * is 32.3deg for the far crest and 46.0deg for the near one — a span of
 * 13.7deg that has to fit inside the frame with room to spare.
 *
 * FOV IS 20, NOT 28, and that is what makes it fit AND keeps the crater big.
 * 13.7deg of crater inside a 20deg frame is 68% of frame height, so the far
 * crest lands at 30% and the near one at 98.5%. Meanwhile the horizontal
 * half-frame at the crater is 81 * tan(10deg) * 1.55 = 22.1 units against a
 * rim radius of 15 — the ring fills 68% of the half-frame and the plateau
 * beyond it still runs off both edges. A wider fov from further back would fit
 * the crater vertically too, but only by shrinking it to half the frame width.
 *
 * Camera pitch is 36.3deg, which puts the look target on the ground at
 * z = -9. Above the far rim is BLACK because the land behind it is escarpment,
 * 40 units down and alpha-faded out (see caldera.ts).
 *
 * Reference: `Direction A - 1` (start) -> `Direction B - 3` (end).
 */
/**
 * END OF DESCENT (P3, ref `Direction B - 3`): the reference is a wide-angle
 * frame looking straight DOWN a fractured obsidian throat that converges on a
 * heat core. So the path no longer settles onto the bowl floor — the last two
 * beats carry the camera across the floor to the vent (plane (2, 9) = world
 * (2, y, -9)) and tip it over the mouth, ending ~75deg nose-down with the
 * throat converging in the lower-centre of frame. The vent itself is opened
 * into that throat by uDescend in the terrain shader over the same beat.
 */
const PATH = [
  new THREE.Vector3(0.0, 44.0, 53.0),
  new THREE.Vector3(0.8, 32.0, 38.0),
  new THREE.Vector3(0.8, 18.0, 22.0),
  new THREE.Vector3(0.4, 8.5, 3.0),
  new THREE.Vector3(2.0, 1.5, -7.4),
];

const LOOK = [
  new THREE.Vector3(0.0, 0.0, -17.5),
  new THREE.Vector3(0.0, 0.0, -12.0),
  new THREE.Vector3(0.0, -0.5, -6.0),
  new THREE.Vector3(0.8, -2.5, -6.5),
  new THREE.Vector3(2.0, -9.0, -9.0),
];

export function ScrollCamera() {
  const camera = useThree((s) => s.camera);
  const posCurve = useMemo(() => new THREE.CatmullRomCurve3(PATH, false, "catmullrom", 0.4), []);
  const lookCurve = useMemo(() => new THREE.CatmullRomCurve3(LOOK, false, "catmullrom", 0.4), []);

  const t = useRef(0);
  const parallax = useRef(new THREE.Vector2());
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const d = Math.min(dt, 1 / 20);
    const { progress, pointer, reducedMotion } = useScrollStore.getState();

    // Damp the scroll value itself as well as Lenis — mass on top of mass.
    t.current = damp(t.current, progress, 6, d);

    posCurve.getPoint(t.current, pos.current);
    lookCurve.getPoint(t.current, look.current);

    if (!reducedMotion) {
      // ±2° drift toward the cursor, heavily lerped (PRD §4 Scene 1).
      parallax.current.x = damp(parallax.current.x, pointer.x, 1.6, d);
      parallax.current.y = damp(parallax.current.y, pointer.y, 1.6, d);
      const amp = 1.0 - t.current * 0.6;
      pos.current.x += parallax.current.x * 0.85 * amp;
      pos.current.y += parallax.current.y * 0.42 * amp;
    }

    camera.position.copy(pos.current);
    camera.lookAt(look.current);
    // A slow roll off the horizontal keeps the frame from feeling like a slider.
    camera.rotation.z += Math.sin(t.current * Math.PI) * 0.012;

    // The lens OPENS as the camera commits (`Direction B - 3` is wide-angle:
    // the throat converges because the walls wrap the frame, and a 20deg
    // telephoto can never wrap). fov 20 holds the hero's solved framing —
    // untouched until the final beat, because it computed from t, which the
    // hero holds at ~0.
    const desc = descendForProgress(t.current);
    const cam = camera as THREE.PerspectiveCamera;
    const fov = 20 + desc * 24;
    if (Math.abs(cam.fov - fov) > 1e-3) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    camera.updateMatrixWorld();
  });

  return null;
}
