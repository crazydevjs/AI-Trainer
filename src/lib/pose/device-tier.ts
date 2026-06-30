// Best-effort device performance tier from static signals (cores / RAM / GPU /
// mobile). Used to pick the starting pose model; a runtime FPS monitor provides
// the dynamic safety net on top of this.

export type Tier = "low" | "mid" | "high";

let cached: Tier | null = null;

function gpuRenderer(): string {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") ||
      c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "") : "";
  } catch {
    return "";
  }
}

export function detectTier(): Tier {
  if (cached) return cached;
  if (typeof navigator === "undefined") return (cached = "mid");

  const cores = navigator.hardwareConcurrency || 4;
  // deviceMemory is Chrome-only (GB); assume 4 elsewhere.
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;
  const ua = navigator.userAgent || "";
  const mobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const r = gpuRenderer();

  const weakGpu = /Mali-4|Mali-G5[12]|Adreno \(TM\) [1-4]\d{2}|Adreno 5[0-3]\d|PowerVR/i.test(r);
  const strongGpu = /Apple (A1[4-9]|M[1-9])|Adreno \(TM\) [6-9]\d{2}|Mali-G[789]|RTX|Radeon|Iris/i.test(r);

  let tier: Tier;
  if (!mobile && cores >= 8) tier = "high";
  else if (cores >= 8 && mem >= 6 && !weakGpu) tier = "high";
  else if (cores <= 4 || mem <= 3 || weakGpu) tier = "low";
  else tier = "mid";

  if (strongGpu && tier !== "high") tier = tier === "low" ? "mid" : "high";
  return (cached = tier);
}
