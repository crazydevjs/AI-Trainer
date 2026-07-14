export interface QualityScoreBreakdown {
  /** 0..1 */
  overall: number;
  /** Named sub-scores (each 0..1) that were weighted into `overall` — kept
   *  around so a report can show *why* a score is what it is, not just
   *  the number. */
  components: Record<string, number>;
}
