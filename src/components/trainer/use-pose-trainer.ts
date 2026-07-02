"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { getExerciseConfig } from "@/lib/pose/exercises";
import { getFormChecks, type Mode } from "@/lib/pose/form-rules";
import { getCameraSetup } from "@/lib/pose/camera-setup";
import { RepCounter, type CoachEvent, type CoachState } from "@/lib/pose/rep-counter";
import { BodyLock, poseBox, type LockState, type Pose } from "@/lib/pose/body-lock";
import { KeypointSmoother } from "@/lib/pose/one-euro";
import { chooseModel, type PoseModel } from "@/lib/pose/model-select";
import { detectTier } from "@/lib/pose/device-tier";
import { loadSmoothing } from "@/lib/pose/smoothing-config";
import { getEngineOverride, type EngineOverride } from "@/lib/dev";
import { isMirrored, type Facing } from "@/lib/camera";

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
  confidence: 0,
  orientation: "unknown",
  repPhase: "idle",
  debug: {
    side: null,
    joints: "—",
    angle: null,
    angleSource: "2D",
    progress: 0,
    peak: 0,
    requiredProgress: 0,
    turnaroundTol: 0.1,
    wristVeto: false,
    lastDecision: null,
  },
};

/** Which detection pipeline is actually driving the current workout:
 *  - "2D":     MoveNet — 2D keypoints for tracking + angle measurement.
 *  - "3D":     BlazePose loaded, but no usable 3D landmarks for the athlete yet.
 *  - "Hybrid": BlazePose — 2D keypoints track/lock the athlete, 3D world
 *              landmarks measure the joint angles (depth-invariant). */
export type Pipeline = "2D" | "3D" | "Hybrid";

