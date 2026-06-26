"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface PickerExercise {
  id: string;
  name: string;
  slug: string;
  category: string;
  muscles: string[];
  aiRepCount: boolean;
}

interface Row {
  exerciseId: string;
  name: string;
  category: string;
  sets: number;
  reps: number;
  restSec: number;
}

const PROGRAM_TYPES = [
  ["CUSTOM", "Custom"],
  ["PUSH_PULL_LEGS", "Push/Pull/Legs"],
  ["UPPER_LOWER", "Upper/Lower"],
  ["FULL_BODY", "Full Body"],
  ["POWERLIFTING", "Powerlifting"],
  ["BRO_SPLIT", "Bro Split"],
] as const;

const label = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function WorkoutBuilder({
  allExercises,
  initialName = "",
  initialProgramType = "CUSTOM",
  initialRows = [],
}: {
  allExercises: PickerExercise[];
  initialName?: string;
  initialProgramType?: string;
  initialRows?: Row[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState("");
  const [programType, setProgramType] = useState(initialProgramType);
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const chosen = new Set(rows.map((r) => r.exerciseId));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allExercises
      .filter((e) =>
        !q
          ? true
          : e.name.toLowerCase().includes(q) ||
            e.muscles.some((m) => m.toLowerCase().includes(q))
      )
      .slice(0, 40);
  }, [allExercises, query]);

  function add(e: PickerExercise) {
    if (chosen.has(e.id)) return;
    setRows((r) => [
      ...r,
      { exerciseId: e.id, name: e.name, category: e.category, sets: 3, reps: 10, restSec: 60 },
    ]);
  }

  function update(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function remove(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    setRows((r) => {
      const j = i + dir;
      if (j < 0 || j >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function save() {
    if (!name.trim()) return toast.error("Name your workout");
    if (rows.length === 0) return toast.error("Add at least one exercise");
    setSaving(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          programType,
          exercises: rows.map((r) => ({
            exerciseId: r.exerciseId,
            sets: r.sets,
            reps: r.reps,
            restSec: r.restSec,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save");
        return;
      }
      toast.success("Workout saved");
      router.push("/workouts");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Left: builder */}
      <div className="space-y-6 lg:col-span-3">
        <div className="glass rounded-3xl p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="wname">Workout name</Label>
              <Input
                id="wname"
                placeholder="e.g. Monday Push"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="wdesc">Description (optional)</Label>
              <Input
                id="wdesc"
                placeholder="Heavy chest & shoulders"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label>Program type</Label>
              <div className="flex flex-wrap gap-2">
                {PROGRAM_TYPES.map(([val, lab]) => (
                  <button
                    key={val}
                    onClick={() => setProgramType(val)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-all",
                      programType === val
                        ? "border-ember/60 bg-ember/15 text-chalk"
                        : "border-white/10 bg-white/[0.03] text-fog hover:text-chalk"
                    )}
                  >
                    {lab}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Selected exercises */}
        <div className="glass rounded-3xl p-6">
          <h2 className="font-display mb-4 text-lg font-semibold uppercase tracking-wide">
            Exercises ({rows.length})
          </h2>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-smoke">
              Add exercises from the library on the right →
            </p>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {rows.map((row, i) => (
                  <motion.div
                    key={row.exerciseId}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-chalk">
                          {i + 1}. {row.name}
                        </p>
                        <p className="text-xs text-smoke">{label(row.category)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => move(i, -1)} className="rounded-lg p-1.5 text-smoke hover:bg-white/5 hover:text-chalk" aria-label="Move up">
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button onClick={() => move(i, 1)} className="rounded-lg p-1.5 text-smoke hover:bg-white/5 hover:text-chalk" aria-label="Move down">
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(i)} className="rounded-lg p-1.5 text-smoke hover:bg-white/5 hover:text-ember" aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <NumField label="Sets" value={row.sets} onChange={(v) => update(i, { sets: v })} />
                      <NumField label="Reps" value={row.reps} onChange={(v) => update(i, { reps: v })} />
                      <NumField label="Rest (s)" value={row.restSec} onChange={(v) => update(i, { restSec: v })} step={15} />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          <Button className="mt-6 w-full" size="lg" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save workout
          </Button>
        </div>
      </div>

      {/* Right: picker */}
      <div className="lg:col-span-2">
        <div className="glass sticky top-6 rounded-3xl p-6">
          <h2 className="font-display mb-4 text-lg font-semibold uppercase tracking-wide">
            Add exercises
          </h2>
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke" />
            <Input
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-11"
            />
          </div>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {results.map((e) => {
              const added = chosen.has(e.id);
              return (
                <button
                  key={e.id}
                  onClick={() => add(e)}
                  disabled={added}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-2xl border p-3 text-left transition-all",
                    added
                      ? "border-neon/30 bg-neon/5 opacity-60"
                      : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                  )}
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-chalk">
                      {e.name}
                      {e.aiRepCount && <Camera className="h-3 w-3 shrink-0 text-volt" />}
                    </p>
                    <p className="truncate text-xs text-smoke">{e.muscles.join(" · ")}</p>
                  </div>
                  {added ? (
                    <X className="h-4 w-4 shrink-0 text-neon" />
                  ) : (
                    <Plus className="h-4 w-4 shrink-0 text-ember" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-smoke">
        {label}
      </span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-chalk outline-none focus:border-ember/50"
      />
    </div>
  );
}
