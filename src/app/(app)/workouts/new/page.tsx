import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTemplate } from "@/lib/programs";
import { WorkoutBuilder, type PickerExercise } from "@/components/workouts/builder";
import { getPickerExercises } from "@/lib/queries";

export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template: templateId } = await searchParams;

  const exercises = await getPickerExercises();

  // Resolve template (slugs → ids) for prefill.
  let initialName = "";
  let initialProgramType = "CUSTOM";
  let initialRows: {
    exerciseId: string;
    name: string;
    category: string;
    sets: number;
    reps: number;
    restSec: number;
  }[] = [];

  const tpl = templateId ? getTemplate(templateId) : null;
  if (tpl) {
    initialName = tpl.name;
    initialProgramType = tpl.programType;
    const bySlug = new Map(exercises.map((e) => [e.slug, e]));
    initialRows = tpl.exercises
      .map((t) => {
        const ex = bySlug.get(t.slug);
        if (!ex) return null;
        return {
          exerciseId: ex.id,
          name: ex.name,
          category: ex.category,
          sets: t.sets,
          reps: t.reps,
          restSec: t.restSec,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/workouts"
        className="inline-flex items-center gap-2 text-sm text-fog transition-colors hover:text-chalk"
      >
        <ArrowLeft className="h-4 w-4" />
        Workouts
      </Link>
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
        {tpl ? "Customize template" : "Build a workout"}
      </h1>

      <WorkoutBuilder
        allExercises={exercises as PickerExercise[]}
        initialName={initialName}
        initialProgramType={initialProgramType}
        initialRows={initialRows}
      />
    </div>
  );
}
