import Link from "next/link";
import { Dumbbell, Layers, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { WorkoutActions } from "@/components/workouts/workout-actions";
import { PROGRAM_TEMPLATES } from "@/lib/programs";

export const dynamic = "force-dynamic";

const label = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default async function WorkoutsPage() {
  const session = await getSession();
  const workouts = session?.sub
    ? await prisma.customWorkout.findMany({
        where: { userId: session.sub },
        orderBy: [{ isFavorite: "desc" }, { createdAt: "desc" }],
        include: { exercises: { include: { exercise: true } } },
      })
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
            My Workouts
          </h1>
          <p className="mt-2 text-sm text-fog">
            Build custom routines or start from a proven program template.
          </p>
        </div>
        <Button asChild>
          <Link href="/workouts/new">
            <Plus className="h-5 w-5" />
            New workout
          </Link>
        </Button>
      </div>

      {/* Saved workouts */}
      <section>
        <h2 className="font-display mb-4 text-xl font-semibold uppercase tracking-wide">
          Saved
        </h2>
        {workouts.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <Dumbbell className="mx-auto mb-3 h-8 w-8 text-smoke" />
            <p className="text-fog">No saved workouts yet.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/workouts/new">Build your first</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {workouts.map((w) => (
              <div key={w.id} className="glass rounded-3xl p-6">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-fog">
                      {label(w.programType)}
                    </span>
                    <h3 className="font-display mt-2 text-lg font-semibold tracking-wide">
                      {w.name}
                    </h3>
                  </div>
                  <WorkoutActions id={w.id} isFavorite={w.isFavorite} />
                </div>
                {w.description && (
                  <p className="mb-3 line-clamp-2 text-xs text-fog">{w.description}</p>
                )}
                <ul className="space-y-1.5">
                  {w.exercises.slice(0, 5).map((pe) => (
                    <li
                      key={pe.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate text-fog">{pe.exercise.name}</span>
                      <span className="shrink-0 text-xs text-smoke">
                        {pe.sets}×{pe.reps}
                      </span>
                    </li>
                  ))}
                  {w.exercises.length > 5 && (
                    <li className="text-xs text-smoke">
                      +{w.exercises.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Templates */}
      <section>
        <h2 className="font-display mb-4 flex items-center gap-2 text-xl font-semibold uppercase tracking-wide">
          <Layers className="h-5 w-5 text-flame" />
          Program templates
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROGRAM_TEMPLATES.map((t) => (
            <Link
              key={t.id}
              href={`/workouts/new?template=${t.id}`}
              className="glass group rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1"
            >
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-fog">
                {label(t.programType)}
              </span>
              <h3 className="font-display mt-2 text-lg font-semibold tracking-wide">
                {t.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-fog">{t.description}</p>
              <p className="mt-3 text-xs text-smoke">
                {t.exercises.length} exercises ·{" "}
                <span className="text-ember group-hover:underline">Use template →</span>
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
