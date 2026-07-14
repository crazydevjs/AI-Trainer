import { prisma } from "@/lib/prisma";
import { logger } from "../monitoring/logger";
import type { JobName, JobResult } from "./types";

interface RegisteredJob {
  name: JobName;
  intervalMs: number;
  run: () => Promise<void>;
  timer?: ReturnType<typeof setInterval>;
  lastResult?: JobResult;
}

/** In-process interval scheduler. Registering a job never starts its
 *  timer — `start()` is an explicit, separate call so importing this
 *  module (e.g. from the Developer dashboard, to list registered jobs)
 *  never has the side effect of spinning up recurring DB fan-out queries.
 *  A single Node instance only; a real deployment should trigger these
 *  same job functions from Vercel Cron / a dedicated worker instead of
 *  calling `start()`, since `setInterval` doesn't survive serverless
 *  cold starts or run across multiple instances. */
class JobScheduler {
  private jobs = new Map<JobName, RegisteredJob>();

  register(name: JobName, intervalMs: number, run: () => Promise<void>): void {
    this.jobs.set(name, { name, intervalMs, run });
  }

  private async runOnce(job: RegisteredJob): Promise<void> {
    const start = performance.now();
    try {
      await job.run();
      job.lastResult = {
        job: job.name,
        ranAt: Date.now(),
        durationMs: Math.round(performance.now() - start),
        ok: true,
      };
    } catch (error) {
      job.lastResult = {
        job: job.name,
        ranAt: Date.now(),
        durationMs: Math.round(performance.now() - start),
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
      logger.error("scheduled job failed", { job: job.name, error: job.lastResult.error });
    }
  }

  start(): void {
    for (const job of this.jobs.values()) {
      job.timer ??= setInterval(() => void this.runOnce(job), job.intervalMs);
    }
  }

  stop(): void {
    for (const job of this.jobs.values()) {
      if (job.timer) {
        clearInterval(job.timer);
        job.timer = undefined;
      }
    }
  }

  async runNow(name: JobName): Promise<void> {
    const job = this.jobs.get(name);
    if (job) await this.runOnce(job);
  }

  list(): Array<{ name: JobName; intervalMs: number; running: boolean; lastResult?: JobResult }> {
    return [...this.jobs.values()].map((j) => ({
      name: j.name,
      intervalMs: j.intervalMs,
      running: !!j.timer,
      lastResult: j.lastResult,
    }));
  }
}

const globalForScheduler = globalThis as unknown as { platformJobScheduler?: JobScheduler };

export const jobScheduler = globalForScheduler.platformJobScheduler ?? new JobScheduler();
if (process.env.NODE_ENV !== "production") globalForScheduler.platformJobScheduler = jobScheduler;

/** Runs a per-user job function across every user, isolating failures so
 *  one user's error doesn't abort the rest — the shape a real fan-out
 *  worker would need regardless of what triggers it. */
export async function runForAllUsers(fn: (userId: string) => Promise<void>): Promise<void> {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const { id } of users) {
    try {
      await fn(id);
    } catch (error) {
      logger.error("per-user job failed", { userId: id, error: error instanceof Error ? error.message : String(error) });
    }
  }
}
