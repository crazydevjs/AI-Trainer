import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-ember to-flame shadow-[0_8px_24px_-8px_rgba(255,59,48,0.8)]">
        <Flame className="h-5 w-5 text-white" strokeWidth={2.5} />
      </span>
      {showText && (
        <span className="font-display text-xl font-bold tracking-[0.2em] text-chalk">
          FORGE
        </span>
      )}
    </span>
  );
}
