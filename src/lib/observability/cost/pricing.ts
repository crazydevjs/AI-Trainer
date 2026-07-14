/** Placeholder rates — no real billing integration exists yet (no LLM
 *  provider is wired up per `src/lib/coach.ts`, no cloud storage/CDN
 *  billing account). These exist so a cost report has a real shape to
 *  populate once a real provider/rate exists; every line item's `basis`
 *  string says exactly what was measured vs. estimated. */
export const PRICING = {
  llmPerThousandTokensUsd: 0.002,
  storagePerGbMonthUsd: 0.023,
  computePerApiCallUsd: 0.00005,
} as const;
