import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { TrainerExperience } from "@/components/trainer/trainer-experience";

export const dynamic = "force-dynamic";

export default async function TrainPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.onboarded) redirect("/onboarding");

  const { slug } = await params;
  const exercise = await prisma.exercise.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      poseKey: true,
      metValue: true,
      aiRepCount: true,
      muscles: true,
      secondaryMuscles: true,
      formTips: true,
      equipment: true,
    },
  });
  if (!exercise) notFound();

  // Lifting history for progressive overload + PR detection.
  const sets = await prisma.sessionSet.findMany({
    where: {
      session: { userId: user.id, exerciseId: exercise.id },
      weightKg: { not: null },
    },
    select: { weightKg: true, reps: true, session: { select: { startedAt: true } } },
    orderBy: { session: { startedAt: "desc" } },
    take: 200,
  });

  let bestWeightKg = 0;
  let bestVolumeKg = 0;
  for (const s of sets) {
    const w = s.weightKg ?? 0;
    bestWeightKg = Math.max(bestWeightKg, w);
    bestVolumeKg = Math.max(bestVolumeKg, w * s.reps);
  }
  // most recent session's top set weight
  const lastDate = sets[0]?.session.startedAt?.toDateString();
  const lastWeightKg = lastDate
    ? Math.max(
        0,
        ...sets
          .filter((s) => s.session.startedAt?.toDateString() === lastDate)
          .map((s) => s.weightKg ?? 0)
      )
    : 0;

  return (
    <TrainerExperience
      exercise={exercise}
      bodyWeightKg={user.profile?.weightKg ?? 75}
      history={{ bestWeightKg, bestVolumeKg, lastWeightKg }}
    />
  );
}
