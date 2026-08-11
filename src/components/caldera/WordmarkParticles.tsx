import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { heatForProgress, smoothstep, useScrollStore } from "#/lib/scroll-store";

/**
 * The hero wordmark, built out of particles and living IN the scene.
 *
 * Why particles and not DOM text:
 *
 *   OCCLUSION IS REAL. The DOM version sat behind a transparent canvas and was
 *   "occluded" only because the terrain happened to be opaque where it
 *   overlapped. That works for exactly one composition and breaks the moment
 *   anything moves. These points are geometry at a known depth, so the rim
 *   crest cuts the letters because it is actually in front of them.
 *
 *   THE LETTERFORM CAN BREATHE. Type made of a hundred thousand points can do
 *   things type cannot: hold crisp in the middle and dissolve at the edges,
 *   pick up ember colour from below where the crater light would fall on it,
 *   and come apart into drifting sparks as the camera commits to the descent.
 *   None of that is a filter over a glyph — it is per-particle behaviour.
 *
 * The letterform itself is still authored by the FONT. Points are sampled from
 * a rasterised "KALDERA", so the shapes are the real face at the real weight,
 * not an approximation. An <h1> stays in the DOM (visually hidden) so the page
 * still says what it is to a crawler.
 */

/** Fraction of the viewport width the wordmark spans. */
const FILL = 0.9;
/**
 * Upper bound on particle count. The sampler strides to hit it, so the
 * letterform stays the same density at any raster size.
 */
const MAX_POINTS = 110_000;

/**
 * WORLD PLACEMENT — sized and positioned for the hero camera specifically.
 *
 * The plane sits at z = -26, BEHIND the far rim (z = -15) and out in the
 * region where the escarpment has already dropped 40 units and alpha-faded to
 * nothing. So the only thing in the world that can occlude the letters is the
 * rim crest itself, which is exactly the one thing that should.
 *
 * y = -4 is not a typo and not below anything: from a camera at (0, 44, 53)
 * with a 31.9deg pitch, a point 79 units away in z and 48 units down in y
 * lands 0.6deg above the optical axis — 44% of frame height. The rim crest
 * projects to 52%, so it cuts the bottom quarter of the letters. Those two
 * numbers are the composition.
 *
 * This is anchored to the hero framing on purpose. The wordmark has released
 * the frame by 20% scroll (see the opacity ramp), long before the camera has
 * travelled far enough for the anchoring to matter.
 */
const PLANE_Z = -26;
// 0.6, raised from -1.6 (which was itself raised from -4): the word now sits
// clear of the rim crest with only the descenders' tips near the cut, ~6% of
// frame height higher on screen. The crest still reads as being in front of
// the letters where they meet, which is all the occlusion trick needs.
const PLANE_Y = 0.6;
/**
 * Half-frame width in world units at the plane's distance, at the REFERENCE
 * aspect. The cloud is built at this width and then scaled per frame to the
 * viewport's real aspect — a fixed world width fits at exactly one window
 * shape and ran off both edges at every other one.
 */
const HALF_FRAME_AT_PLANE = 25.25;
/**
 * Aspect the 25.25 above was derived at. Hero camera (0, 44, 53), fov 20:
 * distance to the plane is 92.4, so half-frame HEIGHT is 92.4 * tan(10deg) =
 * 16.29 world units and half-frame WIDTH is that times the aspect.
 */
const REF_ASPECT = 1.55;

type Sampled = {
  positions: Float32Array;
  /** x: seed, y: edge-ness 0..1, z: stray 0/1 */
  attrs: Float32Array;
  scales: Float32Array;
  count: number;
};

/**
 * Rasterise the wordmark and sample its ink.
 *
 * The raster is sized so one canvas pixel is about one screen pixel at the
 * final composited size — that is what makes the point cloud read as SOLID
 * type rather than as a stipple of it. Below that density the counters fill
 * in and the letterform stops being the letterform.
 */
