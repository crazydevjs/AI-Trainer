import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fmtDuration, fmtVolume } from "@/lib/workout-session";

export const dynamic = "force-dynamic";

/** Restore the exercise order stamped by the save route ("order:n" feedback tag). */
function orderOf(feedback: string[]): number {
  for (const f of feedback) {
    const m = /^order:(\d+)$/.exec(f);
    if (m) return Number(m[1]);
  }
  return 0;
}

export default async function WorkoutLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.sub) notFound();

  const { id } = await params;
  const log = await prisma.workoutLog.findFirst({
    where: { id, userId: session.sub },
    include: {
      exercises: {
        include: {
          exercise: { select: { name: true, slug: true } },
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
    },
  });
  if (!log) notFound();

  const exercises = [...log.exercises].sort(
    (a, b) => orderOf(a.feedback) - orderOf(b.feedback)
  );

  return (
    <div className="space-y-6">
      <Link
        href="/profile/history"
        className="inline-flex items-center gap-2 text-sm text-fog transition-colors hover:text-chalk"
      >
        <ArrowLeft className="h-4 w-4" />
        Workout history
      </Link>

      <div>
        <p className="text-xs uppercase tracking-widest text-smoke">
          {log.startedAt.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          ·{" "}
          {log.startedAt.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <h1 className="font-display mt-1 text-4xl font-bold uppercase tracking-wide">
          {log.title}
        </h1>
        {log.description && <p className="mt-2 text-sm text-fog">{log.description}</p>}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Total label="Duration" value={fmtDuration(log.durationSec)} />
        <Total label="Volume" value={fmtVolume(log.totalVolumeKg)} />
        <Total label="Sets" value={`${log.totalSets}`} />
        <Total label="Reps" value={`${log.totalReps}`} />
      </div>

      {log.prCount > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-chalk">
          <Trophy className="h-5 w-5 text-amber" />
          {log.prCount} personal record{log.prCount > 1 ? "s" : ""} set in this session
        </div>
      )}

      {log.summary && (
        <div className="glass rounded-3xl p-5">
          <p className="text-xs uppercase tracking-widest text-volt">AI Coach</p>
          <p className="mt-2 text-sm leading-relaxed text-fog">“{log.summary}”</p>
        </div>
      )}

      {/* Full log */}
      <div className="space-y-4">
        {exercises.map((ex) => (
          <div key={ex.id} className="glass rounded-3xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <Link
                href={`/exercises/${ex.exercise.slug}`}
                className="font-display text-lg font-semibold tracking-wide text-chalk hover:text-ember"
              >
                {ex.exercise.name}
              </Link>
              {ex.formScore != null && (
                <span className="flex items-center gap-1 text-xs text-volt">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI form {Math.round(ex.formScore)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-[3rem_1fr_1fr] gap-2 px-1 text-[10px] uppercase tracking-widest text-smoke">
              <span>Set</span>
              <span>Weight</span>
              <span>Reps</span>
            </div>
            <div className="mt-1 space-y-1">
              {ex.sets.map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-[3rem_1fr_1fr] gap-2 rounded-xl bg-white/[0.03] px-1 py-2 text-sm"
                >
                  <span className="text-center font-bold text-fog">{s.setNumber}</span>
                  <span className="text-chalk">
                    {s.weightKg != null && s.weightKg > 0 ? `${s.weightKg} kg` : "Bodyweight"}
                  </span>
                  <span className="text-chalk">× {s.reps}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <p className="font-display text-xl font-bold text-chalk">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-widest text-smoke">{label}</p>
    </div>
  );
}
