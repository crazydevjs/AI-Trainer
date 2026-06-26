"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { getExerciseConfig } from "@/lib/pose/exercises";
import { getFormChecks } from "@/lib/pose/form-rules";
import { RepCounter, type CoachEvent, type CoachState } from "@/lib/pose/rep-counter";
import { BodyLock, poseBox, type LockState, type Pose } from "@/lib/pose/body-lock";

const SKELETON: [string, string][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

export type TrainerStatus = "loading" | "ready" | "error";

const INITIAL_COACH: CoachState = {
  reps: 0,
  invalidReps: 0,
  holdSeconds: 0,
  progress: 0,
  avgRom: null,
  avgForm: null,
  formOk: true,
  tracking: false,
  inMotion: false,
  fault: null,
  faultJoints: [],
  danger: false,
  color: "idle",
};

const INITIAL_LOCK: LockState = {
  status: "idle",
  lockedId: null,
  confidence: 0,
  lostFrames: 0,
  peopleCount: 0,
};

export function usePoseTrainer({
  poseKey,
  running,
  onEvent,
}: {
  poseKey?: string | null;
  running: boolean;
  onEvent?: (e: CoachEvent) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const counterRef = useRef<RepCounter>(
    new RepCounter(getExerciseConfig(poseKey), getFormChecks(poseKey))
  );
  const lockRef = useRef<BodyLock>(new BodyLock());
  const lastPosesRef = useRef<Pose[]>([]);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const runningRef = useRef(running);
  const onEventRef = useRef(onEvent);
  const lastLockEmit = useRef(0);

  const [status, setStatus] = useState<TrainerStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [state, setState] = useState<CoachState>(INITIAL_COACH);
  const [lockState, setLockState] = useState<LockState>(INITIAL_LOCK);

  runningRef.current = running;
  onEventRef.current = onEvent;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const tf = await import("@tensorflow/tfjs");
        await tf.ready();
        const poseDetection = await import("@tensorflow-models/pose-detection");
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
            enableTracking: true,
            trackerType: poseDetection.TrackerType.BoundingBox,
          }
        );
        if (cancelled) {
          detector.dispose();
          return;
        }
        detectorRef.current = detector;
        setStatus("ready");
        loop();
      } catch (e: any) {
        console.error("Trainer init failed:", e);
        setErrorMsg(
          e?.name === "NotAllowedError"
            ? "Camera access was denied. Enable it in your browser to use the AI coach."
            : "Could not start the camera or AI model. Check your connection and camera."
        );
        setStatus("error");
      }
    }

    async function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const detector = detectorRef.current;
      const counter = counterRef.current;
      const lock = lockRef.current;
      if (video && canvas && detector && video.readyState >= 2) {
        try {
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 480;
          const poses = (await detector.estimatePoses(video, {
            flipHorizontal: false,
          })) as Pose[];
          lastPosesRef.current = poses;
          const now = performance.now();

          // Auto-lock the center person once the workout is running.
          if (lock.status === "idle" && runningRef.current && poses.length) {
            lock.lockCenter(poses, vw, vh, now);
          }

          const locked = lock.update(poses, now, vw, vh);

          let formView: FormView | undefined;
          if (locked && runningRef.current) {
            const evts = counter.update(locked.keypoints, now);
            for (const e of evts) onEventRef.current?.(e);
            const cs = counter.state();
            setState(cs);
            formView = { color: cs.color, faultJoints: new Set(cs.faultJoints) };
          }
          draw(canvas, video, poses, lock.lockedId, lock.confidence, formView);
          if (now - lastLockEmit.current > 150) {
            lastLockEmit.current = now;
            setLockState(lock.state());
          }
        } catch {
          /* skip frame */
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    init();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      detectorRef.current?.dispose?.();
      const s = videoRef.current?.srcObject as MediaStream | null;
      s?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- manual lock controls ---
  function lockCenter() {
    const v = videoRef.current;
    if (!v) return;
    lockRef.current.lockCenter(
      lastPosesRef.current,
      v.videoWidth || 640,
      v.videoHeight || 480,
      performance.now()
    );
    setLockState(lockRef.current.state());
  }

  function lockAtClient(clientX: number, clientY: number) {
    const v = videoRef.current;
    if (!v) return;
    const rect = v.getBoundingClientRect();
    const vw = v.videoWidth || 640;
    const vh = v.videoHeight || 480;
    const scale = Math.max(rect.width / vw, rect.height / vh);
    const offX = (vw * scale - rect.width) / 2;
    const offY = (vh * scale - rect.height) / 2;
    // account for the mirrored (-scale-x) video display
    const dx = rect.width - (clientX - rect.left);
    const dy = clientY - rect.top;
    const vx = (dx + offX) / scale;
    const vy = (dy + offY) / scale;
    lockRef.current.lockAt(lastPosesRef.current, vx, vy, performance.now());
    setLockState(lockRef.current.state());
  }

  function resetLock() {
    lockRef.current.reset();
    setLockState(lockRef.current.state());
  }

  return {
    videoRef,
    canvasRef,
    status,
    errorMsg,
    state,
    lockState,
    lockCenter,
    lockAtClient,
    resetLock,
    getSummary: () => counterRef.current.summary(),
    getAttempts: () => counterRef.current.getAttempts(),
  };
}

interface FormView {
  color: "green" | "amber" | "red" | "idle";
  faultJoints: Set<string>;
}

const COLORS = {
  green: "rgba(43,255,136,0.9)",
  amber: "rgba(255,194,75,0.95)",
  red: "rgba(255,59,48,0.95)",
  idle: "rgba(255,122,24,0.9)",
};

// ---- drawing (canvas is NOT css-mirrored; we flip x here so labels read normally) ----
function draw(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  poses: Pose[],
  lockedId: number | null,
  confidence: number,
  formView?: FormView
) {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const fx = (x: number) => w - x; // mirror to match the video

  for (const p of poses) {
    const box = poseBox(p.keypoints);
    if (!box) continue;
    const isLocked = p.id === lockedId;

    // bounding box
    ctx.lineWidth = isLocked ? 4 : 2;
    ctx.strokeStyle = isLocked ? "rgba(43,255,136,0.95)" : "rgba(160,160,170,0.5)";
    const left = fx(box.xMax);
    ctx.strokeRect(left, box.yMin, box.w, box.h);

    if (isLocked) {
      // label above the box
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillStyle = "rgba(43,255,136,0.95)";
      ctx.fillText(`ACTIVE USER · ${confidence}%`, left, Math.max(16, box.yMin - 8));

      // skeleton (locked user only) — colored by form quality
      const map: Record<string, any> = {};
      for (const k of p.keypoints) if (k.name) map[k.name] = k;
      const color = COLORS[formView?.color ?? "idle"];
      const badJoints = formView?.faultJoints ?? new Set<string>();
      ctx.lineWidth = 4;
      ctx.strokeStyle = color;
      for (const [a, b] of SKELETON) {
        const ka = map[a];
        const kb = map[b];
        if (ka?.score > 0.3 && kb?.score > 0.3) {
          // a limb touching a faulted joint turns red
          ctx.strokeStyle = badJoints.has(a) || badJoints.has(b) ? COLORS.red : color;
          ctx.beginPath();
          ctx.moveTo(fx(ka.x), ka.y);
          ctx.lineTo(fx(kb.x), kb.y);
          ctx.stroke();
        }
      }
      for (const k of p.keypoints) {
        if ((k.score ?? 0) > 0.3) {
          const bad = k.name && badJoints.has(k.name);
          ctx.beginPath();
          ctx.arc(fx(k.x), k.y, bad ? 9 : 5, 0, Math.PI * 2);
          ctx.fillStyle = bad ? COLORS.red : "#2bd4ff";
          ctx.fill();
        }
      }
    }
  }
}
