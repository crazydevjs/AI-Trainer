"use client";

// Workout creation screen — title, description, exercises and per-set
// weight × reps planning. Everything remains editable during the workout.

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Dumbbell, Play, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { displayWeight, toKg, type Unit } from "@/lib/weight";
import type { DraftExercise, DraftSet, WorkoutDraft } from "@/lib/workout-session";
import { ExercisePicker } from "./exercise-picker";
import type { LibraryExercise } from "./experience";

const TITLE_IDEAS = ["Push Day", "Pull Day", "Leg Day", "Upper Body Strength", "Full Body"];

export const DEFAULT_SET: DraftSet = { weightKg: 0, targetReps: 10, doneReps: null };

export function newDraftExercise(e: LibraryExercise): DraftExercise {
  return {
    exerciseId: e.id,
    slug: e.slug,
    name: e.name,
    poseKey: e.poseKey,
    aiRepCount: e.aiRepCount,
    restSec: 90,
    sets: [{ ...DEFAULT_SET }, { ...DEFAULT_SET }, { ...DEFAULT_SET }],
  };
}

export function WorkoutPlanner({
  draft,
  setDraft,
  library,
  unit,
  setUnit,
  onStart,
  onDiscard,
}: {
  draft: WorkoutDraft;
  setDraft: (fn: (d: WorkoutDraft) => WorkoutDraft) => void;
  library: LibraryExercise[];
  unit: Unit;
  setUnit: (u: Unit) => void;
  onStart: () => void;
  onDiscard: () => void;
}) {
  const [picking, setPicking] = useState(false);

  const updateExercise = (i: number, fn: (e: DraftExercise) => DraftExercise) =>
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e, j) => (j === i ? fn(e) : e)),
    }));

  const canStart = draft.title.trim().length > 0 && draft.exercises.length > 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-fog transition-colors hover:text-chalk"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        {(draft.title || draft.exercises.length > 0) && (
          <button onClick={onDiscard} className="text-xs text-smoke hover:text-ember">
            Discard draft
          </button>
        )}
      </div>

      <p className="text-xs uppercase tracking-widest text-smoke">New workout</p>
      <h1 className="font-display mt-1 text-3xl font-bold uppercase tracking-wide">
        Plan your session
      </h1>

      {/* Title + description */}
      <div className="glass mt-6 space-y-4 rounded-3xl p-6">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-smoke">
            Workout title
          </label>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Push Day, Chest & Triceps…"
            maxLength={80}
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-chalk outline-none focus:border-ember/50"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {TITLE_IDEAS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, title: t }))}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-fog hover:border-ember/40 hover:text-chalk"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-smoke">
            Description <span className="normal-case text-smoke/70">(optional)</span>
          </label>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Testing new PR · Deload week · Heavy bench focus…"
            maxLength={500}
            rows={2}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-chalk outline-none focus:border-ember/50"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-smoke">Weight unit</span>
          <div className="flex overflow-hidden rounded-lg border border-white/10">
            {(["kg", "lbs"] as Unit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  unit === u ? "bg-ember text-white" : "text-fog"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div className="mt-6 space-y-4">
        {draft.exercises.length === 0 && (
          <div className="glass rounded-3xl p-8 text-center">
            <Dumbbell className="mx-auto mb-2 h-7 w-7 text-smoke" />
            <p className="text-sm text-fog">Add the exercises you plan to perform.</p>
          </div>
        )}

        {draft.exercises.map((ex, i) => (
          <div key={`${ex.exerciseId}-${i}`} className="glass rounded-3xl p-5">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-semibold tracking-wide text-chalk">
                  {ex.name}
                </h3>
                {ex.aiRepCount && ex.poseKey && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-volt">
                    AI rep tracking available
                  </span>
                )}
              </div>
              <button
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    exercises: d.exercises.filter((_, j) => j !== i),
                  }))
                }
                className="rounded-xl p-2 text-smoke hover:bg-white/5 hover:text-ember"
                aria-label={`Remove ${ex.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[2.5rem_1fr_1fr_2rem] items-center gap-2 px-1 text-[10px] uppercase tracking-widest text-smoke">
                <span>Set</span>
                <span>Weight ({unit})</span>
                <span>Reps</span>
                <span />
              </div>
              {ex.sets.map((s, j) => (
                <div
                  key={j}
                  className="grid grid-cols-[2.5rem_1fr_1fr_2rem] items-center gap-2"
                >
                  <span className="text-center text-sm font-bold text-fog">{j + 1}</span>
                  <input
                    type="number"
                    min={0}
                    step={unit === "kg" ? 2.5 : 5}
                    value={s.weightKg > 0 ? displayWeight(s.weightKg, unit) : ""}
                    placeholder="0"
                    onChange={(e) =>
                      updateExercise(i, (ex2) => ({
                        ...ex2,
                        sets: ex2.sets.map((s2, k) =>
                          k === j
                            ? { ...s2, weightKg: toKg(Math.max(0, Number(e.target.value) || 0), unit) }
                            : s2
                        ),
                      }))
                    }
                    className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-center text-sm font-semibold text-chalk outline-none focus:border-ember/50"
                  />
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={s.targetReps || ""}
                    placeholder="10"
                    onChange={(e) =>
                      updateExercise(i, (ex2) => ({
                        ...ex2,
                        sets: ex2.sets.map((s2, k) =>
                          k === j
                            ? { ...s2, targetReps: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }
                            : s2
                        ),
                      }))
                    }
                    className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-center text-sm font-semibold text-chalk outline-none focus:border-ember/50"
                  />
                  <button
                    onClick={() =>
                      updateExercise(i, (ex2) => ({
                        ...ex2,
                        sets: ex2.sets.filter((_, k) => k !== j),
                      }))
                    }
                    disabled={ex.sets.length <= 1}
                    className="grid h-8 w-8 place-items-center rounded-lg text-smoke hover:bg-white/5 hover:text-ember disabled:opacity-30"
                    aria-label="Remove set"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                updateExercise(i, (ex2) => ({
                  ...ex2,
                  sets: [...ex2.sets, { ...(ex2.sets[ex2.sets.length - 1] ?? DEFAULT_SET), doneReps: null, aiTracked: undefined, formScore: undefined, romScore: undefined }],
                }))
              }
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ember hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Add set
            </button>
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={() => setPicking(true)}>
          <Plus className="h-5 w-5" />
          Add exercise
        </Button>
      </div>

      <Button size="xl" className="mt-6 w-full" disabled={!canStart} onClick={onStart}>
        <Play className="h-5 w-5" />
        Start workout
      </Button>
      {!canStart && (
        <p className="mt-2 text-center text-xs text-smoke">
          Add a title and at least one exercise to begin.
        </p>
      )}

      {picking && (
        <ExercisePicker
          library={library}
          onClose={() => setPicking(false)}
          onPick={(e) => {
            setDraft((d) => ({ ...d, exercises: [...d.exercises, newDraftExercise(e)] }));
            setPicking(false);
          }}
        />
      )}
    </main>
  );
}
