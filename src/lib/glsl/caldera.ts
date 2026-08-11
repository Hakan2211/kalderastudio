import { NOISE_GLSL } from "./noise";

/**
 * The caldera terrain — PRD §6.1.
 * Displaced plane + FBM heightfield sculpted into a crater profile,
 * obsidian surface, emissive crack veins driven by `uHeat`.
 *
 * The height function lives in a shared chunk so the vertex shader can
 * displace with it and the fragment shader can reason about the same field.
 *
 * ART DIRECTION (ref: `Direction A - 1 - Hero Design`)
 *
 * Three things separate this pass from the last one, and all three were
 * misreadings of the reference rather than tuning misses:
 *
 * 1. SHAPE. The crater is much SHALLOWER and much FURTHER AWAY than it looks.
 *    It drops about 15% of its own radius, and there is plateau visible either
 *    side of the ring — the "island floating in black" problem is solved by
 *    surrounding land, not by cropping the crater. Forcing it to over-fill the
 *    frame meant the only thing on screen was the near outer flank, and an
 *    outer flank is convex; no lighting makes a convex surface read as a hole.
 *    Concavity is carried by the rim LINE, the terrace break and the vent.
 *
 * 2. TEXTURE. The rock is not eroded, it is PAHOEHOE — sheets of lava that
 *    flooded the basin and froze, so the surface is long laminar bands that
 *    wrap AROUND the landform like contour lines. They run along the slope,
 *    not down it. Every earlier attempt built structure down the fall line
 *    (flow striations, then radial erosion channels) and that is the wrong
 *    axis, which is why the rock read first as fur and then as wood grain.
 *    See strata(). A voronoi fracture mosaic supplies the plate joints.
 *
 * 3. VEINS. Isolines of a noise field have no path — they wander, they clump
 *    where the field happens to flatten, and they cannot be made to go
 *    anywhere. The veins are now explicit CURVES: meandering rings around the
 *    rim plus radial runners that cross the rim and reach the frame edge, each
 *    with an arc-length parameter that carries a travelling heat pulse.
 */

