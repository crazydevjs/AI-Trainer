import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { workoutLogSchema } from "@/lib/validators";
import { buildCoachSummary, type WorkoutStats } from "@/lib/workout-session";

const XP_PER_REP = 2;
const XP_PER_SET = 15;
const XP_PER_PR = 100;

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}
function isYesterday(prev: Date, now: Date) {
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  return prev.toDateString() === y.toDateString();
}

export interface PrResult {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = workoutLogSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid workout" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const userId = session.sub;

  // Validate all referenced exercises in one query.
  const ids = [...new Set(d.exercises.map((e) => e.exerciseId))];
  const known = await prisma.exercise.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const nameById = new Map(known.map((e) => [e.id, e.name]));
  if (known.length !== ids.length) {
    return NextResponse.json({ error: "Unknown exercise in workout" }, { status: 400 });
  }

  // ---- Totals (only sets with reps > 0 count as performed) ----
  let totalSets = 0;
  let totalReps = 0;
  let totalVolumeKg = 0;
  let plannedSets = 0;
  let aiTrackedSets = 0;
  let failureSets = 0;
  let exercisesTouched = 0;
  let heaviest: WorkoutStats["heaviest"] = null;
  for (const ex of d.exercises) {
    plannedSets += ex.sets.length;
    let touched = false;
    for (const s of ex.sets) {
      if (s.reps <= 0) continue;
      touched = true;
      totalSets += 1;
      totalReps += s.reps;
      totalVolumeKg += (s.weightKg ?? 0) * s.reps;
      if (s.aiTracked) aiTrackedSets += 1;
      if (s.failed) failureSets += 1;
      if ((s.weightKg ?? 0) > 0 && (!heaviest || (s.weightKg ?? 0) > heaviest.weightKg)) {
        heaviest = {
          exerciseName: nameById.get(ex.exerciseId) ?? "Exercise",
          weightKg: s.weightKg ?? 0,
          reps: s.reps,
        };
      }
    }
    if (touched) exercisesTouched += 1;
  }
  if (totalSets === 0) {
    return NextResponse.json({ error: "No completed sets to save" }, { status: 400 });
  }

  // ---- PR detection: heaviest set per exercise vs stored PersonalRecord ----
  const existing = await prisma.personalRecord.findMany({
    where: { userId, exerciseId: { in: ids } },
    select: { exerciseId: true, weightKg: true },
  });
  const prByExercise = new Map(existing.map((r) => [r.exerciseId, r.weightKg]));
  const prs: PrResult[] = [];
  for (const ex of d.exercises) {
    let best: { weightKg: number; reps: number } | null = null;
    for (const s of ex.sets) {
      if (s.reps <= 0 || !s.weightKg) continue;
      if (!best || s.weightKg > best.weightKg) best = { weightKg: s.weightKg, reps: s.reps };
    }
    if (!best) continue;
    const prev = prByExercise.get(ex.exerciseId) ?? 0;
    if (best.weightKg > prev) {
      // dedupe: keep the heaviest per exercise if it appears twice in the plan
      const already = prs.find((p) => p.exerciseId === ex.exerciseId);
      if (already) {
        if (best.weightKg > already.weightKg) Object.assign(already, best);
      } else {
        prs.push({
          exerciseId: ex.exerciseId,
          exerciseName: nameById.get(ex.exerciseId) ?? "Exercise",
          ...best,
        });
      }
    }
  }

  const startedAt = new Date(d.startedAt);
  const endedAt = new Date();

  // AI coach observation — generated here where PR results are known.
  const summary =
    d.summary ??
    buildCoachSummary({
      stats: {
        completedSets: totalSets,
        plannedSets,
        totalReps,
        volumeKg: totalVolumeKg,
        exercisesTouched,
        failureSets,
        heaviest,
      },
      durationSec: d.durationSec,
      prCount: prs.length,
      aiTrackedSets,
      failureSets,
      completionPct: plannedSets ? Math.round((totalSets / plannedSets) * 100) : 100,
    });

  // ---- Persist: WorkoutLog + per-exercise WorkoutSession + SessionSets ----
  const log = await prisma.workoutLog.create({
    data: {
      userId,
      title: d.title,
      description: d.description,
      summary,
      startedAt,
      endedAt,
      durationSec: d.durationSec,
      totalExercises: d.exercises.length,
      totalSets,
      totalReps,
      totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
      prCount: prs.length,
      exercises: {
        create: d.exercises.map((ex, i) => {
          const done = ex.sets.filter((s) => s.reps > 0);
          const scored = done.filter((s) => s.formScore != null);
          const avg = (k: "formScore" | "romScore") =>
            scored.length
              ? Math.round(scored.reduce((sum, s) => sum + (s[k] ?? 0), 0) / scored.length)
              : null;
          return {
            userId,
            exerciseId: ex.exerciseId,
            targetSets: ex.sets.length,
            targetReps: Math.max(1, ...ex.sets.map((s) => s.targetReps ?? s.reps)),
            startedAt,
            endedAt,
            durationSec: Math.round(d.durationSec / d.exercises.length),
            totalReps: done.reduce((sum, s) => sum + s.reps, 0),
            formScore: avg("formScore"),
            romScore: avg("romScore"),
            completionPct: Math.round((done.length / ex.sets.length) * 100),
            // keep exercise order stable for history rendering
            feedback: [`order:${ex.order ?? i}`],
            sets: {
              create: done.map((s) => ({
                setNumber: s.setNumber,
                reps: s.reps,
                targetReps: s.targetReps,
                failed: s.failed ?? false,
                weightKg: s.weightKg,
                formScore: s.formScore,
                romScore: s.romScore,
              })),
            },
          };
        }),
      },
    },
    select: { id: true },
  });

  // ---- Upsert PRs ----
  for (const pr of prs) {
    await prisma.personalRecord.upsert({
      where: { userId_exerciseId: { userId, exerciseId: pr.exerciseId } },
      create: { userId, exerciseId: pr.exerciseId, weightKg: pr.weightKg, reps: pr.reps },
      update: { weightKg: pr.weightKg, reps: pr.reps, achievedAt: endedAt },
    });
  }

  // ---- Gamification: XP, level, streak ----
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, streak: true, longestStreak: true, lastActiveDate: true },
  });
  const xpGain = totalReps * XP_PER_REP + totalSets * XP_PER_SET + prs.length * XP_PER_PR;
  const now = new Date();
  let streak = user?.streak ?? 0;
  const last = user?.lastActiveDate;
  if (!last) streak = 1;
  else if (isSameDay(last, now)) {
    /* already counted today */
  } else if (isYesterday(last, now)) streak += 1;
  else streak = 1;
  const newXp = (user?.xp ?? 0) + xpGain;
  await prisma.user.update({
    where: { id: userId },
    data: {
      xp: newXp,
      level: Math.floor(newXp / 500) + 1,
      streak,
      longestStreak: Math.max(user?.longestStreak ?? 0, streak),
      lastActiveDate: now,
    },
  });

  return NextResponse.json({
    ok: true,
    id: log.id,
    xpGain,
    prs,
    summary,
    totals: { totalSets, totalReps, totalVolumeKg: Math.round(totalVolumeKg * 10) / 10 },
  });
}
