// One-Euro smoothing parameters, tunable from the hidden Developer settings.

export interface SmoothingParams {
  minCutoff: number;
  beta: number;
  dCutoff: number;
}

export const SMOOTHING_DEFAULTS: SmoothingParams = {
  minCutoff: 1.7,
  beta: 0.015,
  dCutoff: 1.0,
};

const KEY = "forge_smoothing";

export function loadSmoothing(): SmoothingParams {
  if (typeof window === "undefined") return { ...SMOOTHING_DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...SMOOTHING_DEFAULTS };
    const p = JSON.parse(raw);
    return {
      minCutoff: Number(p.minCutoff) || SMOOTHING_DEFAULTS.minCutoff,
      beta: Number.isFinite(+p.beta) ? +p.beta : SMOOTHING_DEFAULTS.beta,
      dCutoff: Number(p.dCutoff) || SMOOTHING_DEFAULTS.dCutoff,
    };
  } catch {
    return { ...SMOOTHING_DEFAULTS };
  }
}

export function saveSmoothing(p: SmoothingParams) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  }
}

export function resetSmoothing() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}