const FIELD_GLSL = /* glsl */ `
// P3, ref "Direction B - 3": 0 for the whole approach, ramping to 1 over
// the final beat of the descent as the camera tips over the vent. It OPENS
// the vent into a throat — geometry, not just glow — which is why it lives in
// the shared chunk: the vertex stage digs the hole and the fragment stage
// lights it, and they have to agree on the shape.
uniform float uDescend;
#define R_RIM 15.0
// The vent is off-centre in BOTH axes — right of the axis and well back
// toward the far wall (local +Y is world -Z). Centred, it lands at 89% of
// frame height and half of it is cropped; nine units back it sits at 77%,
// which is where the reference puts it. Off-centre vents are also the normal
// case in the field, and the asymmetry is most of what stops the landform
// reading as a lathe-turned object.
#define PIT_AT vec2(2.0, 9.0)

// Seamless-in-angle sampling. Walking a circle of radius A in the noise plane
// as theta goes 0..2pi gives a periodic field with NO seam and no repetition —
// roughly 2*pi*A independent features around the ring. atan-based domains all
// tear at +/-pi; this cannot.
vec3 ringDomain(float a, float A, float z) {
  return vec3(cos(a) * A, sin(a) * A, z);
}

/**
 * atan(y, x) has undefined behaviour at x == 0 and this driver returns
 * garbage there. That is normally a measure-zero problem you never see — but
 * the plane is authored with an even segment count, so there is an entire
 * VERTEX COLUMN sitting at exactly x = 0. Every vertex in it got a bad angle,
 * every angle-driven term displaced it wrong, and the result was a hard crease
 * running straight down the middle of the terrain from the rim to the floor.
 *
 * Nudging x off the axis by a ten-thousandth costs nothing: the vertex pitch
 * is 0.078 world units, so no real sample can land in the gap this opens.
 */
float angleOf(vec2 p) {
  return atan(p.y, p.x + 1e-4);
}

// The rim is a meander, not a circle.
float rimWarp(float a) {
  return fbm(ringDomain(a, 1.6, 4.0), 3) * 3.30
       + fbm(ringDomain(a, 4.0, 8.0), 2) * 1.10;
}

// Rim height around the ring. Mostly even — a heavily breached near arc was
// only needed when the camera was too low to see over it, and at this
// elevation it just makes the ring look bitten. What is left is irregularity
// plus one shallow saddle so the outflow veins have somewhere to spill.
float rimHeightAt(float a) {
  // Two octaves, not three, and a narrow range. The crest is the only clean
  // line in the composition — it is what the wordmark is cut by — and a noisy
  // one reads as crumpled foil rather than as a ridge fifteen kilometres long.
  float irregular = 0.78 + 0.22 * (fbm(ringDomain(a, 2.2, 21.0), 2) * 0.5 + 0.5);
  float saddle = exp(-pow((a - 2.35) / 0.55, 2.0)) + exp(-pow((a + 1.05) / 0.45, 2.0));
  return irregular * (1.0 - 0.42 * saddle);
}

/**
 * FLOW BANDING — the surface structure this whole thing was missing.
 *
 * Zoom into the reference and the rock is not eroded at all. It is PAHOEHOE:
 * sheets of lava that flooded the basin and froze, so the surface is a stack
 * of long laminar bands that wrap AROUND the landform the way contour lines
 * wrap a map. They run along the slope, not down it. Every previous attempt
 * built structure that ran down the fall line — flow striations, then radial
 * erosion channels — and both are the wrong axis, which is why the rock kept
 * reading as fur, then as wood grain, then as corrugated iron.
 *
 * Sampling the noise domain on the terrain's own HEIGHT gives contour-
 * following bands for free, and it is the reason this reads as a landform
 * rather than as a shape with a texture on it: the pattern is a CONSEQUENCE
 * of the geometry instead of being painted across it. Bend a ridge and the
 * bands bend with it, because they are level sets of the very field that made
 * the ridge.
 *
 * The two in-plane terms are what stop it becoming a topographic map: a small
 * warp so the bands are not exact contours, and a slow variation along their
 * length so a band thickens, thins and dies out instead of circling the whole
 * crater at constant weight.
 */
float strata(vec2 p, float h, float freq, float seed, int oct) {
  float hw = h + fbm(vec3(p * 0.085, 17.0 + seed), 3) * 0.90;
  return ridged(vec3(hw * freq, p.x * 0.055, p.y * 0.055 + seed), oct);
}

/**
 * Where surface detail is allowed to be strong: the slopes, not the flats.
 *
 * The reference is mostly large calm passages with the fine structure
 * concentrated where the light rakes across a slope. When every square metre
 * of frame runs the same detail at the same contrast the eye reads visual
 * NOISE and stops believing any of it is a surface — detail has to be spent
 * somewhere and withheld everywhere else, or it stops being detail.
 */
float slopeZone(float rw, float r) {
  float band = exp(-pow((rw - R_RIM * 0.66) / 5.4, 2.0))      // inner wall
             + exp(-pow((rw - R_RIM * 1.34) / 5.8, 2.0)) * 0.75;  // outer flank
  return clamp(0.28 + band, 0.0, 1.0);
}

// Analytic crater silhouette: rim ridge -> terraced bowl -> central pit,
// sitting on a plateau that falls away past the apron.
float craterProfile(vec2 p, float a, float rw, float r) {
  float rim  = 2.30 * rimHeightAt(a) * exp(-pow((rw - R_RIM) / 3.10, 2.0));
  // DEPTH IS A FRAMING BUDGET. Rim crest to vent has to fit inside roughly
  // 6-8deg of vertical angle, because that is the gap the reference leaves
  // between them (far rim at ~48% of frame height, vent at ~70%). From this
  // camera every world unit of bowl depth spends about 1.3deg. At -7.6 total
  // the vent fell to 89% of frame height and half of it was cropped; -5.2 puts
  // it at 76%. What makes the bowl read concave is the far wall being visible
  // and separately lit, the terraces, and the channel fan converging on the
  // floor — not the number.
  //
  // And the shape is a FLAT-FLOORED PIT, not a dish. This is the difference
  // between a caldera and a funnel, and it is why the previous profile kept
  // reading as a cone: -k * (1 - smoothstep(0, R, rw)) is a smooth cosine
  // basin whose gradient never stops changing, so every radius looks like
  // every other radius and the eye is given nothing to locate the floor with.
  // A real caldera is three distinct zones — flat floor, steep wall band,
  // sharp crest — and the eye reads the CREASES between them, not the depth.
  //
  // FINALLY: IT IS MUCH SHALLOWER THAN IT LOOKS. Measured off the reference,
  // the basin drops about 15% of its own radius from crest to floor — call it
  // two units against a rim radius of fifteen. Every version of this that
  // dropped 6+ units read as a cone, and no amount of texture or lighting
  // rescued it, because a 23deg wall running unbroken from crest to floor IS
  // a cone. What sells the concavity is not depth: it is the rim LINE, the
  // vent, and the terrace break. Depth past a couple of units buys nothing
  // and costs the whole read.
  float wallT = smoothstep(R_RIM * 0.50, R_RIM * 0.94, rw);
  float bowl = -1.60 * (1.0 - wallT);
  // The vent is the exception — it is a genuine hole, narrow and deep, and it
  // is carrying the entire "this is not a hill" argument on its own.
  //
  // On the final beat (uDescend), the vent OPENS: the mouth widens by half
  // and the shaft drops another ten units, turning the pit into the fractured
  // throat of "Direction B - 3". Concentric ribs — frozen levels of the lava
  // column, the reference's tunnel rings — are carved into the shaft wall as
  // geometry so the raking vent-light catches them; their wavelength (1.2
  // world units) sits far above the 0.078 vertex pitch, so they displace
  // cleanly. Both terms are zero until the camera commits.
  float dpit = length(p - PIT_AT);
  float mouth = 2.00 + 2.60 * uDescend;
  float pit  = -(2.60 + 10.5 * uDescend) * exp(-pow(dpit / mouth, 2.0));
  pit += sin(dpit * 5.2) * 0.30 * uDescend * exp(-pow(dpit / (mouth * 1.15), 2.0));

  // The apron is DIRECTIONAL. Left, right and near, the ground has to run all
  // the way off the frame edge or the terrain curves away inside the picture
  // and reads as an island. BEHIND the far rim it must be gone, or it fills
  // the top of frame and there is no black field for the wordmark — and a flat
  // plateau does not hide behind a 3-unit rim, it sits above it in frame and
  // peeks over. So the caldera sits at the lip of an escarpment falling away
  // to the north; from the hero camera you only ever see the near half of the
  // ring and the asymmetry is invisible.
  float far = smoothstep(-0.15, 0.80, sin(a));   // local +Y is world -Z
  float fall = smoothstep(
    mix(R_RIM + 9.0, R_RIM + 1.5, far),
    mix(R_RIM + 24.0, R_RIM + 8.0, far),
    r
  );
  float apron = -40.0 * fall * fall;
  return rim + bowl + pit + apron;
}

/**
 * The landform WITHOUT its flow banding.
 *
 * Split out because the banding is a function of height, so it needs a height
 * to be a function of. Both stages also have to be reproducible in the
 * fragment shader — the shading has to sit exactly on the geometry — which is
 * why the base is handed out as a varying rather than recomputed there.
 */
float baseTerrain(vec2 p, out float rw, out float r, out float a) {
  r = length(p) + 1e-4;
  a = angleOf(p);

  // Meander the radius before the profile is evaluated — this is what stops
  // the silhouette from reading as a lathe-turned bowl.
  //
  // It has to fade out at BOTH ends, and the inner one is the important one.
  // rimWarp swings +/-4.4 units, so near the axis it dominates r entirely:
  // rw at r = 3 was a pure function of angle, every radius-driven term
  // downstream became a function of angle alone, and the floor grew a radial
  // starburst centred on the camera axis. This is a RIM meander; it has no
  // business anywhere near the middle of the crater.
  float warpAmt = smoothstep(0.0, R_RIM * 0.55, r)
                * (1.0 - smoothstep(R_RIM + 4.0, R_RIM + 16.0, r));
  rw = r + rimWarp(a) * warpAmt;

  float h = craterProfile(p, a, rw, r);

  float onLand = 1.0 - smoothstep(R_RIM + 10.0, R_RIM + 20.0, r);

  // Collapsed benches — terraces on the inner wall. A continuous slope from
  // crest to floor is a cone no matter how it is textured; one visible ledge
  // running around the bowl kills that reading. One octave only: two stacked
  // ridges at this frequency make a staircase whose steps land near the vertex
  // pitch, and the derivative normal reads them as hard horizontal dashes.
  //
  // The angular warp has to be faded in with radius for exactly the same
  // reason rimWarp does: near the axis, rw * 0.30 goes to zero and the +/-1.6
  // angular term is ALL that is left, so the terrace value becomes a pure
  // function of angle and the crater floor grows a radial starburst. Any term
  // that mixes an angular offset into a radial coordinate has this failure
  // mode, and the fix is always the same — no angular authority near r = 0.
  float benchFade = smoothstep(5.0, 11.0, r);
  float bench = ridged(vec3(rw * 0.30 + fbm(ringDomain(a, 2.0, 5.0), 2) * 1.6 * benchFade,
                            44.0, 0.0), 1);
  h += (bench - 0.5) * 1.00 * (1.0 - smoothstep(R_RIM * 0.30, R_RIM * 1.02, rw))
                            * benchFade * onLand;

  // Broad geological mass — low frequency, shapes bulk rather than texture.
  h += fbm(vec3(p * 0.030, 4.7), 3) * 1.05 * onLand;
  h += fbm(vec3(p * 0.075, 8.3), 2) * 0.42 * onLand;

  // A REGIONAL TILT. Everything above this line is a function of radius, and
  // a function of radius is a lathe: symmetric about the axis, symmetric left
  // to right in frame, and instantly readable as manufactured. One linear ramp
  // across the whole field breaks that globally — the ground genuinely sits
  // higher on the near left and falls away to the far right, the rim crest is
  // no longer level, and the light lands differently on the two halves. It is
  // one line and it does more for believability than any noise term here.
  h += (p.x * 0.075 + p.y * 0.042) * onLand;

  return h;
}

float terrainHeight(vec2 p, out float base) {
  float rw, r, a;
  base = baseTerrain(p, rw, r, a);

  float zone = slopeZone(rw, r) * (1.0 - smoothstep(R_RIM + 10.0, R_RIM + 20.0, r));

  // Two band scales, both shallow. Displacement detail is sampled once per
  // vertex and cannot be anti-aliased, so anything with real amplitude up here
  // shimmers under the camera move; the crisp version of this same field is
  // painted per-pixel in strataShade() where aa can fade it out.
  // BAND SPACING IS SET IN METRES OF ELEVATION, and that is the whole trick to
  // getting it right. freq 2.3 puts a band every 0.43 world units of height —
  // and because contour lines BUNCH on a steep face, the crater wall came out
  // as corduroy. freq 0.85 is a band every 1.2 units, which stays legible
  // where the wall is steepest and opens out into broad sheets on the floor
  // and the plateau, exactly as flooded lava does.
  return base
       + (strata(p, base, 0.55, 0.0, 2) - 0.52) * 0.26 * zone
       + (strata(p, base, 1.30, 3.7, 2) - 0.52) * 0.05 * zone;
}
`;

