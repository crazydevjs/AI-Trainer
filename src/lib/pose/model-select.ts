// Hybrid pose-model selection. 2D MoveNet (fast, multi-person + person-lock) is
// the default. We switch to BlazePose 3D only for exercises where 2D struggles
// with depth / occlusion / camera angle (lying presses, bent-over rows, hinges),
// where its better landmark estimation outweighs the extra cost.

export type PoseModel = "2D" | "3D";

// poseKeys (which already group families) that benefit from 3D. For these the
// limb often moves toward/away from the camera, so a 2D image-plane angle is
// foreshortened; BlazePose world landmarks give a depth-invariant joint angle.
//  bench-press  → bench, incline DB, flat DB, decline, close-grip
//  row          → barbell/dumbbell/t-bar/seated-cable/machine/chest-supported
//  pull-down    → lat pulldown (tracked from side/rear; machine blocks front)
//  shoulder-press, rdl (hip hinge)
const POSE_3D = new Set(["bench-press", "row", "shoulder-press", "rdl", "pull-down"]);

export function modelFor(poseKey?: string | null): PoseModel {
  return poseKey && POSE_3D.has(poseKey) ? "3D" : "2D";
}

export const use3DFor = (poseKey?: string | null) => modelFor(poseKey) === "3D";

import type { Tier } from "./device-tier";

/**
 * Hybrid choice = exercise need × device capability.
 *  - Low-end devices never start 3D (smoothness first).
 *  - Mid/high start 3D for 3D-exercises; the runtime FPS monitor downgrades
 *    mid-range devices if they can't sustain it.
 */
export function chooseModel(
  poseKey: string | null | undefined,
  tier: Tier,
  override: "auto" | "2d" | "3d" = "auto"
): PoseModel {
  if (override === "2d") return "2D";
  if (override === "3d") return "3D";
  if (!use3DFor(poseKey)) return "2D";
  return tier === "low" ? "2D" : "3D";
}

