import { cn } from "@/lib/utils";

/** Base pulsing placeholder block — matches the loading.tsx skeleton style
 *  already used at the (app) route-group root, now reusable per-route. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-white/10", className)} />;
}

/** A glass-card-shaped placeholder for stat tiles / summary cards. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("glass animate-pulse space-y-3 rounded-3xl p-6", className)}>
      <div className="h-3 w-24 rounded-full bg-white/10" />
      <div className="h-8 w-16 rounded-lg bg-white/10" />
    </div>
  );
}

/** A single placeholder row for list-style content (history, workouts). */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("glass animate-pulse rounded-3xl p-6", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded-lg bg-white/10" />
          <div className="h-3 w-1/2 rounded-full bg-white/10" />
        </div>
        <div className="h-8 w-20 rounded-xl bg-white/10" />
      </div>
    </div>
  );
}