function sampleWordmark(text: string, rasterWidth: number): Sampled | null {
  const probe = document.createElement("canvas");
  const pctx = probe.getContext("2d");
  if (!pctx) return null;

  const FONT = (size: number) =>
    `900 ${size}px "Archivo Expanded", "Anton", "Arial Black", sans-serif`;

  // Measure at a known size, then scale so the word lands on rasterWidth.
  const PROBE_SIZE = 200;
  pctx.font = FONT(PROBE_SIZE);
  const m = pctx.measureText(text);
  if (!m.width) return null;
  const fontSize = (PROBE_SIZE * rasterWidth) / m.width;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.font = FONT(fontSize);
  const mm = ctx.measureText(text);
  const ascent = mm.actualBoundingBoxAscent || fontSize * 0.72;
  const descent = mm.actualBoundingBoxDescent || fontSize * 0.05;
  const pad = Math.ceil(fontSize * 0.06);

  const W = Math.ceil(mm.width) + pad * 2;
  const H = Math.ceil(ascent + descent) + pad * 2;
  canvas.width = W;
  canvas.height = H;

  // Re-set: resizing the canvas resets all context state including the font.
  ctx.font = FONT(fontSize);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, pad, pad + ascent);

  const data = ctx.getImageData(0, 0, W, H).data;
  const ink = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] > 128;

  // Count first so the stride can hit MAX_POINTS exactly rather than
  // over-allocating for the bounding box.
  let total = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ink(x, y)) total++;
  if (!total) return null;

  const keep = Math.min(1, MAX_POINTS / total);
  const worldW = HALF_FRAME_AT_PLANE * 2 * FILL;
  const scale = worldW / W;

  const positions: number[] = [];
  const attrs: number[] = [];
  const scales: number[] = [];

  // Deterministic PRNG — the wordmark must be identical every load.
  let s = 20260807;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!ink(x, y)) continue;
      if (rnd() > keep) continue;

      // Edge-ness: how close this pixel is to leaving the glyph. Sampled at
      // two radii so the falloff has some depth to it — the outermost ring of
      // particles is the one that gets to drift, and a one-pixel test would
      // give a hard, obviously-procedural outline.
      let open = 0;
      for (const d of [1, 3]) {
        if (!ink(x + d, y)) open += 1;
        if (!ink(x - d, y)) open += 1;
        if (!ink(x, y + d)) open += 1;
        if (!ink(x, y - d)) open += 1;
      }
      const edge = Math.min(1, open / 5);

      // A few percent of particles are strays: they never fully commit to the
      // glyph and drift as sparks. They are what stop the cloud reading as a
      // halftone screen of a solid shape.
      const stray = rnd() < 0.018 ? 1 : 0;

      positions.push(
        (x + rnd() - 0.5 - W / 2) * scale,
        (H / 2 - (y + rnd() - 0.5)) * scale,
        (rnd() - 0.5) * 0.35,
      );
      attrs.push(rnd(), edge, stray);
      scales.push(0.7 + rnd() * 0.8);
    }
  }

  return {
    positions: new Float32Array(positions),
    attrs: new Float32Array(attrs),
    scales: new Float32Array(scales),
    count: scales.length,
  };
}

const VERT = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uHeat;
uniform float uCharge;    // 0 at rest, 1 when the word is straining to let go
uniform float uRelease;   // 0 at rest, 1 once the camera commits to the descent
uniform float uForm;      // 0 scattered sparks, 1 assembled letterform
uniform vec2 uPointer;    // pointer in the cloud's LOCAL plane space
uniform vec2 uPointerVel; // local units/sec, damped — the smear direction
uniform float uPointerOn; // 0 until the pointer has ever moved
uniform float uHalfWidth; // half the cloud's local width, for the break wave
uniform float uPixelRatio;
uniform float uSizeScale;

attribute vec3 aAttr;     // x seed, y edge-ness, z stray
attribute float aScale;

varying float vAlpha;
varying float vEmber;
varying float vSeed;

