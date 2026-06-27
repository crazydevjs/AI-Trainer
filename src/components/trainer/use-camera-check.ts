"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { poseBox, type Pose } from "@/lib/pose/body-lock";
import type { CameraSetup } from "@/lib/pose/camera-setup";
import { isMirrored, type Facing } from "@/lib/camera";

export type CheckStatus = "loading" | "ready" | "error";

export interface CameraCheck {
  orientation: "front" | "side" | "45" | "unknown";
  visibilityScore: number;
  angleScore: number;
  lightingScore: number;
  confidence: number;
  issues: string[];
  ok: boolean;
}

const INITIAL: CameraCheck = {
  orientation: "unknown",
  visibilityScore: 0,
  angleScore: 0,
  lightingScore: 0,
  confidence: 0,
  issues: ["Stand in front of the camera so I can see you."],
  ok: false,
};

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

const ok = (k?: any) => (k?.score ?? 0) >= 0.3;

export function useCameraCheck(setup: CameraSetup, facing: Facing) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const brightRef = useRef(120);
  const lastBright = useRef(0);
  const facingRef = useRef(facing);
  facingRef.current = facing;

  const [status, setStatus] = useState<CheckStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [check, setCheck] = useState<CameraCheck>(INITIAL);

  // Load the model + run the detection loop once.
  useEffect(() => {
    let cancelled = false;
    const sampler = document.createElement("canvas");
    sampler.width = 16;
    sampler.height = 16;

    function sampleBrightness(video: HTMLVideoElement, now: number) {
      if (now - lastBright.current < 500) return;
      lastBright.current = now;
      const ctx = sampler.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 16, 16);
      const { data } = ctx.getImageData(0, 0, 16, 16);
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      brightRef.current = sum / (data.length / 4);
    }

    async function init() {
      try {
        const tf = await import("@tensorflow/tfjs");
        await tf.ready();
        const pd = await import("@tensorflow-models/pose-detection");
        const detector = await pd.createDetector(pd.SupportedModels.MoveNet, {
          modelType: pd.movenet.modelType.MULTIPOSE_LIGHTNING,
        });
        if (cancelled) return detector.dispose();
        detectorRef.current = detector;
        loop();
      } catch {
        if (!cancelled) {
          setErrorMsg("Could not load the AI model. Check your connection.");
          setStatus("error");
        }
      }
    }

    async function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const detector = detectorRef.current;
      if (video && canvas && detector && video.readyState >= 2) {
        try {
          const now = performance.now();
          sampleBrightness(video, now);
          const poses = (await detector.estimatePoses(video)) as Pose[];
          const best = poses.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null;
          const result = evaluate(setup, best, video.videoWidth, video.videoHeight, brightRef.current);
          draw(canvas, video, best, result.ok, isMirrored(facingRef.current));
          setCheck(result);
        } catch {
          /* skip */
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

  // (Re)acquire the camera stream whenever the selected camera changes.
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
        setStatus("ready");
      } catch (e: any) {
        setErrorMsg(
          e?.name === "NotAllowedError"
            ? "Camera access was denied. Enable it to set up your workout."
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

  // Stop tracks on unmount.
  useEffect(
    () => () => streamRef.current?.getTracks().forEach((t) => t.stop()),
    []
  );

  return { videoRef, canvasRef, status, errorMsg, check };
}

function evaluate(
  setup: CameraSetup,
  pose: Pose | null,
  w: number,
  h: number,
  brightness: number
): CameraCheck {
  const issues: string[] = [];
  const lightingScore = Math.round(Math.max(0, Math.min(100, (brightness / 110) * 100)));

  if (!pose || (pose.score ?? 0) < 0.2) {
    return {
      orientation: "unknown",
      visibilityScore: 0,
      angleScore: 0,
      lightingScore,
      confidence: 0,
      issues: [
        brightness < 45 ? "Increase the lighting in the room." : "Stand in front of the camera so I can see you.",
      ],
      ok: false,
    };
  }

  const map: Record<string, any> = {};
  for (const k of pose.keypoints) if (k.name) map[k.name] = k;
  const inFrame = (k?: any) =>
    ok(k) && k.x > 0.04 * w && k.x < 0.96 * w && k.y > 0.04 * h && k.y < 0.96 * h;

  const keyScores = pose.keypoints.filter((k) => (k.score ?? 0) > 0).map((k) => k.score ?? 0);
  const confidence = Math.round((keyScores.reduce((s, n) => s + n, 0) / (keyScores.length || 1)) * 100);

  const ls = map.left_shoulder;
  const rs = map.right_shoulder;
  const lh = map.left_hip;
  const rh = map.right_hip;
  let orientation: CameraCheck["orientation"] = "unknown";
  if (ok(ls) && ok(rs)) {
    const torso = Math.abs((ls.y + rs.y) / 2 - ((lh?.y ?? ls.y) + (rh?.y ?? rs.y)) / 2) || 1;
    const ratio = Math.abs(ls.x - rs.x) / torso;
    orientation = ratio > 0.6 ? "front" : ratio < 0.32 ? "side" : "45";
  } else if (ok(ls) || ok(rs)) {
    orientation = "side";
  }

  let angleScore = 50;
  if (setup.view === "side") angleScore = orientation === "side" ? 100 : orientation === "45" ? 60 : 25;
  else if (setup.view === "front") angleScore = orientation === "front" ? 100 : orientation === "45" ? 60 : 25;
  else angleScore = orientation === "45" ? 100 : orientation === "unknown" ? 40 : 75;

  let visible = 0;
  const missing: string[] = [];
  for (const base of setup.requiredJoints) {
    if (inFrame(map[`left_${base}`]) || inFrame(map[`right_${base}`])) visible++;
    else missing.push(base);
  }
  const visibilityScore = Math.round((visible / setup.requiredJoints.length) * 100);

  const headOk = inFrame(map.nose) || inFrame(map.left_ear) || inFrame(map.right_ear);
  const feetOk = inFrame(map.left_ankle) || inFrame(map.right_ankle);

  if (angleScore < 70) {
    issues.push(setup.view === "front" ? "Face the camera (front view)." : "Rotate your camera to the side.");
  }
  if (setup.fullBody && !feetOk) issues.push("Your lower body isn't visible — move the camera back.");
  if (setup.fullBody && !headOk) issues.push("Move back — keep your head in frame.");
  if (missing.length && (!setup.fullBody || (feetOk && headOk))) {
    issues.push(`Keep your ${missing.join(", ")} visible.`);
  }
  if (lightingScore < 50) issues.push("Increase the lighting in the room.");

  const fullBodyOk = !setup.fullBody || (feetOk && headOk);
  const okAll =
    angleScore >= 70 && visibilityScore >= 85 && lightingScore >= 45 && confidence >= 35 && fullBodyOk;
  if (okAll) issues.length = 0;

  return { orientation, visibilityScore, angleScore, lightingScore, confidence, issues, ok: okAll };
}

function draw(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  pose: Pose | null,
  good: boolean,
  mirrored: boolean
) {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const fx = (x: number) => (mirrored ? w - x : x);

  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.strokeRect(w * 0.08, h * 0.05, w * 0.84, h * 0.9);
  ctx.setLineDash([]);

  if (!pose) return;
  const map: Record<string, any> = {};
  for (const k of pose.keypoints) if (k.name) map[k.name] = k;
  const color = good ? "rgba(43,255,136,0.95)" : "rgba(255,194,75,0.95)";
  ctx.lineWidth = 4;
  ctx.strokeStyle = color;
  for (const [a, b] of SKELETON) {
    const ka = map[a];
    const kb = map[b];
    if (ok(ka) && ok(kb)) {
      ctx.beginPath();
      ctx.moveTo(fx(ka.x), ka.y);
      ctx.lineTo(fx(kb.x), kb.y);
      ctx.stroke();
    }
  }
  const box = poseBox(pose.keypoints);
  if (box) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(fx(mirrored ? box.xMax : box.xMin), box.yMin, box.w, box.h);
  }
}
