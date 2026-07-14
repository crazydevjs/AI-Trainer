export interface CohortRow {
  cohortWeekStart: string; // YYYY-MM-DD
  cohortSize: number;
  /** Index 0 = signup week itself, index N = N weeks later. `null` for a
   *  week that hasn't happened yet for this cohort — never a fabricated
   *  0%. */
  retentionByWeek: (number | null)[];
}
