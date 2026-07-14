import { randomUUID } from "crypto";
import { logger } from "../monitoring/logger";
import type { QueueJob, QueueSnapshot } from "./types";

/** In-process FIFO async queue with a single registered handler and a
 *  self-draining loop (no polling timer). Correct for a single Node
 *  instance; a real multi-instance deployment needs a durable, shared
 *  queue (SQS, BullMQ+Redis) behind the same enqueue/onProcess shape —
 *  callers of `queue.enqueue()` wouldn't need to change. */
export class MemoryQueue<T> {
  private items: QueueJob<T>[] = [];
  private processing = false;
  private handler: ((payload: T) => Promise<void>) | null = null;
  private processedCount = 0;
  private failedCount = 0;

  constructor(private name: string) {}

  onProcess(handler: (payload: T) => Promise<void>): void {
    this.handler = handler;
    void this.drain();
  }

  enqueue(payload: T): void {
    this.items.push({ id: randomUUID(), payload, createdAt: Date.now(), attempts: 0 });
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.processing || !this.handler) return;
    this.processing = true;
    try {
      while (this.items.length > 0) {
        const job = this.items.shift();
        if (!job) break;
        try {
          await this.handler(job.payload);
          this.processedCount++;
        } catch (error) {
          this.failedCount++;
          logger.error("queue job failed", {
            queue: this.name,
            jobId: job.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } finally {
      this.processing = false;
    }
  }

  snapshot(): QueueSnapshot {
    return {
      name: this.name,
      pending: this.items.length,
      processing: this.processing,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
    };
  }
}
