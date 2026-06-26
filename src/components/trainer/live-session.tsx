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
  Target,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePoseTrainer } from "./use-pose-trainer";
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
import { RestScreen } from "./rest-screen";
import type { TrainerExercise } from "./trainer-experience";

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
  sets: { setNumber: number; reps: number; formScore?: number; romScore?: number }[];
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
    lockState,
    lockCenter,
    lockAtClient,
    resetLock,
    getSummary,
    getAttempts,
  } = usePoseTrainer({
    poseKey: exercise.poseKey,
    running: !paused && !resting && !finishedRef.current,
    mode,
    onEvent: handleEvent,
  });

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

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopSpeaking();
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
      sets:
        completedSets.current.length > 0
          ? completedSets.current
          : [{ setNumber: 1, reps: totalCount, formScore: s.formScore, romScore: s.romScore }],
    });
  }, [getSummary, isHold, targetSets, targetReps, exercise.metValue, bodyWeightKg, onFinish]);

  // detect set completion
  const liveCount = isHold ? state.holdSeconds : state.reps;
  useEffect(() => {
    if (resting || finishedRef.current || status !== "ready") return;
    const inSet = liveCount - setStartCount.current;

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

    if (inSet >= targetReps) {
      completedSets.current.push({
        setNumber: currentSet,
        reps: inSet,
        formScore: state.avgForm ?? undefined,
        romScore: state.avgRom ?? undefined,
      });

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
        // Announce rest + the top coaching points back-to-back.
        speakSequence([
          `Set ${currentSet} complete. Rest for ${restSeconds} seconds.`,
          ...(report?.voiceLines.slice(0, 2) ?? []),
        ]);
      }
    }
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
      coach.nextSet();
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      {/* Camera feed (mirrored) */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
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
        </div>
      </div>

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
              {isHold ? `/ ${targetReps}s` : `/ ${targetReps} reps`}
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
