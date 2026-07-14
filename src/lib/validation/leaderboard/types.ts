export interface LeaderboardEntry {
  experimentId: string;
  name: string;
  poseKey: string | null;
  date: number;
  precision: number;
  recall: number;
  f1: number;
  winner: string | null;
  regressionDetected: boolean;
}
