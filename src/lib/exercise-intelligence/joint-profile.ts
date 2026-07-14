import type { JointInvolvement, JointProfile } from "./types";

export function primary(joint: string): JointInvolvement {
  return { joint, role: "primary" };
}
export function secondary(joint: string): JointInvolvement {
  return { joint, role: "secondary" };
}
export function stabilizer(joint: string): JointInvolvement {
  return { joint, role: "stabilizer" };
}

/** Terse constructor used by exercise-catalog.ts to define a joint profile. */
export function joints(entries: JointInvolvement[]): JointProfile {
  return { joints: entries };
}
