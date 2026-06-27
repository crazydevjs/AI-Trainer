"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Loader2, Ruler, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCameraSetup, VIEW_LABEL } from "@/lib/pose/camera-setup";
import { setVoiceEnabled, speak } from "@/lib/voice";
import { useCameraCheck } from "./use-camera-check";
import type { TrainerExercise } from "./trainer-experience";

export function CameraGuide({
  exercise,
  voiceOn,
  onReady,
  onBack,
}: {
  exercise: TrainerExercise;
  voiceOn: boolean;
  onReady: () => void;
  onBack: () => void;
}) {
  const STABILITY_MS = 2500;

  const setup = getCameraSetup(exercise.poseKey);
  const { videoRef, canvasRef, status, errorMsg, check } = useCameraCheck(setup);
  const [allowOverride, setAllowOverride] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const okSince = useRef<number | null>(null);
  const lastOk = useRef(0);
  const counting = useRef(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const spokeDetected = useRef(false);
  const spokeStill = useRef(0);
  const lastIssueTs = useRef(0);

  useEffect(() => {
    setVoiceEnabled(voiceOn);
  }, [voiceOn]);

  useEffect(() => () => void (tick.current && clearInterval(tick.current)), []);

  const cancelCountdown = () => {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
    counting.current = false;
    setCountdown(null);
  };

  // Auto-start: when the setup is valid and held stable, run a countdown.
  useEffect(() => {
    if (status !== "ready") return;
    const now = Date.now();

    if (check.ok) {
      lastOk.current = now;
      if (okSince.current == null) {
        okSince.current = now;
        if (voiceOn && !spokeDetected.current) {
          spokeDetected.current = true;
          speak("Body detected. Hold still.", true);
        }
      }
      // begin countdown once stable for STABILITY_MS
      if (!counting.current && countdown == null && now - okSince.current >= STABILITY_MS) {
        counting.current = true;
        setCountdown(3);
        if (voiceOn) speak("Get ready!", true);
        tick.current = setInterval(() => setCountdown((c) => (c == null ? null : c - 1)), 1000);
      }
    } else {
      // ignore brief flickers; only reset if lost for >700ms
      if (okSince.current != null && now - lastOk.current > 700) {
        okSince.current = null;
        spokeDetected.current = false;
        if (counting.current || countdown != null) {
          cancelCountdown();
          if (voiceOn && now - spokeStill.current > 3000) {
            spokeStill.current = now;
            speak("Hold on — get back into position.", true);
          }
        }
      }
      // read the top setup issue aloud periodically while not ready
      if (voiceOn && check.issues[0] && now - lastIssueTs.current > 4000) {
        lastIssueTs.current = now;
        speak(check.issues[0], true);
      }
    }
  }, [check, status, voiceOn, countdown]);

  // Countdown ticking → voice each number, then start.
  useEffect(() => {
    if (countdown == null) return;
    if (countdown <= 0) {
      cancelCountdown();
      onReady();
      return;
    }
    if (voiceOn && countdown <= 2) speak(String(countdown), true);
  }, [countdown, voiceOn, onReady]);

  // Safety net: allow manual start if validation stays flaky.
  useEffect(() => {
    const t = setTimeout(() => setAllowOverride(true), 12000);
    return () => clearTimeout(t);
  }, []);

  const cameraReady = check.angleScore >= 70 && check.lightingScore >= 45;
  const bodyDetected = check.visibilityScore >= 85 && check.confidence >= 35;

  return (
    <main className="relative flex min-h-screen flex-col px-4 py-6">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-fog transition-colors hover:text-chalk"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <p className="text-xs uppercase tracking-widest text-smoke">Camera setup</p>
      </div>

      <h1 className="font-display mx-auto mt-2 w-full max-w-4xl text-3xl font-bold uppercase tracking-wide">
        Position your camera · {exercise.name}
      </h1>

      <div className="mx-auto mt-5 grid w-full max-w-4xl flex-1 gap-5 lg:grid-cols-2">
        {/* Recommendation */}
        <div className="glass rounded-3xl p-6">
          <SetupDiagram view={setup.view} />
          <div className="mt-5 space-y-3">
            <Row icon={<Video className="h-4 w-4 text-volt" />} label="Angle" value={VIEW_LABEL[setup.view]} />
            <Row icon={<Ruler className="h-4 w-4 text-flame" />} label="Distance" value={setup.distance} />
            <Row icon={<ArrowRight className="h-4 w-4 text-neon" />} label="Height" value={setup.height} />
            <Row
              icon={<CheckCircle2 className="h-4 w-4 text-ember" />}
              label="Visible"
              value={setup.fullBody ? "Whole body" : "Upper body"}
            />
          </div>
          <ul className="mt-5 space-y-1.5">
            {setup.tips.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-fog">
                <span className="text-ember">•</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Live validation */}
        <div className="glass rounded-3xl p-6">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
            />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />

            {/* Auto-start countdown overlay */}
            {countdown != null && countdown > 0 && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60">
                <p className="text-xs uppercase tracking-[0.3em] text-neon">Starting in</p>
                <motion.span
                  key={countdown}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-display text-8xl font-bold text-chalk"
                >
                  {countdown}
                </motion.span>
              </div>
            )}
            {/* Hold-still indicator while stabilizing */}
            {countdown == null && check.ok && status === "ready" && (
              <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-neon/40 bg-neon/15 px-4 py-1.5 text-xs font-medium text-neon backdrop-blur">
                Hold still — auto-starting…
              </div>
            )}

            {status !== "ready" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-center">
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-7 w-7 animate-spin text-ember" />
                    <p className="text-sm text-fog">Starting camera…</p>
                  </>
                ) : (
                  <p className="max-w-xs px-4 text-sm text-chalk">{errorMsg}</p>
                )}
              </div>
            )}
          </div>

          {/* Scores */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Score label="Angle" value={check.angleScore} />
            <Score label="Visibility" value={check.visibilityScore} />
            <Score label="Lighting" value={check.lightingScore} />
            <Score label="Body conf." value={check.confidence} />
          </div>

          {/* Readiness checklist */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ReadyItem ok={cameraReady} label="Camera ready" />
            <ReadyItem ok={bodyDetected} label="Body detected" />
            <ReadyItem ok={check.ok} label="In position" />
          </div>

          {/* Status / issues */}
          <div className="mt-3 min-h-[48px]">
            {check.ok ? (
              <div className="flex items-center gap-2 rounded-2xl border border-neon/40 bg-neon/10 px-4 py-3 text-sm font-semibold text-neon">
                <CheckCircle2 className="h-5 w-5" />
                {countdown != null ? `Starting in ${countdown}…` : "Setup looks great — hold still to start."}
              </div>
            ) : (
              <motion.div
                key={check.issues[0]}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber"
              >
                {check.issues[0] ?? "Adjusting…"}
              </motion.div>
            )}
          </div>

          <Button
            size="xl"
            className="mt-3 w-full"
            disabled={!check.ok && !allowOverride}
            onClick={() => {
              cancelCountdown();
              onReady();
            }}
          >
            {countdown != null
              ? "Start now"
              : check.ok
                ? "Start workout"
                : allowOverride
                  ? "Start anyway"
                  : "Auto-starts when you're ready"}
            <ArrowRight className="h-5 w-5" />
          </Button>
          <p className="mt-2 text-center text-xs text-smoke">
            No need to come back to the phone — it starts on its own. Or tap to start manually.
          </p>
        </div>
      </div>
    </main>
  );
}

function ReadyItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-2xl border p-2 text-center text-[11px] ${
        ok ? "border-neon/40 bg-neon/10 text-neon" : "border-white/10 bg-white/[0.03] text-smoke"
      }`}
    >
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      {label}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-fog">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold text-chalk">{value}</span>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80 ? "from-neon to-volt" : value >= 50 ? "from-amber to-flame" : "from-ember to-red-700";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-widest text-smoke">{label}</span>
        <span className="font-display text-sm font-bold">{value}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-300`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/** Simple top-down illustration of where to put the phone. */
function SetupDiagram({ view }: { view: "side" | "front" | "45" }) {
  return (
    <div className="relative grid h-40 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent">
      <svg viewBox="0 0 220 120" className="h-full w-full">
        {/* floor */}
        <line x1="10" y1="100" x2="210" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
        {/* person */}
        <g transform="translate(150,50)" stroke="#ff7a18" strokeWidth="3" fill="none">
          <circle cx="0" cy="0" r="7" />
          <line x1="0" y1="7" x2="0" y2="32" />
          <line x1="0" y1="14" x2={view === "front" ? "-12" : "-8"} y2="24" />
          <line x1="0" y1="14" x2={view === "front" ? "12" : "8"} y2="24" />
          <line x1="0" y1="32" x2="-9" y2="50" />
          <line x1="0" y1="32" x2="9" y2="50" />
        </g>
        {/* phone */}
        <g transform="translate(40,55)">
          <rect x="-8" y="-16" width="16" height="32" rx="3" fill="#2bd4ff" opacity="0.9" />
          <circle cx="0" cy="0" r="3" fill="#050505" />
        </g>
        {/* field of view */}
        <path d="M48 55 L150 25 L150 95 Z" fill="rgba(43,212,255,0.12)" stroke="rgba(43,212,255,0.4)" strokeDasharray="4 4" />
        {/* distance arrow */}
        <line x1="48" y1="110" x2="150" y2="110" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" markerEnd="" />
        <text x="99" y="118" textAnchor="middle" fontSize="9" fill="#a1a1aa">
          {view === "front" ? "front view" : view === "45" ? "45° / side" : "side view"}
        </text>
      </svg>
    </div>
  );
}