export interface Telemetry {
  fps: number;
  model: PoseModel;
  pipeline: Pipeline;
  fallbackActive: boolean;
  confidence: number; // 0..100
  landmarks: number;
  inferenceMs: number;
}

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
  mode = "beginner",
  facing = "user",
  onEvent,
}: {
  poseKey?: string | null;
  running: boolean;
  mode?: Mode;
  facing?: Facing;
  onEvent?: (e: CoachEvent) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const counterRef = useRef<RepCounter>(
    new RepCounter(getExerciseConfig(poseKey), getFormChecks(poseKey), {
      mode,
      requiredView: getCameraSetup(poseKey).view,
    })
  );
  const lockRef = useRef<BodyLock>(new BodyLock());
  const smootherRef = useRef<KeypointSmoother | null>(null);
  if (!smootherRef.current) {
    const p = loadSmoothing();
    smootherRef.current = new KeypointSmoother(p.minCutoff, p.beta, p.dCutoff);
  }
  const prevLockId = useRef<number | null>(null);
  const lastPosesRef = useRef<Pose[]>([]);
  const detectorRef = useRef<any>(null);
  const pdRef = useRef<any>(null);
  const tierRef = useRef(detectTier());
  const modelRef = useRef<PoseModel>("2D");
  const fpsEma = useRef(30);
  const slowSince = useRef(0);
  const downgraded = useRef(false);
  const lastFrameTs = useRef(0);
  const overrideRef = useRef<EngineOverride>("auto");
  const infEma = useRef(0);
  const lastSample = useRef(0);
  const lastTelemetry = useRef(0);
  const debugLog = useRef<Record<string, unknown>[]>([]);
  const prevTracking = useRef(true);

  const logEvent = (e: Record<string, unknown>) => {
    if (debugLog.current.length < 8000) debugLog.current.push(e);
  };
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const runningRef = useRef(running);
  const onEventRef = useRef(onEvent);
  const lastLockEmit = useRef(0);
  const facingRef = useRef(facing);
  facingRef.current = facing;

  const [status, setStatus] = useState<TrainerStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [state, setState] = useState<CoachState>(INITIAL_COACH);
  const [lockState, setLockState] = useState<LockState>(INITIAL_LOCK);
  const [model, setModel] = useState<PoseModel>("2D");
  const [telemetry, setTelemetry] = useState<Telemetry>({
    fps: 0,
    model: "2D",
    pipeline: "2D",
    fallbackActive: false,
    confidence: 0,
    landmarks: 0,
    inferenceMs: 0,
  });

  runningRef.current = running;
  onEventRef.current = onEvent;

  // Load model + run loop once.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const tf = await import("@tensorflow/tfjs");
        await tf.ready();
        const poseDetection = await import("@tensorflow-models/pose-detection");
        pdRef.current = poseDetection;
        overrideRef.current = getEngineOverride();
        const chosen = chooseModel(poseKey, tierRef.current, overrideRef.current);
        const detector =
          chosen === "3D"
            ? await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, {
                runtime: "tfjs",
                modelType: "lite",
                enableSmoothing: false, // we apply our own One-Euro smoothing
              })
            : await makeMoveNet(poseDetection);
        if (cancelled) return detector.dispose();
        detectorRef.current = detector;
        modelRef.current = chosen;
        setModel(chosen);
        loop();
      } catch (e: any) {
        console.error("Trainer init failed:", e);
        setErrorMsg("Could not load the AI model. Check your connection.");
        setStatus("error");
      }
    }

    async function downgradeTo2D() {
      if (downgraded.current || !pdRef.current) return;
      downgraded.current = true;
      try {
        const nd = await makeMoveNet(pdRef.current);
        const old = detectorRef.current;
        detectorRef.current = nd;
        old?.dispose?.();
        lockRef.current.reset();
        smootherRef.current?.reset();
        modelRef.current = "2D";
        setModel("2D");
      } catch {
        /* keep current detector if swap fails */
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
          const tInf = performance.now();
          const poses = (await detector.estimatePoses(video, { flipHorizontal: false })) as Pose[];
          const infMs = performance.now() - tInf;
          infEma.current = infEma.current ? infEma.current * 0.9 + infMs * 0.1 : infMs;
          lastPosesRef.current = poses;
          const now = performance.now();
          const mirrored = isMirrored(facingRef.current);

          // rolling FPS + dynamic 3D→2D fallback (Auto mode only)
          if (lastFrameTs.current) {
            const dt = now - lastFrameTs.current;
            if (dt > 0) fpsEma.current = fpsEma.current * 0.9 + (1000 / dt) * 0.1;
          }
          lastFrameTs.current = now;
          if (overrideRef.current === "auto" && !downgraded.current && modelRef.current === "3D") {
            const floor = tierRef.current === "mid" ? 24 : 18;
            if (fpsEma.current < floor) {
              if (!slowSince.current) slowSince.current = now;
              else if (now - slowSince.current > 2500) {
                logEvent({
                  t: Math.round(now),
                  event: "fallback-3d-to-2d",
                  fps: Math.round(fpsEma.current),
                });
                downgradeTo2D();
              }
            } else {
              slowSince.current = 0;
            }
          }

          if (lock.status === "idle" && runningRef.current && poses.length) {
            lock.lockCenter(poses, vw, vh, now);
          }
          const locked = lock.update(poses, now, vw, vh);

          // One-Euro smoothing on the locked athlete (reset when the lock moves
          // to a different person) → stabler angles, ROM and form analysis.
          if (locked && smootherRef.current) {
            if (lock.lockedId !== prevLockId.current) {
              smootherRef.current.reset();
              prevLockId.current = lock.lockedId;
            }
            locked.keypoints = smootherRef.current.filter(locked.keypoints, now / 1000);
          }

          let formView: FormView | undefined;
          if (locked && runningRef.current) {
            const evts = counter.update(locked.keypoints, now, locked.keypoints3D);
            for (const e of evts) {
              onEventRef.current?.(e);
              if (e.type === "rep")
                logEvent({
                  t: Math.round(now),
                  event: "rep",
                  quality: e.quality,
                  rom: e.rom,
                  form: e.form,
                  confidence: e.confidence,
                  peak: e.peak,
                  required: e.required,
                  angleSource: e.angleSource,
                });
              else if (e.type === "badrep")
                logEvent({
                  t: Math.round(now),
                  event: "rep-rejected",
                  reason: e.reason,
                  rom: e.rom,
                  confidence: e.confidence,
                  peak: e.peak,
                  required: e.required,
                  angleSource: e.angleSource,
                });
            }
            const cs = counter.state();
            setState(cs);
            formView = { color: cs.color, faultJoints: new Set(cs.faultJoints) };
            // tracking loss / regain events
            if (cs.tracking !== prevTracking.current) {
              prevTracking.current = cs.tracking;
              logEvent({ t: Math.round(now), event: cs.tracking ? "tracking-regained" : "tracking-loss" });
            }
          }
          draw(canvas, video, poses, lock.lockedId, lock.confidence, mirrored, formView);
          if (now - lastLockEmit.current > 150) {
            lastLockEmit.current = now;
            setLockState(lock.state());
          }

          // --- developer telemetry + debug log ---
          const lmCount = locked
            ? locked.keypoints.filter((k) => (k.score ?? 0) > 0.3).length
            : 0;
          const conf = locked
            ? Math.round(
                (locked.keypoints.reduce((s, k) => s + (k.score ?? 0), 0) /
                  (locked.keypoints.length || 1)) *
                  100
              )
            : 0;
          const has3D = !!(locked?.keypoints3D && locked.keypoints3D.length);
          const pipeline: Pipeline =
            modelRef.current === "2D" ? "2D" : has3D ? "Hybrid" : "3D";
          if (now - lastTelemetry.current > 200) {
            lastTelemetry.current = now;
            setTelemetry({
              fps: Math.round(fpsEma.current),
              model: modelRef.current,
              pipeline,
              fallbackActive: downgraded.current,
              confidence: conf,
              landmarks: lmCount,
              inferenceMs: Math.round(infEma.current),
            });
          }
          if (runningRef.current && now - lastSample.current > 1000) {
            lastSample.current = now;
            const snap = counter.state();
            const dbg = snap.debug;
            logEvent({
              t: Math.round(now),
              event: "sample",
              fps: Math.round(fpsEma.current),
              model: modelRef.current,
              pipeline,
              angle3D: counter.angleFrom3D,
              inferenceMs: Math.round(infEma.current),
              confidence: conf,
              landmarks: lmCount,
              reps: counter.reps,
              // tuning telemetry (1 Hz): what the rep engine is seeing
              orientation: snap.orientation,
              side: dbg.side,
              joints: dbg.joints,
              angle: dbg.angle,
              progress: dbg.progress,
              peak: dbg.peak,
              required: dbg.requiredProgress,
              wristVeto: dbg.wristVeto,
            });
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)acquire camera when the selected camera changes; re-lock afterwards.
  useEffect(() => {
    let cancelled = false;
    async function open() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        lockRef.current.reset(); // re-detect & re-lock on the new camera
        setStatus("ready");
      } catch (e: any) {
        setErrorMsg(
          e?.name === "NotAllowedError"
            ? "Camera access was denied. Enable it in your browser to use the AI coach."
            : "Could not start the selected camera."
        );
        setStatus("error");
      }
    }
    open();
    return () => {
      cancelled = true;
    };
  }, [facing]);

  useEffect(
    () => () => streamRef.current?.getTracks().forEach((t) => t.stop()),
    []
  );

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
    let dx = clientX - rect.left;
    if (isMirrored(facingRef.current)) dx = rect.width - dx;
    const vx = (dx + offX) / scale;
    const vy = (clientY - rect.top + offY) / scale;
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
    model,
    telemetry,
    lockState,
    lockCenter,
    lockAtClient,
    resetLock,
    getSummary: () => counterRef.current.summary(),
    getAttempts: () => counterRef.current.getAttempts(),
    getDebugLog: () => debugLog.current,
  };
}

