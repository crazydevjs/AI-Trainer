import { speak } from "./voice";

// Simple-English coaching lines. Short, friendly, easy to understand.
const BANKS: Record<string, string[]> = {
  start: ["Let's begin.", "You got this.", "Let's go.", "Ready? Let's work.", "Here we go."],
  perfect: ["Perfect!", "Excellent.", "Very good.", "Strong rep.", "Great depth.", "Beautiful."],
  good: ["Good rep.", "Nice.", "Good.", "That's it.", "Keep going.", "Well done."],
  motivate: [
    "Keep going.",
    "Stay strong.",
    "Nice work.",
    "You're doing great.",
    "Focus on your form.",
    "Control the movement.",
    "Great effort.",
    "Looking good.",
    "Stay with it.",
  ],
  lastOne: ["One more!", "Last one!", "Push! One more.", "Give me one more."],
  almost: ["Almost there.", "Nearly done.", "Keep pushing.", "Two to go."],
  setDone: ["Great set!", "Well done.", "Nice set.", "Strong set!"],
  rest: ["Take some rest.", "Rest now.", "Catch your breath.", "Breathe. Good work."],
  nextSet: ["Get ready.", "Next set. Let's go.", "Here we go again.", "Ready? Let's work."],
  complete: [
    "Workout complete! Great job.",
    "All done. You did great.",
    "Excellent work today!",
    "That's it. Awesome job.",
  ],
  badPrefix: ["Try again.", "Almost.", "Not quite.", "Reset and go again."],
};

function pick(pool: string[], last?: string): string {
  if (pool.length === 1) return pool[0];
  let p = pool[Math.floor(Math.random() * pool.length)];
  let tries = 0;
  while (p === last && tries < 4) {
    p = pool[Math.floor(Math.random() * pool.length)];
    tries++;
  }
  return p;
}

/** Stateful coach that varies phrasing and keeps the user engaged. */
export class Coach {
  private last: Record<string, string> = {};
  lastSpeakTs = 0;

  private say(cat: keyof typeof BANKS, priority = false): string {
    const phrase = pick(BANKS[cat], this.last[cat]);
    this.last[cat] = phrase;
    this.lastSpeakTs = Date.now();
    speak(phrase, priority);
    return phrase;
  }

  start() {
    return this.say("start", true);
  }
  goodRep(quality: "perfect" | "good") {
    return this.say(quality === "perfect" ? "perfect" : "good");
  }
  motivate() {
    return this.say("motivate");
  }
  lastOne() {
    return this.say("lastOne", true);
  }
  almost() {
    return this.say("almost", true);
  }
  setDone() {
    return this.say("setDone", true);
  }
  rest() {
    return this.say("rest", true);
  }
  nextSet() {
    return this.say("nextSet", true);
  }
  complete() {
    return this.say("complete", true);
  }

  /** Specific in-the-moment correction from the pose engine. */
  correct(message: string) {
    this.lastSpeakTs = Date.now();
    speak(message, true);
    return message;
  }

  /** Rejected rep: encouragement + the simple reason. */
  badRep(reason: string) {
    const pre = pick(BANKS.badPrefix, this.last.badPrefix);
    this.last.badPrefix = pre;
    this.lastSpeakTs = Date.now();
    speak(`${pre} ${reason}.`, true);
    return reason;
  }

  /** Fill silence so the coach never goes quiet. Returns phrase or null. */
  maybeMotivate(gapMs = 6500): string | null {
    if (Date.now() - this.lastSpeakTs < gapMs) return null;
    return this.motivate();
  }
}
