import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sessionSchema } from "@/lib/validators";

const XP_PER_REP = 2;
const XP_PER_SET = 15;

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}
function isYesterday(prev: Date, now: Date) {
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  return prev.toDateString() === y.toDateString();
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = sessionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid session" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const exercise = await prisma.exercise.findUnique({
    where: { id: d.exerciseId },
    select: { id: true },
  });
  if (!exercise) {
    return NextResponse.json({ error: "Unknown exercise" }, { status: 400 });
  }

  // Overall score out of 10: weighted blend of the component scores.
  const overall =
    (d.formScore * 0.35 +
      d.romScore * 0.3 +
      d.tempoScore * 0.15 +
      d.completionPct * 0.2) /
    10;

  const feedback = buildFeedback(d);

  const created = await prisma.workoutSession.create({
    data: {
      userId: session.sub,
      exerciseId: d.exerciseId,
      targetSets: d.targetSets,
      targetReps: d.targetReps,
      endedAt: new Date(),
      durationSec: d.durationSec,
      totalReps: d.totalReps,
      caloriesBurned: d.caloriesBurned,
      overallScore: Math.round(overall * 10) / 10,
      formScore: Math.round(d.formScore),
      romScore: Math.round(d.romScore),
      tempoScore: Math.round(d.tempoScore),
      completionPct: Math.round(d.completionPct),
      feedback,
      sets: {
        create: d.sets.map((s) => ({
          setNumber: s.setNumber,
          reps: s.reps,
          weightKg: s.weightKg,
          formScore: s.formScore,
          romScore: s.romScore,
        })),
      },
    },
  });

  // --- Gamification: XP, level, streak ---
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { xp: true, streak: true, longestStreak: true, lastActiveDate: true },
  });

  const xpGain = d.totalReps * XP_PER_REP + d.sets.length * XP_PER_SET;
  const now = new Date();
  let streak = user?.streak ?? 0;
  const last = user?.lastActiveDate;
  if (!last) streak = 1;
  else if (isSameDay(last, now)) {
    /* already counted today */
  } else if (isYesterday(last, now)) streak += 1;
  else streak = 1;

  const newXp = (user?.xp ?? 0) + xpGain;
  const newLevel = Math.floor(newXp / 500) + 1;
  const longest = Math.max(user?.longestStreak ?? 0, streak);

  await prisma.user.update({
    where: { id: session.sub },
    data: {
      xp: newXp,
      level: newLevel,
      streak,
      longestStreak: longest,
      lastActiveDate: now,
    },
  });

  return NextResponse.json({
    ok: true,
    id: created.id,
    overallScore: Math.round(overall * 10) / 10,
    xpGain,
    feedback,
  });
}

function buildFeedback(d: {
  formScore: number;
  romScore: number;
  tempoScore: number;
  completionPct: number;
}): string[] {
  const out: string[] = [];
  if (d.romScore < 75)
    out.push(`Your range of motion was ${Math.round(d.romScore)}%. Aim for full depth on every rep.`);
  if (d.formScore < 75)
    out.push(`Form score ${Math.round(d.formScore)}% — focus on posture and control.`);
  if (d.tempoScore < 70)
    out.push("Slow your tempo — controlled reps build more strength and reduce injury risk.");
  if (d.completionPct < 100)
    out.push(`You completed ${Math.round(d.completionPct)}% of your target. Push for the full count next time.`);
  if (out.length === 0)
    out.push("Excellent session — strong form, full range, and great consistency. Keep it up!");
  return out;
}
