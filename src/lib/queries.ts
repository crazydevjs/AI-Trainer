import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Exercise library rarely changes, so cache it across requests/users.
 * Avoids a Neon round-trip (and its cold-start) on every navigation.
 * Invalidate with revalidateTag("exercises") after seeding/edits.
 */
export const getLibraryExercises = unstable_cache(
  async () =>
    prisma.exercise.findMany({
      orderBy: { name: "asc" },
      select: {
        slug: true,
        name: true,
        category: true,
        difficulty: true,
        disciplines: true,
        muscles: true,
        equipment: true,
        metValue: true,
        aiRepCount: true,
        aiPosture: true,
      },
    }),
  ["library-exercises"],
  { revalidate: 3600, tags: ["exercises"] }
);

export const getPickerExercises = unstable_cache(
  async () =>
    prisma.exercise.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        muscles: true,
        aiRepCount: true,
      },
    }),
  ["picker-exercises"],
  { revalidate: 3600, tags: ["exercises"] }
);
