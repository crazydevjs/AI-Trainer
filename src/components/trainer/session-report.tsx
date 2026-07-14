"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Flame,
  Loader2,
  RotateCcw,
  Share2,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy,
  Video,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { speak } from "@/lib/voice";
import { fmtWeight, totalVolume, epley1RM, type Unit } from "@/lib/weight";
import { isDevUnlocked, AI_BUILD, getEngineOverride, type SessionTags } from "@/lib/dev";
import { detectTier } from "@/lib/pose/device-tier";
import { saveSession } from "@/lib/dev-history";
import { getExerciseConfig } from "@/lib/pose/exercises";
import { getCameraSetup } from "@/lib/pose/camera-setup";
import { REP_TUNING } from "@/lib/pose/rep-counter";
import { loadSmoothing } from "@/lib/pose/smoothing-config";
import { loadCalibration } from "@/lib/pose/calibration";
import { convertToMp4, mp4ConvertSupported, videoFileName } from "@/lib/mp4";
import type { TrainerExercise, LiftHistory } from "./trainer-experience";
import type { SessionResult } from "./live-session";
import type { RecordResult } from "./use-workout-recorder";
import type { PerformanceEngineResult } from "@/lib/performance";
import type { PersonalizationEngineResult } from "@/lib/personalization";

