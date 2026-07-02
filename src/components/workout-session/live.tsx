"use client";

// Live workout tracking. Everything updates in real time: elapsed clock,
// volume, completed sets. Sets can be completed manually (always available)
// or auto-completed by the AI camera coach when it can see the exercise.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Flag,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  Timer,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { displayWeight, toKg, type Unit } from "@/lib/weight";
import {
  computeStats,
  fmtDuration,
  fmtVolume,
  type DraftExercise,
  type WorkoutDraft,
} from "@/lib/workout-session";
import { AiSetTracker } from "./ai-set-tracker";
import { ExercisePicker } from "./exercise-picker";
import { newDraftExercise } from "./planner";
import type { AiLogChunk, LibraryExercise } from "./experience";

export function LiveWorkout({
  draft,
  setDraft,
  library,
  unit,
  saving,
  saveError,
  onFinish,
  onDiscard,
  onAiLog,
}: {
  draft: WorkoutDraft;
  setDraft: (fn: (d: WorkoutDraft) => WorkoutDraft) => void;
  library: LibraryExercise[];
  unit: Unit;
  saving: boolean;
  saveError: string;
  onFinish: () => void;
  onDiscard: () => void;
  /** dev: collect AI-tracker debug logs for the post-workout export */
  onAiLog?: (chunk: AiLogChunk) => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [restLeft, setRestLeft] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [aiOn, setAiOn] = useState(false);
  const aiBase = useRef(0); // cumulative AI reps when the current set started
  const aiReps = useRef(0);
  const [aiInSet, setAiInSet] = useState(0);

  const stats = computeStats(draft);
  const ex: DraftExercise | undefined = draft.exercises[currentIdx];
  const firstIncomplete = ex?.sets.findIndex((s) => s.doneReps == null) ?? -1;

  // elapsed clock
  useEffect(() => {
    const id = setInterval(() => {
      if (draft.startedAt) setElapsed(Math.floor((Date.now() - draft.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [draft.startedAt]);

  // rest countdown — decrements inside the timer; clears itself at zero
  useEffect(() => {
    if (restLeft == null || restLeft <= 0) return;
    const t = setTimeout(
      () => setRestLeft((r) => (r == null || r <= 1 ? null : r - 1)),
      1000
    );
    return () => clearTimeout(t);
  }, [restLeft]);

  const updateExercise = useCallback(
    (i: number, fn: (e: DraftExercise) => DraftExercise) =>
      setDraft((d) => ({
        ...d,
        exercises: d.exercises.map((e, j) => (j === i ? fn(e) : e)),
      })),
    [setDraft]
  );

  const completeSet = useCallback(
    (exIdx: number, setIdx: number, reps: number, ai?: { form: number | null; rom: number | null }) => {
      updateExercise(exIdx, (e) => ({
        ...e,
        sets: e.sets.map((s, k) =>
          k === setIdx
            ? {
                ...s,
                doneReps: reps,
                aiTracked: !!ai,
                formScore: ai?.form ?? undefined,
                romScore: ai?.rom ?? undefined,
              }
            : s
        ),
      }));
      aiBase.current = aiReps.current;
      setAiInSet(0);
      // rest only if something is still left to do
      const e = draft.exercises[exIdx];
      const remaining = draft.exercises.some((x, i) =>
        x.sets.some((s, k) => (i === exIdx && k === setIdx ? false : s.doneReps == null))
      );
      if (remaining && e) setRestLeft(e.restSec);
    },
    [draft.exercises, updateExercise]
  );

  // AI reported reps → progress the first incomplete set of the current exercise
  const handleAiReps = useCallback(
    (total: number, form: number | null, rom: number | null) => {
      aiReps.current = total;
      const inSet = total - aiBase.current;
      setAiInSet(inSet);
      if (!ex || firstIncomplete < 0) return;
      const target = ex.sets[firstIncomplete].targetReps || 10;
      if (inSet >= target) completeSet(currentIdx, firstIncomplete, inSet, { form, rom });
    },
    [ex, firstIncomplete, currentIdx, completeSet]
  );

  // switching exercise resets the AI baseline (tracker remounts via key)
  const selectExercise = (i: number) => {
    setCurrentIdx(i);
    aiBase.current = 0;
    aiReps.current = 0;
    setAiInSet(0);
  };

  const aiCapable = !!ex && ex.aiRepCount && !!ex.poseKey;

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6 pb-32">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-smoke">Live workout</p>
          <h1 className="font-display truncate text-2xl font-bold uppercase tracking-wide">
            {draft.title || "Workout"}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <Timer className="h-4 w-4 text-ember" />
          <span className="font-display text-lg font-bold tabular-nums text-chalk">
            {fmtDuration(elapsed)}
          </span>
        </div>
      </div>

      {/* Live stats */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Volume" value={fmtVolume(stats.volumeKg)} />
        <Stat label="Sets" value={`${stats.completedSets} / ${stats.plannedSets}`} />
        <Stat label="Reps" value={`${stats.totalReps}`} />
      </div>

      {/* Exercise switcher */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {draft.exercises.map((e, i) => {
          const done = e.sets.filter((s) => s.doneReps != null).length;
          const complete = done === e.sets.length;
          return (
            <button
              key={`${e.exerciseId}-${i}`}
              onClick={() => selectExercise(i)}
              className={`shrink-0 rounded-2xl border px-3 py-2 text-left text-xs transition-all ${
                i === currentIdx
                  ? "border-ember/60 bg-ember/15 text-chalk"
                  : complete
                    ? "border-neon/30 bg-neon/[0.06] text-fog"
                    : "border-white/10 bg-white/[0.03] text-fog"
              }`}
            >
              <span className="block max-w-36 truncate font-semibold">{e.name}</span>
              <span className={complete ? "text-neon" : "text-smoke"}>
                {done}/{e.sets.length} sets{complete ? " ✓" : ""}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setPicking(true)}
          className="shrink-0 rounded-2xl border border-dashed border-white/20 px-3 py-2 text-xs text-fog hover:border-ember/40 hover:text-chalk"
        >
          <Plus className="mx-auto h-4 w-4" />
          Add
        </button>
      </div>

      {/* AI tracker */}
      {ex && aiCapable && (
        <div className="mt-4">
          {aiOn ? (
            <AiSetTracker
              key={`${ex.exerciseId}-${currentIdx}`}
              poseKey={ex.poseKey}
              onReps={handleAiReps}
              onClose={() => setAiOn(false)}
              onDebugLog={(log) =>
                onAiLog?.({
                  exercise: ex.name,
                  slug: ex.slug,
                  poseKey: ex.poseKey,
                  at: Date.now(),
                  log,
                })
              }
            />
          ) : (
            <button
              onClick={() => {
                aiBase.current = aiReps.current = 0;
                setAiInSet(0);
                setAiOn(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-volt/40 bg-volt/10 px-4 py-3 text-sm font-semibold text-volt"
            >
              <Sparkles className="h-4 w-4" />
              Track this exercise with the AI coach
            </button>
          )}
        </div>
      )}

      {/* Current exercise sets */}
      {ex && (
        <div className="glass mt-4 rounded-3xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-wide">{ex.name}</h2>
            {aiOn && firstIncomplete >= 0 && (
              <span className="text-xs font-bold text-volt">
                AI: {Math.max(0, aiInSet)} / {ex.sets[firstIncomplete].targetReps} reps
              </span>
            )}
          </div>

          <div className="space-y-2">
            {ex.sets.map((s, j) => {
              const done = s.doneReps != null;
              const isNext = j === firstIncomplete;
              return (
                <div
                  key={j}
                  className={`grid grid-cols-[2rem_1fr_1fr_auto] items-center gap-2 rounded-2xl border px-3 py-2 ${
                    done
                      ? "border-neon/25 bg-neon/[0.05]"
                      : isNext
                        ? "border-ember/50 bg-ember/[0.08]"
                        : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <span className="text-center text-sm font-bold text-fog">{j + 1}</span>

                  {/* weight — editable any time (plans change mid-workout) */}
                  <input
                    type="number"
                    min={0}
                    step={unit === "kg" ? 2.5 : 5}
                    value={s.weightKg > 0 ? displayWeight(s.weightKg, unit) : ""}
                    placeholder={`0 ${unit}`}
                    onChange={(e) =>
                      updateExercise(currentIdx, (e2) => ({
                        ...e2,
                        sets: e2.sets.map((s2, k) =>
                          k === j
                            ? { ...s2, weightKg: toKg(Math.max(0, Number(e.target.value) || 0), unit) }
                            : s2
                        ),
                      }))
                    }
                    className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-center text-sm font-semibold text-chalk outline-none focus:border-ember/50"
                  />

                  {done ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() =>
                          updateExercise(currentIdx, (e2) => ({
                            ...e2,
                            sets: e2.sets.map((s2, k) =>
                              k === j ? { ...s2, doneReps: Math.max(0, (s2.doneReps ?? 0) - 1) } : s2
                            ),
                          }))
                        }
                        className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-fog hover:text-chalk"
                        aria-label="One rep less"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-10 text-center text-sm font-bold text-neon">
                        {s.doneReps} reps
                      </span>
                      <button
                        onClick={() =>
                          updateExercise(currentIdx, (e2) => ({
                            ...e2,
                            sets: e2.sets.map((s2, k) =>
                              k === j ? { ...s2, doneReps: (s2.doneReps ?? 0) + 1 } : s2
                            ),
                          }))
                        }
                        className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-fog hover:text-chalk"
                        aria-label="One rep more"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={s.targetReps || ""}
                      placeholder="10"
                      onChange={(e) =>
                        updateExercise(currentIdx, (e2) => ({
                          ...e2,
                          sets: e2.sets.map((s2, k) =>
                            k === j
                              ? { ...s2, targetReps: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }
                              : s2
                          ),
                        }))
                      }
                      className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-center text-sm font-semibold text-chalk outline-none focus:border-ember/50"
                    />
                  )}

                  {done ? (
                    <div className="flex items-center gap-1">
                      {s.aiTracked && (
                        <span className="rounded-full border border-volt/40 bg-volt/10 px-1.5 py-0.5 text-[9px] font-bold text-volt">
                          AI
                        </span>
                      )}
                      <button
                        onClick={() =>
                          updateExercise(currentIdx, (e2) => ({
                            ...e2,
                            sets: e2.sets.map((s2, k) =>
                              k === j
                                ? { ...s2, doneReps: null, aiTracked: undefined, formScore: undefined, romScore: undefined }
                                : s2
                            ),
                          }))
                        }
                        className="grid h-8 w-8 place-items-center rounded-lg text-smoke hover:bg-white/5 hover:text-amber"
                        aria-label="Undo set"
                        title="Undo this set"
                      >
                        <Undo2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => completeSet(currentIdx, j, s.targetReps || 0)}
                      className="flex h-9 items-center gap-1 rounded-xl border border-neon/40 bg-neon/10 px-3 text-xs font-bold text-neon hover:bg-neon/20"
                    >
                      <Check className="h-4 w-4" />
                      Done
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() =>
                updateExercise(currentIdx, (e2) => ({
                  ...e2,
                  sets: [
                    ...e2.sets,
                    {
                      weightKg: e2.sets[e2.sets.length - 1]?.weightKg ?? 0,
                      targetReps: e2.sets[e2.sets.length - 1]?.targetReps ?? 10,
                      doneReps: null,
                    },
                  ],
                }))
              }
              className="flex items-center gap-1.5 text-xs font-semibold text-ember hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Add set
            </button>
            {firstIncomplete < 0 && currentIdx < draft.exercises.length - 1 && (
              <button
                onClick={() => selectExercise(currentIdx + 1)}
                className="flex items-center gap-1 text-xs font-semibold text-neon hover:underline"
              >
                Next exercise
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-void/90 p-4 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <button onClick={onDiscard} className="text-xs text-smoke hover:text-ember">
            Discard
          </button>
          <div className="flex-1" />
          {saveError && <p className="max-w-48 truncate text-xs text-ember">{saveError}</p>}
          <Button
            size="lg"
            onClick={() => {
              if (stats.completedSets === 0) return;
              if (stats.completedSets < stats.plannedSets) setConfirmFinish(true);
              else onFinish();
            }}
            disabled={saving || stats.completedSets === 0}
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Flag className="h-5 w-5" />}
            Finish workout
          </Button>
        </div>
      </div>

      {/* Rest overlay */}
      {restLeft != null && restLeft > 0 && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/85">
          <p className="text-xs uppercase tracking-[0.3em] text-fog">Rest</p>
          <p className="font-display text-8xl font-bold tabular-nums text-chalk">{restLeft}</p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setRestLeft((r) => (r ?? 0) + 15)}>
              +15s
            </Button>
            <Button onClick={() => setRestLeft(0)}>Skip rest</Button>
          </div>
        </div>
      )}

      {/* Finish confirm */}
      {confirmFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
          <div className="glass-strong w-full max-w-sm rounded-3xl p-6 text-center">
            <h3 className="font-display text-xl font-bold uppercase tracking-wide">
              Finish early?
            </h3>
            <p className="mt-2 text-sm text-fog">
              {stats.plannedSets - stats.completedSets} planned set
              {stats.plannedSets - stats.completedSets === 1 ? "" : "s"} not completed. Only
              completed sets will be saved.
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmFinish(false)}>
                Keep going
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setConfirmFinish(false);
                  onFinish();
                }}
              >
                Finish
              </Button>
            </div>
          </div>
        </div>
      )}

      {picking && (
        <ExercisePicker
          library={library}
          onClose={() => setPicking(false)}
          onPick={(e) => {
            setDraft((d) => ({ ...d, exercises: [...d.exercises, newDraftExercise(e)] }));
            setPicking(false);
            selectExercise(draft.exercises.length);
          }}
        />
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-smoke">{label}</p>
      <p className="font-display mt-0.5 truncate text-lg font-bold text-chalk">{value}</p>
    </div>
  );
}

