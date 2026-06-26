// Per-exercise camera placement recommendations + validation requirements.

export type CameraView = "side" | "front" | "45";

export interface CameraSetup {
  view: CameraView;
  height: string;
  distance: string;
  fullBody: boolean;
  /** base joint names (side prefix added at check time) that must be visible */
  requiredJoints: string[];
  tips: string[];
}

const FULL_BODY = ["shoulder", "hip", "knee", "ankle"];
const UPPER = ["shoulder", "elbow", "wrist", "hip"];

const SIDE_FULL: CameraSetup = {
  view: "side",
  height: "Hip height",
  distance: "2–3 m away",
  fullBody: true,
  requiredJoints: FULL_BODY,
  tips: [
    "Turn side-on to the camera.",
    "Keep your whole body in frame.",
    "Phone steady at hip height.",
  ],
};

const FRONT_UPPER: CameraSetup = {
  view: "front",
  height: "Chest height",
  distance: "1.5–2 m away",
  fullBody: false,
  requiredJoints: UPPER,
  tips: [
    "Face the camera straight on.",
    "Keep your torso and arms visible.",
    "Phone steady at chest height.",
  ],
};

const SETUPS: Record<string, CameraSetup> = {
  squat: SIDE_FULL,
  "front-squat": SIDE_FULL,
  lunge: SIDE_FULL,
  deadlift: { ...SIDE_FULL, height: "Hip height" },
  rdl: SIDE_FULL,
  "push-up": { ...SIDE_FULL, height: "Floor / low angle" },
  plank: { ...SIDE_FULL, height: "Floor / low angle" },
  dip: SIDE_FULL,
  "hip-thrust": SIDE_FULL,
  crunch: { ...SIDE_FULL, height: "Floor level" },
  "leg-raise": { ...SIDE_FULL, height: "Floor level" },
  "bench-press": {
    view: "45",
    height: "Chest height",
    distance: "2 m away",
    fullBody: false,
    requiredJoints: ["shoulder", "elbow", "wrist"],
    tips: ["Side or 45° angle.", "Keep your chest and arms visible."],
  },
  "shoulder-press": FRONT_UPPER,
  curl: FRONT_UPPER,
  "hammer-curl": FRONT_UPPER,
  pushdown: FRONT_UPPER,
  "lateral-raise": FRONT_UPPER,
  "front-raise": FRONT_UPPER,
  row: { ...FRONT_UPPER, view: "side" },
};

const DEFAULT: CameraSetup = {
  view: "front",
  height: "Chest height",
  distance: "2 m away",
  fullBody: true,
  requiredJoints: FULL_BODY,
  tips: ["Keep your whole body in frame.", "Good, even lighting."],
};

export function getCameraSetup(poseKey?: string | null): CameraSetup {
  if (poseKey && SETUPS[poseKey]) return SETUPS[poseKey];
  return DEFAULT;
}

export const VIEW_LABEL: Record<CameraView, string> = {
  side: "Side view",
  front: "Front view",
  "45": "Side / 45° view",
};
