"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  RotateCcw,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { speak } from "@/lib/voice";
import type { TrainerExercise } from "./trainer-experience";
import type { SessionResult } from "./live-session";

export function SessionReport({
  exercise,
  result,
  onRepeat,
}: {
  exercise: TrainerExercise;
  result: SessionResult;
  onRepeat: () => void;
}) {
  const router = useRouter();
  const saved = useRef(false);
  const [overall, setOverall] = useState<number | null>(null);
  const [xpGain, setXpGain] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [saving, setSaving] = useState(true);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    (async () => {
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseId: exercise.id,
            targetSets: result.sets.length,
            targetReps: result.sets[0]?.reps || result.totalReps || 1,
            durationSec: result.durationSec,
            totalReps: result.totalReps,
            formScore: result.formScore,
            romScore: result.romScore,
            tempoScore: result.tempoScore,
            completionPct: result.completionPct,
            caloriesBurned: result.caloriesBurned,
            sets: result.sets,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setOverall(data.overallScore);
          setXpGain(data.xpGain);
          setFeedback(data.feedback ?? []);
        }
      } catch {
        /* show local scores even if save fails */
      } finally {
        setSaving(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Spoken send-off on the report screen.
  useEffect(() => {
    const lines = [
      "Workout complete! Great job today.",
      "All done. You did great.",
      "Excellent work today!",
      "That's a wrap. Awesome effort.",
    ];
    speak(lines[Math.floor(Math.random() * lines.length)], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const localOverall =
    Math.round(
      ((result.formScore * 0.35 +
        result.romScore * 0.3 +
        result.tempoScore * 0.15 +
        result.completionPct * 0.2) /
        10) *
        10
    ) / 10;
  const score = overall ?? localOverall;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong w-full max-w-2xl rounded-3xl p-8"
      >
        <p className="text-center text-xs uppercase tracking-widest text-smoke">
          Session complete
        </p>
        <h1 className="font-display mt-1 text-center text-3xl font-bold uppercase tracking-wide">
          {exercise.name}
        </h1>

        {/* Overall score */}
        <div className="mt-6 flex justify-center">
          <ProgressRing
            value={score * 10}
            label={`${score}`}
            sub="/ 10 overall"
            size={170}
            gradient={["#ff3b30", "#ff7a18"]}
          />
        </div>

        {xpGain != null && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-amber">
            <Trophy className="h-4 w-4" />
            +{xpGain} XP earned
          </div>
        )}

        {/* Component scores */}
        <div className="mt-8 grid grid-cols-4 gap-3">
          <Bar label="Form" value={result.formScore} />
          <Bar label="Depth" value={result.romScore} />
          <Bar label="Stability" value={result.stabilityScore} />
          <Bar label="Tempo" value={result.tempoScore} />
        </div>

        {/* Rep breakdown */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat icon={<CheckCircle2 className="h-4 w-4 text-neon" />} value={`${result.totalReps}`} label="correct reps" />
          <Stat icon={<XCircle className="h-4 w-4 text-ember" />} value={`${result.invalidReps}`} label="invalid reps" />
          <Stat icon={<TrendingUp className="h-4 w-4 text-volt" />} value={`${result.formScore}%`} label="avg form" />
        </div>

        {/* Quick stats */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat icon={<Flame className="h-4 w-4 text-flame" />} value={`${result.caloriesBurned}`} label="kcal" />
          <Stat icon={<Timer className="h-4 w-4 text-neon" />} value={fmt(result.durationSec)} label="time" />
          <Stat icon={<TrendingUp className="h-4 w-4 text-amber" />} value={`${result.stabilityScore}%`} label="stability" />
        </div>

        {/* Most common mistakes */}
        {result.topMistakes.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber/20 bg-amber/[0.06] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-amber">
              <AlertTriangle className="h-4 w-4" />
              Most common mistakes
            </h2>
            <ul className="space-y-2">
              {result.topMistakes.map((m, i) => (
                <li key={i} className="flex gap-2 text-sm text-fog">
                  <span className="text-amber">•</span>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI feedback */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-fog">
            <Sparkles className="h-4 w-4 text-ember" />
            AI Coach feedback
          </h2>
          {saving ? (
            <p className="text-sm text-smoke">Analyzing your session…</p>
          ) : (
            <ul className="space-y-2">
              {(feedback.length ? feedback : localFeedback(result)).map((f, i) => (
                <li key={i} className="flex gap-2 text-sm text-fog">
                  <span className="text-ember">•</span>
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="flex-1"
            onClick={() => {
              router.push("/dashboard");
              router.refresh();
            }}
          >
            Done
          </Button>
          <Button variant="outline" size="lg" className="flex-1" onClick={onRepeat}>
            <RotateCcw className="h-4 w-4" />
            Train again
          </Button>
        </div>
      </motion.div>
    </main>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const v = Math.round(value);
  const color =
    v >= 80 ? "from-neon to-volt" : v >= 60 ? "from-amber to-flame" : "from-ember to-red-700";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
      <p className="text-xs uppercase tracking-widest text-smoke">{label}</p>
      <p className="font-display mt-1 text-2xl font-bold">{v}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      {icon}
      <p className="font-display mt-1 text-xl font-bold">{value}</p>
      <p className="text-xs text-smoke">{label}</p>
    </div>
  );
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function localFeedback(r: SessionResult): string[] {
  const out: string[] = [];
  if (r.romScore < 75) out.push(`Range of motion ${Math.round(r.romScore)}% — aim for full depth.`);
  if (r.formScore < 75) out.push(`Form ${Math.round(r.formScore)}% — focus on posture and control.`);
  if (r.completionPct < 100) out.push(`Completed ${Math.round(r.completionPct)}% of target.`);
  if (!out.length) out.push("Excellent session — strong form and full range. Keep it up!");
  return out;
}
