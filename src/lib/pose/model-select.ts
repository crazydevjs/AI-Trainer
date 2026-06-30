// Hybrid pose-model selection. 2D MoveNet (fast, multi-person + person-lock) is
// the default. We switch to BlazePose 3D only for exercises where 2D struggles
// with depth / occlusion / camera angle (lying presses, bent-over rows, hinges),
// where its better landmark estimation outweighs the extra cost.

export type PoseModel = "2D" | "3D";

// poseKeys (which already group families) that benefit from 3D:
//  bench-press  → bench, incline DB, flat DB, decline, close-grip
//  row          → barbell/dumbbell/t-bar/seated-cable/machine/chest-supported
//  shoulder-press, rdl (hip hinge)
const POSE_3D = new Set(["bench-press", "row", "shoulder-press", "rdl"]);

export function modelFor(poseKey?: string | null): PoseModel {
  return poseKey && POSE_3D.has(poseKey) ? "3D" : "2D";
}

export const use3DFor = (poseKey?: string | null) => modelFor(poseKey) === "3D";
