// Workout Session System — client-side draft state, persistence and the
// post-workout AI summary. The draft autosaves to localStorage on every change
// so an accidental refresh / app close never loses a set.

export interface DraftSet {
  weightKg: number;
  targetReps: number;
  /** reps actually performed; null = not completed yet */
  doneReps: number | null;
  /** ended early via the Failure action — doneReps is < targetReps on purpose */
  failed?: boolean;
  /** true when the set was counted by the AI camera coach */
  aiTracked?: boolean;
  formScore?: number;
  romScore?: number;
}

export interface DraftExercise {
  exerciseId: string;
  slug: string;
  name: string;
  poseKey: string | null;
  aiRepCount: boolean;
  restSec: number;
  sets: DraftSet[];
}

export interface WorkoutDraft {
  title: string;
  description: string;
  startedAt: number | null; // epoch ms; null until the user starts
  exercises: DraftExercise[];
}

export const EMPTY_DRAFT: WorkoutDraft = {
  title: "",
  description: "",
  startedAt: null,
  exercises: [],
};

const KEY = "forge:workout-draft";

export function loadDraft(): WorkoutDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as WorkoutDraft;
    if (!Array.isArray(d.exercises)) return null;
    return d;
  } catch {
    return null;
  }
}

export function saveDraft(d: WorkoutDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* storage full / private mode — session continues in memory */
  }
}

export function clearDraft() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

// ---------- live stats ----------

export interface WorkoutStats {
  completedSets: number;
  plannedSets: number;
  totalReps: number;
  volumeKg: number;
  exercisesTouched: number;
  failureSets: number;
  heaviest: { exerciseName: string; weightKg: number; reps: number } | null;
}

export function computeStats(d: WorkoutDraft): WorkoutStats {
  let completedSets = 0;
  let plannedSets = 0;
  let totalReps = 0;
  let volumeKg = 0;
  let exercisesTouched = 0;
  let failureSets = 0;
  let heaviest: WorkoutStats["heaviest"] = null;
  for (const ex of d.exercises) {
    plannedSets += ex.sets.length;
    let touched = false;
    for (const s of ex.sets) {
      if (s.doneReps == null || s.doneReps <= 0) continue;
      touched = true;
      completedSets += 1;
      totalReps += s.doneReps;
      volumeKg += s.weightKg * s.doneReps;
      if (s.failed) failureSets += 1;
      if (s.weightKg > 0 && (!heaviest || s.weightKg > heaviest.weightKg)) {
        heaviest = { exerciseName: ex.name, weightKg: s.weightKg, reps: s.doneReps };
      }
    }
    if (touched) exercisesTouched += 1;
  }
  return {
    completedSets,
    plannedSets,
    totalReps,
    volumeKg: Math.round(volumeKg * 10) / 10,
    exercisesTouched,
    failureSets,
    heaviest,
  };
}

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export function fmtVolume(kg: number): string {
  return `${Math.round(kg).toLocaleString()} kg`;
}

// ---------- AI coach summary (deterministic, motivational) ----------

export function buildCoachSummary(opts: {
  stats: WorkoutStats;
  durationSec: number;
  prCount: number;
  aiTrackedSets: number;
  failureSets?: number;
  completionPct: number; // completed / planned sets
}): string {
  const { stats, durationSec, prCount, aiTrackedSets, failureSets = 0, completionPct } = opts;
  const lines: string[] = [];

  if (prCount > 0) {
    lines.push(
      prCount === 1
        ? "You set a new personal record today — that's real, measurable progress."
        : `You set ${prCount} personal records today — an outstanding session.`
    );
  } else if (completionPct >= 100) {
    lines.push("You completed every planned set — excellent consistency today.");
  } else if (completionPct >= 75) {
    lines.push("Strong session — you worked through most of your plan with focus.");
  } else {
    lines.push("Every logged set counts. Showing up is the hardest part — done.");
  }

  if (stats.volumeKg >= 10000) {
    lines.push(`Over ${Math.floor(stats.volumeKg / 1000)} tonnes of total volume moved.`);
  } else if (stats.volumeKg > 0) {
    lines.push(`${fmtVolume(stats.volumeKg)} of volume across ${stats.completedSets} sets.`);
  }

  if (durationSec > 0 && stats.completedSets > 0) {
    const pace = durationSec / stats.completedSets;
    if (pace < 120) lines.push("Your pace was quick — great density, keep rest honest on heavy work.");
    else if (pace > 300) lines.push("Long rests today — fine for strength, tighten them up for conditioning.");
    else lines.push("Your tempo and rest discipline stayed steady throughout.");
  }

  if (aiTrackedSets > 0) {
    lines.push(`${aiTrackedSets} set${aiTrackedSets === 1 ? "" : "s"} verified rep-by-rep by the AI coach.`);
  }

  if (failureSets > 0) {
    lines.push(
      failureSets === 1
        ? "You pushed one set to true failure — that's how strength gets built."
        : `You pushed ${failureSets} sets to true failure — real training, not just numbers on a plan.`
    );
  }

  lines.push("Keep this momentum going.");
  return lines.join(" ");
}
