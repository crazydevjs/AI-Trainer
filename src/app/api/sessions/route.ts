import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sessionSchema } from "@/lib/validators";
import { runSessionPerformanceEngine } from "@/lib/performance";
import type {
  SessionFormSummary,
  SessionMovementSummary,
  SessionRiskSummary,
} from "@/lib/performance";
import { runPersonalizationEngine } from "@/lib/personalization";
import { rateLimit } from "@/lib/platform/rate-limiter";
import { telemetry } from "@/lib/platform/telemetry";
import { metrics } from "@/lib/platform/metrics";
import { eventBus } from "@/lib/platform/events";
import { recordUsage } from "@/lib/platform/usage";
import { startTrace, addPresenceSpan, timeSpan, endTrace } from "@/lib/observability/trace";

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

  const rl = rateLimit("session", session.sub);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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

  const requestStartedAt = Date.now();
  const trace = startTrace({ userId: session.sub });

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

  // Presence spans — these four engines run entirely client-side per
  // frame; their timing is never transmitted here, only their final
  // output (already true since Phase 7). See ALGORITHM.md "Distributed
  // Tracing" for why these carry no duration.
  addPresenceSpan(trace.id, "repEngine", "client rep data received");
  if (d.formAnalysis) addPresenceSpan(trace.id, "formEngine", "client form analysis received");
  if (d.movementAnalysis) addPresenceSpan(trace.id, "movementEngine", "client movement analysis received");
  if (d.injuryRiskAnalysis) addPresenceSpan(trace.id, "riskEngine", "client risk analysis received");

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

  // --- Phase 7: Performance Intelligence & Persistence Layer ---
  // Runs after the core session write already succeeded; a failure here
  // must never fail the request that already saved the user's workout.
  let performance = null;
  try {
    const weightKg = d.sets.reduce(
      (max: number | null, s) => (s.weightKg != null && (max == null || s.weightKg > max) ? s.weightKg : max),
      null as number | null
    );
    performance = await timeSpan(trace.id, "performanceEngine", "runSessionPerformanceEngine", () =>
      runSessionPerformanceEngine({
        userId: session.sub,
        workoutSessionId: created.id,
        workoutLogId: null,
        exerciseId: d.exerciseId,
        weightKg,
        durationSec: d.durationSec,
        totalReps: d.totalReps,
        targetReps: d.targetSets * d.targetReps,
        caloriesBurned: d.caloriesBurned,
        restSecondsBeforeSet: null,
        formAnalysis: (d.formAnalysis as SessionFormSummary | undefined) ?? null,
        movementAnalysis: (d.movementAnalysis as SessionMovementSummary | undefined) ?? null,
        riskAnalysis: (d.injuryRiskAnalysis as SessionRiskSummary | undefined) ?? null,
      }),
    );
  } catch (err) {
    console.error("Performance engine failed (session already saved):", err);
  }

  // --- Phase 8: Personalized Learning Engine ---
  // Independent failure isolation from the Performance Engine above — a
  // bug here must never break workout saving or performance tracking.
  let personalization = null;
  try {
    personalization = await timeSpan(trace.id, "personalizationEngine", "runPersonalizationEngine", () =>
      runPersonalizationEngine({ userId: session.sub, exerciseId: d.exerciseId }),
    );
  } catch (err) {
    console.error("Personalization engine failed (session already saved):", err);
  }

  telemetry.track("workout.completed", { userId: session.sub, exerciseId: d.exerciseId, durationSec: d.durationSec });
  metrics.increment("workout.completed");
  recordUsage(session.sub, "workoutSessions");
  eventBus.publish("workout.completed", {
    userId: session.sub,
    exerciseId: d.exerciseId,
    durationMs: d.durationSec * 1000,
  });

  telemetry.recordTiming("api.sessions.post", Date.now() - requestStartedAt);
  trace.sessionId = created.id;
  await endTrace(trace.id);

  return NextResponse.json({
    ok: true,
    id: created.id,
    overallScore: Math.round(overall * 10) / 10,
    xpGain,
    feedback,
    performance,
    personalization,
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
