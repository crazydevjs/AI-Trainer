// Shown instantly during navigation while the server renders (and any
// cold Neon query resolves) — so pages never look "frozen".
export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="h-3 w-28 rounded-full bg-white/10" />
          <div className="h-9 w-56 rounded-xl bg-white/10" />
        </div>
        <div className="h-11 w-40 rounded-2xl bg-white/10" />
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-3xl bg-white/[0.05]" />
        ))}
      </div>

      {/* Content blocks */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-64 rounded-3xl bg-white/[0.05] lg:col-span-2" />
        <div className="h-64 rounded-3xl bg-white/[0.05]" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-3xl bg-white/[0.05]" />
        ))}
      </div>
    </div>
  );
}
