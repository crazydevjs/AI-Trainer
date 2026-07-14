"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, FlaskConical, RefreshCw } from "lucide-react";
import { useDevUnlocked } from "@/lib/dev";

interface ExerciseBenchmarkReport {
  exerciseSlug: string;
  sessionCount: number;
  labeledSessionCount: number;
  repCounting: { macroClassification: { precision: number; recall: number; f1: number }; meanCountAbsError: number } | null;
  avgFps: number;
  latency: { p95Ms: number };
}

interface Experiment {
  id: string;
  name: string;
  date: number;
  poseKey?: string;
  winner: string | null;
  regressionDetected: boolean;
}

interface ValidationStatus {
  datasets: { name: string; version: number; sessionCount: number; labeledCount: number; exercises: string[] }[];
  recentExperiments: Experiment[];
  regressionAlerts: Experiment[];
  latestReport: { datasetName: string; datasetVersion: number; generatedAt: number; reports: ExerciseBenchmarkReport[] } | null;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function ValidationDashboardPage() {
  const unlocked = useDevUnlocked();
  const [data, setData] = useState<ValidationStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/validation/status");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (unlocked) void refresh();
  }, [unlocked, refresh]);

  if (!unlocked) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <FlaskConical className="mb-3 h-8 w-8 text-smoke" />
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Developer settings</h1>
        <p className="mt-2 text-sm text-fog">This area isn&apos;t available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-volt" />
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Validation</h1>
        </div>
        <button
          onClick={() => void refresh()}
          className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-fog hover:text-chalk"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <Link href="/settings/developer">
        <span className="flex items-center gap-1.5 text-sm text-fog hover:text-chalk">
          <ArrowLeft className="h-4 w-4" />
          Back to developer settings
        </span>
      </Link>

      <p className="text-xs text-smoke">
        Offline-only benchmarking against recorded sessions — see{" "}
        <code className="text-chalk">DEVELOPER_GUIDE.md</code> for the <code className="text-chalk">validation:*</code>{" "}
        CLI scripts that produce the data shown here. Never runs during a live session.
      </p>

      {!data ? (
        <p className="text-sm text-fog">Loading validation status…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Dataset Coverage">
            {data.datasets.length === 0 && (
              <p className="text-xs text-smoke">
                No datasets yet — run <code className="text-chalk">npm run validation:validate</code> after
                exporting a session&apos;s debug JSON.
              </p>
            )}
            {data.datasets.map((d) => (
              <Row
                key={d.name}
                k={`${d.name} v${d.version}`}
                v={`${d.labeledCount}/${d.sessionCount} labeled · ${d.exercises.length} exercise(s)`}
              />
            ))}
          </Section>

          <Section title="Regression Alerts">
            {data.regressionAlerts.length === 0 && <p className="text-xs text-smoke">No regressions detected.</p>}
            {data.regressionAlerts.map((e) => (
              <Row key={e.id} k={e.name} v={<span className="text-ember">⚠ {e.poseKey ?? "—"}</span>} />
            ))}
          </Section>

          <Section title="Benchmark History">
            {data.recentExperiments.length === 0 && <p className="text-xs text-smoke">No experiments recorded yet.</p>}
            {data.recentExperiments.map((e) => (
              <Row
                key={e.id}
                k={e.name}
                v={
                  <span className={e.regressionDetected ? "text-ember" : "text-neon"}>
                    {e.winner ?? "—"} · {new Date(e.date).toLocaleDateString()}
                  </span>
                }
              />
            ))}
          </Section>

          <Section title="Accuracy / Precision / Recall / F1 / Latency">
            {!data.latestReport && (
              <p className="text-xs text-smoke">
                No report yet — run <code className="text-chalk">npm run validation:evaluate</code>.
              </p>
            )}
            {data.latestReport?.reports.map((r) => (
              <div key={r.exerciseSlug} className="border-b border-white/5 py-1 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-fog">{r.exerciseSlug}</span>
                  <span className="text-chalk">
                    {r.repCounting ? `F1 ${pct(r.repCounting.macroClassification.f1)}` : "unlabeled"}
                  </span>
                </div>
                {r.repCounting && (
                  <div className="text-[11px] text-smoke">
                    precision {pct(r.repCounting.macroClassification.precision)} · recall{" "}
                    {pct(r.repCounting.macroClassification.recall)} · mean count error{" "}
                    {r.repCounting.meanCountAbsError.toFixed(2)} · p95 {r.latency.p95Ms.toFixed(0)}ms
                  </div>
                )}
              </div>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass space-y-2 rounded-3xl p-6">
      <p className="text-xs uppercase tracking-widest text-smoke">{title}</p>
      <div className="space-y-1 font-mono text-sm">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/5 py-1 last:border-0">
      <span className="text-fog">{k}</span>
      <span className="text-chalk">{v}</span>
    </div>
  );
}
