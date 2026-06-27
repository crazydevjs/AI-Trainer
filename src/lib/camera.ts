// Camera selection (front/rear) + mirror handling, with persistence.

export type Facing = "user" | "environment";

const KEY = "forge_camera_facing";

export function loadFacing(): Facing {
  if (typeof window === "undefined") return "user";
  const v = window.localStorage.getItem(KEY);
  return v === "environment" ? "environment" : "user";
}

export function saveFacing(f: Facing) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, f);
}

/** Front cameras are mirrored (selfie view); rear cameras are not. */
export const isMirrored = (f: Facing) => f === "user";

export const facingLabel = (f: Facing) =>
  f === "user" ? "Front camera" : "Rear camera";

export const otherFacing = (f: Facing): Facing =>
  f === "user" ? "environment" : "user";
