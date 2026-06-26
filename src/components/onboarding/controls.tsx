"use client";

import { cn } from "@/lib/utils";

export interface Option<T extends string> {
  value: T;
  label: string;
  desc?: string;
  icon?: React.ReactNode;
}

/** Single-select card grid. */
export function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: Option<T>[];
  value?: T;
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 sm:grid-cols-3"
      )}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-2xl border p-4 text-left transition-all duration-200",
              active
                ? "border-ember/60 bg-ember/10 glow-ember"
                : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
            )}
          >
            {o.icon && <div className="mb-2 text-2xl">{o.icon}</div>}
            <div className="font-semibold text-chalk">{o.label}</div>
            {o.desc && <div className="mt-0.5 text-xs text-fog">{o.desc}</div>}
          </button>
        );
      })}
    </div>
  );
}

/** Multi-select chips. */
export function ChipGroup({
  options,
  values,
  onToggle,
}: {
  options: string[];
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = values.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-all duration-200",
              active
                ? "border-ember/60 bg-ember/15 text-chalk"
                : "border-white/10 bg-white/[0.03] text-fog hover:border-white/25 hover:text-chalk"
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
