"use client";

// Compact AI rep-tracking panel for the live Workout Session. Wraps the same
// pose pipeline as the dedicated trainer (usePoseTrainer) in a small card:
// camera + skeleton + live rep count. It only *reports* reps upward — set
// completion stays in the parent, and manual logging always works, so a
// failed camera/model never blocks the workout.

import { useEffect, useRef, useState } from "react";
import { Lock, Loader2, SwitchCamera, X } from "lucide-react";
import { usePoseTrainer } from "@/components/trainer/use-pose-trainer";
import { isMirrored, loadFacing, otherFacing, saveFacing, type Facing } from "@/lib/camera";
import type { SessionFormSummary } from "@/lib/pose/form-engine/types";
import type { SessionMovementSummary } from "@/lib/pose/movement-engine/types";

export function AiSetTracker({
  poseKey,
  onReps,
  onClose,
  onDebugLog,
}: {
  poseKey: string | null;
  /** cumulative reps counted since this tracker mounted (+ current avg scores) */
  onReps: (reps: number, avgForm: number | null, avgRom: number | null) => void;
  onClose: () => void;
  /** dev: receives this tracker's full debug log + Form/Movement Engine rollups when the panel unmounts */
  onDebugLog?: (
    log: Record<string, unknown>[],
    formAnalysis?: SessionFormSummary,
    movementAnalysis?: SessionMovementSummary
  ) => void;
}) {
  // lazy init: this panel only mounts client-side (behind the AI toggle)
  const [facing, setFacing] = useState<Facing>(() =>
    typeof window === "undefined" ? "user" : loadFacing()
  );

  const {
    videoRef,
    canvasRef,
    status,
    errorMsg,
    state,
    telemetry,
    lockState,
    lockCenter,
    getDebugLog,
    getFormAnalysis,
    getMovementAnalysis,
  } = usePoseTrainer({ poseKey, running: true, mode: "beginner", facing });

  // Flush the debug log to the parent when the tracker closes (dev tuning).
  const flushRef = useRef({ onDebugLog, getDebugLog, getFormAnalysis, getMovementAnalysis });
  useEffect(() => {
    flushRef.current = { onDebugLog, getDebugLog, getFormAnalysis, getMovementAnalysis };
  });
  useEffect(
    () => () => {
      const {
        onDebugLog: cb,
        getDebugLog: get,
        getFormAnalysis: getForm,
        getMovementAnalysis: getMovement,
      } = flushRef.current;
      const log = get();
      if (cb && log.length) cb(log, getForm(), getMovement());
    },
    []
  );

  const lastReps = useRef(0);
  useEffect(() => {
    if (state.reps !== lastReps.current) {
      lastReps.current = state.reps;
      onReps(state.reps, state.avgForm, state.avgRom);
    }
  }, [state.reps, state.avgForm, state.avgRom, onReps]);

  const flip = () =>
    setFacing((f) => {
      const next = otherFacing(f);
      saveFacing(next);
      return next;
    });

  return (
    <div className="relative overflow-hidden rounded-3xl border border-volt/30 bg-black">
      <div className="relative aspect-[4/3] w-full">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover ${isMirrored(facing) ? "-scale-x-100" : ""}`}
        />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />

        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
            <Loader2 className="h-6 w-6 animate-spin text-ember" />
            <p className="text-xs text-fog">Starting AI coach…</p>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-4 text-center">
            <p className="text-xs text-fog">{errorMsg} — log your sets manually below.</p>
          </div>
        )}

        {/* lock prompt */}
        {status === "ready" && (lockState.status === "idle" || lockState.status === "lost") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
            <button
              onClick={lockCenter}
              className="flex items-center gap-2 rounded-full border border-neon/50 bg-neon/15 px-4 py-2 text-sm font-semibold text-neon"
            >
              <Lock className="h-4 w-4" />
              Lock onto me
            </button>
          </div>
        )}

        {/* top overlay: pipeline + controls */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold backdrop-blur ${
              telemetry.pipeline === "Hybrid"
                ? "border-neon/50 bg-neon/10 text-neon"
                : telemetry.pipeline === "3D"
                  ? "border-volt/50 bg-volt/10 text-volt"
                  : "border-white/20 bg-black/40 text-fog"
            }`}
            title="Active detection pipeline"
          >
            AI · {telemetry.pipeline}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={flip}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/50 text-chalk backdrop-blur"
              aria-label="Flip camera"
            >
              <SwitchCamera className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/50 text-chalk backdrop-blur"
              aria-label="Close AI tracker"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* live rep count */}
        {status === "ready" && lockState.status === "locked" && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-2xl border border-white/15 bg-black/60 px-4 py-1.5 text-center backdrop-blur">
            <span className="font-display text-2xl font-bold text-chalk">{state.reps}</span>
            <span className="ml-1.5 text-[10px] uppercase tracking-widest text-fog">reps seen</span>
          </div>
        )}
      </div>
    </div>
  );
}
