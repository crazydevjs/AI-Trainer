// Weight units, conversions, increments, 1RM — with persisted unit preference.

export type Unit = "kg" | "lbs";

const KEY = "forge_weight_unit";
const LB_PER_KG = 2.20462;

export function loadUnit(): Unit {
  if (typeof window === "undefined") return "kg";
  return window.localStorage.getItem(KEY) === "lbs" ? "lbs" : "kg";
}
export function saveUnit(u: Unit) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, u);
}

/** Internal storage is always kg. */
export const toKg = (v: number, u: Unit) => (u === "kg" ? v : v / LB_PER_KG);
export const fromKg = (kg: number, u: Unit) => (u === "kg" ? kg : kg * LB_PER_KG);

export const displayWeight = (kg: number, u: Unit) =>
  Math.round(fromKg(kg, u) * 10) / 10;

export const fmtWeight = (kg: number, u: Unit) =>
  kg > 0 ? `${displayWeight(kg, u)} ${u}` : "Bodyweight";

/** Quick-add increments in the user's unit, returned in kg. */
export function incrementsKg(u: Unit): number[] {
  return u === "kg" ? [2.5, 5, 10] : [toKg(5, u), toKg(10, u), toKg(25, u)];
}

/** Estimated one-rep max (Epley). */
export const epley1RM = (kg: number, reps: number) =>
  reps > 0 ? Math.round(kg * (1 + reps / 30)) : Math.round(kg);

/** Total volume (kg) from a list of sets. */
export const totalVolume = (sets: { weightKg?: number; reps: number }[]) =>
  Math.round(sets.reduce((s, x) => s + (x.weightKg ?? 0) * x.reps, 0));