export const CALDERA_VERT = /* glsl */ `
precision highp float;

varying vec3 vWorldPos;
varying vec2 vPlane;
varying float vRadius;
varying float vBase;

${NOISE_GLSL}
${FIELD_GLSL}

void main() {
  vec3 pos = position;
  // Plane is authored in XY then rotated -90deg on X, so displace along +Z
  // in local space; that becomes world +Y.
  vec2 p = pos.xy;
  float base;
  pos.z += terrainHeight(p, base);
  vBase = base;

  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorldPos = world.xyz;
  vPlane = p;
  vRadius = length(p);

  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/**
 * Fragment-only chunk. This lives outside FIELD_GLSL because it calls fwidth(),
 * and FIELD_GLSL is included in the VERTEX shader too — derivative functions
 * are a fragment-stage feature, so sharing it silently fails vertex
 * compilation and the terrain simply stops drawing with nothing in the console.
 */
const VEIN_GLSL = /* glsl */ `
/**
 * PATHED VEINS.
 *
 * The old field was an isoline of noise: |fbm(p)| < w. That has no path. It
 * cannot be aimed, it pools wherever the field goes flat — which is what put
 * every crack in two or three clumps — and it has no arc-length parameter, so
 * nothing can travel along it.
 *
 * A vein is now an explicit curve with a parameter s, and the shader
 * measures distance to it. Two families:
 *
 *   RINGS    r = f(theta)  — fissures that follow the rim contour around the
 *                            crater. Distance is |r - f(theta)|, which is
 *                            exact along the radial and near-exact overall
 *                            because f is a slow meander on a big circle.
 *   RUNNERS  theta = g(r)  — outflow channels that cross the rim and run down
 *                            the flank to the frame edge. Distance is the arc
 *                            length |wrap(theta - g(r))| * r.
 *
 * Everything the reference has and the old field could not do falls out of
 * having s: heat pulses that TRAVEL along the crack, beads of ember spaced
 * along it, and a presence window so a vein fades in and out over its length
 * instead of being switched on by an unrelated mask.
 */

