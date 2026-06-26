"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getExerciseConfig } from "@/lib/pose/exercises";
import { unlockVoice } from "@/lib/voice";
import { LiveSession, type SessionResult } from "./live-session";
import { SessionReport } from "./session-report";
import { CameraGuide } from "./camera-guide";

export interface TrainerExercise {
  id: string;
  slug: string;
  name: string;
  poseKey: string | null;
  metValue: number;
  aiRepCount: boolean;
  muscles: string[];
  secondaryMuscles: string[];
  formTips: string[];
}

type Phase = "setup" | "camera" | "active" | "report";

export function TrainerExperience({
  exercise,
  bodyWeightKg,
}: {
  exercise: TrainerExercise;
  bodyWeightKg: number;
}) {
  const router = useRouter();
  const isHold = getExerciseConfig(exercise.poseKey).type === "hold";
  const [phase, setPhase] = useState<Phase>("setup");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(isHold ? 30 : 10);
  const [rest, setRest] = useState(60);
  const [mode, setMode] = useState<"beginner" | "advanced">("beginner");
  const [voiceOn, setVoiceOn] = useState(true);
  const [result, setResult] = useState<SessionResult | null>(null);

  if (phase === "camera") {
    return (
      <CameraGuide
        exercise={exercise}
        voiceOn={voiceOn}
        onReady={() => setPhase("active")}
        onBack={() => setPhase("setup")}
      />
    );
  }

  if (phase === "active") {
    return (
      <LiveSession
        exercise={exercise}
        targetSets={sets}
        targetReps={reps}
        restSeconds={rest}
        mode={mode}
        isHold={isHold}
        voiceOn={voiceOn}
        bodyWeightKg={bodyWeightKg}
        onExit={() => router.push(`/exercises/${exercise.slug}`)}
        onFinish={(r) => {
          setResult(r);
          setPhase("report");
        }}
      />
    );
  }

  if (phase === "report" && result) {
    return (
      <SessionReport
        exercise={exercise}
        result={result}
        onRepeat={() => {
          setResult(null);
          setPhase("setup");
        }}
      />
    );
  }

  // ---- Setup ----
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute left-6 top-6">
        <Link
          href={`/exercises/${exercise.slug}`}
          className="inline-flex items-center gap-2 text-sm text-fog transition-colors hover:text-chalk"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit
        </Link>
      </div>

      <div className="glass-strong w-full max-w-md rounded-3xl p-8">
        <p className="text-center text-xs uppercase tracking-widest text-smoke">
          AI Camera Trainer
        </p>
        <h1 className="font-display mt-2 text-center text-4xl font-bold uppercase tracking-wide">
          {exercise.name}
        </h1>
        <p className="mt-3 text-center text-sm text-fog">
          {exercise.aiRepCount
            ? "The AI coach will count your reps, score your form, and cue you in real time."
            : "Live pose tracking with manual rep detection for this movement."}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <Stepper
            label="Sets"
            value={sets}
            min={1}
            max={10}
            onChange={setSets}
          />
          <Stepper
            label={isHold ? "Seconds / set" : "Reps / set"}
            value={reps}
            min={isHold ? 10 : 1}
            max={isHold ? 300 : 50}
            step={isHold ? 5 : 1}
            onChange={setReps}
          />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-widest text-smoke">
            Rest between sets
          </p>
          <div className="flex flex-wrap gap-2">
            {[30, 60, 90, 120].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRest(r)}
                className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold transition-all ${
                  rest === r
                    ? "border-ember/60 bg-ember/15 text-chalk"
                    : "border-white/10 bg-white/[0.03] text-fog hover:text-chalk"
                }`}
              >
                {r}s
              </button>
            ))}
            <input
              type="number"
              min={10}
              max={600}
              placeholder="Custom"
              value={[30, 60, 90, 120].includes(rest) ? "" : rest}
              onChange={(e) => setRest(Math.max(5, Number(e.target.value) || 0))}
              className="w-20 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center text-sm text-chalk outline-none focus:border-ember/50"
            />
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-widest text-smoke">
            Coaching mode
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["beginner", "Beginner", "Forgiving · encouraging"],
              ["advanced", "Advanced", "Strict form standards"],
            ] as const).map(([val, label, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => setMode(val)}
                className={`rounded-2xl border p-3 text-left transition-all ${
                  mode === val
                    ? "border-ember/60 bg-ember/15"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25"
                }`}
              >
                <div className="font-semibold text-chalk">{label}</div>
                <div className="text-[11px] text-fog">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <span className="text-sm text-chalk">Voice coaching</span>
          <button
            type="button"
            onClick={() => {
              const next = !voiceOn;
              setVoiceOn(next);
              if (next) unlockVoice(); // user gesture → satisfy autoplay policy
            }}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              voiceOn ? "bg-ember" : "bg-white/15"
            }`}
            aria-pressed={voiceOn}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                voiceOn ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>

        <Button
          size="xl"
          className="mt-6 w-full"
          onClick={() => {
            // Unlock speech synthesis inside the click gesture so the coach
            // can speak in production (autoplay policy on new origins).
            if (voiceOn) unlockVoice();
            setPhase("camera");
          }}
        >
          Continue to camera setup
        </Button>
        <p className="mt-3 text-center text-xs text-smoke">
          Next: we&apos;ll help you place your camera for accurate form tracking.
        </p>
      </div>
    </main>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
      <p className="text-xs uppercase tracking-widest text-smoke">{label}</p>
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-xl text-chalk hover:bg-white/10"
        >
          −
        </button>
        <span className="font-display text-3xl font-bold">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-xl text-chalk hover:bg-white/10"
        >
          +
        </button>
      </div>
    </div>
  );
}
