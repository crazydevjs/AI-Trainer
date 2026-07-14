export interface CompletionStats {
  totalSessions: number;
  /** "Completed" = `completionPct >= COMPLETION_THRESHOLD_PCT`. There's
   *  no explicit completed/abandoned field on `WorkoutSession` — this is
   *  the closest honest proxy available (see Known limitations: a
   *  session that's never saved at all, because the user quit before
   *  finishing, produces no row and is invisible to this query). */
  completedSessions: number;
  completionRate: number;
  avgCompletionPct: number;
}

export interface ExercisePopularityEntry {
  exerciseId: string;
  exerciseName: string;
  sessionCount: number;
}

export interface CoachUsageStats {
  totalWorkoutLogs: number;
  /** `WorkoutLog.summary` is the AI coach's post-workout observation —
   *  a non-null summary is the only server-observable signal that the
   *  coach actually produced output for a session. */
  logsWithCoachSummary: number;
  adoptionRate: number;
}

export interface PersonalizationAdoptionStats {
  totalUsers: number;
  usersWithLearningProfile: number;
  adoptionRate: number;
}