// Signed angular difference, wrapped to [-pi, pi] without a branch.
float angWrap(float d) { return atan(sin(d), cos(d)); }

// Accumulator: x = core (hairline, emissive), y = halo (bounce on the rock),
// z = wide additive glow.
void addVein(inout vec3 acc, float dist, float s, float live, float heat,
             float t, float seed, float weight) {
  // Width in WORLD units, floored at roughly one pixel by the distance
  // field's own screen derivative. Without the floor the crack is thinner
  // than the pixel grid over most of the frame and samples to a dithered
  // dashed line; with it, the line holds the same weight as the camera
  // descends instead of fattening as it approaches.
  float px = fwidth(dist);
  float wCore = max(mix(0.022, 0.075, heat), px * 0.9);
  float wHalo = max(mix(0.15, 0.46, heat), px * 2.2);
  float wGlow = wHalo * 3.0;

  // The pulse TRAVELS. This is the whole point of having an arc parameter:
  // heat runs along the fissure the way it does in a real lava tube, instead
  // of the whole network breathing in place.
  float pulse = 0.42 + 0.58 * pow(
    0.5 + 0.5 * sin(s * 1.15 - t * 0.55 + seed * 3.1), 2.2);
  // Beads — the crack is not evenly bright along its length; it opens into
  // hot pockets. Cheap 1D hash-ish along s.
  float bead = 0.55 + 0.75 * smoothstep(0.35, 0.95,
    fbm(vec3(s * 1.9, seed, t * 0.11), 2) * 0.5 + 0.5);

  float amp = live * weight * (0.45 + 0.55 * pulse) * bead;

  acc.x = max(acc.x, (1.0 - smoothstep(0.0, wCore, dist)) * amp);
  acc.y = max(acc.y, (1.0 - smoothstep(0.0, wHalo, dist)) * amp);
  float g = 1.0 - smoothstep(0.0, wGlow, dist);
  acc.z = max(acc.z, g * g * amp);
}

/**
 * How "alive" the vein is at this point along its length.
 *
 * A slow window, so a fissure runs bright for eight or ten world units and
 * then dies out, rather than being stippled on and off — and, critically, so
 * that MOST of every path is dark. PRD §2.3 puts the frame at 95% monochrome.
 * A vein network that is continuously lit end to end reads as neon piping; the
 * reference has maybe six lit segments in the whole picture and everything
 * between them is cold black rock. The threshold pair below is the dial for
 * that ratio and it wants to sit high.
 */
float veinLive(float s, float seed) {
  float w = fbm(vec3(s * 0.26, seed, 0.0), 3) * 0.5 + 0.5;
  return smoothstep(0.50, 0.74, w);
}

