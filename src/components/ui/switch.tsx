"use client";

import { cn } from "@/lib/utils";

/**
 * Accessible toggle switch.
 *
 * Layout is deterministic: the track has fixed size + internal padding, and the
 * thumb travels exactly `trackWidth - thumbWidth - 2*padding`, so it can never
 * overflow the rounded container in either state.
 *
 *   track: h-7 w-12 (28 × 48px), padding 2px  → inner 24 × 44px
 *   thumb: h-6 w-6 (24 × 24px)                → travel = 44 - 24 = 20px = translate-x-5
 */
export function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5",
        "transition-colors duration-200 ease-out outline-none",
        "focus-visible:ring-2 focus-visible:ring-ember/60",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-ember" : "bg-white/15",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none h-6 w-6 rounded-full bg-white shadow-md",
          "transition-transform duration-200 ease-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
