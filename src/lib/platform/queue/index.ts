import { MemoryQueue } from "./memory-queue";
import type { QueueSnapshot } from "./types";

export type { QueueJob, QueueSnapshot } from "./types";
export { MemoryQueue } from "./memory-queue";

const globalForQueues = globalThis as unknown as { platformQueueRegistry?: Map<string, MemoryQueue<unknown>> };
const registry = globalForQueues.platformQueueRegistry ?? new Map<string, MemoryQueue<unknown>>();
if (process.env.NODE_ENV !== "production") globalForQueues.platformQueueRegistry = registry;

/** Creates (or returns the existing) named queue, so the Developer
 *  dashboard can enumerate every queue in the process without each module
 *  having to register itself separately. */
export function createQueue<T>(name: string): MemoryQueue<T> {
  const existing = registry.get(name);
  if (existing) return existing as MemoryQueue<T>;
  const queue = new MemoryQueue<T>(name);
  registry.set(name, queue as MemoryQueue<unknown>);
  return queue;
}

export function listQueues(): QueueSnapshot[] {
  return [...registry.values()].map((q) => q.snapshot());
}
