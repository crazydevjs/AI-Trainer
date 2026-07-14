// Exercise Intelligence — shared type definitions.
//
// This module is pure metadata: no landmark analysis, no DB access, no
// per-frame computation. Everything here describes an exercise, not a rep.

/** Canonical exercise identifiers. Adding a new exercise means adding one
 *  value here plus one entry in exercise-catalog.ts — nothing else changes. */
export type ExerciseId =
  | "squat"
  | "bench-press"
  | "deadlift"
  | "overhead-press"
  | "barbell-row"
  | "pull-up"
  | "lat-pulldown"
  | "seated-row"
  | "leg-press"
  | "leg-extension"
  | "leg-curl"
  | "romanian-deadlift"
  | "hip-thrust"
  | "lunge"
  | "split-squat"
  | "push-up"
  | "dumbbell-curl"
  | "hammer-curl"
  | "lateral-raise"
  | "face-pull"
  | "triceps-pushdown";

export type ExerciseCategory =
  | "lower-body-compound"
  | "upper-body-push"
  | "upper-body-pull"
  | "isolation";

export type MovementPattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "horizontal-push"
  | "horizontal-pull"
  | "vertical-push"
  | "vertical-pull"
  | "elbow-flexion"
  | "elbow-extension"
  | "shoulder-abduction"
  | "shoulder-external-rotation"
  | "knee-extension"
  | "knee-flexion"
  | "hip-extension";

export type MuscleGroup =
  | "chest"
  | "back"
  | "lats"
  | "traps"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export type PlaneOfMotion = "sagittal" | "frontal" | "transverse" | "multi-planar";

export type Laterality = "bilateral" | "unilateral" | "bilateral-alternating";

export type Mechanics = "compound" | "isolation";

export type ForceType = "push" | "pull";

export type BodyRegion = "upper" | "lower" | "full-body";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type QualitativeLevel = "low" | "moderate" | "high";

export type FatiguePattern =
  /** Bar speed/power degrades first, ROM and form hold up longest. */
  | "power-first"
  /** Form breaks down (compensation, alignment) before ROM or speed does. */
  | "form-first"
  /** Range of motion shortens first (partial reps) while speed looks fine. */
  | "rom-first"
  /** Balance/control degrades first — most relevant to unilateral/high-stability lifts. */
  | "stability-first";

export interface ROMProfile {
  /** The joint whose angle excursion best describes this exercise's ROM. */
  primaryJoint: string;
  /** Expected full-range angle excursion, in degrees, at the primary joint. */
  fullRangeDeg: [number, number];
  /** Human-readable description of what "full depth/range" means for coaching copy. */
  depthCriteria: string;
  notes?: string;
}

export interface TempoProfile {
  eccentricSec: [number, number];
  concentricSec: [number, number];
  pauseSec?: [number, number];
  totalRepSec: [number, number];
  controlRequirement: QualitativeLevel;
}

export interface JointInvolvement {
  joint: string;
  role: "primary" | "secondary" | "stabilizer";
}

export interface JointProfile {
  joints: JointInvolvement[];
}

export interface SymmetryProfile {
  expectedSymmetry: QualitativeLevel | "not-applicable";
  isUnilateralCapable: boolean;
  notes?: string;
}

export type RiskCategory =
  | "lumbar-spine"
  | "knee-valgus"
  | "shoulder-impingement"
  | "wrist"
  | "elbow"
  | "hip"
  | "ankle"
  | "neck"
  | "sacroiliac";

export interface RiskSensitivity {
  category: RiskCategory;
  sensitivity: QualitativeLevel;
  notes?: string;
}

export interface RiskProfile {
  sensitivities: RiskSensitivity[];
  overallRiskSensitivity: QualitativeLevel;
}

export interface CommonMistake {
  id: string;
  label: string;
  description: string;
  severity: "minor" | "moderate" | "major";
}

/** Full exercise-specific biomechanical profile. Read-only metadata consumed
 *  by downstream engines via exercise-capabilities.ts — never mutated at runtime. */
export interface ExerciseProfile {
  id: ExerciseId;
  displayName: string;
  /** Alternate identifiers this exercise is known by elsewhere in the app —
   *  Prisma `Exercise.slug` values and pose-layer `poseKey` values — used by
   *  the classifier to resolve a lookup key to this profile. */
  aliases: string[];

  category: ExerciseCategory;
  movementPattern: MovementPattern;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  planeOfMotion: PlaneOfMotion;
  laterality: Laterality;
  mechanics: Mechanics;
  forceType: ForceType;
  bodyRegion: BodyRegion;

  rom: ROMProfile;
  tempo: TempoProfile;
  joints: JointProfile;
  symmetry: SymmetryProfile;
  risk: RiskProfile;
  commonMistakes: CommonMistake[];

  /** Whether a rep is expected to reach a locked-out top/end position. */
  requiresLockout: boolean;
  /** Whether the bottom/stretched position calls out for deliberate control
   *  (vs. a fast stretch-reflex bounce) — e.g. squat/bench vs. leg extension. */
  bottomPositionControlled: boolean;

  commonWeakPoints: string[];
  compensationPatterns: string[];
  coachingPriorities: string[];
  expectedStability: QualitativeLevel;
  typicalFatiguePattern: FatiguePattern;
  difficulty: Difficulty;
}

/** Aggregate view over movement-relevant fields of an ExerciseProfile —
 *  what the "Movement Profiles" section of Phase 10 asks each exercise to
 *  expose (ROM, tempo/velocity envelope, lockout, bottom-position control). */
export interface MovementProfile {
  movementPattern: MovementPattern;
  rom: ROMProfile;
  tempo: TempoProfile;
  requiresLockout: boolean;
  bottomPositionControlled: boolean;
  controlRequirement: QualitativeLevel;
}
