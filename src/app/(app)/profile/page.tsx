import { getCurrentUser } from "@/lib/auth";
import { ProgressRing } from "@/components/ui/progress-ring";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  LOSE_WEIGHT: "Lose Weight",
  BUILD_MUSCLE: "Build Muscle",
  GAIN_STRENGTH: "Gain Strength",
  IMPROVE_ENDURANCE: "Improve Endurance",
  STAY_FIT: "Stay Fit",
  RECOMP: "Body Recomposition",
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  SEDENTARY: "Sedentary",
  LIGHT: "Light",
  MODERATE: "Moderate",
  ACTIVE: "Active",
  VERY_ACTIVE: "Very Active",
  HOME: "Home",
  GYM: "Gym",
  OUTDOOR: "Outdoor",
  HYBRID: "Hybrid",
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const p = user.profile;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
        Profile
      </h1>

      {/* Identity */}
      <div className="glass-strong flex flex-col items-center gap-4 rounded-3xl p-8 sm:flex-row sm:items-center">
        <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-ember to-flame text-2xl font-bold text-white">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="h-full w-full object-cover" />
          ) : (
            (user.name?.[0] ?? user.email[0]).toUpperCase()
          )}
        </div>
        <div className="text-center sm:text-left">
          <h2 className="font-display text-2xl font-bold">{user.name ?? "Athlete"}</h2>
          <p className="text-sm text-fog">{user.email}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Badge>Level {user.level}</Badge>
            <Badge>{user.xp} XP</Badge>
            <Badge>{user.streak}-day streak</Badge>
            {user.emailVerified ? (
              <Badge tone="neon">Verified</Badge>
            ) : (
              <Badge tone="amber">Unverified</Badge>
            )}
          </div>
        </div>
      </div>

      {p ? (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <RingCard value={p.fitnessScore ?? 0} label={`${p.fitnessScore ?? 0}`} sub="Fitness" gradient={["#ff3b30", "#ff7a18"]} />
            <RingCard value={p.bmi ? Math.min(100, (p.bmi / 40) * 100) : 0} label={`${p.bmi ?? "—"}`} sub="BMI" gradient={["#2bd4ff", "#2bff88"]} />
            <RingCard value={p.dailyCalories ? Math.min(100, (p.dailyCalories / 4000) * 100) : 0} label={`${p.dailyCalories ?? "—"}`} sub="kcal/day" gradient={["#ff7a18", "#ffc24b"]} />
          </div>

          {/* Details */}
          <div className="glass rounded-3xl p-6">
            <h3 className="font-display mb-4 text-lg font-semibold uppercase tracking-wide">
              Your details
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Detail label="Age" value={`${p.age}`} />
              <Detail label="Gender" value={LABELS[p.gender]} />
              <Detail label="Height" value={`${p.heightCm} cm`} />
              <Detail label="Weight" value={`${p.weightKg} kg`} />
              <Detail label="Target" value={p.targetWeightKg ? `${p.targetWeightKg} kg` : "—"} />
              <Detail label="Goal" value={LABELS[p.goal]} />
              <Detail label="Experience" value={LABELS[p.experience]} />
              <Detail label="Activity" value={LABELS[p.activityLevel]} />
              <Detail label="Location" value={LABELS[p.location]} />
              <Detail label="Days/week" value={`${p.workoutDays}`} />
              <Detail label="Minutes/day" value={`${p.dailyMinutes}`} />
              <Detail label="BMR" value={p.bmr ? `${p.bmr} kcal` : "—"} />
            </div>

            {(p.equipment.length > 0 || p.injuries.length > 0) && (
              <div className="mt-6 space-y-3 border-t border-white/5 pt-6">
                {p.equipment.length > 0 && (
                  <TagRow label="Equipment" tags={p.equipment} />
                )}
                {p.injuries.length > 0 && (
                  <TagRow label="Injuries" tags={p.injuries} />
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-fog">No profile data yet.</p>
      )}
    </div>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "neon" | "amber";
}) {
  const tones = {
    default: "border-white/10 bg-white/[0.04] text-fog",
    neon: "border-neon/30 bg-neon/10 text-neon",
    amber: "border-amber/30 bg-amber/10 text-amber",
  };
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function RingCard({
  value,
  label,
  sub,
  gradient,
}: {
  value: number;
  label: string;
  sub: string;
  gradient: [string, string];
}) {
  return (
    <div className="glass flex items-center justify-center rounded-3xl p-6">
      <ProgressRing value={value} label={label} sub={sub} gradient={gradient} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-smoke">{label}</p>
      <p className="mt-0.5 font-semibold text-chalk">{value}</p>
    </div>
  );
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-smoke">{label}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-chalk"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
