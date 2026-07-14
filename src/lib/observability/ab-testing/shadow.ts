import { logger } from "@/lib/platform/monitoring";

/** Runs a candidate implementation alongside the live one without ever
 *  affecting what the caller sees — the live result always wins; the
 *  shadow result (and whether it agreed) is only logged. The intended
 *  use is comparing a candidate engine change against production before
 *  trusting it with real traffic — logging via the structured logger
 *  rather than a dedicated store, since a shadow run's value is in the
 *  aggregate log signal, not needing its own persisted record type. */
export async function shadowEvaluate<T>(
  label: string,
  live: () => Promise<T> | T,
  shadow: () => Promise<T> | T,
  isEqual: (a: T, b: T) => boolean = (a, b) => JSON.stringify(a) === JSON.stringify(b),
): Promise<T> {
  const [liveResult, shadowResult] = await Promise.allSettled([
    Promise.resolve().then(live),
    Promise.resolve().then(shadow),
  ]);

  if (shadowResult.status === "rejected") {
    logger.warn("shadow evaluation threw", { label, error: String(shadowResult.reason) });
  } else if (liveResult.status === "fulfilled") {
    logger.info("shadow evaluation", { label, agreed: isEqual(liveResult.value, shadowResult.value) });
  }

  if (liveResult.status === "rejected") throw liveResult.reason;
  return liveResult.value;
}
