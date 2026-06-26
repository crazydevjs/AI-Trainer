// Turns a set's attempt log into a coach-style debrief shown during rest.

import type { AttemptRecord } from "./rep-counter";

export interface SetReport {
  setNumber: number;
  totalReps: number;
  correctReps: number;
  invalidReps: number;
  avgForm: number;
  avgRom: number;
  avgStability: number;
  tempoScore: number;
  fatigue: { level: "Low" | "Moderate" | "High"; pct: number };
  mistakes: string[];
  suggestions: string[];
  focus: string[];
  muscles: { name: string; activation: number }[];
  comparison: { prevForm: number; curForm: number; note: string } | null;
  motivation: string;
  voiceLines: string[];
}

export interface ExerciseInfo {
  name: string;
  muscles: string[];
  secondaryMuscles: string[];
  formTips: string[];
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const avg = (a: number[]) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : 0);

/** Short label for a fault cue (for "… in N reps" lines). */
function label(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("knee")) return "Knees collapsed inward";
  if (m.includes("back") || m.includes("spine")) return "Rounded back";
  if (m.includes("chest") || m.includes("lean") || m.includes("torso")) return "Forward lean";
  if (m.includes("deep") || m.includes("lower") || m.includes("down") || m.includes("depth"))
    return "Incomplete depth";
  if (m.includes("body") || m.includes("hip")) return "Hips dropped";
  if (m.includes("balanc")) return "Loss of stability";
  return msg;
}

function adviceFor(lbl: string): string | null {
  switch (lbl) {
    case "Knees collapsed inward":
      return "Focus on knee alignment — push them out over your toes.";
    case "Rounded back":
      return "Brace your core and keep a flat back throughout.";
    case "Forward lean":
      return "Keep your chest up and your torso tall.";
    case "Incomplete depth":
      return "Hit full depth on every rep — control the bottom.";
    case "Hips dropped":
      return "Keep your body in one straight line.";
    case "Loss of stability":
      return "Slow down and control the movement.";
    default:
      return null;
  }
}

export function analyzeSet(
  setNumber: number,
  attempts: AttemptRecord[],
  tempoScore: number,
  exercise: ExerciseInfo,
  prev: SetReport | null
): SetReport {
  const valid = attempts.filter((a) => a.valid);
  const scoreSrc = valid.length ? valid : attempts;
  const avgForm = Math.round(avg(scoreSrc.map((a) => a.form)));
  const avgRom = Math.round(avg(scoreSrc.map((a) => a.rom)));
  const avgStability = Math.round(avg(scoreSrc.map((a) => a.stability)));
  const correctReps = valid.length;
  const invalidReps = attempts.length - valid.length;

  // --- mistakes ---
  const counts: Record<string, number> = {};
  attempts.forEach((a) => {
    const seen = new Set<string>();
    a.faults.forEach((f) => {
      const l = label(f);
      if (!seen.has(l)) {
        counts[l] = (counts[l] ?? 0) + 1;
        seen.add(l);
      }
    });
  });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const mistakes: string[] = ranked.map(
    ([l, n]) => `${l} in ${n} rep${n === 1 ? "" : "s"}.`
  );
  // a couple of specific rep callouts
  attempts.forEach((a, i) => {
    if (a.faults.length && mistakes.length < 5) {
      const l = label(a.faults[0]);
      const line = `${l} on rep ${i + 1}.`;
      if (!mistakes.includes(line)) mistakes.push(line);
    }
  });

  // trends across the set (valid reps)
  if (valid.length >= 4) {
    const half = Math.floor(valid.length / 2);
    const romFirst = avg(valid.slice(0, half).map((a) => a.rom));
    const romLast = avg(valid.slice(half).map((a) => a.rom));
    if (romLast < romFirst - 8) mistakes.push("Your depth decreased near the end.");
    const stFirst = avg(valid.slice(0, half).map((a) => a.stability));
    const stLast = avg(valid.slice(half).map((a) => a.stability));
    if (stLast < stFirst - 10) mistakes.push("You lost stability in the last reps.");
  }

  // --- suggestions ---
  const suggestions: string[] = [];
  ranked.slice(0, 3).forEach(([l]) => {
    const a = adviceFor(l);
    if (a && !suggestions.includes(a)) suggestions.push(a);
  });
  if (tempoScore < 70) suggestions.push("Slow down the lowering (eccentric) phase.");
  if (!suggestions.length) suggestions.push("Great control — keep the exact same quality.");

  // --- fatigue ---
  let fatiguePct = 0;
  if (prev) fatiguePct += Math.max(0, prev.avgForm - avgForm) * 1.5;
  if (valid.length >= 4) {
    const half = Math.floor(valid.length / 2);
    const romDrop = avg(valid.slice(0, half).map((a) => a.rom)) - avg(valid.slice(half).map((a) => a.rom));
    fatiguePct += Math.max(0, romDrop) * 1.5;
  }
  fatiguePct += attempts.length ? (invalidReps / attempts.length) * 40 : 0;
  if (tempoScore < 70) fatiguePct += 12;
  fatiguePct = Math.round(clamp(fatiguePct));
  const fatigue = {
    pct: fatiguePct,
    level: (fatiguePct < 30 ? "Low" : fatiguePct < 60 ? "Moderate" : "High") as
      | "Low"
      | "Moderate"
      | "High",
  };

  // --- next-set focus + muscles ---
  const focus = [...exercise.formTips.slice(0, 2)];
  if (ranked[0]) {
    const a = adviceFor(ranked[0][0]);
    if (a) focus.unshift(a);
  }
  const muscles = [
    ...exercise.muscles.map((name) => ({ name, activation: 90 })),
    ...exercise.secondaryMuscles.map((name) => ({ name, activation: 55 })),
  ].slice(0, 6);

  // --- comparison + motivation ---
  let comparison: SetReport["comparison"] = null;
  let motivation: string;
  if (prev) {
    const d = avgForm - prev.avgForm;
    const note =
      d >= 3
        ? "Form improved 👏"
        : d <= -3
          ? `Form dropped${ranked[0] ? ` — ${label(ranked[0][0]).toLowerCase()}` : ""}`
          : "Consistent with last set";
    comparison = { prevForm: prev.avgForm, curForm: avgForm, note };
    motivation =
      d >= 3
        ? "Your form improved compared to the last set. Keep it going!"
        : d <= -3
          ? `Form slipped a bit. ${suggestions[0]}`
          : "Solid, consistent work. Hold this quality next set.";
  } else {
    motivation =
      avgForm >= 90 && invalidReps === 0
        ? "Excellent first set — clean reps and strong form!"
        : "Good start. Lock in your form for the next set.";
  }
  if (avgStability >= 85) motivation = "Excellent stability. Let's maintain it.";

  // --- voice lines (coach speaks 1–2 during rest) ---
  const voiceLines: string[] = [];
  if (mistakes[0]) voiceLines.push(mistakes[0]);
  if (focus[0]) voiceLines.push(`Next set: ${focus[0]}`);
  if (!voiceLines.length) voiceLines.push(motivation);

  return {
    setNumber,
    totalReps: attempts.length,
    correctReps,
    invalidReps,
    avgForm,
    avgRom,
    avgStability,
    tempoScore,
    fatigue,
    mistakes,
    suggestions,
    focus,
    muscles,
    comparison,
    motivation,
    voiceLines,
  };
}
