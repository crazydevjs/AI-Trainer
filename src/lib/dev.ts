// Developer-mode flags (hidden from normal users). All client-side localStorage.

export type EngineOverride = "auto" | "2d" | "3d";

const DEV = "forge:dev";
const HUD = "forge:devhud";
const ENG = "forge:engine";

export function isDevUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return (
    process.env.NODE_ENV !== "production" ||
    window.localStorage.getItem(DEV) === "1"
  );
}

export function unlockDev() {
  if (typeof window !== "undefined") window.localStorage.setItem(DEV, "1");
}

export function getHudEnabled(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(HUD) === "1";
}
export function setHudEnabled(v: boolean) {
  if (typeof window !== "undefined") window.localStorage.setItem(HUD, v ? "1" : "0");
}

export function getEngineOverride(): EngineOverride {
  if (typeof window === "undefined") return "auto";
  const v = window.localStorage.getItem(ENG);
  return v === "2d" || v === "3d" ? v : "auto";
}
export function setEngineOverride(v: EngineOverride) {
  if (typeof window !== "undefined") window.localStorage.setItem(ENG, v);
}