void main() {
  vec3 pos = position;
  float seed = aAttr.x;
  float edge = aAttr.y;
  float stray = aAttr.z;

  float ang = seed * 6.2831853;

  // AT REST the cloud is almost still. A wordmark that shimmers is a wordmark
  // nobody can read — the drift here is sub-pixel for the interior particles
  // and only the outermost ring moves enough to see, which is what makes the
  // edges look like they are dissolving rather than vibrating.
  //
  // CHARGE is the first scroll beat, before anything actually breaks: the
  // agitation climbs and the edges start to lift, so the word visibly strains
  // for a while before it goes. That beat is the whole reason the release can
  // now be slow — a wordmark that just sits there for the first 10% of the
  // scroll would read as nothing happening.
  float wob = (0.014 + edge * 0.05 + stray * 0.28) * (1.0 + uCharge * 2.2);
  pos.x += sin(uTime * (0.55 + uCharge * 1.6) + ang) * wob;
  pos.y += cos(uTime * (0.47 + uCharge * 1.4) + ang * 1.7) * wob;
  pos.z += sin(uTime * (0.33 + uCharge * 1.1) + ang * 2.3) * wob * 2.0;
  // Edges peel off the surface first, before the break proper.
  pos.y += uCharge * uCharge * (edge * 0.55 + stray * 1.2);

  // ASSEMBLY: before uForm each particle is a spark in a plume rising out of
  // the crater — below the word and fanned wide. They converge core-first
  // (interior lands, then the outline snaps on), so the word resolves out of
  // fire rather than fading in like a layer.
  float a1 = fract(seed * 127.1) * 6.2831853;
  float rad = 6.0 + fract(seed * 311.7) * 26.0;
  vec3 scatter = vec3(
    pos.x * 0.25 + cos(a1) * rad,
    pos.y - 13.0 - fract(seed * 74.7) * 20.0,
    sin(a1) * rad * 0.35 + 5.0
  );
  float delay = edge * 0.28 + fract(seed * 43.7) * 0.42;
  float ft = clamp((uForm * 1.7 - delay) / 0.55, 0.0, 1.0);
  float formed = 1.0 - pow(1.0 - ft, 3.0);
  pos = mix(scatter, pos, formed);

  // POINTER: a heat bubble around the cursor that WARPS the letterform rather
  // than denting it. Three terms, and it needs all three — a pure radial push
  // just carves a circular hole, which reads as a cookie cutter:
  //
  //   RADIAL   particles shove out of the cursor's way,
  //   TANGENT  and swirl around it, so the strokes bend through the bubble
  //            instead of parting cleanly around it,
  //   SMEAR    and lean along the cursor's travel, so a fast sweep drags the
  //            type with it and a parked cursor sits in a still eddy.
  //
  // Edges give the most and the interior gives least, so the word stays
  // readable while its outline liquefies. Stands down during assembly and once
  // the release has begun.
  vec2 toP = pos.xy - uPointer;
  float pd = length(toP);
  vec2 pdir = toP / max(pd, 0.0001);
  // Squared falloff: a tight, forceful core with a long soft shoulder. The
  // linear version spread the same displacement thinly over the whole bubble
  // and read as the word being slightly out of focus.
  float fall = 1.0 - smoothstep(0.0, 7.0, pd);
  fall *= fall;
  float infl = fall * uPointerOn * formed;
  float give = 0.30 + 0.70 * edge + stray * 0.6;

  pos.xy += pdir * infl * give * 2.1;
  pos.xy += vec2(-pdir.y, pdir.x) * infl * give * 1.55;
  pos.xy += uPointerVel * infl * give * 0.28;
  pos.z += infl * give * 1.1;
  // The bubble also agitates: particles inside it are hot, and hot particles
  // move. Keyed to time so it churns while the cursor is held still.
  pos.xy += vec2(sin(uTime * 2.1 + ang), cos(uTime * 1.9 + ang * 1.3))
    * infl * give * 0.35;

  // RELEASE: the letterform comes apart upward and outward. Two staggers, and
  // they do different jobs:
  //
  //   LEAD  — edges and strays go first, so the outline dissolves while the
  //           interior is still holding the shape. This is what makes it read
  //           as burning off rather than as a layer being faded out.
  //   WAVE  — the break TRAVELS, left to right across the word, so the K is
  //           already sparks while the A has not moved. A word that comes
  //           apart everywhere at once is an effect; one that comes apart in
  //           sequence is an event.
  //
  // Each particle gets its own [start, end] window inside uRelease, and every
  // window closes at or before 1.0, so a fully-released cloud is fully gone
  // no matter which stagger a particle drew.
  float lead = clamp(0.62 * edge + 0.5 * stray, 0.0, 1.0);
  float wave = clamp(position.x / max(uHalfWidth, 0.001) * 0.5 + 0.5, 0.0, 1.0);
  float d0 = wave * 0.30 * (1.0 - lead * 0.6) + fract(seed * 91.3) * 0.05;
  float d1 = d0 + mix(0.62, 0.38, lead);
  float go = clamp((uRelease - d0) / max(d1 - d0, 0.001), 0.0, 1.0);

  // Convection, not ballistics: the sparks accelerate upward, spiral as they
  // rise, and get pushed around by the same slow turbulence the crater breath
  // uses. A straight-line launch reads as a particle system; this reads as
  // something burning.
  //
  // The throws are LARGE, and that is a density decision as much as a motion
  // one. 110k points that only travel a few units stay as tightly packed after
  // the break as they were as ink, and a tightly packed cloud of overlapping
  // points is an opaque smear no matter how low each point's alpha is — the
  // word turned into fog instead of sparks. Roughly tripling the throw spreads
  // the same particles over ~9x the area, which is what actually buys the gaps
  // you have to see through for it to read as fire.
  float spin = go * (1.6 + fract(seed * 17.3) * 2.6);
  pos.y += go * go * (6.5 + seed * 17.0);
  pos.x += go * (seed - 0.5) * 15.0 + sin(ang + spin) * go * 3.0;
  pos.z += go * (fract(seed * 31.7) - 0.5) * 8.0 + cos(ang + spin) * go * 2.2;
  pos.x += sin(uTime * 1.3 + position.y * 0.45 + ang) * go * 1.4;
  infl *= (1.0 - go);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // Ember pickup: the crater is below and in front, so the underside of the
  // letters catches its light. Keyed to the glyph's own local height, which
  // is why it reads as light falling ON the type rather than as a gradient
  // painted INTO it.
  float low = 1.0 - smoothstep(-4.4, -0.4, position.y);
  vEmber = low * (0.30 + 0.70 * uHeat) + go * 0.75;
  // The charge beat glows before anything moves far — the word heats up, then
  // it goes. Edges first, same order the break itself runs in.
  vEmber += uCharge * (0.22 + 0.55 * edge);

  // A slow heat sweep drifts through the letters — a band of ember that
  // crosses the word every few seconds, edges catching first, like convection
  // off the crater playing over the type. Narrow band, low gain: it must read
  // as light moving, never as the word changing colour.
  float sweep = sin(uTime * 0.32 + position.x * 0.14 + position.y * 0.30);
  vEmber += smoothstep(0.78, 1.0, sweep) * 0.24 * (0.4 + 0.6 * edge);

  // Sparks in flight are fire, not paper — full ember while unformed, and the
  // cursor's heat bubble glows where it touches.
  vEmber += (1.0 - formed) * 0.85 + infl * 0.9;

  // The stagger drives the MOTION; a separate, unstaggered term drives the
  // kill. Folding the two together looked right and was wrong: an interior
  // particle has edge = 0, so its staggered term tops out well below 1 and it
  // never reached zero alpha — the word stayed on screen as a bank of pale
  // blobs long after it was supposed to have burned off.
  // The kill also has to HIT HARD once it starts: the cloud is ~100k points a
  // few pixels apart, so even 5% per-particle alpha stacks back up to an
  // opaque smear where they overlap. Squaring the survivor term is what
  // actually clears the sky — a linear ramp leaves a ghost band hanging over
  // the crater.
  //
  // But it no longer has to start EARLY, and that is the change. The per-
  // particle drift term below now does the real work, because every release
  // window closes at or before uRelease = 1 by construction — so this global
  // kill can run LATE and only bite over the last third. That is what buys the
  // sparks their long visible flight instead of snuffing the cloud out on the
  // first scroll beat.
  float kill = smoothstep(0.5, 0.96, uRelease);
  float surv = (1.0 - kill) * (1.0 - kill);
  // CUBED, not squared. A particle at go = 0.5 keeps 25% alpha under a square
  // law, and 25% of 110k overlapping points is still a solid wall. The cube
  // takes the same particle to 12%, which is the difference between a cloud
  // you can see the crater through and one you cannot.
  float drift = 1.0 - go;
  drift = drift * drift * drift;
  // In-flight sparks run at a fraction of settled alpha: they are spread over
  // a huge volume, so at full strength the plume reads as smoke, not sparks.
  vAlpha = drift * surv * mix(1.0, 0.78, edge) * (1.0 - stray * 0.45)
    * mix(0.38, 1.0, formed);
  vSeed = seed;

  // POINTS MUST OVERLAP. The sampler puts one particle on every ink pixel of
  // a raster sized to the viewport, so neighbours land about two device pixels
  // apart — and a point drawn smaller than that gap leaves a visible lattice
  // of holes through every stroke, which is why the first pass read as spray
  // paint rather than as type. Sized so an interior particle is roughly three
  // device pixels across and its skirt reaches its neighbours.
  // Released particles flare and then shrink: a spark brightens as it leaves
  // the surface and burns down to a pinpoint. Growing all the way would also
  // undo the spreading above — bigger points over a wider area cover the same
  // sky, and the point of the spread is to open gaps in it.
  gl_PointSize = aScale * uSizeScale * uPixelRatio
    * (1.0 + go * 0.55 - go * go * 0.95)
    * (240.0 / max(-mv.z, 1.0));
}
`;

const FRAG = /* glsl */ `
precision highp float;

