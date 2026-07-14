import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function ExercisesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-11 w-40 rounded-2xl" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} className="h-36" />
        ))}
      </div>
    </div>
  );
}
