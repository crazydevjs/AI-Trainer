import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shared "nothing here yet" panel — extracted from the pattern that used
 *  to be hand-duplicated per page (icon + message + optional CTA). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="glass rounded-3xl p-12 text-center">
      {Icon && <Icon className="mx-auto mb-3 h-8 w-8 text-smoke" />}
      <p className="text-fog">{title}</p>
      {description && <p className="mt-1 text-sm text-smoke">{description}</p>}
      {action && (
        <Button asChild variant="outline" className="mt-4">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
