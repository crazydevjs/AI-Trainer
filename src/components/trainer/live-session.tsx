"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bug,
  Loader2,
  Lock,
  Pause,
  Play,
  Square,
  SwitchCamera,
  Target,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePoseTrainer, type Pipeline } from "./use-pose-trainer";
import { getCameraSetup } from "@/lib/pose/camera-setup";
import type { CoachEvent } from "@/lib/pose/rep-counter";
import {
  getVoiceStatus,
  setVoiceEnabled,
  speak,
  stopSpeaking,
  unlockVoice,
  speakSequence,
  playBeep,
  type VoiceStatus,
} from "@/lib/voice";
import { Coach } from "@/lib/coach";
import { analyzeSet, type SetReport } from "@/lib/pose/set-analysis";
import { isMirrored, type Facing } from "@/lib/camera";
import { isDevUnlocked, getHudEnabled } from "@/lib/dev";
import { displayWeight, fmtWeight, type Unit } from "@/lib/weight";
import { RestScreen } from "./rest-screen";
import type { WorkoutRecorder, RecorderHud } from "./use-workout-recorder";
import type { TrainerExercise, LiftHistory } from "./trainer-experience";

export interface SessionResult {
  durationSec: number;
  totalReps: number;
  invalidReps: number;
  formScore: number;
  romScore: number;
  tempoScore: number;
  stabilityScore: number;
  confidenceScore: number;
  completionPct: number;
  caloriesBurned: number;
  topMistakes: string[];
  targetReps: number;
  repsMode: "fixed" | "failure";
  sets: {
    setNumber: number;
    reps: number;
    formScore?: number;
    romScore?: number;
    weightKg?: number;
  }[];
  debugLog?: Record<string, unknown>[];
}

type Cue = { text: string; id: number; tone: "praise" | "correct" | "bad" };

function tempoFromTimes(times: number[]): number {
  if (times.length < 3) return 100;
  const ivs: number[] = [];
  for (let i = 1; i < times.length; i++) ivs.push((times[i] - times[i - 1]) / 1000);
  const avg = ivs.reduce((a, b) => a + b, 0) / ivs.length;
  if (avg < 1) return 50;
  if (avg < 1.5) return 70;
  if (avg < 2) return 88;
  if (avg <= 4.5) return 100;
  return 85;
}

const TONE_STYLES: Record<Cue["tone"], string> = {
  praise: "border-neon/50 bg-neon/15 text-neon",
  correct: "border-amber/50 bg-amber/20 text-amber",
  bad: "border-ember/60 bg-ember/25 text-chalk",
};

