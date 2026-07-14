// Classification layer over Phase 7's WeaknessHistory (read via
// getWeaknessTrend()) — stores the *conclusion* (LearnedWeakness), not a
// duplicate of the raw frequency/severity tracking Phase 7 already owns.

import { getWeaknessTrend } from "@/lib/performance";
import type { WeaknessClassification } from "./types";

const RESOLVED_AFTER_DAYS = 14;
const PERSISTENT_MIN_FREQUENCY = 3;

export interface WeaknessClassificationResult {
  issueId: string;
  exerciseId: string | null;
  classification: WeaknessClassification;
  confidence: number;
  recurrenceProbability: number;
}

export async function classifyWeaknesses(
  userId: string,
  sessionsAnalyzed: number
): Promise<WeaknessClassificationResult[]> {
  const rows = await getWeaknessTrend(userId);
  const now = Date.now();

  return rows.map((r) => {
    const daysSinceSeen = (now - r.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24);

    let classification: WeaknessClassification;
    if (daysSinceSeen > RESOLVED_AFTER_DAYS && r.frequency >= 2) {
      classification = "RESOLVED";
    } else if (r.trend === "improving") {
      classification = "RAPIDLY_IMPROVING";
    } else if (r.trend === "declining" && r.frequency >= PERSISTENT_MIN_FREQUENCY) {
      classification = "PERSISTENT";
    } else if (r.frequency <= 1) {
      classification = "NEW";
    } else {
      classification = "RECURRING";
    }

    const recurrenceProbability =
      sessionsAnalyzed > 0 ? Math.round(Math.min(1, r.frequency / sessionsAnalyzed) * 100) / 100 : 0;
    const confidence = Math.round(Math.min(1, r.frequency / 5) * 100) / 100;

    return {
      issueId: r.issueId,
      exerciseId: r.exerciseId,
      classification,
      confidence,
      recurrenceProbability,
    };
  });
}
