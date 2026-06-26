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
    },
  });
  if (!exercise) notFound();

  return (
    <TrainerExperience
      exercise={exercise}
      bodyWeightKg={user.profile?.weightKg ?? 75}
    />
  );
}
