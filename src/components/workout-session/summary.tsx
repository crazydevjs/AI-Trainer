"use client";

// Post-workout summary: motivating AI debrief + a premium, story-format
// shareable card rendered to a 1080×1920 canvas (Web Share / PNG download).

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Download, Share2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtWeight, type Unit } from "@/lib/weight";
import { fmtDuration, fmtVolume, type WorkoutDraft, type WorkoutStats } from "@/lib/workout-session";
import { isDevUnlocked, AI_BUILD, getEngineOverride } from "@/lib/dev";
import { detectTier } from "@/lib/pose/device-tier";
import { getExerciseConfig } from "@/lib/pose/exercises";
import { REP_TUNING } from "@/lib/pose/rep-counter";
import { loadSmoothing } from "@/lib/pose/smoothing-config";
import { loadCalibration } from "@/lib/pose/calibration";
import type { AiLogChunk, SaveResult } from "./experience";

export function WorkoutSummary({
  draft,
  stats,
  durationSec,
  result,
  unit,
  aiLogs = [],
  onDone,
}: {
  draft: WorkoutDraft;
  stats: WorkoutStats;
  durationSec: number;
  result: SaveResult;
  unit: Unit;
  aiLogs?: AiLogChunk[];
  onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shared, setShared] = useState(false);
  const avgReps = stats.completedSets ? Math.round(stats.totalReps / stats.completedSets) : 0;
  const dateStr = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Render the share card once on mount.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawShareCard(canvas, {
      title: draft.title || "Workout",
      dateStr,
      duration: fmtDuration(durationSec),
      volume: fmtVolume(stats.volumeKg),
      sets: stats.completedSets,
      reps: stats.totalReps,
      heaviest: stats.heaviest
        ? `${stats.heaviest.exerciseName} — ${fmtWeight(stats.heaviest.weightKg, unit)} × ${stats.heaviest.reps}`
        : null,
      prCount: result.prs.length,
      quote: firstSentence(result.summary),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function share() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) return;
    const file = new File([blob], "workout.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: draft.title || "Workout" });
        setShared(true);
        return;
      }
    } catch {
      /* user cancelled or share failed → fall through to download */
    }
    download();
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${(draft.title || "workout").toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
    setShared(true);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-center text-xs uppercase tracking-[0.3em] text-neon">
          Workout saved <Check className="ml-1 inline h-3.5 w-3.5" />
        </p>
        <h1 className="font-display mt-2 text-center text-4xl font-bold uppercase tracking-wide">
          {draft.title || "Workout"} Complete 💪
        </h1>
        <p className="mt-1 text-center text-sm text-fog">
          {dateStr} · +{result.xpGain} XP
        </p>

        {/* PRs */}
        {result.prs.length > 0 && (
          <div className="mt-5 space-y-2">
            {result.prs.map((pr) => (
              <div
                key={pr.exerciseId}
                className="flex items-center gap-3 rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3"
              >
                <Trophy className="h-5 w-5 shrink-0 text-amber" />
                <p className="text-sm text-chalk">
                  <b>New PR</b> · {pr.exerciseName} — {fmtWeight(pr.weightKg, unit)} × {pr.reps}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Stats grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Big label="Duration" value={fmtDuration(durationSec)} icon="🔥" />
          <Big label="Volume lifted" value={fmtVolume(stats.volumeKg)} icon="🏋️" />
          <Big label="Sets completed" value={`${stats.completedSets}`} icon="✅" />
          <Big label="Total reps" value={`${stats.totalReps}`} icon="💥" />
          <Big label="Exercises" value={`${stats.exercisesTouched}`} icon="📋" />
          <Big label="Avg reps / set" value={`${avgReps}`} icon="📈" />
          {stats.failureSets > 0 && (
            <Big label="Sets to failure" value={`${stats.failureSets}`} icon="🔥" />
          )}
        </div>

        {stats.heaviest && (
          <div className="glass mt-3 rounded-2xl p-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-smoke">🏆 Heaviest lift</p>
            <p className="font-display mt-1 text-lg font-bold text-chalk">
              {stats.heaviest.exerciseName} — {fmtWeight(stats.heaviest.weightKg, unit)} ×{" "}
              {stats.heaviest.reps}
            </p>
          </div>
        )}

        {/* AI coach observation */}
        <div className="glass-strong mt-5 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-widest text-volt">AI Coach</p>
          <p className="mt-2 text-sm leading-relaxed text-fog">“{result.summary}”</p>
        </div>

        {/* Share card */}
        <div className="mt-6">
          <p className="mb-3 text-center text-xs uppercase tracking-widest text-smoke">
            Your shareable card
          </p>
          <div className="mx-auto w-56 overflow-hidden rounded-2xl border border-white/15 shadow-2xl">
            <canvas ref={canvasRef} width={1080} height={1920} className="h-auto w-full" />
          </div>
          <div className="mx-auto mt-4 flex max-w-sm gap-3">
            <Button className="flex-1" onClick={share}>
              <Share2 className="h-5 w-5" />
              Share
            </Button>
            <Button variant="outline" className="flex-1" onClick={download}>
              <Download className="h-5 w-5" />
              Save image
            </Button>
          </div>
          {shared && (
            <p className="mt-2 text-center text-xs text-neon">Card ready — go inspire someone.</p>
          )}
        </div>

        {/* Dev: export the AI trackers' full debug logs for offline tuning.
            (This screen only mounts client-side, so the dev check is safe.) */}
        {isDevUnlocked() && aiLogs.length > 0 && (
          <button
            onClick={() => exportAiLogs(draft.title, durationSec, aiLogs)}
            className="mt-4 w-full rounded-xl border border-volt/30 bg-volt/10 px-3 py-2 font-mono text-xs text-volt"
          >
            ⤓ AI debug log ({aiLogs.length} tracker session{aiLogs.length === 1 ? "" : "s"},{" "}
            {aiLogs.reduce((n, c) => n + c.log.length, 0)} events)
          </button>
        )}

        <Button size="xl" variant="glass" className="mt-8 w-full" onClick={onDone}>
          View workout history
        </Button>
      </motion.div>
    </main>
  );
}

function Big({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <p className="text-lg">{icon}</p>
      <p className="font-display mt-1 truncate text-xl font-bold text-chalk">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-widest text-smoke">{label}</p>
    </div>
  );
}

function firstSentence(s: string): string {
  const m = s.match(/^[^.!?]+[.!?]/);
  return (m ? m[0] : s).trim();
}

/** Dev export: one JSON with every AI-tracker session from this workout,
 *  stamped with the exact tuning each exercise ran with. */
function exportAiLogs(title: string, durationSec: number, chunks: AiLogChunk[]) {
  const report = {
    meta: {
      workoutTitle: title || "Workout",
      timestamp: new Date().toISOString(),
      durationSec,
      aiBuild: AI_BUILD,
      deviceTier: detectTier(),
      engineOverride: getEngineOverride(),
      repEngine: REP_TUNING,
      smoothing: loadSmoothing(),
      calibration: loadCalibration(),
    },
    trackers: chunks.map((c) => ({
      exercise: c.exercise,
      slug: c.slug,
      poseKey: c.poseKey,
      closedAt: new Date(c.at).toISOString(),
      exerciseConfig: getExerciseConfig(c.poseKey),
      events: c.log.length,
      log: c.log,
      formAnalysis: c.formAnalysis ?? null,
      movementAnalysis: c.movementAnalysis ?? null,
    })),
  };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
  );
  a.download = `forge-ai-log-${Date.now()}.json`;
  a.click();
}

// ---------- canvas share card (1080×1920, Instagram-story friendly) ----------

interface CardData {
  title: string;
  dateStr: string;
  duration: string;
  volume: string;
  sets: number;
  reps: number;
  heaviest: string | null;
  prCount: number;
  quote: string;
}

function drawShareCard(canvas: HTMLCanvasElement, d: CardData) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = 1080;
  const H = 1920;

  // background — deep charcoal with an ember glow
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b0b0d");
  bg.addColorStop(1, "#141114");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.16, 60, W / 2, H * 0.16, 700);
  glow.addColorStop(0, "rgba(255,122,24,0.28)");
  glow.addColorStop(1, "rgba(255,122,24,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const sans = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";

  // brand
  ctx.fillStyle = "#ff7a18";
  ctx.font = `bold 40px ${sans}`;
  ctx.fillText("🔥 FORGE", W / 2, 150);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `28px ${sans}`;
  ctx.fillText("AI TRAINER", W / 2, 195);

  // title + date
  ctx.fillStyle = "#f5f5f4";
  ctx.font = `bold 96px ${sans}`;
  wrapText(ctx, d.title.toUpperCase(), W / 2, 360, 940, 104);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `36px ${sans}`;
  ctx.fillText(d.dateStr, W / 2, 560);

  // PR badge
  if (d.prCount > 0) {
    ctx.fillStyle = "rgba(255,194,75,0.15)";
    roundRect(ctx, W / 2 - 220, 610, 440, 76, 38);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,194,75,0.6)";
    ctx.lineWidth = 3;
    roundRect(ctx, W / 2 - 220, 610, 440, 76, 38);
    ctx.stroke();
    ctx.fillStyle = "#ffc24b";
    ctx.font = `bold 40px ${sans}`;
    ctx.fillText(`🏆 ${d.prCount} NEW PR${d.prCount > 1 ? "S" : ""}`, W / 2, 662);
  }

  // stat rows
  const rows: [string, string][] = [
    ["⏱", `${d.duration}`],
    ["🏋️", `${d.volume} volume`],
    ["✅", `${d.sets} sets`],
    ["💥", `${d.reps} reps`],
  ];
  let y = 810;
  for (const [icon, text] of rows) {
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundRect(ctx, 90, y - 62, W - 180, 100, 28);
    ctx.fill();
    ctx.fillStyle = "#f5f5f4";
    ctx.font = `bold 52px ${sans}`;
    ctx.fillText(`${icon}  ${text}`, W / 2, y + 8);
    y += 136;
  }

  // heaviest lift
  if (d.heaviest) {
    y += 30;
    ctx.fillStyle = "rgba(255,122,24,0.55)";
    ctx.font = `bold 30px ${sans}`;
    ctx.fillText("BEST LIFT", W / 2, y);
    ctx.fillStyle = "#f5f5f4";
    ctx.font = `bold 46px ${sans}`;
    wrapText(ctx, d.heaviest, W / 2, y + 62, 900, 56);
    y += 190;
  }

  // quote
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `italic 38px ${sans}`;
  wrapText(ctx, `“${d.quote}”`, W / 2, Math.max(y + 60, 1560), 880, 52);

  // footer
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = `30px ${sans}`;
  ctx.fillText("Generated by AI Trainer", W / 2, H - 90);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}
