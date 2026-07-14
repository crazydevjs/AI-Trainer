export interface GateCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface GateResult {
  passed: boolean;
  checks: GateCheck[];
  evaluatedAt: number;
}

export interface ReleaseGateThresholds {
  maxP95LatencyMs: number;
  minF1: number;
}

export const DEFAULT_RELEASE_GATE_THRESHOLDS: ReleaseGateThresholds = {
  maxP95LatencyMs: 60,
  minF1: 0.7,
};
