// Lightweight geometry helpers over MoveNet keypoints.

export interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

export type KeypointMap = Record<string, Keypoint>;

/** MoveNet returns an array; index by name for ergonomic access. */
export function toMap(keypoints: Keypoint[]): KeypointMap {
  const map: KeypointMap = {};
  for (const k of keypoints) if (k.name) map[k.name] = k;
  return map;
}

/** Interior angle at point B (A-B-C) in degrees, 0-180. */
export function angle(a: Keypoint, b: Keypoint, c: Keypoint): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magAb = Math.hypot(abx, aby);
  const magCb = Math.hypot(cbx, cby);
  if (magAb === 0 || magCb === 0) return 180;
  let cos = dot / (magAb * magCb);
  cos = Math.max(-1, Math.min(1, cos));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Angle of a segment A->B relative to vertical (0 = perfectly upright). */
export function angleFromVertical(a: Keypoint, b: Keypoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.abs((Math.atan2(dx, dy) * 180) / Math.PI);
}

/** True if every named keypoint clears the confidence threshold. */
export function visible(map: KeypointMap, names: string[], min = 0.3): boolean {
  return names.every((n) => (map[n]?.score ?? 0) >= min);
}

/** Average a metric over whichever body side is more confidently tracked. */
export function bestSide(
  map: KeypointMap,
  leftNames: string[],
  rightNames: string[]
): "left" | "right" | null {
  const score = (names: string[]) =>
    names.reduce((s, n) => s + (map[n]?.score ?? 0), 0) / names.length;
  const l = score(leftNames);
  const r = score(rightNames);
  if (Math.max(l, r) < 0.3) return null;
  return l >= r ? "left" : "right";
}
