"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, FlaskConical, RefreshCw } from "lucide-react";
import { useDevUnlocked } from "@/lib/dev";

interface DatasetCoverageReport {
  datasetName: string;
  datasetVersion: number;
  totalSessions: number;
  labeledSessions: number;
  qualityScore: number;
}

interface GoldenDataset {
  name: string;
  datasetVersion: number;
  promotedAt: number;
}

interface ReleaseCandidate {
  id: string;
  name: string;
  status: string;
  qualityScore?: number;
  createdAt: number;
}

interface RegressionAlert {
  exerciseSlug: string;
  metric: string;
  comparedAgainst: string;
  severity: "critical" | "warning";
}

interface DriftReport {
  dimension: string;
  severity: "none" | "moderate" | "significant";
  driftScore: number;
}

interface MlopsStatus {
  datasetCoverage: DatasetCoverageReport[];
  goldenDatasets: GoldenDataset[];
  releaseHistory: ReleaseCandidate[];
  regressionAlerts: RegressionAlert[];
  driftAlerts: DriftReport[];
  latestReleaseQualityScore: number | null;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function MlopsDashboardPage() {
  const unlocked = useDevUnlocked();
  const [data, setData] = useState<MlopsStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mlops/status");
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
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide">MLOps</h1>
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
        Internal release-governance tooling — see <code className="text-chalk">DEVELOPER_GUIDE.md</code> for the{" "}
        <code className="text-chalk">release:*</code>/<code className="text-chalk">dataset:*</code> CLI scripts that
        produce the data shown here. Never affects live inference.
      </p>

      {!data ? (
        <p className="text-sm text-fog">Loading MLOps status…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Dataset Status">
            {data.datasetCoverage.length === 0 && <p className="text-xs text-smoke">No datasets yet.</p>}
            {data.datasetCoverage.map((d) => (
              <Row
                key={`${d.datasetName}-${d.datasetVersion}`}
                k={`${d.datasetName} v${d.datasetVersion}`}
                v={`${pct(d.qualityScore)} · ${d.labeledSessions}/${d.totalSessions} labeled`}
              />
            ))}
          </Section>

          <Section title="Golden Dataset">
            {data.goldenDatasets.length === 0 && <p className="text-xs text-smoke">No golden datasets promoted yet.</p>}
            {data.goldenDatasets.map((g) => (
              <Row
                key={`${g.name}-${g.datasetVersion}`}
                k={`${g.name} v${g.datasetVersion}`}
                v={new Date(g.promotedAt).toLocaleDateString()}
              />
            ))}
          </Section>

          <Section title="Release Candidates">
            {data.releaseHistory.length === 0 && <p className="text-xs text-smoke">No releases yet.</p>}
            {data.releaseHistory.map((r) => (
              <Row
                key={r.id}
                k={r.name}
                v={
                  <span
                    className={
                      r.status === "deployed" ? "text-neon" : r.status === "rejected" ? "text-ember" : "text-amber"
                    }
                  >
                    {r.status} · {pct(r.qualityScore ?? 0)}
                  </span>
                }
              />
            ))}
          </Section>

          <Section title="Quality Score">
            <Row
              k="latest release"
              v={data.latestReleaseQualityScore != null ? pct(data.latestReleaseQualityScore) : "—"}
            />
          </Section>

          <Section title="Regression Status">
            {data.regressionAlerts.length === 0 && <p className="text-xs text-smoke">No regressions detected.</p>}
            {data.regressionAlerts.map((a, i) => (
              <Row
                key={i}
                k={`${a.exerciseSlug}.${a.metric}`}
                v={<span className={a.severity === "critical" ? "text-ember" : "text-amber"}>vs {a.comparedAgainst}</span>}
              />
            ))}
          </Section>

          <Section title="Drift Alerts">
            {data.driftAlerts.length === 0 && <p className="text-xs text-smoke">No drift detected.</p>}
            {data.driftAlerts.map((d, i) => (
              <Row
                key={i}
                k={d.dimension}
                v={<span className={d.severity === "significant" ? "text-ember" : "text-amber"}>{d.severity} ({d.driftScore.toFixed(2)})</span>}
              />
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
