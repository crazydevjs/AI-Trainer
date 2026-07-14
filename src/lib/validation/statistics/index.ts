// Generic numeric helpers — no domain knowledge of reps, exercises, or
// engines. Every other validation module builds on these rather than
// recomputing mean/percentile/error inline.

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = mean(values.map((v) => (v - avg) ** 2));
  return Math.sqrt(variance);
}

/** `p` in [0, 100]. Nearest-rank method — simple and stable for the
 *  sample sizes this framework deals with (dozens to low thousands of
 *  frames per session), not worth a more elaborate interpolation scheme. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

/** Mean absolute error between paired predicted/actual values. */
export function mae(predicted: number[], actual: number[]): number {
  const n = Math.min(predicted.length, actual.length);
  if (n === 0) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) total += Math.abs(predicted[i] - actual[i]);
  return total / n;
}

export function rmse(predicted: number[], actual: number[]): number {
  const n = Math.min(predicted.length, actual.length);
  if (n === 0) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) total += (predicted[i] - actual[i]) ** 2;
  return Math.sqrt(total / n);
}
