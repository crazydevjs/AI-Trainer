import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Baby,
  Camera,
  CheckCircle2,
  Flame,
  Lightbulb,
  Rocket,
  Signal,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const DIFF_COLOR: Record<string, string> = {
  BEGINNER: "text-neon",
  INTERMEDIATE: "text-amber",
  ADVANCED: "text-ember",
};

const label = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const e = await prisma.exercise.findUnique({ where: { slug } });
  if (!e) notFound();

  const aiFeatures = [
    ["Posture detection", e.aiPosture],
    ["Rep counting", e.aiRepCount],
    ["Range of motion", e.aiRom],
    ["Real-time feedback", e.aiFeedback],
  ] as const;
  const aiSupported = aiFeatures.some(([, v]) => v);

  return (
    <div className="space-y-6">
      <Link
        href="/exercises"
        className="inline-flex items-center gap-2 text-sm text-fog transition-colors hover:text-chalk"
      >
        <ArrowLeft className="h-4 w-4" />
        Library
      </Link>

      {/* Hero */}
      <div className="glass-strong relative overflow-hidden rounded-3xl p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ember/15 blur-3xl" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-widest text-fog">
            {label(e.category)}
          </span>
          {e.disciplines.map((d) => (
            <span
              key={d}
              className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[10px] uppercase tracking-widest text-smoke"
            >
              {label(d)}
            </span>
          ))}
        </div>
        <h1 className="font-display mt-3 text-4xl font-bold uppercase tracking-wide">
          {e.name}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-smoke">
          <span className={`flex items-center gap-1.5 ${DIFF_COLOR[e.difficulty]}`}>
            <Signal className="h-4 w-4" />
            {label(e.difficulty)}
          </span>
          <span className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-flame" />
            ~{Math.round(e.metValue * 8)} kcal/set
          </span>
        </div>

        {/* Muscles */}
        <div className="mt-6 space-y-2">
          <div className="flex flex-wrap gap-2">
            {e.muscles.map((m) => (
              <span
                key={m}
                className="rounded-full border border-ember/30 bg-ember/10 px-3 py-1 text-xs text-chalk"
              >
                {m}
              </span>
            ))}
            {e.secondaryMuscles.map((m) => (
              <span
                key={m}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-fog"
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <Button asChild size="lg">
            <Link href={`/train/${e.slug}`}>
              <Camera className="h-5 w-5" />
              {aiSupported ? "Train with AI Coach" : "Start tracked workout"}
            </Link>
          </Button>
        </div>
      </div>

      {/* AI support */}
      {aiSupported && (
        <div className="glass rounded-3xl p-6">
          <h2 className="font-display mb-4 flex items-center gap-2 text-lg font-semibold uppercase tracking-wide">
            <Camera className="h-5 w-5 text-volt" />
            AI Camera Support
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {aiFeatures.map(([name, on]) => (
              <div
                key={name}
                className={`rounded-2xl border p-3 text-center text-xs ${
                  on
                    ? "border-volt/30 bg-volt/10 text-chalk"
                    : "border-white/5 bg-white/[0.02] text-smoke"
                }`}
              >
                <CheckCircle2
                  className={`mx-auto mb-1 h-4 w-4 ${on ? "text-volt" : "text-smoke/40"}`}
                />
                {name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Instructions */}
        <div className="glass rounded-3xl p-6">
          <h2 className="font-display mb-4 text-lg font-semibold uppercase tracking-wide">
            How to perform
          </h2>
          <ol className="space-y-3">
            {e.instructions.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ember/15 text-xs font-bold text-ember">
                  {i + 1}
                </span>
                <span className="text-sm text-fog">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Common mistakes */}
        <div className="glass rounded-3xl p-6">
          <h2 className="font-display mb-4 text-lg font-semibold uppercase tracking-wide">
            Common mistakes
          </h2>
          <ul className="space-y-3">
            {e.commonMistakes.map((m, i) => (
              <li key={i} className="flex gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber" />
                <span className="text-sm text-fog">{m}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Form tips */}
        {e.formTips.length > 0 && (
          <div className="glass rounded-3xl p-6">
            <h2 className="font-display mb-4 text-lg font-semibold uppercase tracking-wide">
              Form tips
            </h2>
            <ul className="space-y-3">
              {e.formTips.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <Lightbulb className="h-5 w-5 shrink-0 text-neon" />
                  <span className="text-sm text-fog">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Progressions */}
        <div className="glass rounded-3xl p-6">
          <h2 className="font-display mb-4 text-lg font-semibold uppercase tracking-wide">
            Scaling
          </h2>
          {e.beginnerMod && (
            <div className="mb-4 flex gap-3">
              <Baby className="h-5 w-5 shrink-0 text-volt" />
              <div>
                <p className="text-xs uppercase tracking-widest text-smoke">Beginner</p>
                <p className="text-sm text-fog">{e.beginnerMod}</p>
              </div>
            </div>
          )}
          {e.advancedVariations.length > 0 && (
            <div className="flex gap-3">
              <Rocket className="h-5 w-5 shrink-0 text-ember" />
              <div>
                <p className="text-xs uppercase tracking-widest text-smoke">Advanced</p>
                <p className="text-sm text-fog">{e.advancedVariations.join(" · ")}</p>
              </div>
            </div>
          )}
          {!e.beginnerMod && e.advancedVariations.length === 0 && (
            <p className="text-sm text-smoke">No scaling notes for this movement.</p>
          )}

          {e.equipment.length > 0 && (
            <div className="mt-6 border-t border-white/5 pt-4">
              <p className="mb-2 text-xs uppercase tracking-widest text-smoke">
                Equipment
              </p>
              <div className="flex flex-wrap gap-2">
                {e.equipment.map((eq) => (
                  <span
                    key={eq}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-chalk"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-neon" />
                    {eq}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
