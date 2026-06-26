import { PrismaClient } from "@prisma/client";
import { exercises } from "./data/exercises";
import { equipment } from "./data/equipment";

const prisma = new PrismaClient();

const achievements = [
  { slug: "first-workout", title: "First Forge", description: "Complete your first workout", icon: "Flame", xpReward: 100 },
  { slug: "streak-7", title: "Week Warrior", description: "Maintain a 7-day streak", icon: "CalendarCheck", xpReward: 200 },
  { slug: "streak-30", title: "Iron Habit", description: "Maintain a 30-day streak", icon: "Trophy", xpReward: 500 },
  { slug: "perfect-form", title: "Flawless", description: "Score 10/10 on form", icon: "Star", xpReward: 250 },
  { slug: "ten-sessions", title: "Committed", description: "Complete 10 sessions", icon: "Dumbbell", xpReward: 300 },
  { slug: "century", title: "Century Club", description: "Complete 100 total sets", icon: "Award", xpReward: 400 },
];

async function main() {
  // Equipment catalog
  for (const e of equipment) {
    await prisma.equipment.upsert({
      where: { slug: e.slug },
      create: e,
      update: e,
    });
  }

  // Exercise library
  for (const e of exercises) {
    await prisma.exercise.upsert({
      where: { slug: e.slug },
      // `e` matches the Exercise create/update shape (enums passed as strings).
      create: e as never,
      update: e as never,
    });
  }

  // Achievements
  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { slug: a.slug },
      create: a,
      update: a,
    });
  }

  const aiCount = exercises.filter((e) => e.aiRepCount || e.aiPosture).length;
  console.log(
    `Seeded ${equipment.length} equipment, ${exercises.length} exercises ` +
      `(${aiCount} AI-supported), ${achievements.length} achievements.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
