"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkoutActions({
  id,
  isFavorite,
}: {
  id: string;
  isFavorite: boolean;
}) {
  const router = useRouter();
  const [fav, setFav] = useState(isFavorite);
  const [busy, setBusy] = useState(false);

  async function toggleFav() {
    setBusy(true);
    const next = !fav;
    setFav(next);
    try {
      const res = await fetch(`/api/workouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setFav(!next);
      toast.error("Could not update");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this workout?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Workout deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggleFav}
        disabled={busy}
        aria-label="Favorite"
        className={cn(
          "rounded-xl p-2 transition-colors",
          fav ? "text-amber" : "text-smoke hover:text-chalk"
        )}
      >
        <Star className={cn("h-4 w-4", fav && "fill-amber")} />
      </button>
      <button
        onClick={remove}
        disabled={busy}
        aria-label="Delete"
        className="rounded-xl p-2 text-smoke transition-colors hover:text-ember"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