vec3 veinField(vec2 p, float heat, float t) {
  float r = length(p) + 1e-4;
  float a = angleOf(p);
  vec3 acc = vec3(0.0);

  // ── Rings: fissures tracing the rim contour ───────────────────────────
  // Radii chosen so one sits just inside the crest, one just outside on the
  // flank, and one low on the inner wall. That is the reference's reading:
  // heat gathers along the ring and on the outer shoulder, and the bowl
  // itself stays cold black rock so the pit can read.
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float seed = 7.0 + fi * 23.0;
    float base = R_RIM * (0.72 + fi * 0.24);
    // A tight meander. In the reference the fissures TRACE the rim — the ring
    // is legible as a ring. The old amplitude (1.9 + fi*0.8) let the paths
    // wander mid-flank and the network read as scattered scribbles.
    float rr = base + fbm(ringDomain(a, 2.4 + fi * 0.7, seed), 3) * (1.1 + fi * 0.4);
    // Arc length along the ring, so the pulse speed is uniform in world units.
    float s = a * base;
    // The crest ring (i=1, at 0.96 R_RIM) runs nearly continuous — it is the
    // one line in the reference that reads the whole way round; the others
    // stay episodic.
    float live = (i == 1)
      ? max(veinLive(s, seed), 0.4)
      : veinLive(s, seed);
    addVein(acc, abs(r - rr), s, live, heat, t, seed, 0.95 - fi * 0.22);
  }

  // ── Runners: outflow down the flank, off the frame ────────────────────
  // These are what the reference has and the old field never could: a crack
  // that starts on the rim, crosses it, and keeps going until it leaves the
  // picture. They are the lines that give the frame its scale.
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float seed = 61.0 + fi * 37.0;
    // Spread the launch angles unevenly — evenly spaced runners read as a
    // compass rose. The wander amplitude grows with radius so a runner leaves
    // the rim as a crack and arrives at the frame edge as a river.
    float a0 = fi * 2.094 + fbm(vec3(seed, 0.0, 0.0), 1) * 2.2;
    float th = a0 + fbm(vec3(r * 0.075, seed, 0.0), 3) * (0.30 + r * 0.022);
    float d = abs(angWrap(a - th)) * r;
    // Runners live from mid-wall outward; they do not exist on the floor.
    float span = smoothstep(R_RIM * 0.40, R_RIM * 0.66, r);
    addVein(acc, d, r, veinLive(r * 0.8, seed) * span, heat, t, seed, 0.62);
  }

  // Veins live on the terrain, not in the sky.
  acc *= 1.0 - smoothstep(R_RIM + 11.0, R_RIM + 19.0, r);
  return acc;
}
`;

export const CALDERA_FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uHeat;
uniform vec3  uPointer;      // world-space pointer light position
uniform float uPointerAmt;
uniform vec3  uObsidian;
uniform vec3  uAsh;
uniform vec3  uEmber;
uniform vec3  uMagmaDeep;
uniform vec3  uHeatWhite;
uniform vec3  uKeyDir;
uniform vec3  uHaze;
uniform float uNearFade;     // world distance where the near crush starts
uniform float uFarFade;      // world distance where aerial haze saturates

varying vec3 vWorldPos;
varying vec2 vPlane;
varying float vRadius;
varying float vBase;

${NOISE_GLSL}
${FIELD_GLSL}
${VEIN_GLSL}

/**
 * The fracture mosaic — the surface term that actually makes this read as
 * stone. Two voronoi layers: big plates with a hairline joint between them,
 * and a finer shatter inside each plate. cellEdges is ~0 exactly on a joint,
 * so 1 - smoothstep paints the joint and leaves the plate interiors FLAT,
 * which is the property fbm can never have and the reason noise-only rock
 * always looks like fabric.
 */
float fractureField(vec2 p, float aa) {
  float j1 = 1.0 - smoothstep(0.0, 0.075, cellEdges(p * 1.05 + fbm(vec3(p * 0.4, 3.0), 2) * 0.6));
  float j2 = 1.0 - smoothstep(0.0, 0.090, cellEdges(p * 3.30 + fbm(vec3(p * 1.1, 9.0), 2) * 0.4));
  return j1 * 0.65 + j2 * 0.45 * aa;
}

/**
 * The band crests, at pixel rate, contrast-crushed into hard edges.
 *
 * This — not the normal map — is what paints the pale ridge lines in the
 * reference. A smooth normal perturbation on its own gives soft grey clouds
 * that read as smoke; real pahoehoe goes from black to a silver edge within a
 * couple of pixels where a frozen band catches the raking key. Crushing
 * ridged through a narrow smoothstep is the cheapest way to get that edge.
 *
 * Same field and same height coordinate the displacement used, three octaves
 * further up — so the fine bands sit exactly on the coarse ones the geometry
 * already carries rather than crossing them.
 */
float strataShade(vec2 p, float base, float zone, float aa) {
  float b1 = strata(p, base, 0.55, 0.0, 3);
  float b2 = strata(p, base, 1.30, 3.7, 3);
  float b3 = strata(p, base, 3.10, 9.1, 2);
  // Narrow windows. A wide smoothstep gives a soft gradient from band to band
  // and the surface reads as crumpled CLOTH — which is what the previous
  // numbers produced. Real frozen lava has a hard bright edge on the crest of
  // each band and falls to black within a couple of pixels; the width of these
  // windows is precisely the difference between silk and stone.
  float s = smoothstep(0.68, 0.78, b1) * 0.30
          + smoothstep(0.70, 0.81, b2) * 0.20
          + smoothstep(0.71, 0.85, b3) * 0.15 * aa;
  return s * (0.20 + 0.80 * zone);
}

void main() {
  // Geometric normal from screen-space derivatives — the mesh is dense
  // enough that this reads as faceted volcanic glass rather than low-poly.
  vec3 N = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
  if (N.y < 0.0) N = -N;
  vec3 Ngeo = N;

  vec2 p = vPlane;
  float r = length(p) + 1e-4;
  float a = angleOf(p);

  float camDist = length(cameraPosition - vWorldPos);

  // Sampling rate, and with it a hand-rolled mip bias. The lower half of the
  // frame is near-grazing terrain where one pixel spans many world units;
  // without this the fine octaves crawl. Distance is folded in as well, which
  // doubles as a cheap depth-of-field: far rock loses its top octaves and goes
  // soft while the near rock stays crisp.
  float lod = length(vec2(fwidth(p.x), fwidth(p.y)));
  float aa = (1.0 - smoothstep(0.010, 0.075, lod))
           * (1.0 - smoothstep(uFarFade * 0.55, uFarFade * 1.25, camDist) * 0.75);

  // ── Micro-relief ────────────────────────────────────────────────────
  // Fracture joints perturb the normal: a joint is a groove, so the rock on
  // either side of it catches the key differently and the plate edges pop.
  float fe = 0.020;
  float f0 = fractureField(p * 2.6, aa);
  float fx = fractureField((p + vec2(fe, 0.0)) * 2.6, aa);
  float fz = fractureField((p + vec2(0.0, fe)) * 2.6, aa);
  N = normalize(N + vec3(-(fx - f0), 0.0, -(fz - f0)) * 0.58 * aa);

  // Isotropic sandpaper grain on top. Basalt is matte and gritty at every
  // scale; without this the plates look injection-moulded.
  float ge = 0.030;
  float gC = fbm(vec3(p * 4.2, 77.0), 2);
  float gX = fbm(vec3((p + vec2(ge, 0.0)) * 4.2, 77.0), 2);
  float gZ = fbm(vec3((p + vec2(0.0, ge)) * 4.2, 77.0), 2);
  N = normalize(N + vec3(-(gX - gC), 0.0, -(gZ - gC)) * 0.32 * aa);
  float grain = gC * 0.5 + 0.5;

  vec3 V = normalize(cameraPosition - vWorldPos);

  // ── Basalt surface ──────────────────────────────────────────────────
  float rw = r + rimWarp(a) * smoothstep(0.0, R_RIM * 0.55, r)
                            * (1.0 - smoothstep(R_RIM + 4.0, R_RIM + 16.0, r));
  float zone = slopeZone(rw, r) * (1.0 - smoothstep(R_RIM + 10.0, R_RIM + 20.0, r));
  float crest = strataShade(p, vBase, zone, aa);
  float joint = f0;

  // Slope drives the material: flats collect pale ash, steep faces are bare
  // glassy rock. That split is most of the value structure in the reference.
  float slope = 1.0 - clamp(Ngeo.y, 0.0, 1.0);

  // Albedo stays almost flat. Painting the crest pattern into the base colour
  // is what turned the surface into marble: real basalt is one dark value and
  // ALL of its structure comes from how the light rakes the relief.
  float rough = mix(0.32, 0.86, clamp(slope * 1.1 + (1.0 - crest) * 0.40, 0.0, 1.0));
  vec3 albedo = mix(uObsidian, uAsh, clamp(crest * 0.34 + grain * 0.11, 0.0, 1.0));
  albedo = mix(albedo, uObsidian, smoothstep(0.40, 0.90, slope) * 0.45);
  // Joints are packed with fine ash and read a touch paler than the plates.
  albedo = mix(albedo, uAsh, joint * 0.10 * aa);
  // Joints are packed shadow, not highlight — the plate EDGES are what the
  // eye reads as stone, and they read by going darker than the plate faces.
  albedo *= 1.0 - joint * 0.45 * aa;

  vec3 L = normalize(uKeyDir);
  // 1.45, not 1.25 — the contrast power is what crushes the mid-grey plateau
  // toward black while the raking wall barely moves (see the key-elevation
  // note in Terrain.tsx). §2.3: the frame is 95% obsidian.
  float ndl = pow(max(dot(N, L), 0.0), 1.45);

  vec3 keyCol = vec3(1.0, 0.985, 0.962);
  vec3 lit = albedo * keyCol * ndl * 5.6;

  // Glassy sheen — the hard silver edge on a crest that happens to face key.
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), mix(190.0, 20.0, rough));
  lit += keyCol * spec * (0.09 + 0.42 * crest) * (1.0 - rough * 0.65);

  // Cavity/AO. Depth below the rim line is a good enough proxy and costs
  // nothing; the bowl has to be darker than the plateau or it keeps reading
  // as a mound.
  float inBowl = 1.0 - smoothstep(R_RIM * 0.85, R_RIM * 1.18, r);
  float depthAO = clamp((2.8 - vWorldPos.y) / 6.5, 0.0, 1.0);
  // 0.55, not 0.30. A crater floor in the reference is DARK but readable —
  // you can see the fracture pattern on it. Crushing it to 5% of key made the
  // bowl a black void with a red smear in it, which is not depth, it is a
  // hole in the picture: the eye has nothing to measure the far wall against
  // and the whole thing flattens back out.
  float ao = mix(1.0, 0.55, depthAO * inBowl);
  // The vent gets a much harder cavity term, over a MUCH smaller area. A small
  // black ellipse is the single cue that says "hole in the ground"; a large
  // one just eats the floor that makes the ellipse legible.
  ao *= mix(1.0, 0.14, smoothstep(3.4, 1.3, length(p - PIT_AT)));
  // Joints are self-shadowed.
  ao *= 1.0 - joint * 0.42 * aa;
  lit *= ao;

  // Sky/ambient: up-facing rock catches a sliver of night sky. Tiny — ambient
  // is what greys out the blacks and flattens the whole frame.
  lit += albedo * vec3(0.42, 0.43, 0.48) * (0.16 + 0.84 * max(N.y, 0.0)) * 0.19 * ao;

  // ── Heat ────────────────────────────────────────────────────────────
  vec3 vein = veinField(p, uHeat, uTime);
  float core = vein.x;
  float halo = vein.y;
  float glow = vein.z;

  float flicker = 0.88 + 0.12 * fbm(vec3(p * 0.9, uTime * 0.9), 2);

  vec3 emissive = mix(uMagmaDeep, uEmber, smoothstep(0.02, 0.38, core));
  emissive = mix(emissive, uHeatWhite, smoothstep(0.40, 0.88, core) * (0.65 + 0.35 * uHeat));
  emissive *= core * flicker * (13.0 + 9.0 * uHeat);

  // The rock next to a vein is lit BY the vein.
  vec3 bounce = mix(uMagmaDeep, uEmber, 0.62) * halo * halo * (0.45 + 1.3 * uHeat) * flicker;
  lit += albedo * bounce * 1.6 + bounce * 0.03;

  // The glow skirt — additive, so it survives the dark albedo.
  emissive += mix(uMagmaDeep, uEmber, 0.85) * glow * flicker * (0.26 + 0.75 * uHeat);

  // ── The vent as a light source ──────────────────────────────────────
  // A warm pool at the bottom of the bowl that lights the far wall from
  // below. This is a depth cue as much as a heat cue: the far wall is now
  // rim-lit from a source the near wall does not see, so the two walls stop
  // sharing one flat value and the bowl gains an interior.
  // The source rides the throat floor down as the vent opens (P3).
  vec3 ventPos = vec3(PIT_AT.x, -4.0 - 9.0 * uDescend, -PIT_AT.y);
  vec3 toVent = ventPos - vWorldPos;
  float ventD = length(toVent);
  float ventFall = 1.0 / (1.0 + ventD * ventD * 0.030);
  float ventNdl = max(dot(N, toVent / max(ventD, 1e-3)), 0.0);
  vec3 ventLit = mix(uMagmaDeep, uEmber, 0.55) * ventFall * ventNdl
               * (0.55 + 3.2 * uHeat) * flicker;
  // The wash stands down as the throat opens: at the end frame the rings and
  // the core carry the heat, and the walls between them have to fall back to
  // black glass or the whole frame reads as one brown wash ("Direction B - 3"
  // keeps its corners obsidian even with the furnace at centre).
  lit += albedo * ventLit * 3.0 * (1.0 - 0.45 * uDescend);

  // The pit's own glow, mostly hidden at rest, blooms with heat.
  float pit = exp(-pow(length(p - PIT_AT) / 2.6, 2.0));
  vec3 pitGlow = mix(uMagmaDeep, uHeatWhite, 0.25 + 0.45 * uHeat)
               * pit * (0.035 + 1.2 * uHeat * uHeat) * flicker;

  // ── The throat (P3, ref "Direction B - 3") ──────────────────────────
  // The end-of-descent frame: everything here is gated by uDescend and by
  // proximity to the vent, so the hero and the whole approach never see it.
  float dpit = length(p - PIT_AT);
  // Tight. The first pass masked to dpit < 10, which at the descent fov is
  // the ENTIRE frame — every fracture joint lit and the picture went
  // wall-to-wall dragon-skin. §2.3 still applies down here: the reference is
  // mostly black glass, with the heat living in the crevices and the depth.
  float throat = uDescend * (1.0 - smoothstep(4.5, 8.0, dpit));

  // Concentric molten rings converging on the core — the reference's tunnel
  // read. Lines of sin(dpit) so they are exactly concentric with the shaft
  // (and with the geometric ribs the vertex stage carved, whose light they
  // carry); fwidth-floored like the veins so they hold one hairline weight,
  // broken along their length by a slow noise gate so they read as cooling
  // fissure levels rather than as printed rings.
  // Broken arcs, not printed circles: the gate has no floor, so where the
  // noise says cold the ring simply is not there. The reference's tunnel
  // rings are fissure levels — every one of them dies and re-ignites as it
  // goes round.
  float rphase = dpit * 3.1 - uTime * 0.22;
  float ringLine = 1.0 - smoothstep(0.0, max(0.14, fwidth(rphase) * 1.4), abs(sin(rphase)));
  float ringGate = smoothstep(0.48, 0.80, fbm(vec3(p * 0.60, 31.0), 2) * 0.5 + 0.5);
  vec3 ringCol = mix(uEmber, uHeatWhite, 1.0 - smoothstep(0.5, 4.5, dpit));
  // Rings DISSOLVE into the core rather than circling it — a ring drawn
  // through the glow reads as an egg-shaped outline around the light, which
  // instantly flattens the funnel back into a decal.
  float ringNearCore = smoothstep(1.3, 2.3, dpit);
  emissive += ringCol * ringLine * ringGate * ringNearCore * throat
            * (1.5 + 2.6 * throat) * flicker;

  // The fracture mosaic turns to shards of black glass reflecting the heat —
  // but SPARSELY. Lighting every joint made the walls read as cellular
  // membrane; a high-threshold gate keeps whole plates dark between the few
  // crevices that carry light, which is the actual texture of the reference.
  float jointGate = smoothstep(0.55, 0.85, fbm(vec3(p * 0.85, 53.0), 2) * 0.5 + 0.5);
  emissive += mix(uMagmaDeep, uEmber, 0.70) * joint * jointGate * throat * 0.8 * flicker;

  // The heat core. A COMPACT white-hot heart at the bottom of the shaft,
  // squared on uDescend so it arrives late and hard; it runs far past 1.0 on
  // purpose — this is what the bloom pass is FOR (threshold 0.95). Kept
  // narrow: a wide pool floods the funnel beige and the walls lose the black
  // that makes the heat read as deep.
  float corePool = exp(-pow(dpit / 1.05, 2.0));
  emissive += mix(uEmber, uHeatWhite, 0.85) * corePool * uDescend * uDescend
            * (3.5 + 4.5 * flicker);

  // ── Pointer light — the ember cursor lights the terrain locally ─────
  float pd = length(vWorldPos - uPointer);
  float pf = exp(-pd * 0.42) * uPointerAmt;
  vec3 pointerLit = uEmber * pf * (0.25 + 0.75 * max(dot(N, normalize(uPointer - vWorldPos)), 0.0));

  vec3 color = lit + emissive + pitGlow + albedo * pointerLit * 6.0 + pointerLit * 0.05;

  // ── Depth ───────────────────────────────────────────────────────────
  // The single biggest thing missing from the last pass. Everything was one
  // value, so the crater sat flat on the screen like a decal.
  //
  // FAR: aerial perspective. Distant rock loses contrast toward a very dark,
  // slightly cool haze. It is not a fog bank — the lift is a few percent —
  // but it is what separates the far rim from the near wall and gives the
  // bowl an inside and an outside.
  float aer = 1.0 - exp(-max(camDist - uNearFade, 0.0) / uFarFade);
  color = mix(color, uHaze, aer * 0.82);
  // Warm haze pooling in the bowl over the glow — light scattering in the
  // ash, and a second, independent read on how deep the hole is.
  float pool = (1.0 - smoothstep(-1.0, 6.0, vWorldPos.y)) * inBowl;
  color += mix(uMagmaDeep, uEmber, 0.35) * pool * aer * (0.030 + 0.24 * uHeat);

  // NEAR: crush the foreground. The bottom of frame is rock a few metres from
  // the lens with nothing behind it, and in the reference it is nearly black —
  // a dark near edge is what makes the eye travel INTO the frame instead of
  // reading it as a wall. This is the foreground half of the depth ramp and
  // it does as much work as the haze.
  // The whole frame spans only ~25 world units of depth, so this ramp has to
  // be narrow and sit right at the front edge. A wide one swallows the entire
  // lower half of the picture instead of just the near lip.
  float nearK = smoothstep(uNearFade + 2.0, uNearFade - 8.0, camDist);
  // …but the crush stands down over the final beat. At the bottom of the
  // descent EVERYTHING is a few units from the lens; the near ramp that gave
  // the hero its dark leading edge would grey the whole molten frame out.
  // "Direction B - 3" is lit wall-to-wall by its own core.
  color *= mix(1.0, 0.20, nearK * (1.0 - 0.85 * uDescend));

  // ── Atmosphere / alpha ──────────────────────────────────────────────
  // The far plain dissolves into ALPHA, not into a fog colour. That kills the
  // plane's edge and — because this canvas sits over the DOM — it is what
  // lets the hero wordmark read above the rim while the rim itself still
  // occludes the letters it crosses.
  //
  // Fade by HEIGHT, not by radius: the apron is directional, so no radial ring
  // can follow it, but "the land has dropped below the plateau" is true
  // wherever it happens to fall. The radial term is only a backstop so the
  // plane's literal edge can never appear.
  float fade = max(
    1.0 - smoothstep(-22.0, -7.0, vWorldPos.y),
    smoothstep(30.0, 34.0, vRadius)
  );
  color += uMagmaDeep * 0.10 * uHeat * fade;

  gl_FragColor = vec4(color, 1.0 - fade);
  #include <colorspace_fragment>
}
`;
