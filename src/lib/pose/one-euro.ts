// One-Euro filter — adaptive low-pass that smooths jitter when still but stays
// responsive (low lag) during fast motion. FPS-independent (uses timestamps).
// Ref: Casiez et al., "1€ Filter" (CHI 2012).

import type { Keypoint } from "./angles";

export class OneEuroFilter {
  private xPrev = 0;
  private dxPrev = 0;
  private tPrev = 0;
  private started = false;

  constructor(
    private minCutoff = 1.7,
    private beta = 0.015,
    private dCutoff = 1.0
  ) {}

  private alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(x: number, t: number): number {
    if (!this.started) {
      this.started = true;
      this.xPrev = x;
      this.dxPrev = 0;
      this.tPrev = t;
      return x;
    }
    const dt = Math.max(1 / 120, t - this.tPrev);
    this.tPrev = t;

    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const edx = aD * dx + (1 - aD) * this.dxPrev;

    // higher motion → higher cutoff → less smoothing → less lag
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const a = this.alpha(cutoff, dt);
    const ex = a * x + (1 - a) * this.xPrev;

    this.xPrev = ex;
    this.dxPrev = edx;
    return ex;
  }

  reset() {
    this.started = false;
  }
}

/**
 * Smooths a full set of pose keypoints. Low-confidence joints are "held" at
 * their last good position (helps when equipment briefly occludes a joint).
 */
export class KeypointSmoother {
  private fx = new Map<string, OneEuroFilter>();
  private fy = new Map<string, OneEuroFilter>();
  private last = new Map<string, { x: number; y: number }>();

  constructor(
    private minCutoff = 1.7,
    private beta = 0.015,
    private dCutoff = 1.0
  ) {}

  reset() {
    this.fx.clear();
    this.fy.clear();
    this.last.clear();
  }

  /** @param t timestamp in seconds */
  filter(keypoints: Keypoint[], t: number): Keypoint[] {
    return keypoints.map((k) => {
      if (!k.name) return k;
      const score = k.score ?? 0;

      // occlusion hold: keep the last stable position instead of a noisy jump
      if (score < 0.25) {
        const l = this.last.get(k.name);
        return l ? { ...k, x: l.x, y: l.y } : k;
      }

      let fx = this.fx.get(k.name);
      let fy = this.fy.get(k.name);
      if (!fx) {
        fx = new OneEuroFilter(this.minCutoff, this.beta, this.dCutoff);
        this.fx.set(k.name, fx);
      }
      if (!fy) {
        fy = new OneEuroFilter(this.minCutoff, this.beta, this.dCutoff);
        this.fy.set(k.name, fy);
      }
      const x = fx.filter(k.x, t);
      const y = fy.filter(k.y, t);
      this.last.set(k.name, { x, y });
      return { ...k, x, y };
    });
  }
}
