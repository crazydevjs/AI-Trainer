// Per-frame velocity/acceleration/jerk derived from the Rep Engine's own
// already-smoothed `progress` signal (CoachState.progress, 0..1) — no new
// pose math, just calculus over a scalar the Rep Engine already computes
// every frame. Jerk (rate of acceleration change) is the standard proxy for
// movement smoothness: a jerky, interrupted rep has a noisier jerk signal
// than a smooth, controlled one.

export interface KinematicsSample {
  velocity: number | null; // progress units / second, signed
  acceleration: number | null; // progress units / second^2
  jerk: number | null;
}

export class KinematicsTracker {
  private prevProgress: number | null = null;
  private prevVelocity: number | null = null;
  private prevAcceleration: number | null = null;
  private prevT: number | null = null;

  update(progress: number | null, now: number): KinematicsSample {
    if (progress == null) {
      this.reset();
      return { velocity: null, acceleration: null, jerk: null };
    }
    if (this.prevProgress == null || this.prevT == null) {
      this.prevProgress = progress;
      this.prevT = now;
      return { velocity: null, acceleration: null, jerk: null };
    }

    const dt = (now - this.prevT) / 1000;
    if (dt <= 0) return { velocity: this.prevVelocity, acceleration: this.prevAcceleration, jerk: null };

    const velocity = (progress - this.prevProgress) / dt;
    let acceleration: number | null = null;
    let jerk: number | null = null;
    if (this.prevVelocity != null) {
      acceleration = (velocity - this.prevVelocity) / dt;
      if (this.prevAcceleration != null) jerk = (acceleration - this.prevAcceleration) / dt;
    }

    this.prevProgress = progress;
    this.prevVelocity = velocity;
    this.prevAcceleration = acceleration;
    this.prevT = now;
    return { velocity, acceleration, jerk };
  }

  reset() {
    this.prevProgress = null;
    this.prevVelocity = null;
    this.prevAcceleration = null;
    this.prevT = null;
  }
}
