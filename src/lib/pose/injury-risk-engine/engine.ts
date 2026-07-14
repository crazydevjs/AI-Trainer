// InjuryRiskEngine — the single integration surface. One instance per
// trainer session, driven from live-session.tsx (not use-pose-trainer.ts —
// see ALGORITHM.md "Where IRE runs" for why). analyzeFrame() reads only
// CoachState, FormAnalysisSnapshot, and MovementAnalysisSnapshot — never
// pose landmarks, never any sealed engine's internals.

import type { CoachState } from "../rep-counter";
import type { FormAnalysisSnapshot } from "../form-engine/types";
import type { MovementAnalysisSnapshot } from "../movement-engine/types";
import { classifyTrend } from "../movement-engine/trend";
import { computeConfidence } from "./confidence";
import { computeFatigueScore } from "./fatigue";
import { RiskHistory } from "./history";
import { computeLoadScore } from "./load";
import { pickRecommendation } from "./recommendations";
import { combineRisk, computeRiskFactors } from "./risk-model";
import type {
  RecommendationHistoryEntry,
  RiskCategory,
  RiskSnapshot,
  RiskTimelineEntry,
  SessionRiskSummary,
} from "./types";

const SCORE_SAMPLE_INTERVAL_MS = 1000;
const CAUSE_TALLY_THRESHOLD = 20; // only tally a category if it meaningfully contributed

export interface RiskAnalysisInput {
  coachState: CoachState;
  formSnapshot: FormAnalysisSnapshot;
  movementSnapshot: MovementAnalysisSnapshot | null;
  /** Seconds since the last completed rep (or set), if known — feeds the
   *  recovery-deficit factor. null when there's no prior rep yet. */
  secondsSinceLastRep: number | null;
  /** Current working weight, if this is a weighted exercise. */
  weightKg?: number;
  now: number;
}

export class InjuryRiskEngine {
  private history = new RiskHistory();
  private timeline: RiskTimelineEntry[] = [];
  private categoryTally = new Map<RiskCategory, number>();
  private lastSampleAt = 0;
  private lastRecommendationAt = 0;
  private recommendationHistory: RecommendationHistoryEntry[] = [];

  analyzeFrame(input: RiskAnalysisInput): RiskSnapshot {
    const { coachState, formSnapshot, movementSnapshot, secondsSinceLastRep, weightKg, now } = input;
    this.history.update({ coachState, formSnapshot, movementSnapshot }, now);

    const fatigueScore = computeFatigueScore(this.history, secondsSinceLastRep, now);
    const loadScore = computeLoadScore(this.history, weightKg, now);
    const factors = computeRiskFactors(
      this.history,
      formSnapshot.scores,
      movementSnapshot?.scores ?? null,
      movementSnapshot?.activeCompensations.length ?? 0,
      secondsSinceLastRep,
      fatigueScore
    );
    const { riskScore, overallRisk, topReasons } = combineRisk(factors);
    const confidence = computeConfidence(this.history, formSnapshot.confidence, now);

    const recommendation = pickRecommendation(factors, overallRisk, this.lastRecommendationAt, now);
    if (recommendation) {
      this.lastRecommendationAt = now;
      this.recommendationHistory.push({ at: now, action: recommendation.action, text: recommendation.text });
      if (this.recommendationHistory.length > 100) this.recommendationHistory.shift();
    }

    if (now - this.lastSampleAt >= SCORE_SAMPLE_INTERVAL_MS) {
      this.lastSampleAt = now;
      this.timeline.push({ t: now, riskScore, level: overallRisk });
      if (this.timeline.length > 600) this.timeline.shift();

      const top = [...factors].sort((a, b) => b.score - a.score)[0];
      if (top && top.score > CAUSE_TALLY_THRESHOLD) {
        this.categoryTally.set(top.category, (this.categoryTally.get(top.category) ?? 0) + 1);
      }
    }

    return {
      overallRisk,
      riskScore,
      confidence,
      factors: [...factors].sort((a, b) => b.score - a.score),
      topReasons,
      recommendation,
      fatigueScore,
      loadScore,
      at: now,
    };
  }

  getSessionSummary(): SessionRiskSummary {
    const scores = this.timeline.map((e) => e.riskScore);
    const highestRisk = scores.length ? Math.max(...scores) : 0;
    const averageRisk = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    // Higher risk later in the session reads as "degrading" (worse), so
    // improvingIsHigher=false.
    const riskTrend = classifyTrend(scores, false);

    const mostCommonCauses = Array.from(this.categoryTally.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);

    return {
      riskTimeline: this.timeline,
      highestRisk,
      averageRisk,
      riskTrend,
      mostCommonCauses,
      recommendationHistory: this.recommendationHistory,
    };
  }
}
