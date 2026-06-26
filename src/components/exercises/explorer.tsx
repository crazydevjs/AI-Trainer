"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Camera, Dumbbell, Flame, Search, Signal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ExerciseCard {
  slug: string;
  name: string;
  category: string;
  difficulty: string;
  disciplines: string[];
  muscles: string[];
  equipment: string[];
  metValue: number;
  aiRepCount: boolean;
  aiPosture: boolean;
}

const DIFF_COLOR: Record<string, string> = {
  BEGINNER: "text-neon",
  INTERMEDIATE: "text-amber",
  ADVANCED: "text-ember",
};

const CATEGORIES = [
  "ALL", "CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS", "QUADS",
  "HAMSTRINGS", "GLUTES", "CALVES", "CORE", "CARDIO", "FUNCTIONAL", "OLYMPIC", "FULL_BODY",
];

const label = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function ExerciseExplorer({ exercises }: { exercises: ExerciseCard[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [aiOnly, setAiOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => {
      if (category !== "ALL" && e.category !== category) return false;
      if (aiOnly && !e.aiRepCount && !e.aiPosture) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.muscles.some((m) => m.toLowerCase().includes(q)) ||
        e.equipment.some((m) => m.toLowerCase().includes(q))
      );
    });
  }, [exercises, query, category, aiOnly]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke" />
          <Input
            placeholder="Search by name, muscle, or equipment…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-11"
          />
        </div>
        <button
          onClick={() => setAiOnly((v) => !v)}
          className={cn(
            "flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-medium transition-all",
            aiOnly
              ? "border-volt/50 bg-volt/10 text-volt"
              : "border-white/10 bg-white/[0.03] text-fog hover:text-chalk"
          )}
        >
          <Camera className="h-4 w-4" />
          AI Camera
        </button>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-wider transition-all",
              category === c
                ? "border-ember/60 bg-ember/15 text-chalk"
                : "border-white/10 bg-white/[0.03] text-fog hover:border-white/25 hover:text-chalk"
            )}
          >
            {c === "ALL" ? "All" : label(c)}
          </button>
        ))}
      </div>

      <p className="text-xs uppercase tracking-widest text-smoke">
        {filtered.length} exercise{filtered.length === 1 ? "" : "s"}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-fog">
          No exercises match your filters.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
              <Link
                key={e.slug}
                href={`/exercises/${e.slug}`}
                className="group relative block overflow-hidden rounded-3xl border border-white/10 bg-graphite/60 p-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)] transition-transform duration-200 hover:-translate-y-1 hover:border-white/20"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
                    <Dumbbell className="h-6 w-6 text-ember" />
                  </div>
                  <div className="flex items-center gap-2">
                    {(e.aiRepCount || e.aiPosture) && (
                      <span className="flex items-center gap-1 rounded-full border border-volt/30 bg-volt/10 px-2 py-0.5 text-[10px] font-medium text-volt">
                        <Camera className="h-3 w-3" /> AI
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-widest text-fog">
                      {label(e.category)}
                    </span>
                  </div>
                </div>

                <h3 className="font-display text-xl font-semibold tracking-wide">
                  {e.name}
                </h3>
                <p className="mt-1 line-clamp-1 text-xs text-fog">
                  {e.muscles.join(" · ")}
                </p>

                <div className="mt-4 flex items-center gap-4 text-xs text-smoke">
                  <span className={`flex items-center gap-1 ${DIFF_COLOR[e.difficulty]}`}>
                    <Signal className="h-3.5 w-3.5" />
                    {label(e.difficulty)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-flame" />
                    ~{Math.round(e.metValue * 8)} kcal/set
                  </span>
                </div>
              </Link>
          ))}
        </div>
      )}
    </div>
  );
}
