// Throttled text-to-speech for the AI coach (Web Speech API).

let enabled = true;
let lastSpoke = 0;

export function setVoiceEnabled(on: boolean) {
  enabled = on;
  if (!on && typeof window !== "undefined") window.speechSynthesis?.cancel();
}

export function isVoiceSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Speak a phrase. `priority` cues (form corrections) bypass the throttle
 * gap; ambient cues (rep counts) are rate-limited to avoid chatter.
 */
export function speak(text: string, priority = false) {
  if (!enabled || !isVoiceSupported()) return;
  const now = Date.now();
  if (!priority && now - lastSpoke < 1200) return;
  lastSpoke = now;

  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.05;
  u.pitch = 1;
  u.volume = 1;
  if (priority) window.speechSynthesis.cancel(); // jump the queue for corrections
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (isVoiceSupported()) window.speechSynthesis.cancel();
}
