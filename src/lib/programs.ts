// Prebuilt program templates for the Workout Creator.
// `exercises` reference exercise slugs (resolved to ids when prefilling).

export type ProgramType =
  | "CUSTOM"
  | "PUSH_PULL_LEGS"
  | "UPPER_LOWER"
  | "FULL_BODY"
  | "POWERLIFTING"
  | "BRO_SPLIT";

export interface ProgramTemplate {
  id: string;
  name: string;
  programType: ProgramType;
  description: string;
  exercises: { slug: string; sets: number; reps: number; restSec: number }[];
}

const s = (slug: string, sets = 3, reps = 10, restSec = 90) => ({
  slug,
  sets,
  reps,
  restSec,
});

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: "ppl-push",
    name: "PPL · Push Day",
    programType: "PUSH_PULL_LEGS",
    description: "Chest, shoulders, and triceps — the push half of a PPL split.",
    exercises: [
      s("bench-press", 4, 6, 120),
      s("shoulder-press", 3, 8),
      s("incline-dumbbell-press", 3, 10),
      s("lateral-raise", 3, 15, 60),
      s("tricep-pushdown", 3, 12, 60),
    ],
  },
  {
    id: "ppl-pull",
    name: "PPL · Pull Day",
    programType: "PUSH_PULL_LEGS",
    description: "Back and biceps — the pull half of a PPL split.",
    exercises: [
      s("deadlift", 3, 5, 150),
      s("pull-ups", 4, 8),
      s("barbell-row", 3, 8),
      s("seated-cable-row", 3, 12, 60),
      s("bicep-curl", 3, 12, 60),
    ],
  },
  {
    id: "ppl-legs",
    name: "PPL · Leg Day",
    programType: "PUSH_PULL_LEGS",
    description: "Quads, hamstrings, glutes, and calves.",
    exercises: [
      s("squat", 4, 6, 150),
      s("romanian-deadlift", 3, 10),
      s("leg-press", 3, 12),
      s("leg-curl", 3, 12, 60),
      s("standing-calf-raise", 4, 15, 45),
    ],
  },
  {
    id: "upper",
    name: "Upper Body",
    programType: "UPPER_LOWER",
    description: "A complete upper session for an Upper/Lower split.",
    exercises: [
      s("bench-press", 4, 6, 120),
      s("barbell-row", 4, 8),
      s("shoulder-press", 3, 8),
      s("lat-pulldown", 3, 10),
      s("bicep-curl", 3, 12, 60),
      s("tricep-pushdown", 3, 12, 60),
    ],
  },
  {
    id: "lower",
    name: "Lower Body",
    programType: "UPPER_LOWER",
    description: "A complete lower session for an Upper/Lower split.",
    exercises: [
      s("squat", 4, 6, 150),
      s("romanian-deadlift", 3, 10),
      s("bulgarian-split-squat", 3, 10),
      s("leg-curl", 3, 12, 60),
      s("standing-calf-raise", 4, 15, 45),
    ],
  },
  {
    id: "full-body",
    name: "Full Body",
    programType: "FULL_BODY",
    description: "Hit everything in one session — great 3x/week.",
    exercises: [
      s("squat", 3, 8, 120),
      s("bench-press", 3, 8, 120),
      s("barbell-row", 3, 8),
      s("shoulder-press", 3, 10),
      s("plank", 3, 45, 45),
    ],
  },
  {
    id: "powerlifting",
    name: "Powerlifting · Strength",
    programType: "POWERLIFTING",
    description: "The big three with heavy compounds and full rest.",
    exercises: [
      s("squat", 5, 5, 180),
      s("bench-press", 5, 5, 180),
      s("deadlift", 3, 5, 210),
      s("close-grip-bench-press", 3, 8, 120),
    ],
  },
];

export function getTemplate(id: string) {
  return PROGRAM_TEMPLATES.find((t) => t.id === id) ?? null;
}