export function LiveSession({
  exercise,
  targetSets,
  targetReps,
  restSeconds,
  mode,
  facing,
  onFlipCamera,
  recorder,
  recordEnabled,
  weighted,
  unit,
  startWeightKg,
  history,
  repsMode,
  isHold,
  voiceOn,
  bodyWeightKg,
  onExit,
  onFinish,
}: {
  exercise: TrainerExercise;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  mode: "beginner" | "advanced";
  repsMode: "fixed" | "failure";
  facing: Facing;
  onFlipCamera: () => void;
  recorder: WorkoutRecorder;
  recordEnabled: boolean;
  weighted: boolean;
  unit: Unit;
  startWeightKg: number;
  history: LiftHistory;
  isHold: boolean;
  voiceOn: boolean;
  bodyWeightKg: number;
  onExit: () => void;
  onFinish: (r: SessionResult) => void;
}) {
  const [paused, setPaused] = useState(false);
  const [resting, setResting] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [cue, setCue] = useState<Cue | null>(null);
  const [voice, setVoice] = useState(voiceOn);
  const [showDebug, setShowDebug] = useState(false);
  const [repQuality, setRepQuality] = useState<{
    form: number;
    depth: number;
    stability: number;
    confidence: number;
    id: number;
  } | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>({
    supported: true,
    unlocked: false,
    speaking: false,
    voice: null,
  });

  const [restReport, setRestReport] = useState<SetReport | null>(null);
  const setStartCount = useRef(0);
  const repTimes = useRef<number[]>([]);
  const startTs = useRef(performance.now());
  const finishedRef = useRef(false);
  const completedSets = useRef<SessionResult["sets"]>([]);
  const coach = useRef(new Coach()).current;
  const startedRef = useRef(false);
  const hypeRef = useRef("");
  const prevReportRef = useRef<SetReport | null>(null);
  const attemptsAtSetStart = useRef(0);
  const repTimesAtSetStart = useRef(0);
  const announced15 = useRef(false);
  const hudRef = useRef<RecorderHud>({ exercise: exercise.name, rep: "0", set: "Set 1" });
  const recStarted = useRef(false);
  const lastRepFlash = useRef(0);
  const [devHud] = useState(() => isDevUnlocked() && getHudEnabled());
  const fpsHist = useRef<number[]>([]);
  const infHist = useRef<number[]>([]);
  const requiredView = getCameraSetup(exercise.poseKey).view;
  const [currentWeightKg, setCurrentWeightKg] = useState(startWeightKg);
  const [nextWeightKg, setNextWeightKg] = useState(startWeightKg);
  const bestWeightRef = useRef(history.bestWeightKg);
  const bestVolumeRef = useRef(history.bestVolumeKg);
  const currentWeightRef = useRef(startWeightKg);
  currentWeightRef.current = currentWeightKg;
  const [prBadge, setPrBadge] = useState(false);

  useEffect(() => {
    setVoiceEnabled(voice);
  }, [voice]);

  // Poll the speech engine so the HUD can show status / a fallback button.
  useEffect(() => {
    const id = setInterval(() => setVoiceStatus(getVoiceStatus()), 1000);
    return () => clearInterval(id);
  }, []);

  function enableVoice() {
    setVoiceEnabled(true);
    unlockVoice();
    setVoice(true);
    speak("Voice on. Let's go.", true); // audible confirmation within the gesture
    setVoiceStatus(getVoiceStatus());
  }

  const handleEvent = useCallback(
    (e: CoachEvent) => {
      if (e.type === "rep") {
        repTimes.current.push(performance.now());
        lastRepFlash.current = Date.now();
        const phrase = coach.goodRep(e.quality);
        setCue({ text: phrase, id: Date.now(), tone: "praise" });
        setRepQuality({
          form: e.form,
          depth: e.rom,
          stability: e.stability,
          confidence: e.confidence,
          id: Date.now(),
        });
      } else if (e.type === "badrep") {
        const phrase = coach.badRep(e.reason);
        setCue({ text: phrase, id: Date.now(), tone: "bad" });
      } else {
        coach.correct(e.message);
        setCue({
          text: e.message,
          id: Date.now(),
          tone: e.tone === "praise" ? "praise" : "correct",
        });
      }
    },
    [coach]
  );

  // running only when not paused, not resting, not finished
  const {
    videoRef,
    canvasRef,
    status,
    errorMsg,
    state,
    telemetry,
    lockState,
    lockCenter,
    lockAtClient,
    resetLock,
    getSummary,
    getAttempts,
    getDebugLog,
  } = usePoseTrainer({
    poseKey: exercise.poseKey,
    running: !paused && !resting && !finishedRef.current,
    mode,
    facing,
    onEvent: handleEvent,
  });

  if (devHud) {
    const h = fpsHist.current;
    if (h[h.length - 1] !== telemetry.fps) {
      h.push(telemetry.fps);
      if (h.length > 48) h.shift();
    }
    const g = infHist.current;
    if (g[g.length - 1] !== telemetry.inferenceMs) {
      g.push(telemetry.inferenceMs);
      if (g.length > 48) g.shift();
    }
  }

  // Greet on first ready + keep the coach talking during quiet stretches.
  useEffect(() => {
    if (status === "ready" && !startedRef.current) {
      startedRef.current = true;
      coach.start();
    }
  }, [status, coach]);

  useEffect(() => {
    const id = setInterval(() => {
      if (finishedRef.current || paused || resting || status !== "ready") return;
      const p = coach.maybeMotivate();
      if (p) setCue({ text: p, id: Date.now(), tone: "praise" });
    }, 4000);
    return () => clearInterval(id);
  }, [paused, resting, status, coach]);

  // Auto-start screen recording once the camera/AI is live.
  useEffect(() => {
    if (
      recordEnabled &&
      recorder.supported &&
      status === "ready" &&
      !recStarted.current &&
      !finishedRef.current
    ) {
      const okStart = recorder.start({
        video: videoRef.current,
        overlay: canvasRef.current,
        mirrored: () => isMirrored(facing),
        hud: () => hudRef.current,
      });
      if (okStart) recStarted.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordEnabled, status]);

  // Pause/resume recording with the workout pause (rest is still recorded).
  useEffect(() => {
    if (!recorder.recording) return;
    if (paused) recorder.pause();
    else recorder.resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopSpeaking();
    recorder.stop();
    const s = getSummary();
    const totalCount = isHold ? s.holdSeconds : s.reps;
    const targetTotal = targetSets * targetReps;
    const completionPct = Math.max(0, Math.min(100, (totalCount / targetTotal) * 100));
    const durationSec = Math.round((performance.now() - startTs.current) / 1000);

    // tempo from rep intervals (reps only)
    let tempoScore = 100;
    if (!isHold && repTimes.current.length > 2) {
      const ivs: number[] = [];
      for (let i = 1; i < repTimes.current.length; i++)
        ivs.push((repTimes.current[i] - repTimes.current[i - 1]) / 1000);
      const avg = ivs.reduce((a, b) => a + b, 0) / ivs.length;
      // ideal 2-4s/rep; penalize rushing hardest
      if (avg < 1) tempoScore = 50;
      else if (avg < 1.5) tempoScore = 70;
      else if (avg < 2) tempoScore = 88;
      else if (avg <= 4.5) tempoScore = 100;
      else tempoScore = 85;
    }

    const minutes = durationSec / 60;
    const calories = Math.round(
      exercise.metValue * 3.5 * bodyWeightKg * minutes / 200
    );

    onFinish({
      durationSec,
      totalReps: isHold ? s.holdSeconds : s.reps,
      invalidReps: s.invalidReps,
      formScore: s.formScore || 80,
      romScore: s.romScore || (isHold ? 100 : 80),
      tempoScore,
      stabilityScore: s.stabilityScore,
      confidenceScore: s.confidenceScore,
      completionPct,
      caloriesBurned: calories,
      topMistakes: s.topMistakes,
      targetReps,
      repsMode,
      debugLog: getDebugLog(),
      sets:
        completedSets.current.length > 0
          ? completedSets.current
          : [
              {
                setNumber: 1,
                reps: totalCount,
                formScore: s.formScore,
                romScore: s.romScore,
                weightKg: weighted ? currentWeightRef.current : undefined,
              },
            ],
    });
  }, [getSummary, isHold, targetSets, targetReps, exercise.metValue, bodyWeightKg, weighted, onFinish]);

  // detect set completion
  const liveCount = isHold ? state.holdSeconds : state.reps;
  function completeSet(inSet: number) {
    if (finishedRef.current || inSet < 1) return;
    const w = weighted ? currentWeightRef.current : undefined;
    completedSets.current.push({
      setNumber: currentSet,
      reps: inSet,
      formScore: state.avgForm ?? undefined,
      romScore: state.avgRom ?? undefined,
      weightKg: w,
    });

    // Progressive overload / PR detection for weighted sets.
    if (weighted && w && w > 0) {
      const vol = w * inSet;
      const weightPR = w > bestWeightRef.current;
      const volPR = vol > bestVolumeRef.current;
      bestWeightRef.current = Math.max(bestWeightRef.current, w);
      bestVolumeRef.current = Math.max(bestVolumeRef.current, vol);
      if (weightPR || volPR) {
        setPrBadge(true);
        setCue({
          text: weightPR ? "New personal record!" : "Best volume yet!",
          id: Date.now(),
          tone: "praise",
        });
        speakSequence([
          weightPR ? "New personal record! Strong lift." : "Best volume yet. Great work.",
        ]);
      }
    }

    // Build the per-set debrief from this set's attempts.
    const slice = getAttempts().slice(attemptsAtSetStart.current);
    const setTimes = repTimes.current.slice(repTimesAtSetStart.current);
    const report = isHold
      ? null
      : analyzeSet(
          currentSet,
          slice,
          tempoFromTimes(setTimes),
          {
            name: exercise.name,
            muscles: exercise.muscles,
            secondaryMuscles: exercise.secondaryMuscles,
            formTips: exercise.formTips,
          },
          prevReportRef.current
        );

    if (currentSet >= targetSets) {
      finish();
    } else {
      setStartCount.current = liveCount;
      setCurrentSet((s) => s + 1);
      if (report) {
        prevReportRef.current = report;
        setRestReport(report);
      }
      setResting(true);
      setRestLeft(restSeconds);
      announced15.current = false;
      speakSequence([
        `Set ${currentSet} complete. Rest for ${restSeconds} seconds.`,
        ...(report?.voiceLines.slice(0, 2) ?? []),
      ]);
    }
  }

  useEffect(() => {
    if (resting || finishedRef.current || status !== "ready") return;
    const inSet = liveCount - setStartCount.current;

    // Reps-to-failure: never auto-complete — the user taps "Finish set".
    if (repsMode === "failure") return;

    // last-rep encouragement (rep exercises only)
    if (!isHold && inSet < targetReps) {
      const remaining = targetReps - inSet;
      const tag = `${currentSet}-${remaining}`;
      if (remaining === 1 && hypeRef.current !== tag) {
        hypeRef.current = tag;
        coach.lastOne();
      } else if (remaining === 2 && hypeRef.current !== tag) {
        hypeRef.current = tag;
        coach.almost();
      }
    }

    if (inSet >= targetReps) completeSet(inSet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCount]);

  // rest countdown + rest-period voice coaching
  useEffect(() => {
    if (!resting) return;
    if (restLeft <= 0) {
      playBeep();
      setResting(false);
      setRestReport(null);
      // mark the next set's attempt/time window
      attemptsAtSetStart.current = getAttempts().length;
      repTimesAtSetStart.current = repTimes.current.length;
      // apply the weight chosen for the upcoming set
      if (weighted) setCurrentWeightKg(nextWeightKg);
      coach.nextSet();
      if (weighted && nextWeightKg > 0) {
        const heavy = nextWeightKg >= bestWeightRef.current;
        speakSequence([
          `Set ${currentSet}, ${displayWeight(nextWeightKg, unit)} ${unit}.`,
          ...(heavy ? ["Heavy set. Brace your core."] : []),
        ]);
      }
      return;
    }
    if (restLeft === 15 && !announced15.current) {
      announced15.current = true;
      speakSequence(["15 seconds remaining."]);
    }
    const t = setTimeout(() => setRestLeft((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resting, restLeft]);

  const inSetCount = Math.max(0, liveCount - setStartCount.current);
  const repState =
    Date.now() - lastRepFlash.current < 700
      ? "Complete"
      : state.repPhase === "idle"
        ? "Idle"
        : state.repPhase === "down"
          ? "Down"
          : "Up";

  // keep the recorder's burned-in overlay text current
  hudRef.current = {
    exercise: exercise.name,
    rep: isHold ? `${inSetCount}s` : `${inSetCount} / ${targetReps}`,
    set:
      `Set ${Math.min(currentSet, targetSets)}/${targetSets}` +
      (weighted && currentWeightKg > 0 ? ` · ${fmtWeight(currentWeightKg, unit)}` : ""),
    cue: cue?.tone === "praise" ? undefined : cue?.text,
    resting,
    restText: `REST ${restLeft}s`,
  };

  function toggleRecord() {
    if (recorder.recording) recorder.stop();
    else
      recorder.start({
        video: videoRef.current,
        overlay: canvasRef.current,
        mirrored: () => isMirrored(facing),
        hud: () => hudRef.current,
      });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      {/* Camera feed (mirrored) */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 h-full w-full object-cover ${isMirrored(facing) ? "-scale-x-100" : ""}`}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* darkening vignette for HUD legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />

      {/* Click-to-lock layer (below HUD controls) */}
      {status === "ready" && (
        <div
          className="absolute inset-0 z-10"
          onClick={(e) => lockAtClient(e.clientX, e.clientY)}
          title="Tap a person to lock onto them"
        />
      )}

      {/* Loading / error */}
      {status !== "ready" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center">
          {status === "loading" ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-ember" />
              <p className="text-fog">Starting your AI coach…</p>
              <p className="text-xs text-smoke">Loading pose model & camera</p>
            </>
          ) : (
            <>
              <p className="max-w-sm text-chalk">{errorMsg}</p>
              <Button variant="outline" onClick={onExit}>
                Exit
              </Button>
            </>
          )}
        </div>
      )}

      {/* ===== HUD ===== */}
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between p-5 sm:p-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-fog">
            Set {Math.min(currentSet, targetSets)} / {targetSets}
            {weighted && currentWeightKg > 0 && (
              <span className="ml-2 text-flame">· {fmtWeight(currentWeightKg, unit)}</span>
            )}
          </p>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-chalk text-glow">
            {exercise.name}
          </h2>
        </div>
        <div className="flex gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-center backdrop-blur ${
              lockState.status === "locked"
                ? "border-neon/50 bg-neon/10 text-neon"
                : lockState.status === "searching"
                  ? "border-amber/50 bg-amber/10 text-amber"
                  : "border-white/15 bg-black/40 text-fog"
            }`}
          >
            <Lock className="h-4 w-4" />
            <span className="font-display text-sm font-bold">
              {lockState.status === "locked"
                ? `${lockState.confidence}%`
                : lockState.status === "searching"
                  ? "···"
                  : "—"}
            </span>
          </div>
          <ScoreChip label="Form" value={state.avgForm} />
          <ScoreChip label="ROM" value={state.avgRom} />
          <PipelineChip pipeline={telemetry.pipeline} />
        </div>
      </div>

      {/* REC indicator */}
      {recorder.recording && (
        <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-ember/50 bg-black/60 px-3 py-1 text-xs font-bold text-ember backdrop-blur">
          <span className={`h-2.5 w-2.5 rounded-full bg-ember ${recorder.paused ? "" : "animate-pulse"}`} />
          {recorder.paused ? "PAUSED" : "REC"}
        </div>
      )}

      {/* Developer telemetry HUD (dev mode only) */}
      {devHud && status === "ready" && (
        <div className="absolute right-3 top-28 z-30 w-56 space-y-0.5 rounded-xl border border-volt/30 bg-black/75 p-3 font-mono text-[11px] text-fog backdrop-blur">
          <p className="mb-1 font-bold text-volt">DEV HUD</p>
          <Row2 k="FPS" v={`${telemetry.fps}`} />
          <Sparkline data={fpsHist.current} max={60} color="#2bd4ff" refValue={30} />
          <Row2 k="inference" v={`${telemetry.inferenceMs} ms`} />
          <Sparkline
            data={infHist.current}
            max={Math.max(40, ...infHist.current)}
            color="#ffc24b"
            refValue={33}
          />
          <Row2 k="model" v={telemetry.model === "3D" ? "BlazePose" : "MoveNet"} />
          <Row2 k="pipeline" v={telemetry.pipeline} />
          <Row2 k="fallback" v={telemetry.fallbackActive ? "3D→2D active" : "—"} />

          <p className="mb-0.5 mt-2 font-bold text-volt">EXERCISE</p>
          <Row2 k="slug" v={exercise.slug} />
          <Row2 k="poseKey" v={exercise.poseKey ?? "—"} />
          <Row2 k="view" v={`${state.orientation} (need ${requiredView})`} />

          <p className="mb-0.5 mt-2 font-bold text-volt">REP ENGINE</p>
          <Row2
            k="joints"
            v={`${state.debug.side ? state.debug.side[0].toUpperCase() : "?"} ${state.debug.joints}`}
          />
          <Row2
            k="angle"
            v={state.debug.angle != null ? `${state.debug.angle}° · ${state.debug.angleSource}` : "—"}
          />
          <Row2 k="progress" v={`${state.debug.progress} · pk ${state.debug.peak}`} />
          <Row2 k="req / tol" v={`${state.debug.requiredProgress} / ${state.debug.turnaroundTol}`} />
          <Row2 k="phase" v={repState} />
          <Row2 k="rep conf" v={`${state.confidence}%`} />
          <Row2 k="lm conf" v={`${telemetry.confidence}% · ${telemetry.landmarks} pts`} />
          <Row2 k="wrist veto" v={state.debug.wristVeto ? "ACTIVE" : "—"} />
          {state.debug.lastDecision && (
            <p
              className={`mt-1 rounded-md px-1.5 py-1 leading-tight ${
                state.debug.lastDecision.accepted
                  ? "bg-neon/10 text-neon"
                  : "bg-ember/15 text-ember"
              }`}
            >
              {state.debug.lastDecision.accepted ? "✓" : "✗"} {state.debug.lastDecision.reason}
              <br />
              pk {state.debug.lastDecision.peak} req {state.debug.lastDecision.required} · rom{" "}
              {state.debug.lastDecision.rom} · conf {state.debug.lastDecision.confidence}%
            </p>
          )}
        </div>
      )}

      {/* PR badge */}
      {prBadge && (
        <div className="absolute right-4 top-14 z-20 flex items-center gap-1.5 rounded-full border border-amber/50 bg-amber/15 px-3 py-1 text-xs font-bold text-amber backdrop-blur">
          🏆 NEW PR
        </div>
      )}

      {/* Tracking warning */}
      {status === "ready" && !state.tracking && !resting && !paused && (
        <div className="absolute left-1/2 top-24 z-20 -translate-x-1/2 rounded-full border border-amber/40 bg-amber/15 px-4 py-2 text-sm text-amber backdrop-blur">
          Step back — keep your whole body in frame
        </div>
      )}

      {/* Voice fallback: speech blocked / not yet unlocked */}
      {status === "ready" && voice && voiceStatus.supported && !voiceStatus.unlocked && (
        <button
          onClick={enableVoice}
          className="absolute left-1/2 top-36 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full border border-volt/50 bg-volt/15 px-4 py-2 text-sm font-medium text-volt backdrop-blur"
        >
          <Volume2 className="h-4 w-4" />
          Tap to enable coach voice
        </button>
      )}
      {status === "ready" && voice && !voiceStatus.supported && (
        <div className="absolute left-1/2 top-36 z-20 -translate-x-1/2 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-xs text-fog backdrop-blur">
          Voice not supported here — on-screen coaching is active
        </div>
      )}

      {/* Form fault: red screen border on a serious mistake */}
      {status === "ready" && state.fault?.severity === "error" && (
        <div className="pointer-events-none absolute inset-0 z-10 ring-4 ring-inset ring-ember/70" />
      )}

      {/* Live form status (green good / amber warn / red error) */}
      {status === "ready" && state.inMotion && !resting && !paused && (
        <div
          className={`absolute left-1/2 top-16 z-20 -translate-x-1/2 rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur ${
            state.fault
              ? state.fault.severity === "error"
                ? "border-ember/60 bg-ember/20 text-chalk"
                : "border-amber/50 bg-amber/20 text-amber"
              : "border-neon/50 bg-neon/15 text-neon"
          }`}
        >
          {state.fault ? state.fault.message : "Good form"}
        </div>
      )}

      {/* Re-acquiring banner (occlusion / temporarily left) */}
      {status === "ready" && lockState.status === "searching" && (
        <div className="absolute left-1/2 top-28 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full border border-amber/40 bg-amber/15 px-4 py-2 text-sm text-amber backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin" />
          Re-acquiring you… ({lockState.lostFrames})
        </div>
      )}

      {/* Debug panel */}
      {status === "ready" && showDebug && (
        <div className="absolute left-5 top-28 z-20 space-y-1 rounded-2xl border border-white/15 bg-black/70 p-4 font-mono text-xs text-fog backdrop-blur">
          <p className="mb-1 font-bold text-chalk">BODY LOCK · DEBUG</p>
          <p>status: <span className="text-volt">{lockState.status}</span></p>
          <p>lockedId: <span className="text-volt">{lockState.lockedId ?? "—"}</span></p>
          <p>confidence: <span className="text-volt">{lockState.confidence}%</span></p>
          <p>lostFrames: <span className="text-volt">{lockState.lostFrames}</span></p>
          <p className="flex items-center gap-1">
            <Users className="h-3 w-3" /> people: <span className="text-volt">{lockState.peopleCount}</span>
          </p>
          <p>reps: <span className="text-volt">{state.reps}</span></p>
          <button
            onClick={resetLock}
            className="mt-2 rounded-lg border border-ember/40 bg-ember/10 px-2 py-1 text-[11px] text-ember"
          >
            Reset lock
          </button>
        </div>
      )}

      {/* Lock prompt (idle before lock, or lost) */}
      {status === "ready" &&
        (lockState.status === "idle" || lockState.status === "lost") && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 px-6 text-center">
            <Target className="mb-3 h-10 w-10 text-neon" />
            <h3 className="font-display text-2xl font-bold uppercase tracking-wide">
              {lockState.status === "lost" ? "Lost track of you" : "Lock onto you"}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-fog">
              {lockState.peopleCount > 1
                ? "Multiple people detected. Stand in the center, or tap yourself, then lock."
                : "Stand so your whole body is visible, then lock on."}
            </p>
            <Button size="lg" className="mt-5" onClick={lockCenter}>
              <Lock className="h-5 w-5" />
              Lock me in
            </Button>
            <p className="mt-2 text-xs text-smoke">
              {lockState.peopleCount} {lockState.peopleCount === 1 ? "person" : "people"} detected · or tap your body on screen
            </p>
          </div>
        )}

      {/* Floating cue */}
      <AnimatePresence>
        {cue && (
          <motion.div
            key={cue.id}
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onAnimationComplete={() => {
              setTimeout(() => setCue((c) => (c?.id === cue.id ? null : c)), 2000);
            }}
            className={`absolute left-1/2 top-[30%] z-20 -translate-x-1/2 rounded-2xl border px-6 py-3 text-center backdrop-blur-xl ${TONE_STYLES[cue.tone]}`}
          >
            {cue.tone === "bad" && (
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ember">
                Rep invalid · not counted
              </p>
            )}
            <span className="text-lg font-semibold">{cue.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big counter */}
      <div className="absolute inset-x-0 bottom-28 z-20 flex flex-col items-center">
        <div className="relative grid place-items-center">
          <svg width="200" height="200" className="-rotate-90">
            <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
            <circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke="url(#hudgrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 88}
              strokeDashoffset={2 * Math.PI * 88 * (1 - state.progress)}
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
            <defs>
              <linearGradient id="hudgrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ff3b30" />
                <stop offset="100%" stopColor="#ff7a18" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-display text-7xl font-bold leading-none text-chalk">
              {inSetCount}
            </span>
            <span className="mt-1 text-xs uppercase tracking-widest text-fog">
              {repsMode === "failure"
                ? isHold
                  ? "seconds"
                  : "reps · to failure"
                : isHold
                  ? `/ ${targetReps}s`
                  : `/ ${targetReps} reps`}
            </span>
          </div>
        </div>
        {/* last rep quality */}
        {repQuality && !isHold && (
          <div className="mt-3 flex flex-wrap justify-center gap-3 text-center text-xs">
            <span className="text-fog">Form <b className="text-chalk">{repQuality.form}</b></span>
            <span className="text-fog">Depth <b className="text-chalk">{repQuality.depth}</b></span>
            <span className="text-fog">Stability <b className="text-chalk">{repQuality.stability}</b></span>
            <span className="text-fog">Conf <b className="text-chalk">{repQuality.confidence}</b></span>
          </div>
        )}
        {state.invalidReps > 0 && (
          <p className="mt-1 text-xs text-ember">{state.invalidReps} invalid rep{state.invalidReps === 1 ? "" : "s"}</p>
        )}
      </div>

      {/* Rest screen — coached debrief + countdown */}
      <AnimatePresence>
        {resting && restReport && (
          <RestScreen
            report={restReport}
            timeLeft={restLeft}
            total={restSeconds}
            totalSets={targetSets}
            onSkip={() => setRestLeft(0)}
            onAddTime={() => setRestLeft((r) => r + 15)}
            weighted={weighted}
            unit={unit}
            nextWeightKg={nextWeightKg}
            lastWeightKg={currentWeightKg}
            onWeightChange={setNextWeightKg}
          />
        )}
        {resting && !restReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80"
          >
            <p className="text-sm uppercase tracking-widest text-fog">Rest</p>
            <p className="font-display text-8xl font-bold text-chalk">{restLeft}</p>
            <p className="mt-2 text-fog">Next: Set {currentSet} of {targetSets}</p>
            <Button variant="outline" className="mt-6" onClick={() => setRestLeft(0)}>
              Skip rest
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paused overlay */}
      <AnimatePresence>
        {paused && !resting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80"
          >
            <p className="font-display text-5xl font-bold uppercase tracking-wide">Paused</p>
            <Button size="lg" className="mt-6" onClick={() => setPaused(false)}>
              <Play className="h-5 w-5" />
              Resume
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safety Mode strip — reps won't count until form is fixed */}
      {status === "ready" && state.danger && !resting && !paused && (
        <div className="absolute inset-x-0 bottom-24 z-20 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-2xl border border-ember/60 bg-ember/25 px-5 py-3 text-center text-sm font-semibold text-chalk backdrop-blur-xl">
            <span className="text-lg">⚠</span>
            Safety: {state.fault?.message}. Reps won&apos;t count until you fix it.
          </div>
        </div>
      )}

      {/* Reps-to-failure: manual finish-set */}
      {status === "ready" && repsMode === "failure" && !resting && !paused && (
        <div className="absolute inset-x-0 bottom-24 z-20 flex justify-center px-4">
          <Button size="lg" variant="primary" onClick={() => completeSet(inSetCount)}>
            Finish set ({inSetCount} {isHold ? "s" : "reps"})
          </Button>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-3 p-5 sm:p-8">
        <button
          onClick={() => {
            const next = !voice;
            setVoice(next);
            if (next) unlockVoice(); // re-arm within the click gesture
          }}
          className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/5 text-chalk backdrop-blur hover:bg-white/10"
          aria-label="Toggle voice"
          title={
            voiceStatus.supported
              ? voiceStatus.voice
                ? `Voice: ${voiceStatus.voice}`
                : "Coach voice"
              : "Voice not supported"
          }
        >
          {voice ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
        <button
          onClick={lockCenter}
          className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/5 text-chalk backdrop-blur hover:bg-white/10"
          aria-label="Lock user"
          title="Lock onto the center person"
        >
          <Lock className="h-5 w-5" />
        </button>
        <button
          onClick={onFlipCamera}
          className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/5 text-chalk backdrop-blur hover:bg-white/10"
          aria-label="Flip camera"
          title="Switch front / rear camera"
        >
          <SwitchCamera className="h-5 w-5" />
        </button>
        {recorder.supported && (
          <button
            onClick={toggleRecord}
            className={`grid h-12 w-12 place-items-center rounded-full border backdrop-blur ${
              recorder.recording
                ? "border-ember/60 bg-ember/20 text-ember"
                : "border-white/15 bg-white/5 text-chalk hover:bg-white/10"
            }`}
            aria-label="Record"
            title={recorder.recording ? "Stop recording" : "Record workout"}
          >
            {recorder.recording ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>
        )}
        <button
          onClick={() => setShowDebug((d) => !d)}
          className={`grid h-12 w-12 place-items-center rounded-full border backdrop-blur ${
            showDebug
              ? "border-volt/50 bg-volt/15 text-volt"
              : "border-white/15 bg-white/5 text-chalk hover:bg-white/10"
          }`}
          aria-label="Toggle debug"
          title="Tracking debug info"
        >
          <Bug className="h-5 w-5" />
        </button>
        <Button
          size="lg"
          variant="glass"
          onClick={() => setPaused((p) => !p)}
          disabled={resting}
        >
          {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button size="lg" variant="danger" onClick={finish}>
          <Square className="h-5 w-5" />
          End workout
        </Button>
      </div>
    </div>
  );
}

function Sparkline({
  data,
  max,
  color = "#2bd4ff",
  refValue,
}: {
  data: number[];
  max: number;
  color?: string;
  refValue?: number;
}) {
  const w = 152;
  const h = 28;
  const n = data.length;
  const pts =
    n > 1
      ? data
          .map((d, i) => `${(i / (n - 1)) * w},${h - Math.max(0, Math.min(1, d / max)) * h}`)
          .join(" ")
      : "";
  const refY = refValue != null ? h - Math.min(1, refValue / max) * h : null;
  return (
    <svg width={w} height={h} className="my-1 block w-full">
      {refY != null && (
        <line x1="0" y1={refY} x2={w} y2={refY} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
      )}
      {pts && <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />}
    </svg>
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

const PIPELINE_META: Record<Pipeline, { label: string; title: string; tone: string }> = {
  "2D": {
    label: "2D",
    title: "2D Pose Detection — MoveNet. Fast, multi-person tracking; joint angles measured in the image plane.",
    tone: "border-white/15 bg-black/40 text-fog",
  },
  "3D": {
    label: "3D",
    title: "3D Pose Detection — BlazePose loaded (waiting on 3D landmarks for the tracked athlete).",
    tone: "border-volt/50 bg-volt/10 text-volt",
  },
  Hybrid: {
    label: "HYB",
    title:
      "Hybrid Detection — BlazePose: 2D keypoints lock/track you while 3D world landmarks measure joint angles (depth-invariant, better for bench, press, rows & pulldowns from side/angled cameras).",
    tone: "border-neon/50 bg-neon/10 text-neon",
  },
};

function PipelineChip({ pipeline }: { pipeline: Pipeline }) {
  const m = PIPELINE_META[pipeline];
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border px-3 py-2 text-center backdrop-blur ${m.tone}`}
      title={m.title}
    >
      <span className="text-[9px] uppercase leading-none tracking-widest opacity-70">AI</span>
      <span className="font-display text-sm font-bold leading-tight">{m.label}</span>
    </div>
  );
}

function ScoreChip({ label, value }: { label: string; value: number | null }) {
  const color =
    value == null
      ? "text-fog"
      : value >= 80
        ? "text-neon"
        : value >= 60
          ? "text-amber"
          : "text-ember";
  return (
    <div className="rounded-2xl border border-white/15 bg-black/40 px-4 py-2 text-center backdrop-blur">
      <p className="text-[10px] uppercase tracking-widest text-fog">{label}</p>
      <p className={`font-display text-xl font-bold ${color}`}>
        {value == null ? "—" : value}
      </p>
    </div>
  );
}
