export interface DatasetCoverageReport {
  datasetName: string;
  datasetVersion: number;
  totalSessions: number;
  labeledSessions: number;
  exerciseDistribution: Record<string, number>;
  cameraAngleDistribution: Record<string, number>;
  deviceDistribution: Record<string, number>;
  lightingDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  contributors: string[];
  /** Video resolution isn't captured anywhere in the app's debug export
   *  today — always empty, documented rather than fabricated. See
   *  ALGORITHM.md "Known limitations". */
  resolutionDistribution: Record<string, number>;
  qualityScore: number;
  generatedAt: number;
}
