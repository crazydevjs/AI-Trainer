// Throttled text-to-speech for the AI coach (Web Speech API).
//
// Production note: browsers gate speechSynthesis behind the autoplay policy on
// low-engagement origins. The FIRST speak() must run inside a user gesture, so
// `unlockVoice()` is called from the Start button. We also pick a voice once
// they load (async) and run a keep-alive resume() to dodge Chrome's pause bug.

let enabled = true;
let unlocked = false;
let lastSpoke = 0;
let preferred: SpeechSynthesisVoice | null = null;
let keepAlive: ReturnType<typeof setInterval> | null = null;

function supported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
export const isVoiceSupported = supported;

function loadVoices() {
  if (!supported()) return;
  const apply = () => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    preferred =
      voices.find((v) => /en[-_]US/i.test(v.lang) && /google|samantha|natural|female/i.test(v.name)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      voices[0] ||
      null;
  };
  apply();
  window.speechSynthesis.onvoiceschanged = apply;
}
if (supported()) loadVoices();

/** Call from a user gesture (Start / Enable Voice) to satisfy autoplay policy. */
export function unlockVoice() {
  if (!supported()) return;
  try {
    window.speechSynthesis.resume();
    const warm = new SpeechSynthesisUtterance(" ");
    warm.volume = 0; // silent — only to register a gesture-bound speak
    window.speechSynthesis.speak(warm);
    unlocked = true;
    if (!preferred) loadVoices();
    if (!keepAlive) {
      // Chrome silently pauses synthesis after ~15s; nudge it back.
      keepAlive = setInterval(() => {
        const s = window.speechSynthesis;
        if (s.speaking && s.paused) s.resume();
      }, 5000);
    }
  } catch {
    /* ignore */
  }
}

export function setVoiceEnabled(on: boolean) {
  enabled = on;
  if (!on) stopSpeaking();
}

/**
 * Speak a phrase. Priority cues (corrections) jump the queue; ambient cues
 * (praise/motivation) are rate-limited.
 */
export function speak(text: string, priority = false) {
  if (!enabled || !supported() || !text.trim()) return;
  const now = Date.now();
  if (!priority && now - lastSpoke < 1200) return;
  lastSpoke = now;

  const u = new SpeechSynthesisUtterance(text);
  if (preferred) u.voice = preferred;
  u.lang = preferred?.lang || "en-US";
  u.rate = 1.05;
  u.pitch = 1;
  u.volume = 1;

  if (priority) window.speechSynthesis.cancel();
  window.speechSynthesis.resume(); // unstick if paused
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (supported()) window.speechSynthesis.cancel();
}

export interface VoiceStatus {
  supported: boolean;
  unlocked: boolean;
  speaking: boolean;
  voice: string | null;
}

export function getVoiceStatus(): VoiceStatus {
  return {
    supported: supported(),
    unlocked,
    speaking: supported() ? window.speechSynthesis.speaking : false,
    voice: preferred?.name ?? null,
  };
}
