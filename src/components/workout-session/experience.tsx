"use client";

// Workout Session System — orchestrates the full gym-session flow:
//   plan (title/description/exercises) → active (live tracking + AI coach)
//   → summary (AI debrief + shareable card).
// The draft autosaves to localStorage, so closing the app mid-workout loses
// nothing — reopening /workout resumes exactly where the user left off.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EMPTY_DRAFT,
  clearDraft,
  computeStats,
  loadDraft,
  saveDraft,
  type WorkoutDraft,
} from "@/lib/workout-session";
import { loadUnit, saveUnit, type Unit } from "@/lib/weight";
import { WorkoutPlanner } from "./planner";
import { LiveWorkout } from "./live";
import { WorkoutSummary } from "./summary";

export interface LibraryExercise {
  id: string;
  name: string;
  slug: string;
  category: string;
  muscles: string[];
  equipment: string[];
  aiRepCount: boolean;
  poseKey: string | null;
}

export interface SaveResult {
  id: string;
  xpGain: number;
  summary: string;
  prs: { exerciseId: string; exerciseName: string; weightKg: number; reps: number }[];
}

/** One AI-tracker session's debug log (dev tuning export). */
export interface AiLogChunk {
  exercise: string;
  slug: string;
  poseKey: string | null;
  at: number; // epoch ms when the tracker closed
  log: Record<string, unknown>[];
  /** Form Analysis Engine session rollup — see src/lib/pose/form-engine/. */
  formAnalysis?: import("@/lib/pose/form-engine/types").SessionFormSummary;
  /** Movement Intelligence Engine session rollup — see src/lib/pose/movement-engine/. */
  movementAnalysis?: import("@/lib/pose/movement-engine/types").SessionMovementSummary;
}

type Phase = "plan" | "active" | "summary";

export function WorkoutSessionExperience({ library }: { library: LibraryExercise[] }) {
  const router = useRouter();
  const [draft, setDraftState] = useState<WorkoutDraft>(EMPTY_DRAFT);
  const [phase, setPhase] = useState<Phase>("plan");
  const [unit, setUnitState] = useState<Unit>("kg");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [result, setResult] = useState<SaveResult | null>(null);
  const [finishedDraft, setFinishedDraft] = useState<WorkoutDraft | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const restored = useRef(false);
  const [aiLogs, setAiLogs] = useState<AiLogChunk[]>([]); // dev: AI tracker logs for export

  // Restore an in-progress workout (or a half-built plan) after hydration.
  // Runs async (microtask) so the first client render matches the server HTML.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    queueMicrotask(() => {
      setUnitState(loadUnit());
      const saved = loadDraft();
      if (saved && (saved.exercises.length > 0 || saved.title)) {
        setDraftState(saved);
        if (saved.startedAt) setPhase("active");
      }
    });
  }, []);

  const setDraft = useCallback((updater: (d: WorkoutDraft) => WorkoutDraft) => {
    setDraftState((d) => {
      const next = updater(d);
      saveDraft(next);
      return next;
    });
  }, []);

  const setUnit = (u: Unit) => {
    setUnitState(u);
    saveUnit(u);
  };

  const start = () => {
    setDraft((d) => ({ ...d, startedAt: d.startedAt ?? Date.now() }));
    setPhase("active");
  };

  const discard = () => {
    clearDraft();
    setDraftState(EMPTY_DRAFT);
    router.push("/dashboard");
  };

  // Finish → persist to the server. On failure the draft is kept intact so the
  // user can retry — a workout is never lost because a request failed.
  const finish = useCallback(async () => {
    const dur = draft.startedAt ? Math.round((Date.now() - draft.startedAt) / 1000) : 0;
    setDurationSec(dur);
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        title: draft.title.trim() || "Workout",
        description: draft.description.trim() || undefined,
        startedAt: draft.startedAt ?? Date.now() - dur * 1000,
        durationSec: dur,
        exercises: draft.exercises
          .filter((ex) => ex.sets.length > 0)
          .map((ex, i) => {
            // Phase 7 — most-recent AI-tracker sub-session for this exercise
            // (matched by slug, since AiLogChunk has no exerciseId). Only
            // the last chunk is sent when an exercise had multiple AI
            // tracking sub-sessions — see ALGORITHM.md "Known limitations".
            const lastChunk = aiLogs
              .filter((c) => c.slug === ex.slug)
              .sort((a, b) => a.at - b.at)
              .pop();
            return {
              exerciseId: ex.exerciseId,
              order: i,
              sets: ex.sets.map((s, j) => ({
                setNumber: j + 1,
                reps: s.doneReps ?? 0,
                targetReps: s.targetReps > 0 ? s.targetReps : undefined,
                failed: s.failed,
                weightKg: s.weightKg > 0 ? s.weightKg : undefined,
                aiTracked: s.aiTracked,
                formScore: s.formScore,
                romScore: s.romScore,
              })),
              formAnalysis: lastChunk?.formAnalysis,
              movementAnalysis: lastChunk?.movementAnalysis,
            };
          }),
      };
      const res = await fetch("/api/workout-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not save the workout");
      setResult(data as SaveResult);
      setFinishedDraft(draft);
      clearDraft();
      setPhase("summary");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save the workout");
    } finally {
      setSaving(false);
    }
  }, [draft, aiLogs]);

  if (phase === "summary" && result && finishedDraft) {
    return (
      <WorkoutSummary
        draft={finishedDraft}
        stats={computeStats(finishedDraft)}
        durationSec={durationSec}
        result={result}
        unit={unit}
        aiLogs={aiLogs}
        onDone={() => router.push("/profile/history")}
      />
    );
  }

  if (phase === "active") {
    return (
      <LiveWorkout
        draft={draft}
        setDraft={setDraft}
        library={library}
        unit={unit}
        saving={saving}
        saveError={saveError}
        onFinish={finish}
        onDiscard={discard}
        onAiLog={(chunk) => setAiLogs((p) => [...p, chunk])}
      />
    );
  }

  return (
    <WorkoutPlanner
      draft={draft}
      setDraft={setDraft}
      library={library}
      unit={unit}
      setUnit={setUnit}
      onStart={start}
      onDiscard={discard}
    />
  );
}
