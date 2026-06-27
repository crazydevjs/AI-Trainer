"use client";

import { useRef, useState } from "react";

export interface RecorderHud {
  exercise: string;
  rep: string; // e.g. "5 / 10"
  set: string; // e.g. "Set 2/3"
  cue?: string;
  resting?: boolean;
  restText?: string;
}

export interface RecordConfig {
  video: HTMLVideoElement | null;
  overlay: HTMLCanvasElement | null;
  mirrored: () => boolean;
  hud: () => RecorderHud;
  watermark?: boolean;
}

export interface RecordResult {
  url: string;
  blob: Blob;
  ext: string;
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  const cands = [
    "video/mp4;codecs=h264",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return cands.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

export function useWorkoutRecorder() {
  const cfgRef = useRef<RecordConfig | null>(null);
  const mediaRec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const rafRef = useRef(0);

  const [supported] = useState(
    () =>
      typeof window !== "undefined" &&
      "MediaRecorder" in window &&
      typeof HTMLCanvasElement !== "undefined" &&
      typeof HTMLCanvasElement.prototype.captureStream === "function"
  );
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<RecordResult | null>(null);

  function start(cfg: RecordConfig): boolean {
    if (!supported || recording) return false;
    const v = cfg.video;
    if (!v || !v.videoWidth) return false;
    cfgRef.current = cfg;

    const w = v.videoWidth;
    const h = v.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const renderLoop = () => {
      const cur = cfgRef.current;
      if (cur && cur.video && cur.video.readyState >= 2) {
        ctx.save();
        if (cur.mirrored()) {
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(cur.video, 0, 0, w, h);
        ctx.restore();
        if (cur.overlay) ctx.drawImage(cur.overlay, 0, 0, w, h);
        drawHud(ctx, w, h, cur.hud(), cur.watermark !== false);
      }
      rafRef.current = requestAnimationFrame(renderLoop);
    };

    const stream = canvas.captureStream(30);
    const mime = pickMime();
    let mr: MediaRecorder;
    try {
      mr = new MediaRecorder(
        stream,
        mime ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : undefined
      );
    } catch {
      return false;
    }
    chunks.current = [];
    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.current.push(e.data);
    };
    mr.onstop = () => {
      cancelAnimationFrame(rafRef.current);
      const type = mr.mimeType || mime || "video/webm";
      const blob = new Blob(chunks.current, { type });
      const ext = type.includes("mp4") ? "mp4" : "webm";
      setResult({ url: URL.createObjectURL(blob), blob, ext });
      setRecording(false);
      setPaused(false);
      cfgRef.current = null;
    };
    mediaRec.current = mr;
    setResult(null);
    mr.start(1000);
    setRecording(true);
    setPaused(false);
    renderLoop();
    return true;
  }

  function pause() {
    if (mediaRec.current?.state === "recording") {
      mediaRec.current.pause();
      setPaused(true);
    }
  }
  function resume() {
    if (mediaRec.current?.state === "paused") {
      mediaRec.current.resume();
      setPaused(false);
    }
  }
  function stop() {
    if (mediaRec.current && mediaRec.current.state !== "inactive") {
      mediaRec.current.stop();
    } else {
      cancelAnimationFrame(rafRef.current);
    }
  }
  function clear() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
  }

  return { supported, recording, paused, result, start, pause, resume, stop, clear };
}

export type WorkoutRecorder = ReturnType<typeof useWorkoutRecorder>;

function drawHud(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  hud: RecorderHud,
  watermark: boolean
) {
  ctx.save();
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 6;

  // top-left: exercise + set
  ctx.fillStyle = "#f5f5f7";
  ctx.font = `600 ${Math.round(w * 0.045)}px system-ui, sans-serif`;
  ctx.fillText(hud.exercise.toUpperCase(), w * 0.04, h * 0.05);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = `500 ${Math.round(w * 0.03)}px system-ui, sans-serif`;
  ctx.fillText(hud.set, w * 0.04, h * 0.05 + w * 0.05);

  // rest banner or rep counter
  if (hud.resting) {
    ctx.fillStyle = "#2bd4ff";
    ctx.textAlign = "center";
    ctx.font = `700 ${Math.round(w * 0.06)}px system-ui, sans-serif`;
    ctx.fillText(hud.restText ?? "REST", w / 2, h * 0.45);
    ctx.textAlign = "left";
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = `800 ${Math.round(w * 0.14)}px system-ui, sans-serif`;
    ctx.fillText(hud.rep, w / 2, h * 0.78);
    ctx.textAlign = "left";
  }

  // cue (mid)
  if (hud.cue && !hud.resting) {
    ctx.fillStyle = "#ffc24b";
    ctx.textAlign = "center";
    ctx.font = `700 ${Math.round(w * 0.04)}px system-ui, sans-serif`;
    ctx.fillText(hud.cue, w / 2, h * 0.3);
    ctx.textAlign = "left";
  }

  // watermark bottom-right
  if (watermark) {
    ctx.shadowBlur = 4;
    ctx.fillStyle = "#ff3b30";
    ctx.textAlign = "right";
    ctx.font = `800 ${Math.round(w * 0.04)}px system-ui, sans-serif`;
    ctx.fillText("🔥 FORGE", w * 0.96, h * 0.92);
    ctx.textAlign = "left";
  }
  ctx.restore();
}
