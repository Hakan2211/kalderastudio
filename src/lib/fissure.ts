/**
 * THE FISSURE — the page's one recurring line.
 *
 * Authored in percent space: long segments with small jags plus one broad sag
 * left-of-centre and a slow rise to the right — traced from the `Preloader
 * design` reference, which is a meander with fine breaks, not a zigzag of
 * even teeth.
 *
 * Scene 0 splits the page along it, and route transitions close the page back
 * along the SAME polyline (PRD §4: "crack-line wipe … the preloader motif
 * reused"). One source of truth so the motif can never drift between them.
 */
export const PTS: ReadonlyArray<readonly [number, number]> = [
  [0, 44.5],
  [5, 45.8],
  [9, 44.6],
  [13, 47.2],
  [17, 46.4],
  [21, 49.8],
  [25, 49.0],
  [28, 51.6],
  [32, 52.4],
  [36, 51.2],
  [39, 53.0],
  [44, 52.2],
  [48, 53.6],
  [52, 52.8],
  [55, 51.4],
  [58, 52.0],
  [62, 50.2],
  [66, 50.8],
  [70, 49.2],
  [74, 49.6],
  [78, 48.2],
  [83, 48.8],
  [88, 47.4],
  [93, 47.8],
  [100, 46.6],
];

const SEAM = PTS.map(([x, y]) => `${x}% ${y}%`);

/** The upper half of the field: everything above the seam. */
export const CLIP_TOP = `polygon(0% 0%, 100% 0%, ${[...SEAM].reverse().join(", ")})`;
/** The lower half: everything below it. */
export const CLIP_BOTTOM = `polygon(0% 100%, 100% 100%, ${[...SEAM].reverse().join(", ")})`;

/** Point at fraction t of the polyline's arc length, in percent space. */
export function pointAt(t: number): [number, number] {
  const lengths: number[] = [0];
  let total = 0;
  for (let i = 1; i < PTS.length; i++) {
    total += Math.hypot(PTS[i][0] - PTS[i - 1][0], PTS[i][1] - PTS[i - 1][1]);
    lengths.push(total);
  }
  const d = t * total;
  for (let i = 1; i < PTS.length; i++) {
    if (lengths[i] >= d) {
      const f = (d - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
      return [
        PTS[i - 1][0] + (PTS[i][0] - PTS[i - 1][0]) * f,
        PTS[i - 1][1] + (PTS[i][1] - PTS[i - 1][1]) * f,
      ];
    }
  }
  return [PTS[PTS.length - 1][0], PTS[PTS.length - 1][1]];
}

/** The seam as an SVG polyline `points` string for a pixel-space viewBox. */
export function seamPoints(w: number, h: number): string {
  return PTS.map(([x, y]) => `${(x / 100) * w},${(y / 100) * h}`).join(" ");
}
