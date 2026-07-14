import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Name is too short").max(60),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Include at least one number"),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const forgotSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export const resetSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Include at least one number"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").optional(),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Include at least one number"),
});

export const deleteAccountSchema = z.object({
  password: z.string().optional(),
  confirmEmail: z.string().optional(),
});

export const onboardingSchema = z.object({
  age: z.coerce.number().int().min(13).max(100),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  heightCm: z.coerce.number().min(100).max(250),
  weightKg: z.coerce.number().min(30).max(300),
  targetWeightKg: z.coerce.number().min(30).max(300).optional(),
  goal: z.enum([
    "LOSE_WEIGHT",
    "BUILD_MUSCLE",
    "GAIN_STRENGTH",
    "IMPROVE_ENDURANCE",
    "STAY_FIT",
    "RECOMP",
  ]),
  experience: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  activityLevel: z.enum([
    "SEDENTARY",
    "LIGHT",
    "MODERATE",
    "ACTIVE",
    "VERY_ACTIVE",
  ]),
  location: z.enum(["HOME", "GYM", "OUTDOOR", "HYBRID"]),
  injuries: z.array(z.string()).default([]),
  equipment: z.array(z.string()).default([]),
  dailyMinutes: z.coerce.number().int().min(10).max(240).default(45),
  workoutDays: z.coerce.number().int().min(1).max(7).default(4),
});

export const workoutSchema = z.object({
  name: z.string().min(2, "Name your workout").max(80),
  description: z.string().max(280).optional(),
  programType: z
    .enum([
      "CUSTOM",
      "PUSH_PULL_LEGS",
      "UPPER_LOWER",
      "FULL_BODY",
      "POWERLIFTING",
      "BRO_SPLIT",
    ])
    .default("CUSTOM"),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().min(1),
        sets: z.coerce.number().int().min(1).max(20).default(3),
        reps: z.coerce.number().int().min(1).max(100).default(10),
        restSec: z.coerce.number().int().min(0).max(600).default(60),
      })
    )
    .min(1, "Add at least one exercise"),
});

export const sessionSchema = z.object({
  exerciseId: z.string().min(1),
  targetSets: z.coerce.number().int().min(1).max(20),
  targetReps: z.coerce.number().int().min(1).max(1000),
  durationSec: z.coerce.number().int().min(0).max(36000),
  totalReps: z.coerce.number().int().min(0).max(10000),
  formScore: z.coerce.number().min(0).max(100),
  romScore: z.coerce.number().min(0).max(100),
  tempoScore: z.coerce.number().min(0).max(100),
  completionPct: z.coerce.number().min(0).max(100),
  caloriesBurned: z.coerce.number().min(0).max(5000),
  sets: z
    .array(
      z.object({
        setNumber: z.coerce.number().int().min(1),
        reps: z.coerce.number().int().min(0),
        weightKg: z.coerce.number().min(0).max(1000).optional(),
        formScore: z.coerce.number().min(0).max(100).optional(),
        romScore: z.coerce.number().min(0).max(100).optional(),
      })
    )
    .default([]),
  // Phase 7 — Performance Intelligence & Persistence Layer. These are the
  // Form/Movement/Injury-Risk Engines' full session rollups (see
  // src/lib/pose/{form,movement,injury-risk}-engine/types.ts) — large,
  // engine-owned nested shapes validated loosely at this boundary and
  // handed to the Performance Engine, which stores them as Json.
  formAnalysis: z.unknown().optional(),
  movementAnalysis: z.unknown().optional(),
  injuryRiskAnalysis: z.unknown().optional(),
});

// Full gym session (Workout Session System): title + many exercises, each with
// per-set weight × reps as actually performed. AI scores are optional — sets
// completed manually simply carry no scores.
export const workoutLogSchema = z.object({
  title: z.string().min(1, "Give your workout a title").max(80),
  description: z.string().max(500).optional(),
  summary: z.string().max(600).optional(), // AI coach observation
  startedAt: z.coerce.number().int().positive(), // epoch ms
  durationSec: z.coerce.number().int().min(0).max(86400),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().min(1),
        order: z.coerce.number().int().min(0).default(0),
        sets: z
          .array(
            z.object({
              setNumber: z.coerce.number().int().min(1),
              reps: z.coerce.number().int().min(0).max(500), // actual reps completed
              targetReps: z.coerce.number().int().min(0).max(500).optional(), // planned reps
              failed: z.boolean().optional(), // ended at failure, short of target
              weightKg: z.coerce.number().min(0).max(1000).optional(),
              aiTracked: z.boolean().optional(),
              formScore: z.coerce.number().min(0).max(100).optional(),
              romScore: z.coerce.number().min(0).max(100).optional(),
            })
          )
          .min(1),
        // Phase 7 — most-recent AI-tracker sub-session's engine rollups for
        // this exercise, when AI tracking was used. See sessionSchema above.
        formAnalysis: z.unknown().optional(),
        movementAnalysis: z.unknown().optional(),
        injuryRiskAnalysis: z.unknown().optional(),
      })
    )
    .min(1, "Log at least one exercise"),
});

export type WorkoutLogInput = z.infer<typeof workoutLogSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type WorkoutInput = z.infer<typeof workoutSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Phase 8 — Personalized Learning Engine. Writable, no-UI-yet preference
// endpoints (see ALGORITHM.md "Personalized Learning Engine").
export const goalProfileSchema = z.object({
  goal: z.enum(["STRENGTH", "HYPERTROPHY", "FAT_LOSS", "ENDURANCE", "GENERAL_FITNESS", "REHABILITATION"]),
  targetFrequency: z.coerce.number().int().min(1).max(14).optional(),
  notes: z.string().max(280).optional(),
});

export const coachStyleSchema = z.object({
  coachingPreference: z.enum(["STRICT", "ENCOURAGING", "TECHNICAL", "MINIMAL", "MOTIVATIONAL"]),
});

export type GoalProfileInput = z.infer<typeof goalProfileSchema>;
export type CoachStyleInput = z.infer<typeof coachStyleSchema>;
