/**
 * The Kaldera mark — single source of truth (brand Direction 3).
 *
 * A caldera seen from above: a thick ring of cooled crust, fractured into
 * plates by radial cracks, with the eastern arc still molten. Everything the
 * brand needs is derived from the numbers below — the SVG favicon, the inline
 * React mark and the rasterised touch icon are all generated from this file by
 * `scripts/build-brand.mjs`, so the mark can never drift between surfaces.
 *
 * Geometry is authored in a 64×64 box; every consumer scales it.
 */

export const OBSIDIAN = "#0B0B0D";
export const PUMICE = "#E8E5DF";
export const EMBER = "#FF551F";

export const BOX = 64;
export const CX = 32;
export const CY = 32;
export const R_OUT = 24;
export const R_IN = 13;

/** The molten arc, in degrees (SVG convention: 0 = east, +y = down). */
export const EMBER_FROM = -63;
export const EMBER_TO = 57;

/**
 * Where the crust has split. Two of these sit exactly on the molten arc's
 * edges — the colour change has to happen at a fracture, not mid-plate, or the
 * mark reads as a pie chart instead of broken ground.
 */
export const CRACK_ANGLES = [-63, 14, 57, 99, 143, 191, 246];

/** Half-width of a crack in mark units. */
export const CRACK_HALF = 1.15;

const rad = (deg) => (deg * Math.PI) / 180;

/** Deterministic jitter — the cracks must be identical in every output. */
function jitter(seed) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280 - 0.5;
  };
}

/**
 * One crack, as a list of points crossing the ring from inside to outside.
 * Overshoots both radii so the stroke's round cap never leaves a sliver of
 * crust bridging the gap at the rim.
 */
export function crackPoints(angle, index) {
  const next = jitter(index + 1);
  const radii = [10.4, 13.8, 16.6, 19.4, 22.2, 25.2, 27.4];
  return radii.map((r, i) => {
    // Ends stay true to the nominal angle; the middle wanders.
    const edge = i === 0 || i === radii.length - 1;
    const a = rad(angle + (edge ? 0 : next() * 13));
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  });
}

export const CRACKS = CRACK_ANGLES.map(crackPoints);

/** The molten arc as an annular wedge path. */
export function emberWedgePath() {
  const p = (r, deg) => {
    const a = rad(deg);
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  };
  const [ox, oy] = p(R_OUT, EMBER_FROM);
  const [ex, ey] = p(R_OUT, EMBER_TO);
  const [ix, iy] = p(R_IN, EMBER_TO);
  const [sx, sy] = p(R_IN, EMBER_FROM);
  const f = (n) => n.toFixed(2);
  return (
    `M${f(ox)} ${f(oy)}` +
    `A${R_OUT} ${R_OUT} 0 0 1 ${f(ex)} ${f(ey)}` +
    `L${f(ix)} ${f(iy)}` +
    `A${R_IN} ${R_IN} 0 0 0 ${f(sx)} ${f(sy)}Z`
  );
}

/** True when a bearing falls inside the molten arc (handles the 0° wrap). */
export function isEmber(deg) {
  let d = ((deg - EMBER_FROM) % 360 + 360) % 360;
  return d <= ((EMBER_TO - EMBER_FROM) % 360 + 360) % 360;
}

export function crackPolylineAttr(points) {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
}
