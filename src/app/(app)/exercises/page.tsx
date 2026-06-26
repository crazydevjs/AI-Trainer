import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseExplorer, type ExerciseCard } from "@/components/exercises/explorer";
import { getLibraryExercises } from "@/lib/queries";

export default async function ExercisesPage() {
  const exercises = await getLibraryExercises();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
            Exercise Library
          </h1>
          <p className="mt-2 text-sm text-fog">
            {exercises.length} movements across every discipline — train any of them live with the AI camera coach.
          </p>
        </div>
        <Button asChild>
          <Link href="/workouts/new">
            <Plus className="h-5 w-5" />
            Build a workout
          </Link>
        </Button>
      </div>

      {exercises.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-fog">
          No exercises yet. Run{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-chalk">
            npm run db:seed
          </code>{" "}
          to populate the library.
        </div>
      ) : (
        <ExerciseExplorer exercises={exercises as ExerciseCard[]} />
      )}
    </div>
  );
}
