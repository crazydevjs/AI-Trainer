// Per-exercise tuning for the rep-counter engine, keyed by Exercise.poseKey.

export interface PostureRule {
  // shoulder->hip line vs vertical must stay under maxLean degrees
  kind: "torsoUpright" | "bodyLine";
  threshold: number;
  cue: string;
}

export interface RepConfig {
  type: "rep";
  /** keypoint triple (side prefix added at runtime), angle measured at middle joint */
  joint: [string, string, string];
  /** angle (deg) at the resting/locked position */
  startAngle: number;
  /** angle (deg) at the worked position (rep is registered crossing toward this) */
  activeAngle: number;
  /** the ideal angle at full range — used to score ROM */
  idealAngle: number;
  posture?: PostureRule;
  /** message when a rep finishes without enough range */
  incompleteCue: string;
  /** overhead presses: only treat as "worked" when the wrist is above the
   *  shoulder — prevents arms-at-sides (elbow straight) reading as a rep. */
  requireWristAboveShoulder?: boolean;
  /** progress-reversal (0..1) required to confirm a bottom turnaround. Larger
   *  values ignore the grind/wobble of heavy, slow reps so a single rep isn't
   *  split into several or a pause misread as a turnaround. Default 0.1. */
  turnaroundTol?: number;
}

export interface HoldConfig {
  type: "hold";
  posture: PostureRule;
}

export interface GenericConfig {
  type: "generic";
}

export type ExerciseConfig = RepConfig | HoldConfig | GenericConfig;

const squatLike: RepConfig = {
  type: "rep",
  joint: ["hip", "knee", "ankle"],
  startAngle: 160,
  activeAngle: 100,
  idealAngle: 70,
  incompleteCue: "Go lower",
};

const curlLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "elbow", "wrist"],
  startAngle: 150,
  activeAngle: 70,
  idealAngle: 45,
  incompleteCue: "Curl all the way up",
};

const pushupLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "elbow", "wrist"],
  startAngle: 160,
  activeAngle: 100,
  idealAngle: 80,
  incompleteCue: "Go all the way down",
};

// Barbell/DB bench + incline press. Elbow flexion, measured in 3D so a side/45°
// camera doesn't foreshorten the arm. Slightly forgiving turnaround for the
// grind of a heavy press.
const benchLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "elbow", "wrist"],
  startAngle: 158, // arms extended (top)
  activeAngle: 100, // elbow bent at the chest (bottom)
  idealAngle: 82,
  incompleteCue: "Lower the bar to your chest",
  turnaroundTol: 0.14,
};

const pressLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "elbow", "wrist"],
  startAngle: 90,
  activeAngle: 140, // forgiving lockout for heavy sets / limited mobility
  idealAngle: 165,
  incompleteCue: "Press a little higher",
  requireWristAboveShoulder: true,
  turnaroundTol: 0.16, // tolerate the grind + controlled pause of a heavy press
};

// Seated knee extension: leg goes from bent (~90) to straight (~165).
const legExtensionLike: RepConfig = {
  type: "rep",
  joint: ["hip", "knee", "ankle"],
  startAngle: 90,
  activeAngle: 155,
  idealAngle: 172,
  incompleteCue: "Straighten your legs fully",
};

// Leg press: legs extended at the top (~165), bend to ~90, press back.
const legPressLike: RepConfig = {
  type: "rep",
  joint: ["hip", "knee", "ankle"],
  startAngle: 165,
  activeAngle: 110,
  idealAngle: 90,
  incompleteCue: "Lower with control",
};

const pullupLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "elbow", "wrist"],
  startAngle: 160,
  activeAngle: 80,
  idealAngle: 55,
  incompleteCue: "Pull all the way up",
};

// Lat pulldown. Elbow flexion from arms-extended-overhead to bar-at-chest.
// Measured in 3D so it counts from side and rear angles (front is blocked by
// the machine). This replaces the old fallback that treated it as a generic
// hip-drop movement, which never counted pulldown reps.
const pulldownLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "elbow", "wrist"],
  startAngle: 165, // arms extended overhead
  activeAngle: 85, // elbows driven down, bar at upper chest
  idealAngle: 62,
  incompleteCue: "Pull the bar all the way down",
  turnaroundTol: 0.14,
};

const rowLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "elbow", "wrist"],
  startAngle: 160,
  activeAngle: 80,
  idealAngle: 60,
  incompleteCue: "Pull it to your body",
  turnaroundTol: 0.14,
};

const hingeLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "hip", "knee"],
  startAngle: 165,
  activeAngle: 110,
  idealAngle: 90,
  incompleteCue: "Stand up tall",
};

const hipThrustLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "hip", "knee"],
  startAngle: 110,
  activeAngle: 165,
  idealAngle: 175,
  incompleteCue: "Push your hips up",
};

const raiseLike: RepConfig = {
  type: "rep",
  joint: ["hip", "shoulder", "wrist"],
  startAngle: 25,
  activeAngle: 80,
  idealAngle: 90,
  incompleteCue: "Raise your arms higher",
};

const crunchLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "hip", "knee"],
  startAngle: 150,
  activeAngle: 110,
  idealAngle: 95,
  incompleteCue: "Crunch up a bit more",
};

const dipLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "elbow", "wrist"],
  startAngle: 160,
  activeAngle: 95,
  idealAngle: 80,
  incompleteCue: "Go a bit lower",
};

const pushdownLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "elbow", "wrist"],
  startAngle: 90,
  activeAngle: 160,
  idealAngle: 172,
  incompleteCue: "Push all the way down",
};

const CONFIGS: Record<string, ExerciseConfig> = {
  squat: squatLike,
  "front-squat": squatLike,
  lunge: squatLike,
  "push-up": pushupLike,
  "bench-press": benchLike,
  "shoulder-press": pressLike,
  "pull-up": pullupLike,
  "pull-down": pulldownLike,
  curl: curlLike,
  "hammer-curl": curlLike,
  row: rowLike,
  deadlift: hingeLike,
  rdl: hingeLike,
  "hip-thrust": hipThrustLike,
  "lateral-raise": raiseLike,
  "front-raise": raiseLike,
  crunch: crunchLike,
  "leg-raise": crunchLike,
  "leg-extension": legExtensionLike,
  "leg-press": legPressLike,
  dip: dipLike,
  pushdown: pushdownLike,
  plank: {
    type: "hold",
    posture: { kind: "bodyLine", threshold: 150, cue: "Keep your hips level" },
  },
};

export function getExerciseConfig(poseKey?: string | null): ExerciseConfig {
  if (poseKey && CONFIGS[poseKey]) return CONFIGS[poseKey];
  return { type: "generic" };
}