function makeMoveNet(pd: any) {
  return pd.createDetector(pd.SupportedModels.MoveNet, {
    modelType: pd.movenet.modelType.MULTIPOSE_LIGHTNING,
    enableTracking: true,
    trackerType: pd.TrackerType.BoundingBox,
  });
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

function draw(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  poses: Pose[],
  lockedId: number | null,
  confidence: number,
  mirrored: boolean,
  formView?: FormView
) {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const fx = (x: number) => (mirrored ? w - x : x);

  for (const p of poses) {
    const box = poseBox(p.keypoints);
    if (!box) continue;
    const isLocked = p.id === lockedId;

    ctx.lineWidth = isLocked ? 4 : 2;
    ctx.strokeStyle = isLocked ? "rgba(43,255,136,0.95)" : "rgba(160,160,170,0.5)";
    const left = fx(mirrored ? box.xMax : box.xMin);
    ctx.strokeRect(left, box.yMin, box.w, box.h);

    if (isLocked) {
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillStyle = "rgba(43,255,136,0.95)";
      ctx.fillText(`ACTIVE USER · ${confidence}%`, left, Math.max(16, box.yMin - 8));

      const map: Record<string, any> = {};
      for (const k of p.keypoints) if (k.name) map[k.name] = k;
      const color = COLORS[formView?.color ?? "idle"];
      const badJoints = formView?.faultJoints ?? new Set<string>();
      ctx.lineWidth = 4;
      for (const [a, b] of SKELETON) {
        const ka = map[a];
        const kb = map[b];
        if (ka?.score > 0.3 && kb?.score > 0.3) {
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
