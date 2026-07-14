"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { poseBox, type Pose } from "@/lib/pose/body-lock";
import { KeypointSmoother } from "@/lib/pose/one-euro";
import { loadSmoothing } from "@/lib/pose/smoothing-config";
import type { CameraSetup } from "@/lib/pose/camera-setup";
import { isMirrored, type Facing } from "@/lib/camera";
import { estimateCalibration, type CalibrationProfile } from "@/lib/pose/calibration";
import { toMap } from "@/lib/pose/angles";

export type CheckStatus = "loading" | "ready" | "error";

export interface CameraCheck {
  orientation: "front" | "side" | "45" | "rear" | "unknown";
  visibilityScore: number;
  angleScore: number;
  lightingScore: number;
  confidence: number;
  blurScore: number;
  fps: number;
  issues: string[];
  ok: boolean;
  calibration: CalibrationProfile | null;
}

const INITIAL: CameraCheck = {
  orientation: "unknown",
  visibilityScore: 0,
  angleScore: 0,
  lightingScore: 0,
  confidence: 0,
  blurScore: 0,
  fps: 0,
  issues: ["Stand in front of the camera so I can see you."],
  ok: false,
  calibration: null,
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

export function useCameraCheck(setup: CameraSetup, facing: Facing, heightCm?: number | null) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const brightRef = useRef(120);
  const sharpRef = useRef(50);
  const lastSample = useRef(0);
  const fpsRef = useRef(30);
  const lastFrameTs = useRef(0);
  const smootherRef = useRef<KeypointSmoother | null>(null);
  if (!smootherRef.current) {
    const p = loadSmoothing();
    smootherRef.current = new KeypointSmoother(p.minCutoff, p.beta, p.dCutoff);
  }
  const facingRef = useRef(facing);
  facingRef.current = facing;
  const heightRef = useRef(heightCm);
  heightRef.current = heightCm;

  const [status, setStatus] = useState<CheckStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [check, setCheck] = useState<CameraCheck>(INITIAL);

  // Load the model + run the detection loop once.
  useEffect(() => {
    let cancelled = false;
    const SAMPLE_SIZE = 64;
    const sampler = document.createElement("canvas");
    sampler.width = SAMPLE_SIZE;
    sampler.height = SAMPLE_SIZE;

    // Brightness (mean luma) + a cheap sharpness proxy (mean adjacent-pixel
    // gradient — low for a blurry/out-of-focus frame, high for a crisp one).
    // Reuses one small downsample so both checks stay ~free per frame.
    function sampleFrame(video: HTMLVideoElement, now: number) {
      if (now - lastSample.current < 500) return;
      lastSample.current = now;
      const ctx = sampler.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      const n = SAMPLE_SIZE * SAMPLE_SIZE;
      const luma = new Float32Array(n);
      let sum = 0;
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        luma[p] = l;
        sum += l;
      }
      brightRef.current = sum / n;

      let grad = 0;
      let gradN = 0;
      for (let y = 0; y < SAMPLE_SIZE - 1; y++) {
        for (let x = 0; x < SAMPLE_SIZE - 1; x++) {
          const i = y * SAMPLE_SIZE + x;
          grad += Math.abs(luma[i] - luma[i + 1]) + Math.abs(luma[i] - luma[i + SAMPLE_SIZE]);
          gradN++;
        }
      }
      sharpRef.current = grad / gradN;
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
          if (lastFrameTs.current) {
            const dt = now - lastFrameTs.current;
            if (dt > 0) fpsRef.current = fpsRef.current * 0.9 + (1000 / dt) * 0.1;
          }
          lastFrameTs.current = now;
          sampleFrame(video, now);
          const poses = (await detector.estimatePoses(video)) as Pose[];
          const best = poses.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null;
          if (best) best.keypoints = smootherRef.current!.filter(best.keypoints, now / 1000);
          else smootherRef.current!.reset();
          const result = evaluate(
            setup,
            best,
            video.videoWidth,
            video.videoHeight,
            brightRef.current,
            sharpRef.current,
            fpsRef.current,
            heightRef.current
          );
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
  brightness: number,
  sharpness: number,
  fps: number,
  heightCm: number | null | undefined
): CameraCheck {
  const issues: string[] = [];
  const lightingScore = Math.round(Math.max(0, Math.min(100, (brightness / 110) * 100)));
  // Empirically-scaled edge-gradient proxy for focus; conservative low
  // threshold below so an ordinary webcam/phone frame doesn't false-trigger.
  const blurScore = Math.round(Math.max(0, Math.min(100, (sharpness / 14) * 100)));
  const fpsOk = fps >= 10;

  if (!pose || (pose.score ?? 0) < 0.2) {
    if (blurScore < 20) issues.push("Camera image is blurry — clean the lens or hold it steady.");
    if (!fpsOk) issues.push("Performance is too low for reliable tracking — close other apps.");
    issues.push(
      brightness < 45 ? "Increase the lighting in the room." : "Stand in front of the camera so I can see you."
    );
    return {
      orientation: "unknown",
      visibilityScore: 0,
      angleScore: 0,
      lightingScore,
      confidence: 0,
      blurScore,
      fps: Math.round(fps),
      issues,
      ok: false,
      calibration: null,
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
  // Front and rear both produce a wide shoulder spread relative to torso
  // height; distinguish them by whether facial landmarks are confidently
  // seen. Lower confidence than front/side — flagged as a heuristic, not a
  // certainty, in the UI.
  let orientation: CameraCheck["orientation"] = "unknown";
  if (ok(ls) && ok(rs)) {
    const torso = Math.abs((ls.y + rs.y) / 2 - ((lh?.y ?? ls.y) + (rh?.y ?? rs.y)) / 2) || 1;
    const ratio = Math.abs(ls.x - rs.x) / torso;
    const faceVisible = ok(map.nose) || ok(map.left_ear) || ok(map.right_ear);
    if (ratio > 0.6) orientation = faceVisible ? "front" : "rear";
    else orientation = ratio < 0.32 ? "side" : "45";
  } else if (ok(ls) || ok(rs)) {
    orientation = "side";
  }

  let angleScore = 50;
  if (setup.view === "side") angleScore = orientation === "side" ? 100 : orientation === "45" ? 60 : 25;
  else if (setup.view === "front")
    angleScore = orientation === "front" ? 100 : orientation === "45" ? 60 : orientation === "rear" ? 15 : 25;
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
    issues.push(
      orientation === "rear"
        ? "You're facing away from the camera — turn to face it."
        : setup.view === "front"
          ? "Face the camera (front view)."
          : "Rotate your camera to the side."
    );
  }
  if (setup.fullBody && !feetOk) issues.push("Your lower body isn't visible — move the camera back.");
  if (setup.fullBody && !headOk) issues.push("Move back — keep your head in frame.");
  if (missing.length && (!setup.fullBody || (feetOk && headOk))) {
    issues.push(`Keep your ${missing.join(", ")} visible.`);
  }
  if (lightingScore < 50) issues.push("Increase the lighting in the room.");
  if (blurScore < 20) issues.push("Camera image is blurry — clean the lens or hold it steady.");
  if (!fpsOk) issues.push("Performance is too low for reliable tracking — close other apps.");

  const fullBodyOk = !setup.fullBody || (feetOk && headOk);
  const okAll =
    angleScore >= 70 &&
    visibilityScore >= 85 &&
    lightingScore >= 45 &&
    confidence >= 35 &&
    fullBodyOk &&
    blurScore >= 20 &&
    fpsOk;
  if (okAll) issues.length = 0;

  const calibration = estimateCalibration(toMap(pose.keypoints), heightCm, h);

  return {
    orientation,
    visibilityScore,
    angleScore,
    lightingScore,
    confidence,
    blurScore,
    fps: Math.round(fps),
    issues,
    ok: okAll,
    calibration,
  };
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
