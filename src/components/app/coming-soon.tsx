import { Construction } from "lucide-react";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
        {title}
      </h1>
      <div className="glass flex flex-col items-center justify-center rounded-3xl p-16 text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-ember/20 to-flame/10 ring-1 ring-ember/30">
          <Construction className="h-8 w-8 text-flame" />
        </div>
        <h2 className="font-display text-xl font-semibold uppercase tracking-wide">
          Coming in the next milestone
        </h2>
        <p className="mt-2 max-w-md text-sm text-fog">{description}</p>
      </div>
    </div>
  );
}
