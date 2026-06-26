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
  posture: { kind: "torsoUpright", threshold: 55, cue: "Keep your chest up" },
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
  posture: { kind: "bodyLine", threshold: 150, cue: "Keep your body straight" },
  incompleteCue: "Go all the way down",
};

const pressLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "elbow", "wrist"],
  startAngle: 90,
  activeAngle: 160,
  idealAngle: 172,
  incompleteCue: "Push all the way up",
};

const pullupLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "elbow", "wrist"],
  startAngle: 160,
  activeAngle: 80,
  idealAngle: 55,
  incompleteCue: "Pull all the way up",
};

const rowLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "elbow", "wrist"],
  startAngle: 160,
  activeAngle: 80,
  idealAngle: 60,
  incompleteCue: "Pull it to your body",
};

const hingeLike: RepConfig = {
  type: "rep",
  joint: ["shoulder", "hip", "knee"],
  startAngle: 165,
  activeAngle: 110,
  idealAngle: 90,
  posture: { kind: "bodyLine", threshold: 130, cue: "Keep your back flat" },
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
  "bench-press": pushupLike,
  "shoulder-press": pressLike,
  "pull-up": pullupLike,
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
