export interface GoldenDataset {
  name: string;
  datasetVersion: number;
  checksum: string;
  promotedAt: number;
  promotedBy?: string;
  notes?: string;
}
