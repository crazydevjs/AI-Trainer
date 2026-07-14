export interface FunnelStage {
  stage: string;
  userCount: number;
  conversionFromPrevious: number | null;
}
