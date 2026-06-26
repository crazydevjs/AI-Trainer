"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressRing } from "@/components/ui/progress-ring";
import { OptionGrid, ChipGroup, type Option } from "@/components/onboarding/controls";
import { onboardingSchema, type OnboardingInput } from "@/lib/validators";
import type { FitnessMetrics } from "@/lib/fitness";

const EQUIPMENT = [
  "Dumbbells",
  "Barbell",
  "Kettlebell",
  "Resistance Bands",
  "Pull-up Bar",
  "Bench",
  "Squat Rack",
  "Cable Machine",
  "Treadmill",
  "None",
];

const INJURIES = ["Knee", "Lower Back", "Shoulder", "Wrist", "Neck", "Ankle", "Hip"];

type Form = Partial<OnboardingInput>;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<FitnessMetrics | null>(null);
  const [form, setForm] = useState<Form>({
    injuries: [],
    equipment: [],
    dailyMinutes: 45,
    workoutDays: 4,
  });

  const set = <K extends keyof OnboardingInput>(k: K, v: OnboardingInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleArr = (k: "injuries" | "equipment", v: string) =>
    setForm((f) => {
      const cur = (f[k] as string[]) ?? [];
      return {
        ...f,
        [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
      };
    });

  const steps = buildSteps(form, set, toggleArr);
  const total = steps.length;
  const current = steps[step];
  const progress = Math.round(((step + 1) / total) * 100);

  async function submit() {
    const parsed = onboardingSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please complete all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save profile");
        return;
      }
      setMetrics(data.metrics);
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // ---- Results screen ----
  if (metrics) {
    return (
      <main className="relative flex min-h-screen flex-1 items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="glass-strong w-full max-w-2xl rounded-3xl p-8 text-center"
        >
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-flame" />
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide">
            Your blueprint is ready
          </h1>
          <p className="mt-2 text-sm text-fog">
            We&apos;ve generated your metrics and a personalized plan.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Metric>
              <ProgressRing
                value={metrics.fitnessScore}
                label={`${metrics.fitnessScore}`}
                sub="Fitness score"
                gradient={["#ff3b30", "#ff7a18"]}
              />
            </Metric>
            <Metric>
              <ProgressRing
                value={Math.min(100, (metrics.bmi / 40) * 100)}
                label={`${metrics.bmi}`}
                sub={metrics.bmiCategory}
                gradient={["#2bd4ff", "#2bff88"]}
              />
            </Metric>
            <Metric>
              <ProgressRing
                value={Math.min(100, (metrics.dailyCalories / 4000) * 100)}
                label={`${(metrics.dailyCalories / 1000).toFixed(1)}k`}
                sub="Daily kcal"
                gradient={["#ff7a18", "#ffc24b"]}
              />
            </Metric>
          </div>

          <Button
            size="xl"
            className="mt-10 w-full"
            onClick={() => {
              router.push("/dashboard");
              router.refresh();
            }}
          >
            Enter your dashboard
            <ArrowRight className="h-5 w-5" />
          </Button>
        </motion.div>
      </main>
    );
  }

  // ---- Wizard ----
  return (
    <main className="relative flex min-h-screen flex-1 flex-col px-4 py-8">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between">
        <Logo />
        <span className="text-xs uppercase tracking-widest text-smoke">
          Step {step + 1} / {total}
        </span>
      </header>

      {/* progress bar */}
      <div className="mx-auto mt-6 h-1.5 w-full max-w-xl overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-ember to-flame"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide">
              {current.title}
            </h2>
            {current.subtitle && (
              <p className="mt-2 text-sm text-fog">{current.subtitle}</p>
            )}
            <div className="mt-8">{current.content}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mx-auto flex w-full max-w-xl items-center gap-3">
        {step > 0 && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        {step < total - 1 ? (
          <Button
            size="lg"
            className="flex-1"
            disabled={!current.valid}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1"
            disabled={!current.valid || loading}
            onClick={submit}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate my plan
            <Sparkles className="h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}

function Metric({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center">{children}</div>;
}

// ------------------------------------------------------------
// Step definitions
// ------------------------------------------------------------
function buildSteps(
  form: Form,
  set: <K extends keyof OnboardingInput>(k: K, v: OnboardingInput[K]) => void,
  toggleArr: (k: "injuries" | "equipment", v: string) => void
) {
  const num = (v: unknown) => (v === undefined || v === null ? "" : String(v));

  const genderOpts: Option<OnboardingInput["gender"]>[] = [
    { value: "MALE", label: "Male" },
    { value: "FEMALE", label: "Female" },
    { value: "OTHER", label: "Other" },
  ];

  const goalOpts: Option<OnboardingInput["goal"]>[] = [
    { value: "LOSE_WEIGHT", label: "Lose Weight", desc: "Burn fat, get lean" },
    { value: "BUILD_MUSCLE", label: "Build Muscle", desc: "Hypertrophy focus" },
    { value: "GAIN_STRENGTH", label: "Gain Strength", desc: "Lift heavier" },
    { value: "IMPROVE_ENDURANCE", label: "Endurance", desc: "Last longer" },
    { value: "RECOMP", label: "Recomp", desc: "Build & cut" },
    { value: "STAY_FIT", label: "Stay Fit", desc: "General health" },
  ];

  const expOpts: Option<OnboardingInput["experience"]>[] = [
    { value: "BEGINNER", label: "Beginner", desc: "New to training" },
    { value: "INTERMEDIATE", label: "Intermediate", desc: "1-3 years" },
    { value: "ADVANCED", label: "Advanced", desc: "3+ years" },
  ];

  const activityOpts: Option<OnboardingInput["activityLevel"]>[] = [
    { value: "SEDENTARY", label: "Sedentary", desc: "Little exercise" },
    { value: "LIGHT", label: "Light", desc: "1-2 days/wk" },
    { value: "MODERATE", label: "Moderate", desc: "3-4 days/wk" },
    { value: "ACTIVE", label: "Active", desc: "5-6 days/wk" },
    { value: "VERY_ACTIVE", label: "Very Active", desc: "Daily / athlete" },
  ];

  const locationOpts: Option<OnboardingInput["location"]>[] = [
    { value: "HOME", label: "Home", icon: "🏠" },
    { value: "GYM", label: "Gym", icon: "🏋️" },
    { value: "OUTDOOR", label: "Outdoor", icon: "🌳" },
    { value: "HYBRID", label: "Hybrid", icon: "🔀" },
  ];

  return [
    {
      title: "The basics",
      subtitle: "Let's start with who you are.",
      valid: !!form.age && !!form.gender,
      content: (
        <div className="space-y-6">
          <div>
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 27"
              value={num(form.age)}
              onChange={(e) => set("age", Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Gender</Label>
            <OptionGrid
              options={genderOpts}
              value={form.gender}
              onChange={(v) => set("gender", v)}
              columns={3}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Your body",
      subtitle: "Used to compute BMI, BMR, and calorie targets.",
      valid: !!form.heightCm && !!form.weightKg,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder="175"
                value={num(form.heightCm)}
                onChange={(e) => set("heightCm", Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="72"
                value={num(form.weightKg)}
                onChange={(e) => set("weightKg", Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="target">Target weight (kg) — optional</Label>
            <Input
              id="target"
              type="number"
              placeholder="68"
              value={num(form.targetWeightKg)}
              onChange={(e) => set("targetWeightKg", Number(e.target.value))}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Your goal",
      subtitle: "What are you training for?",
      valid: !!form.goal,
      content: (
        <OptionGrid
          options={goalOpts}
          value={form.goal}
          onChange={(v) => set("goal", v)}
          columns={2}
        />
      ),
    },
    {
      title: "Experience",
      subtitle: "How long have you been training?",
      valid: !!form.experience,
      content: (
        <OptionGrid
          options={expOpts}
          value={form.experience}
          onChange={(v) => set("experience", v)}
          columns={1}
        />
      ),
    },
    {
      title: "Activity level",
      subtitle: "Your typical weekly movement.",
      valid: !!form.activityLevel,
      content: (
        <OptionGrid
          options={activityOpts}
          value={form.activityLevel}
          onChange={(v) => set("activityLevel", v)}
          columns={1}
        />
      ),
    },
    {
      title: "Where you train",
      subtitle: "And what gear you have.",
      valid: !!form.location,
      content: (
        <div className="space-y-6">
          <div>
            <Label>Location</Label>
            <OptionGrid
              options={locationOpts}
              value={form.location}
              onChange={(v) => set("location", v)}
              columns={2}
            />
          </div>
          <div>
            <Label>Equipment available</Label>
            <ChipGroup
              options={EQUIPMENT}
              values={form.equipment ?? []}
              onToggle={(v) => toggleArr("equipment", v)}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Schedule & injuries",
      subtitle: "We'll tailor volume and avoid risky movements.",
      valid: !!form.workoutDays && !!form.dailyMinutes,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="days">Days / week</Label>
              <Input
                id="days"
                type="number"
                min={1}
                max={7}
                value={num(form.workoutDays)}
                onChange={(e) => set("workoutDays", Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="mins">Minutes / day</Label>
              <Input
                id="mins"
                type="number"
                min={10}
                max={240}
                value={num(form.dailyMinutes)}
                onChange={(e) => set("dailyMinutes", Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label>Any injuries? (optional)</Label>
            <ChipGroup
              options={INJURIES}
              values={form.injuries ?? []}
              onToggle={(v) => toggleArr("injuries", v)}
            />
          </div>
        </div>
      ),
    },
  ];
}
