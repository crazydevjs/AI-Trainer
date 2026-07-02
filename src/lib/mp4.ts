// WebM → MP4 (H.264 + AAC) conversion, fully on-device via ffmpeg.wasm.
//
// Why: browsers without MP4 MediaRecorder support (notably Firefox) record
// WebM, which won't play on iPhones, most native players, or social apps.
// We transcode locally so the "video never leaves the device" privacy
// guarantee holds — no server upload, no media storage liability.
//
// The ~31 MB single-threaded ffmpeg core is lazy-loaded from a CDN on first
// use only (browsers that record MP4 natively never pay this cost) and the
// instance is cached for the session.

/* eslint-disable @typescript-eslint/no-explicit-any */

const CORE_VERSION = "0.12.10";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

let ffmpegPromise: Promise<any> | null = null;

/** Whether on-device conversion can run in this browser. */
export function mp4ConvertSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    typeof Worker !== "undefined"
  );
}

async function getFFmpeg(): Promise<any> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util"),
      ]);
      const ffmpeg = new FFmpeg();
      // Blob URLs sidestep CORS/worker-origin restrictions on the CDN files.
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })().catch((e) => {
      ffmpegPromise = null; // allow retry (e.g. flaky network) on next call
      throw e;
    });
  }
  return ffmpegPromise;
}

/**
 * Convert a recorded video blob to a universally playable MP4:
 * H.264 (baseline-friendly yuv420p) + AAC, `+faststart` so the moov atom
 * leads the file and playback starts immediately after download.
 * Audio is passed through to AAC when present; absent audio is fine.
 */
export async function convertToMp4(
  input: Blob,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");

  const inName = "in.webm";
  const outName = "out.mp4";
  const progressHandler = ({ progress }: { progress: number }) => {
    // ffmpeg reports 0..1 (occasionally slightly over on webm without duration)
    onProgress?.(Math.max(0, Math.min(100, Math.round(progress * 100))));
  };

  ffmpeg.on("progress", progressHandler);
  try {
    await ffmpeg.writeFile(inName, await fetchFile(input));
    const code = await ffmpeg.exec([
      "-i", inName,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      outName,
    ]);
    if (code !== 0) throw new Error(`ffmpeg exited with code ${code}`);
    const data = (await ffmpeg.readFile(outName)) as Uint8Array;
    if (!data?.length) throw new Error("ffmpeg produced an empty file");
    return new Blob([new Uint8Array(data)], { type: "video/mp4" });
  } finally {
    ffmpeg.off("progress", progressHandler);
    // best-effort cleanup of the in-memory FS
    try {
      await ffmpeg.deleteFile(inName);
    } catch {}
    try {
      await ffmpeg.deleteFile(outName);
    } catch {}
  }
}

/** `Bench-Press-2026-07-02.mp4` — human filename from an exercise/session name. */
export function videoFileName(name: string, ext: string, date = new Date()): string {
  const clean = name
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "Workout";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${clean}-${y}-${m}-${d}.${ext}`;
}
