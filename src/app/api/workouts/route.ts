import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { workoutSchema } from "@/lib/validators";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workouts = await prisma.customWorkout.findMany({
    where: { userId: session.sub },
    orderBy: [{ isFavorite: "desc" }, { createdAt: "desc" }],
    include: { exercises: { include: { exercise: true } } },
  });
  return NextResponse.json({ workouts });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = workoutSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid workout" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Guard against bogus exercise ids.
  const ids = [...new Set(data.exercises.map((e) => e.exerciseId))];
  const found = await prisma.exercise.count({ where: { id: { in: ids } } });
  if (found !== ids.length) {
    return NextResponse.json(
      { error: "One or more exercises are invalid" },
      { status: 400 }
    );
  }

  const workout = await prisma.customWorkout.create({
    data: {
      userId: session.sub,
      name: data.name,
      description: data.description,
      programType: data.programType,
      exercises: {
        create: data.exercises.map((e, i) => ({
          exerciseId: e.exerciseId,
          order: i,
          sets: e.sets,
          reps: e.reps,
          restSec: e.restSec,
        })),
      },
    },
  });

  return NextResponse.json({ ok: true, id: workout.id });
}
