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
});

export type SessionInput = z.infer<typeof sessionSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type WorkoutInput = z.infer<typeof workoutSchema>;