export function SessionReport({
  exercise,
  result,
  recording,
  unit = "kg",
  history,
  debugMeta,
  onRepeat,
}: {
  exercise: TrainerExercise;
  result: SessionResult;
  recording?: RecordResult | null;
  unit?: Unit;
  history?: LiftHistory;
  debugMeta?: SessionTags;
  onRepeat: () => void;
}) {
  const router = useRouter();
  const saved = useRef(false);
  const sidRef = useRef<string>("");
  useEffect(() => {
    if (!sidRef.current) {
      sidRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `s-${Date.now().toString(36)}`;
    }
  }, []);
  const [overall, setOverall] = useState<number | null>(null);
  const [xpGain, setXpGain] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [saving, setSaving] = useState(true);
  const [perfResult, setPerfResult] = useState<PerformanceEngineResult | null>(null);
  const [personalizationResult, setPersonalizationResult] = useState<PersonalizationEngineResult | null>(null);

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
            // Phase 7 — previously computed client-side only, never sent.
            formAnalysis: result.formAnalysis,
            movementAnalysis: result.movementAnalysis,
            injuryRiskAnalysis: result.injuryRiskAnalysis,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setOverall(data.overallScore);
          setXpGain(data.xpGain);
          setFeedback(data.feedback ?? []);
          setPerfResult(data.performance ?? null);
          setPersonalizationResult(data.personalization ?? null);
        }
      } catch {
        /* show local scores even if save fails */
      } finally {
        setSaving(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist a developer session record (dev mode only).
  const histSaved = useRef(false);
  useEffect(() => {
    if (histSaved.current || !isDevUnlocked()) return;
    histSaved.current = true;
    const stats = computeStats(result);
    const topW = Math.max(0, ...result.sets.map((s) => s.weightKg ?? 0));
    saveSession({
      id: sidRef.current,
      ts: Date.now(),
      exercise: exercise.name,
      slug: exercise.slug,
      weight: topW > 0 ? fmtWeight(topW, unit) : debugMeta?.weight,
      cameraAngle: debugMeta?.cameraAngle,
      device: debugMeta?.device,
      tier: detectTier(),
      engine: stats.poseEngineFinal,
      avgFps: stats.avgFps,
      avgInferenceMs: stats.avgInferenceMs,
      confidence: stats.avgConfidence,
      actualReps: result.totalReps,
      falseReps: 0,
      missedReps: stats.repsRejected,
      trackingLoss: stats.trackingLossEvents,
      fallbackEvents: stats.fallbackEvents,
      aiBuild: AI_BUILD,
      notes: [
        debugMeta?.notes,
        debugMeta?.environment,
        debugMeta?.lighting,
        debugMeta?.prAttempt ? "PR" : "",
        debugMeta?.failureSet ? "failure" : "",
      ]
        .filter(Boolean)
        .join("; "),
      favorite: !!debugMeta?.prAttempt,
    });
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
  }, []);

  // --- MP4 export -----------------------------------------------------------
  // Native MP4 recordings download as-is. WebM recordings (browsers without
  // MP4 MediaRecorder support) are transcoded to H.264+AAC MP4 on-device via
  // ffmpeg.wasm so the file plays on iPhone/Android/desktop and social apps.
  // If conversion fails, the WebM still downloads — the video is never lost.
  const needsConvert = !!recording && recording.ext !== "mp4" && mp4ConvertSupported();
  const [convertPct, setConvertPct] = useState<number | null>(needsConvert ? 0 : null);
  const [convertFailed, setConvertFailed] = useState(false);
  const [video, setVideo] = useState<RecordResult | null>(
    needsConvert ? null : (recording ?? null)
  );
  const convertStarted = useRef(false);

  useEffect(() => {
    if (!recording || !needsConvert || convertStarted.current) return;
    convertStarted.current = true;
    (async () => {
      try {
        const blob = await convertToMp4(recording.blob, (p) => setConvertPct(p));
        setVideo({ url: URL.createObjectURL(blob), blob, ext: "mp4", mimeType: "video/mp4" });
      } catch {
        setConvertFailed(true);
        setVideo(recording); // fall back — never block the download
      } finally {
        setConvertPct(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fileName = videoFileName(exercise.name, video?.ext ?? "mp4");

  // Auto-download the final file (closest thing to gallery-save on web).
  const downloaded = useRef(false);
  useEffect(() => {
    if (!video || downloaded.current) return;
    downloaded.current = true;
    try {
      const a = document.createElement("a");
      a.href = video.url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      /* user can use the buttons */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video]);

  async function shareVideo() {
    if (!video) return;
    const file = new File([video.blob], fileName, { type: video.blob.type });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "My FORGE workout",
          text: `${result.totalReps} reps of ${exercise.name} with my AI coach 💪 #FORGE`,
        });
        return;
      } catch {
        /* fall through to download */
      }
    }
    const a = document.createElement("a");
    a.href = video.url;
    a.download = fileName;
    a.click();
  }

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

  // strength stats
  const hasWeight = result.sets.some((s) => (s.weightKg ?? 0) > 0);
  const volume = totalVolume(result.sets);
  const topWeightKg = Math.max(0, ...result.sets.map((s) => s.weightKg ?? 0));
  const bestSet = result.sets.reduce(
    (b, s) => ((s.weightKg ?? 0) > (b?.weightKg ?? 0) ? s : b),
    result.sets[0]
  );
  const est1RM = bestSet?.weightKg ? epley1RM(bestSet.weightKg, bestSet.reps) : 0;
  const isPR =
    !!history &&
    (topWeightKg > history.bestWeightKg ||
      result.sets.some((s) => (s.weightKg ?? 0) * s.reps > history.bestVolumeKg));

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

        {/* Strength / load */}
        {hasWeight && (
          <div className="mt-4 rounded-2xl border border-flame/20 bg-flame/[0.06] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-flame">
                <TrendingUp className="h-4 w-4" />
                Strength
              </h2>
              {isPR && (
                <span className="rounded-full border border-amber/50 bg-amber/15 px-2.5 py-0.5 text-xs font-bold text-amber">
                  🏆 New PR
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {result.sets.map((s) => (
                <div key={s.setNumber} className="flex items-center justify-between text-sm">
                  <span className="text-fog">Set {s.setNumber}</span>
                  <span className="text-chalk">
                    {s.reps} × {fmtWeight(s.weightKg ?? 0, unit)}
                  </span>
                  <span className="text-smoke">
                    {Math.round((s.weightKg ?? 0) * s.reps)} {unit === "kg" ? "kg" : "lb"}·vol
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-white/5 pt-3">
              <Stat icon={<TrendingUp className="h-4 w-4 text-flame" />} value={`${volume}`} label="total volume" />
              <Stat icon={<Trophy className="h-4 w-4 text-amber" />} value={fmtWeight(topWeightKg, unit)} label="top set" />
              <Stat icon={<Sparkles className="h-4 w-4 text-volt" />} value={fmtWeight(est1RM, unit)} label="est. 1RM" />
            </div>
          </div>
        )}

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

        {/* Form Analysis Engine summary */}
        {result.formAnalysis && result.formAnalysis.topIssues.length > 0 && (
          <div className="mt-4 rounded-2xl border border-volt/20 bg-volt/[0.05] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-volt">
              <AlertTriangle className="h-4 w-4" />
              Form analysis
            </h2>
            <div className="mb-3 grid grid-cols-4 gap-2 text-center">
              <Stat icon={null} value={`${result.formAnalysis.scores.overall}`} label="overall" />
              <Stat icon={null} value={`${result.formAnalysis.scores.technique}`} label="technique" />
              <Stat icon={null} value={`${result.formAnalysis.scores.balance}`} label="balance" />
              <Stat icon={null} value={`${result.formAnalysis.scores.stability}`} label="stability" />
            </div>
            <ul className="space-y-2">
              {result.formAnalysis.issueLog
                .filter((e) => result.formAnalysis!.topIssues.includes(e.id))
                .slice(0, 3)
                .map((e, i) => (
                  <li key={i} className="flex items-center justify-between text-sm text-fog">
                    <span className="flex gap-2">
                      <span className="text-volt">•</span>
                      {e.id}
                    </span>
                    <span className="text-[11px] uppercase text-smoke">{e.severity}</span>
                  </li>
                ))}
            </ul>
            <p className="mt-2 text-[11px] text-smoke">
              Estimated from camera pose tracking — a coaching guide, not a clinical assessment.
              {!result.formAnalysis.hasExerciseProfile &&
                " Only general joint/balance checks apply to this exercise so far."}
            </p>
          </div>
        )}

        {/* Movement Intelligence Engine summary */}
        {result.movementAnalysis && (
          <div className="mt-4 rounded-2xl border border-volt/20 bg-volt/[0.05] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-volt">
              <AlertTriangle className="h-4 w-4" />
              Movement intelligence
            </h2>
            <div className="mb-3 grid grid-cols-4 gap-2 text-center">
              <Stat icon={null} value={`${result.movementAnalysis.scores.overall}`} label="overall" />
              <Stat icon={null} value={`${result.movementAnalysis.scores.smoothness}`} label="smoothness" />
              <Stat icon={null} value={`${result.movementAnalysis.scores.symmetry}`} label="symmetry" />
              <Stat icon={null} value={`${result.movementAnalysis.scores.consistency}`} label="consistency" />
            </div>
            {result.movementAnalysis.strengths.length > 0 && (
              <p className="text-sm text-fog">
                <span className="text-neon">Strengths: </span>
                {result.movementAnalysis.strengths.join(", ")}
              </p>
            )}
            {result.movementAnalysis.weaknesses.length > 0 && (
              <p className="mt-1 text-sm text-fog">
                <span className="text-amber">Focus areas: </span>
                {result.movementAnalysis.focusAreas.join(", ")}
              </p>
            )}
            {result.movementAnalysis.symmetry.dominantSide && (
              <p className="mt-1 text-sm text-fog">
                Dominant side:{" "}
                <span className="text-chalk">{result.movementAnalysis.symmetry.dominantSide}</span>
              </p>
            )}
            <p className="mt-2 text-[11px] text-smoke">
              Describes observed movement patterns from camera pose tracking, not a medical or
              injury assessment.
            </p>
          </div>
        )}

        {/* Performance Intelligence summary */}
        {perfResult && (
          <div className="mt-4 rounded-2xl border border-amber/20 bg-amber/[0.06] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-amber">
              <Trophy className="h-4 w-4" />
              Performance
            </h2>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <Stat icon={null} value={`${perfResult.scores.overallScore}`} label="score" />
              <Stat icon={null} value={perfResult.exerciseProgress} label="progress" />
              <Stat icon={null} value={`${perfResult.historyCount}`} label="sessions" />
            </div>
            {perfResult.newPersonalBests.length > 0 && (
              <p className="text-sm text-fog">
                <span className="text-amber">New personal bests: </span>
                {perfResult.newPersonalBests.length}
              </p>
            )}
            {perfResult.newAchievements.length > 0 && (
              <p className="mt-1 text-sm text-fog">
                <span className="text-neon">Achievements unlocked: </span>
                {perfResult.newAchievements.map((a) => a.title).join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Workout video */}
        {recording && (
          <div className="mt-6 rounded-2xl border border-volt/20 bg-volt/[0.05] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-volt">
              <Video className="h-4 w-4" />
              {convertPct != null ? "Preparing your video" : "Workout video saved"}
            </h2>
            <video
              src={recording.url}
              controls
              playsInline
              className="w-full rounded-xl bg-black"
            />

            {convertPct != null ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="flex items-center gap-2 text-sm text-fog">
                  <Loader2 className="h-4 w-4 animate-spin text-volt" />
                  Converting to MP4 for universal playback… {convertPct}%
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-volt to-neon transition-all duration-300"
                    style={{ width: `${convertPct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-smoke">
                  Runs on your device — the video is never uploaded.
                </p>
              </div>
            ) : (
              video && (
                <div className="mt-3 flex gap-3">
                  <Button className="flex-1" onClick={shareVideo}>
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                  <a href={video.url} download={fileName} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Download className="h-4 w-4" />
                      Download {video.ext.toUpperCase()}
                    </Button>
                  </a>
                </div>
              )
            )}

            {convertFailed && (
              <p className="mt-2 rounded-lg border border-amber/30 bg-amber/10 px-3 py-1.5 text-center text-[11px] text-amber">
                MP4 conversion couldn&apos;t finish here — saved as WebM instead (plays in
                Chrome/Firefox; convert online for iPhone).
              </p>
            )}
            <p className="mt-2 text-center text-[11px] text-smoke">
              {video ? `Saved as ${fileName}. ` : ""}
              Tap Share to post to Instagram, WhatsApp, or YouTube.
            </p>
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

        {isDevUnlocked() && perfResult && (
          <div className="mt-4 space-y-0.5 rounded-xl border border-volt/30 bg-black/75 p-3 font-mono text-[11px] text-fog">
            <p className="mb-1 font-bold text-volt">PERFORMANCE ENGINE</p>
            <Row2 k="workout score" v={`${perfResult.scores.overallScore}`} />
            <Row2 k="progress" v={perfResult.exerciseProgress} />
            <Row2 k="trend (overall)" v={perfResult.overallProgress} />
            <Row2 k="PRs" v={`${perfResult.newPersonalBests.length}`} />
            <Row2
              k="weakness trend"
              v={perfResult.weaknesses[0] ? `${perfResult.weaknesses[0].issueId} (${perfResult.weaknesses[0].trend})` : "—"}
            />
            <Row2 k="history count" v={`${perfResult.historyCount}`} />
          </div>
        )}

        {isDevUnlocked() && personalizationResult && (
          <div className="mt-4 space-y-0.5 rounded-xl border border-volt/30 bg-black/75 p-3 font-mono text-[11px] text-fog">
            <p className="mb-1 font-bold text-volt">PERSONALIZATION ENGINE</p>
            <Row2 k="learning confidence" v={`${Math.round(personalizationResult.profile.learningConfidence * 100)}%`} />
            <Row2 k="goal" v={personalizationResult.goal.goal} />
            <Row2 k="coach style" v={personalizationResult.profile.coachingPreference} />
            <Row2
              k="prediction"
              v={
                personalizationResult.prediction?.expectedImprovementPct != null
                  ? `+${personalizationResult.prediction.expectedImprovementPct}%`
                  : "—"
              }
            />
            {personalizationResult.updatedThresholds.length > 0 && (
              <div className="mt-1 space-y-0.5">
                <p className="text-smoke">Adaptive thresholds</p>
                {personalizationResult.updatedThresholds.slice(0, 4).map((t) => (
                  <div key={t.thresholdType} className="flex items-center justify-between">
                    <span>{t.thresholdType}</span>
                    <span className="text-chalk">{t.personalizedValue}</span>
                  </div>
                ))}
              </div>
            )}
            {personalizationResult.updatedWeaknesses.filter((w) => w.classification === "RESOLVED").length > 0 && (
              <Row2
                k="recovered weaknesses"
                v={`${personalizationResult.updatedWeaknesses.filter((w) => w.classification === "RESOLVED").length}`}
              />
            )}
            {personalizationResult.updatedWeaknesses.filter((w) => w.classification === "PERSISTENT").length > 0 && (
              <Row2
                k="persistent weaknesses"
                v={`${personalizationResult.updatedWeaknesses.filter((w) => w.classification === "PERSISTENT").length}`}
              />
            )}
          </div>
        )}

        {isDevUnlocked() && result.debugLog && result.debugLog.length > 0 && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() =>
                exportDebug(sidRef.current, exercise, result, unit, debugMeta, perfResult, personalizationResult)
              }
              className="flex-1 rounded-xl border border-volt/30 bg-volt/10 px-3 py-2 text-xs font-mono text-volt"
            >
              ⤓ JSON ({result.debugLog.length})
            </button>
            <button
              onClick={() =>
                exportCsv(sidRef.current, exercise, result, unit, debugMeta, perfResult, personalizationResult)
              }
              className="flex-1 rounded-xl border border-volt/30 bg-volt/10 px-3 py-2 text-xs font-mono text-volt"
            >
              ⤓ CSV (summary)
            </button>
          </div>
        )}
      </motion.div>
    </main>
  );
}

function Row2({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{k}</span>
      <span className="text-chalk">{v}</span>
    </div>
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

function computeStats(result: SessionResult) {
  const log = result.debugLog ?? [];
  const samples = log.filter((e) => e.event === "sample");
  const nums = (key: string) => samples.map((s) => Number(s[key]) || 0);
  const mean = (key: string) => {
    const v = nums(key);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
  };
  const count = (ev: string) => log.filter((e) => e.event === ev).length;
  const fpsVals = nums("fps").filter((n) => n > 0);
  const infVals = nums("inferenceMs");
  return {
    poseEngineFinal: (samples[samples.length - 1]?.model as string) ?? "2D",
    avgFps: mean("fps"),
    minFps: fpsVals.length ? Math.min(...fpsVals) : 0,
    avgInferenceMs: mean("inferenceMs"),
    maxInferenceMs: infVals.length ? Math.max(...infVals) : 0,
    avgConfidence: mean("confidence"),
    avgLandmarks: mean("landmarks"),
    repsCounted: count("rep"),
    // proxy: the engine rejected these attempts (partial/bad form). True
    // false/missed counts require ground-truth video review.
    repsRejected: count("rep-rejected"),
    fallbackEvents: count("fallback-3d-to-2d"),
    trackingLossEvents: count("tracking-loss"),
  };
}

function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

function exportDebug(
  sessionId: string,
  exercise: TrainerExercise,
  result: SessionResult,
  unit: Unit,
  meta?: SessionTags,
  perf?: PerformanceEngineResult | null,
  personalization?: PersonalizationEngineResult | null
) {
  const stats = computeStats(result);
  const report = {
    meta: {
      sessionId,
      exercise: exercise.name,
      exerciseSlug: exercise.slug,
      poseKey: exercise.poseKey,
      timestamp: new Date().toISOString(),
      aiBuild: AI_BUILD,
      deviceTier: detectTier(),
      engineOverride: getEngineOverride(),
      unit,
      ...meta,
    },
    // Exact tuning the session ran with — so threshold changes are data-driven,
    // traceable to the config that produced the numbers in `log`.
    tuning: {
      exerciseConfig: getExerciseConfig(exercise.poseKey),
      requiredView: getCameraSetup(exercise.poseKey).view,
      repEngine: REP_TUNING,
      smoothing: loadSmoothing(),
      calibration: loadCalibration(),
    },
    summary: {
      durationSec: result.durationSec,
      ...stats,
      totalReps: result.totalReps,
      invalidReps: result.invalidReps,
      formScore: result.formScore,
      romScore: result.romScore,
      stabilityScore: result.stabilityScore,
    },
    sets: result.sets,
    log: result.debugLog ?? [],
    // Form Analysis Engine rollup: per-rep scores, the issue lifecycle log
    // (with severity/duration/confidence), score history, and cross-session
    // weakness trends — see src/lib/pose/form-engine/.
    formAnalysis: result.formAnalysis ?? null,
    // Movement Intelligence Engine rollup: movement scores, score history,
    // consistency/symmetry/compensation/trend summaries — see
    // src/lib/pose/movement-engine/.
    movementAnalysis: result.movementAnalysis ?? null,
    // Injury Risk Engine rollup: risk timeline, highest/average risk, risk
    // trend, most common contributing factors, and the recommendation
    // history — see src/lib/pose/injury-risk-engine/. Coaching guidance
    // only, not a medical assessment.
    injuryRiskAnalysis: result.injuryRiskAnalysis ?? null,
    // Phase 7: Performance Intelligence & Persistence Layer server response
    // — scores, new personal bests/achievements, weakness trend, progress.
    performance: perf ?? null,
    // Phase 8: Personalized Learning Engine server response — learned
    // profile, adaptive thresholds, weakness classification, prediction,
    // goal. Never overwrites any default threshold — see ALGORITHM.md.
    personalization: personalization ?? null,
  };
  download(
    `forge-debug-${exercise.slug}-${Date.now()}.json`,
    new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
  );
}

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(
  sessionId: string,
  exercise: TrainerExercise,
  result: SessionResult,
  unit: Unit,
  meta?: SessionTags,
  perf?: PerformanceEngineResult | null,
  personalization?: PersonalizationEngineResult | null
) {
  const stats = computeStats(result);
  const ts = new Date().toISOString();
  const target =
    result.repsMode === "failure" ? "To failure" : String(result.targetReps ?? "");
  const headers = [
    "Timestamp", "Session ID", "Exercise", "Set Number", `Weight (${unit})`,
    "Target Reps", "Actual Reps", "Camera Angle", "Device Model", "Device Tier",
    "Pose Engine", "Avg FPS", "Min FPS", "Avg Inference (ms)", "Max Inference (ms)",
    "Detection Confidence", "Tracking Loss Events", "False Rep Count",
    "Missed Rep Count (rejected)", "Auto-Fallback Events", "AI Model Version",
    "Build Version", "Form Overall Score", "Form Top Issues",
    "Movement Overall Score", "Movement Symmetry Score", "Dominant Side",
    "Highest Risk Score", "Average Risk Score", "Risk Trend",
    "Performance Score", "Progress", "New PRs",
    "Learning Confidence", "Goal", "Coach Style", "Notes/Tags",
  ];
  const notes = [meta?.notes, meta?.environment, meta?.lighting, meta?.prAttempt ? "PR-attempt" : "", meta?.failureSet ? "failure-set" : ""]
    .filter(Boolean)
    .join("; ");

  const rows = (result.sets.length ? result.sets : [{ setNumber: 1, reps: result.totalReps, weightKg: 0 }]).map((s) => [
    ts,
    sessionId,
    exercise.name,
    s.setNumber,
    s.weightKg ? Math.round(fromUnit(s.weightKg, unit) * 10) / 10 : "",
    target,
    s.reps,
    meta?.cameraAngle ?? "",
    meta?.device ?? "",
    detectTier(),
    stats.poseEngineFinal,
    stats.avgFps,
    stats.minFps,
    stats.avgInferenceMs,
    stats.maxInferenceMs,
    stats.avgConfidence,
    stats.trackingLossEvents,
    0, // false reps — manual (needs video ground truth)
    stats.repsRejected, // missed/rejected proxy
    stats.fallbackEvents,
    "MoveNet/BlazePose",
    AI_BUILD,
    result.formAnalysis?.scores.overall ?? "",
    result.formAnalysis?.topIssues.join("; ") ?? "",
    result.movementAnalysis?.scores.overall ?? "",
    result.movementAnalysis?.scores.symmetry ?? "",
    result.movementAnalysis?.symmetry.dominantSide ?? "",
    result.injuryRiskAnalysis?.highestRisk ?? "",
    result.injuryRiskAnalysis?.averageRisk ?? "",
    result.injuryRiskAnalysis?.riskTrend ?? "",
    perf?.scores.overallScore ?? "",
    perf?.exerciseProgress ?? "",
    perf?.newPersonalBests.length ?? "",
    personalization ? `${Math.round(personalization.profile.learningConfidence * 100)}%` : "",
    personalization?.goal.goal ?? "",
    personalization?.profile.coachingPreference ?? "",
    notes,
  ]);

  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  download(
    `forge-debug-${exercise.slug}-${Date.now()}.csv`,
    new Blob([csv], { type: "text/csv" })
  );
}

function fromUnit(kg: number, unit: Unit) {
  return unit === "kg" ? kg : kg * 2.20462;
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
