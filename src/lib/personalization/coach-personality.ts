// Coaching-style preference storage only. Per spec: "Do not implement UI
// yet" — and, per the architecture rule that this engine never modifies
// existing engine outputs, no Form/Movement/Injury-Risk coaching-text
// logic is read or altered here. This is purely a stored preference for a
// future consumer to read.

import type { CoachingStyle } from "@prisma/client";
import { getOrCreateLearningProfile, updateLearningProfile } from "./personalization-store";

export async function getCoachingPreference(userId: string): Promise<CoachingStyle> {
  const profile = await getOrCreateLearningProfile(userId);
  return profile.coachingPreference;
}

export async function setCoachingPreference(userId: string, style: CoachingStyle): Promise<CoachingStyle> {
  const updated = await updateLearningProfile(userId, { coachingPreference: style });
  return updated.coachingPreference;
}
