import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Dumbbell,
  Flame,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { WeeklyChart, type DayPoint } from "@/components/dashboard/weekly-chart";

export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const profile = user.profile;

  const today = new Date();
  const dow = today.getDay();

  const [plan, sessions, firstProgress, latestProgress] = await Promise.all([
    prisma.workoutPlan.findUnique({
      where: { userId: user.id },
      include: { days: { include: { exercises: { include: { exercise: true } } } } },
    }),
    prisma.workoutSession.findMany({
      where: {
        userId: user.id,
        startedAt: { gte: new Date(Date.now() - 7 * 864e5) },
      },
      select: { startedAt: true, caloriesBurned: true },
    }),
    prisma.progressEntry.findFirst({
      where: { userId: user.id, weightKg: { not: null } },
      orderBy: { date: "asc" },
    }),
    prisma.progressEntry.findFirst({
      where: { userId: user.id, weightKg: { not: null } },
      orderBy: { date: "desc" },
    }),
  ]);

  // Weekly calorie series (last 7 days).
  const series: DayPoint[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 864e5);
    const calories = sessions
      .filter((s) => s.startedAt.toDateString() === d.toDateString())
      .reduce((sum, s) => sum + s.caloriesBurned, 0);
    return { day: DAY_LABELS[d.getDay()], calories: Math.round(calories) };
  });
  const weekCalories = series.reduce((s, p) => s + p.calories, 0);

  const todayDay = plan?.days.find((d) => d.dayOfWeek === dow);
  const startWeight = firstProgress?.weightKg ?? profile?.weightKg ?? 0;
  const currentWeight = latestProgress?.weightKg ?? profile?.weightKg ?? 0;
  const weightDelta = currentWeight - startWeight;
  const goalWeight = profile?.targetWeightKg;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-smoke">
            {greeting()}
          </p>
          <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
            {user.name ?? "Athlete"}
          </h1>
        </div>
        <Button asChild size="lg">
          <Link href="/exercises">
            <Dumbbell className="h-5 w-5" />
            Start a workout
          </Link>
        </Button>
      </div>

      {/* Top stat strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Flame className="h-5 w-5 text-ember" />}
          label="Streak"
          value={`${user.streak}`}
          unit="days"
        />
        <StatCard
          icon={<Activity className="h-5 w-5 text-volt" />}
          label="This week"
          value={`${weekCalories}`}
          unit="kcal"
        />
        <StatCard
          icon={<Trophy className="h-5 w-5 text-amber" />}
          label="Level"
          value={`${user.level}`}
          unit={`${user.xp} XP`}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-neon" />}
          label="Weight"
          value={`${currentWeight}`}
          unit={`${weightDelta >= 0 ? "+" : ""}${weightDelta.toFixed(1)} kg`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's workout */}
        <div className="glass rounded-3xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold uppercase tracking-wide">
              Today&apos;s workout
            </h2>
            <span className="text-xs uppercase tracking-widest text-smoke">
              {DAY_LABELS[dow]} · {todayDay?.focus ?? "Rest"}
            </span>
          </div>

          {todayDay && todayDay.exercises.length > 0 ? (
            <div className="space-y-2">
              {todayDay.exercises.map((pe) => (
                <Link
                  key={pe.id}
                  href={`/exercises/${pe.exercise.slug}`}
                  className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-white/15 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] ring-1 ring-white/10">
                      <Dumbbell className="h-5 w-5 text-ember" />
                    </div>
                    <div>
                      <p className="font-semibold text-chalk">{pe.exercise.name}</p>
                      <p className="text-xs text-fog">
                        {pe.sets} sets × {pe.reps} reps
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-smoke transition-transform group-hover:translate-x-1 group-hover:text-chalk" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <p className="text-fog">
                {plan
                  ? "Rest day — recover and come back stronger."
                  : "No plan yet. Pick an exercise to start training."}
              </p>
              <Button asChild variant="outline">
                <Link href="/exercises">Browse exercises</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Fitness score ring */}
        <div className="glass flex flex-col items-center justify-center rounded-3xl p-6">
          <h2 className="font-display mb-4 text-xl font-semibold uppercase tracking-wide">
            Fitness score
          </h2>
          <ProgressRing
            value={profile?.fitnessScore ?? 0}
            label={`${profile?.fitnessScore ?? 0}`}
            sub="out of 100"
            size={160}
          />
          <p className="mt-4 text-center text-sm text-fog">
            {(profile?.fitnessScore ?? 0) >= 70
              ? "Elite readiness. Keep pushing."
              : "Train consistently to raise your score."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly chart */}
        <div className="glass rounded-3xl p-6 lg:col-span-2">
          <h2 className="font-display mb-4 text-xl font-semibold uppercase tracking-wide">
            Weekly activity
          </h2>
          <WeeklyChart data={series} />
        </div>

        {/* Body metrics */}
        <div className="space-y-4">
          <MiniMetric
            label="BMI"
            value={`${profile?.bmi ?? "—"}`}
            hint={bmiHint(profile?.bmi)}
            gradient={["#2bd4ff", "#2bff88"]}
            ratio={profile?.bmi ? Math.min(100, (profile.bmi / 40) * 100) : 0}
          />
          <MiniMetric
            label="Daily calories"
            value={`${profile?.dailyCalories ?? "—"}`}
            hint="target intake"
            gradient={["#ff7a18", "#ffc24b"]}
            ratio={
              profile?.dailyCalories
                ? Math.min(100, (profile.dailyCalories / 4000) * 100)
                : 0
            }
          />
          {goalWeight && (
            <MiniMetric
              label="Goal weight"
              value={`${goalWeight} kg`}
              hint={`${Math.abs(currentWeight - goalWeight).toFixed(1)} kg to go`}
              gradient={["#ff3b30", "#ff7a18"]}
              ratio={Math.min(100, (goalWeight / Math.max(currentWeight, 1)) * 100)}
            />
          )}
        </div>
      </div>

      {/* AI recommendation */}
      <div className="glass-strong rounded-3xl p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-ember to-flame">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold uppercase tracking-wide">
              AI Coach
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-fog">
              {aiRecommendation(profile?.goal, user.streak)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] ring-1 ring-white/10">
        {icon}
      </div>
      <p className="text-xs uppercase tracking-widest text-smoke">{label}</p>
      <p className="font-display mt-1 text-3xl font-bold leading-none text-chalk">
        {value}
      </p>
      <p className="mt-1 text-xs text-fog">{unit}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  hint,
  gradient,
  ratio,
}: {
  label: string;
  value: string;
  hint: string;
  gradient: [string, string];
  ratio: number;
}) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-widest text-smoke">{label}</p>
        <span className="text-xs text-fog">{hint}</span>
      </div>
      <p className="font-display mt-1 text-2xl font-bold text-chalk">{value}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{
            width: `${ratio}%`,
            background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})`,
          }}
        />
      </div>
    </div>
  );
}

function bmiHint(bmi?: number | null) {
  if (!bmi) return "—";
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "healthy";
  if (bmi < 30) return "overweight";
  return "obese";
}

function aiRecommendation(goal: string | undefined, streak: number) {
  if (streak === 0)
    return "Let's get moving today — your first session sets the tone. Pick a compound lift and focus on clean form. I'll watch your reps.";
  const byGoal: Record<string, string> = {
    LOSE_WEIGHT:
      "You're trending well. Add a 15-minute conditioning finisher today to push your calorie burn while keeping lifts crisp.",
    BUILD_MUSCLE:
      "Progressive overload is key — aim to add a rep or a small load to your main lift versus last session.",
    GAIN_STRENGTH:
      "Prioritize your top set today. Rest fully between sets and keep bar speed high on every rep.",
    IMPROVE_ENDURANCE:
      "Keep rest periods short today and maintain steady tempo. Your range of motion score matters more than speed.",
    STAY_FIT: "Consistency beats intensity. A solid full-body session today keeps your streak alive.",
    RECOMP:
      "Lift heavy, eat at maintenance, and let the AI track your form scores to ensure quality volume.",
  };
  return (
    (goal && byGoal[goal]) ??
    "Stay consistent and let the AI coach refine your form on every set."
  );
}
