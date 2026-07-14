// Higher-level movement coaching — longer cooldown than the Form Engine's
// per-issue coaching (25s vs. 9s/3.5s) since these are set-level
// observations ("your left side is becoming weaker"), not in-the-moment
// corrections. Picks at most one message per call; caller applies the
// global cooldown gate.

import type { CompensationEvent, MovementCoachMessage, MovementScores } from "./types";

export const MOVEMENT_COACH_COOLDOWN_MS = 25000;

export function pickMovementCoachingMessage(
  scores: MovementScores,
  activeCompensations: CompensationEvent[],
  dominantSide: "left" | "right" | null,
  lastGlobalAt: number,
  now: number
): MovementCoachMessage | null {
  if (now - lastGlobalAt < MOVEMENT_COACH_COOLDOWN_MS) return null;

  if (activeCompensations.length) {
    const top = [...activeCompensations].sort((a, b) => b.confidence - a.confidence)[0];
    return { text: top.note, tone: "correct", priority: 3 };
  }
  if (scores.stability < 55) {
    return {
      text: "Slow down and control the movement — stability is dropping.",
      tone: "correct",
      priority: 2,
    };
  }
  if (scores.symmetry < 55 && dominantSide) {
    return { text: `Balance is shifting toward your ${dominantSide} side.`, tone: "info", priority: 2 };
  }
  if (scores.smoothness >= 90 && scores.overall >= 85) {
    return { text: "Movement quality is looking great — keep it up.", tone: "praise", priority: 1 };
  }
  return null;
}
