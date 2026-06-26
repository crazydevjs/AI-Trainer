"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Ruler, Video } from "lucide-react";
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
  const setup = getCameraSetup(exercise.poseKey);
  const { videoRef, canvasRef, status, errorMsg, check } = useCameraCheck(setup);
  const [allowOverride, setAllowOverride] = useState(false);
  const spokeOk = useRef(false);
  const lastIssueTs = useRef(0);

  useEffect(() => {
    setVoiceEnabled(voiceOn);
  }, [voiceOn]);

  // Voice guidance: read the top issue, or confirm once ready.
  useEffect(() => {
    if (status !== "ready" || !voiceOn) return;
    if (check.ok) {
      if (!spokeOk.current) {
        spokeOk.current = true;
        speak("Camera position is correct. You can start.", true);
      }
      return;
    }
    spokeOk.current = false;
    const now = Date.now();
    if (check.issues[0] && now - lastIssueTs.current > 4000) {
      lastIssueTs.current = now;
      speak(check.issues[0], true);
    }
  }, [check, status, voiceOn]);

  // Safety net: allow manual start if validation stays flaky.
  useEffect(() => {
    const t = setTimeout(() => setAllowOverride(true), 12000);
    return () => clearTimeout(t);
  }, []);

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

          {/* Status / issues */}
          <div className="mt-4 min-h-[52px]">
            {check.ok ? (
              <div className="flex items-center gap-2 rounded-2xl border border-neon/40 bg-neon/10 px-4 py-3 text-sm font-semibold text-neon">
                <CheckCircle2 className="h-5 w-5" />
                Camera position is correct. You&apos;re good to go!
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
            className="mt-4 w-full"
            disabled={!check.ok && !allowOverride}
            onClick={onReady}
          >
            {check.ok ? "Start workout" : allowOverride ? "Start anyway" : "Fix camera to continue"}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </main>
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