uniform vec3 uPumice;
uniform vec3 uEmber;

varying float vAlpha;
varying float vEmber;
varying float vSeed;

void main() {
  // Round, soft-edged points. A square point at this size aliases into a
  // visible pixel grid across the flat interior of every stroke.
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;
  // The soft skirt has to stay NARROW. A point that fades from its centre
  // outward contributes almost no coverage at its rim, so wide-skirted points
  // leave the same lattice of holes a small hard point would — the skirt is
  // for edge quality, not for filling.
  float mask = 1.0 - smoothstep(0.15, 0.25, d);

  // Per-particle brightness scatter. Without it the interior of a stroke is a
  // perfectly flat field of identical dots and reads as printed vinyl; with
  // it the type has grain, like ink on stock.
  float grain = 0.90 + 0.10 * fract(sin(vSeed * 91.7) * 43758.5453);

  // vEmber stacks (crater light + sweep + assembly sparks + cursor heat), so
  // clamp the mix and spend the excess as brightness instead — pushed above
  // 1.0 it crosses the bloom threshold, which is what makes a spark a spark.
  float ember = clamp(vEmber * 0.45, 0.0, 1.0);
  float hot = max(vEmber - 1.4, 0.0);
  vec3 col = mix(uPumice, uEmber, ember) * grain * (1.0 + hot * 0.6);
  gl_FragColor = vec4(col, mask * vAlpha);
}
`;

export function WordmarkParticles({ text = "KALDERA" }: { text?: string }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Points>(null);
  const [sampled, setSampled] = useState<Sampled | null>(null);

  useEffect(() => {
    let cancelled = false;
    const build = () => {
      if (cancelled) return;
      // Raster width tracks the viewport so one canvas pixel stays about one
      // screen pixel — the density the letterform needs to read as solid.
      const raster = Math.min(2400, Math.round(window.innerWidth * FILL));
      const s = sampleWordmark(text, raster);
      if (s && !cancelled) setSampled(s);
    };
    // The display face can swap in after first paint; rasterising before it
    // lands samples the fallback stack, which is a different width AND a
    // different shape. And it has to be an explicit load(): a canvas fillText
    // never TRIGGERS a font fetch — it silently uses whatever is already
    // active — so waiting on fonts.ready alone can resolve before the real
    // face was ever asked for.
    if (document.fonts) {
      void document.fonts.load('900 100px "Archivo Expanded"').then(build, build);
    } else {
      build();
    }
    return () => {
      cancelled = true;
    };
  }, [text]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeat: { value: 0.18 },
      uCharge: { value: 0 },
      uRelease: { value: 0 },
      uForm: { value: 0 },
      uPointer: { value: new THREE.Vector2(999, 999) },
      uPointerVel: { value: new THREE.Vector2(0, 0) },
      uPointerOn: { value: 0 },
      uHalfWidth: { value: HALF_FRAME_AT_PLANE * FILL },
      uPixelRatio: { value: 1 },
      uSizeScale: { value: 1 },
      uPumice: { value: new THREE.Color("#EBE5DF") },
      uEmber: { value: new THREE.Color("#ff551f") },
    }),
    [],
  );

  // Assembly clock: null until the preloader releases the viewport — the
  // sparks must not converge behind Scene 0's curtain where nobody sees it.
  const formStart = useRef<number | null>(null);
  // Damped pointer so the heat bubble trails the cursor with some mass.
  const pointerLocal = useRef(new THREE.Vector2(999, 999));
  const pointerVel = useRef(new THREE.Vector2(0, 0));
  const ray = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    const { progress, pointer, pointerActive, bootLock, reducedMotion } =
      useScrollStore.getState();
    const t = state.clock.elapsedTime;
    mat.uniforms.uTime.value = t;
    mat.uniforms.uHeat.value = heatForProgress(progress);
    // THE RELEASE PACING. The first pass ran uRelease over 0.05 → 0.26 with an
    // early kill on top, which meant the wordmark was gone by 17% of the
    // track — before the visitor had finished scrolling the FIRST screen. It
    // read as the word being deleted the instant you touched the wheel.
    //
    // Now it is two beats. CHARGE runs first and overlaps nothing: the word
    // holds its shape and heats, straining, for the first tenth. RELEASE then
    // runs nearly three times as long as it used to, and the shader staggers a
    // travelling break wave inside it, so the cloud is fully clear at ~31% of
    // the track — still well before the thesis copy owns the frame, but with
    // an actual event in between instead of a cut.
    mat.uniforms.uCharge.value = smoothstep(0.0, 0.115, progress);
    mat.uniforms.uRelease.value = smoothstep(0.10, 0.38, progress);
    mat.uniforms.uPixelRatio.value = state.viewport.dpr;
    // Points are sized in world units at a fixed distance; keep them the same
    // on screen when the viewport changes height.
    mat.uniforms.uSizeScale.value = state.size.height / 950;

    // Assembly: hold at zero under the boot lock, then run a fixed ~2.6s ramp
    // (the shader adds per-particle stagger on top). Reduced motion skips the
    // flight entirely — the word is simply there.
    if (reducedMotion) {
      mat.uniforms.uForm.value = 1;
    } else if (bootLock) {
      formStart.current = null;
      mat.uniforms.uForm.value = 0;
    } else {
      if (formStart.current === null) formStart.current = t;
      mat.uniforms.uForm.value = Math.min((t - formStart.current) / 2.6, 1);
    }

    // POINTER → the cloud's LOCAL plane space, by actually intersecting the
    // cursor ray with the plane the particles live on.
    //
    // The previous mapping multiplied NDC by the half-frame extents and called
    // it done. That is only correct for a camera pointed straight at the
    // plane, and this one is pitched 32deg down and drifting with parallax —
    // so the bubble sat noticeably below and inside the real cursor, and the
    // error GREW toward the top of the frame where the pitch foreshortens
    // hardest. Hover near the top of the K and the warp appeared somewhere
    // around its middle.
    //
    // Unprojecting through the live camera matrix costs one matrix multiply a
    // frame and is exact by construction: whatever the camera is doing, the
    // point returned is the point under the cursor.
    const aspect = state.size.width / Math.max(state.size.height, 1);
    const grpScale = aspect / REF_ASPECT;
    const cam = state.camera;
    // z = 0.5 is any point along the ray; the direction is what matters.
    ray.current.set(pointer.x, pointer.y, 0.5).unproject(cam).sub(cam.position);
    let targetX = pointerLocal.current.x;
    let targetY = pointerLocal.current.y;
    if (Math.abs(ray.current.z) > 1e-6) {
      const hit = (PLANE_Z - cam.position.z) / ray.current.z;
      // Behind the camera: the plane is off-screen entirely (late descent).
      // Hold the last position rather than snapping the bubble across the word.
      if (hit > 0) {
        const s = Math.max(grpScale, 0.001);
        targetX = (cam.position.x + ray.current.x * hit) / s;
        targetY = (cam.position.y + ray.current.y * hit - PLANE_Y) / s;
      }
    }
    const damp = 1 - Math.exp(-11 * delta);
    const prevX = pointerLocal.current.x;
    const prevY = pointerLocal.current.y;
    pointerLocal.current.x += (targetX - prevX) * damp;
    pointerLocal.current.y += (targetY - prevY) * damp;
    (mat.uniforms.uPointer.value as THREE.Vector2).copy(pointerLocal.current);

    // Travel per second, damped and clamped, for the smear term. Clamped
    // because a cursor that leaves and re-enters the window jumps the width of
    // the screen in one frame, and an unclamped velocity would fire that whole
    // jump into the letterform as a shockwave.
    if (delta > 1e-4) {
      const vx = THREE.MathUtils.clamp((pointerLocal.current.x - prevX) / delta, -26, 26);
      const vy = THREE.MathUtils.clamp((pointerLocal.current.y - prevY) / delta, -26, 26);
      const vd = 1 - Math.exp(-6 * delta);
      pointerVel.current.x += (vx - pointerVel.current.x) * vd;
      pointerVel.current.y += (vy - pointerVel.current.y) * vd;
    }
    (mat.uniforms.uPointerVel.value as THREE.Vector2).copy(pointerVel.current);
    mat.uniforms.uPointerOn.value = pointerActive && !reducedMotion ? 1 : 0;

    // Fit to the viewport's real aspect. Computed from the HERO camera, not
    // the live one: the cloud is anchored in the world, so rescaling it as the
    // camera flies past would give away that it is a billboard. It has faded
    // out by 22% scroll, long before the standoff changes enough to matter.
    // The cloud was built to span FILL of the half-frame at REF_ASPECT, and
    // half-frame width is (distance * tan(fov/2)) * aspect — so the only term
    // that changes with the window is the aspect, and the correction is
    // exactly the ratio. Uniform, so the letterforms keep their proportions.
    const grp = groupRef.current;
    if (grp) {
      grp.scale.setScalar(state.size.width / Math.max(state.size.height, 1) / REF_ASPECT);
    }
  });

  if (!sampled) return null;

  return (
    <points
      ref={groupRef}
      position={[0, PLANE_Y, PLANE_Z]}
      frustumCulled={false}
      // Drawn before the terrain in the transparent pass so the rim composites
      // over the letters rather than the other way round.
      renderOrder={-1}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[sampled.positions, 3]} />
        <bufferAttribute attach="attributes-aAttr" args={[sampled.attrs, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[sampled.scales, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
