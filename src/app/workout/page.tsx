import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSessionExercises } from "@/lib/queries";
import { WorkoutSessionExperience } from "@/components/workout-session/experience";

export const dynamic = "force-dynamic";

export default async function WorkoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.onboarded) redirect("/onboarding");

  const library = await getSessionExercises();

  return <WorkoutSessionExperience library={library} />;
}
