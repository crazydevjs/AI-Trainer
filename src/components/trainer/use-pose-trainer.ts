"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { getExerciseConfig } from "@/lib/pose/exercises";
import { getFormChecks } from "@/lib/pose/form-rules";
import { RepCounter, type CoachEvent, type CoachState } from "@/lib/pose/rep-counter";

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

const INITIAL: CoachState = {
  reps: 0,
  holdSeconds: 0,
  progress: 0,
  avgRom: null,
  avgForm: null,
  formOk: true,
  tracking: false,
  inMotion: false,
  fault: null,
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
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const runningRef = useRef(running);
  const onEventRef = useRef(onEvent);

  const [status, setStatus] = useState<TrainerStatus>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [state, setState] = useState<CoachState>(INITIAL);

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
            modelType:
              poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
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
      if (video && canvas && detector && video.readyState >= 2) {
        try {
          const poses = await detector.estimatePoses(video, {
            flipHorizontal: false,
          });
          draw(canvas, video, poses[0]?.keypoints ?? []);
          if (poses[0] && runningRef.current) {
            const evts = counter.update(poses[0].keypoints, performance.now());
            for (const e of evts) onEventRef.current?.(e);
            setState(counter.state());
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

  return {
    videoRef,
    canvasRef,
    status,
    errorMsg,
    state,
    getSummary: () => counterRef.current.summary(),
  };
}

function draw(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  keypoints: any[]
) {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);

  const map: Record<string, any> = {};
  for (const k of keypoints) if (k.name) map[k.name] = k;

  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,122,24,0.9)";
  for (const [a, b] of SKELETON) {
    const ka = map[a];
    const kb = map[b];
    if (ka?.score > 0.3 && kb?.score > 0.3) {
      ctx.beginPath();
      ctx.moveTo(ka.x, ka.y);
      ctx.lineTo(kb.x, kb.y);
      ctx.stroke();
    }
  }

  for (const k of keypoints) {
    if (k.score > 0.3) {
      ctx.beginPath();
      ctx.arc(k.x, k.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#2bd4ff";
      ctx.fill();
    }
  }
}
