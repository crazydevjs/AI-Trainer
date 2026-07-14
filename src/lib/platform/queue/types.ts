export interface QueueJob<T> {
  id: string;
  payload: T;
  createdAt: number;
  attempts: number;
}

export interface QueueSnapshot {
  name: string;
  pending: number;
  processing: boolean;
  processedCount: number;
  failedCount: number;
}
