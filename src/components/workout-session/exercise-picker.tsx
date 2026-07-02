"use client";

// Searchable exercise picker modal for the Workout Session builder.

import { useMemo, useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import type { LibraryExercise } from "./experience";

export function ExercisePicker({
  library,
  onPick,
  onClose,
}: {
  library: LibraryExercise[];
  onPick: (e: LibraryExercise) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return library;
    return library.filter(
      (e) =>
        e.name.toLowerCase().includes(needle) ||
        e.category.toLowerCase().includes(needle) ||
        e.muscles.some((m) => m.toLowerCase().includes(needle))
    );
  }, [library, q]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="glass-strong flex h-[80vh] w-full max-w-lg flex-col rounded-t-3xl p-5 sm:h-[70vh] sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold uppercase tracking-wide">
            Add exercise
          </h3>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-fog hover:text-chalk"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercises, muscles…"
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-10 pr-3 text-sm text-chalk outline-none focus:border-ember/50"
          />
        </div>

        <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-fog">No exercises match.</p>
          )}
          {filtered.map((e) => (
            <button
              key={e.id}
              onClick={() => onPick(e)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-ember/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-chalk">{e.name}</p>
                <p className="truncate text-xs text-smoke">
                  {e.muscles.slice(0, 3).join(" · ") || e.category}
                </p>
              </div>
              {e.aiRepCount && e.poseKey && (
                <span className="ml-3 flex shrink-0 items-center gap-1 rounded-full border border-volt/40 bg-volt/10 px-2 py-0.5 text-[10px] font-bold text-volt">
                  <Sparkles className="h-3 w-3" />
                  AI
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
