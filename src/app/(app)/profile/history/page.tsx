import Link from "next/link";
import { ChevronRight, Dumbbell, Plus, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { fmtDuration, fmtVolume } from "@/lib/workout-session";

export const dynamic = "force-dynamic";

export default async function WorkoutHistoryPage() {
  const session = await getSession();
  const logs = session?.sub
    ? await prisma.workoutLog.findMany({
        where: { userId: session.sub },
        orderBy: { startedAt: "desc" },
        take: 100,
        include: {
          exercises: {
            select: { exercise: { select: { name: true } } },
          },
        },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
            Workout History
          </h1>
          <p className="mt-2 text-sm text-fog">
            Your personal training log — every session, every set, every rep.
          </p>
        </div>
        <Button asChild>
          <Link href="/workout">
            <Plus className="h-5 w-5" />
            Start workout
          </Link>
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <Dumbbell className="mx-auto mb-3 h-8 w-8 text-smoke" />
          <p className="text-fog">No workouts logged yet.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/workout">Start your first session</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => {
            const names = [...new Set(log.exercises.map((e) => e.exercise.name))];
            return (
              <Link
                key={log.id}
                href={`/profile/history/${log.id}`}
                className="glass group block rounded-3xl p-6 transition-all hover:border-ember/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-smoke">
                      {log.startedAt.toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <h2 className="font-display mt-1 truncate text-xl font-bold tracking-wide text-chalk">
                      {log.title}
                    </h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {log.prCount > 0 && (
                      <span className="flex items-center gap-1 rounded-full border border-amber/40 bg-amber/10 px-2.5 py-1 text-[10px] font-bold text-amber">
                        <Trophy className="h-3 w-3" />
                        {log.prCount} PR{log.prCount > 1 ? "s" : ""}
                      </span>
                    )}
                    <ChevronRight className="h-5 w-5 text-smoke transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-fog">
                  <span>Duration: <b className="text-chalk">{fmtDuration(log.durationSec)}</b></span>
                  <span>Volume: <b className="text-chalk">{fmtVolume(log.totalVolumeKg)}</b></span>
                  <span><b className="text-chalk">{log.totalSets}</b> sets</span>
                  <span><b className="text-chalk">{log.totalReps}</b> reps</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {names.slice(0, 6).map((n) => (
                    <span
                      key={n}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-xs text-fog"
                    >
                      {n}
                    </span>
                  ))}
                  {names.length > 6 && (
                    <span className="px-1 text-xs text-smoke">+{names.length - 6} more</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
