import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createSession } from "@/lib/auth";
import { onboardingSchema } from "@/lib/validators";
import { computeMetrics, generatePlan } from "@/lib/fitness";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = onboardingSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const metrics = computeMetrics(data);

  try {
    // Persist profile (idempotent).
    await prisma.profile.upsert({
      where: { userId: session.sub },
      create: {
        userId: session.sub,
        age: data.age,
        gender: data.gender,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        targetWeightKg: data.targetWeightKg,
        goal: data.goal,
        experience: data.experience,
        activityLevel: data.activityLevel,
        location: data.location,
        injuries: data.injuries,
        equipment: data.equipment,
        dailyMinutes: data.dailyMinutes,
        workoutDays: data.workoutDays,
        bmi: metrics.bmi,
        bmr: metrics.bmr,
        dailyCalories: metrics.dailyCalories,
        fitnessScore: metrics.fitnessScore,
      },
      update: {
        age: data.age,
        gender: data.gender,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        targetWeightKg: data.targetWeightKg,
        goal: data.goal,
        experience: data.experience,
        activityLevel: data.activityLevel,
        location: data.location,
        injuries: data.injuries,
        equipment: data.equipment,
        dailyMinutes: data.dailyMinutes,
        workoutDays: data.workoutDays,
        bmi: metrics.bmi,
        bmr: metrics.bmr,
        dailyCalories: metrics.dailyCalories,
        fitnessScore: metrics.fitnessScore,
      },
    });

    // Record initial weight as the first progress point.
    await prisma.progressEntry.create({
      data: { userId: session.sub, weightKg: data.weightKg },
    });

    // Build a personalized plan, linking only exercises that exist.
    await generateAndSavePlan(session.sub, data);

    await prisma.user.update({
      where: { id: session.sub },
      data: { onboarded: true },
    });

    // Refresh session so middleware lets them into the app.
    await createSession({ ...session, onboarded: true });

    return NextResponse.json({ ok: true, metrics });
  } catch (e) {
    console.error("onboarding error", e);
    return NextResponse.json(
      { error: "Could not save your profile" },
      { status: 500 }
    );
  }
}

async function generateAndSavePlan(
  userId: string,
  data: Parameters<typeof generatePlan>[0]
) {
  const plan = generatePlan(data);
  const allSlugs = [...new Set(plan.days.flatMap((d) => d.exerciseSlugs))];
  const existing = await prisma.exercise.findMany({
    where: { slug: { in: allSlugs } },
    select: { id: true, slug: true },
  });
  const idBySlug = new Map(existing.map((e) => [e.slug, e.id]));

  await prisma.workoutPlan.deleteMany({ where: { userId } });

  const repsForGoal =
    data.goal === "GAIN_STRENGTH" ? 5 : data.goal === "BUILD_MUSCLE" ? 10 : 12;

  await prisma.workoutPlan.create({
    data: {
      userId,
      title: plan.title,
      summary: plan.summary,
      days: {
        create: plan.days.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          focus: d.focus,
          exercises: {
            create: d.exerciseSlugs
              .filter((s) => idBySlug.has(s))
              .map((s, i) => ({
                exerciseId: idBySlug.get(s)!,
                order: i,
                sets: 3,
                reps: repsForGoal,
                restSec: 60,
              })),
          },
        })),
      },
    },
  });
}
