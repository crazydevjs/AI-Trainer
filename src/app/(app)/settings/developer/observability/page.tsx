"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, FlaskConical, RefreshCw } from "lucide-react";
import { useDevUnlocked } from "@/lib/dev";

interface HealthComponent {
  name: string;
  status: string;
  detail: string;
}
interface ExperimentDefinition {
  id: string;
  name: string;
  status: string;
  winner: string | null;
}
interface Rollout {
  id: string;
  flagKey: string;
  stages: number[];
  currentStageIndex: number;
  status: string;
}
interface Alert {
  kind: string;
  severity: "critical" | "warning";
  message: string;
}
interface ErrorGroup {
  message: string;
  kind: string;
  count: number;
}
interface FunnelStage {
  stage: string;
  userCount: number;
  conversionFromPrevious: number | null;
}
interface ObservabilityStatus {
  health: { score: number; status: string; components: HealthComponent[] };
  experiments: ExperimentDefinition[];
  rollouts: Rollout[];
  latency: { api: { p95Ms: number; avgMs: number } | null; apiNote: string };
  cost: { totalUsd: number; monthlyProjection: number; costPerWorkout: number };
  alerts: Alert[];
  topErrors: ErrorGroup[];
  retention: { dau: number; wau: number; mau: number };
  featureUsage: FunnelStage[];
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function ObservabilityDashboardPage() {
  const unlocked = useDevUnlocked();
  const [data, setData] = useState<ObservabilityStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/observability/status");
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
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Observability</h1>
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
        Production observability — never participates in inference. See{" "}
        <code className="text-chalk">DEVELOPER_GUIDE.md</code> for the <code className="text-chalk">observability:*</code>
        /<code className="text-chalk">experiments:*</code>/<code className="text-chalk">rollout:*</code> CLI scripts.
      </p>

      {!data ? (
        <p className="text-sm text-fog">Loading observability status…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="System Health">
            <Row k="score" v={<span className={data.health.status === "healthy" ? "text-neon" : data.health.status === "degraded" ? "text-amber" : "text-ember"}>{data.health.status} · {data.health.score}%</span>} />
            {data.health.components.map((c) => (
              <Row key={c.name} k={c.name} v={c.detail} />
            ))}
          </Section>

          <Section title="Experiment Status">
            {data.experiments.length === 0 && <p className="text-xs text-smoke">No experiments yet.</p>}
            {data.experiments.map((e) => (
              <Row key={e.id} k={e.name} v={`${e.status}${e.winner ? ` · winner: ${e.winner}` : ""}`} />
            ))}
          </Section>

          <Section title="Current Rollouts">
            {data.rollouts.length === 0 && <p className="text-xs text-smoke">No rollouts yet.</p>}
            {data.rollouts.map((r) => (
              <Row
                key={r.id}
                k={r.flagKey}
                v={`stage ${r.currentStageIndex + 1}/${r.stages.length} (${r.stages[r.currentStageIndex]}%) · ${r.status}`}
              />
            ))}
          </Section>

          <Section title="Latency">
            <Row k="API p95" v={data.latency.api ? `${data.latency.api.p95Ms.toFixed(0)}ms` : data.latency.apiNote} />
          </Section>

          <Section title="Cost">
            <Row k="last 30d" v={`$${data.cost.totalUsd.toFixed(4)}`} />
            <Row k="monthly projection" v={`$${data.cost.monthlyProjection.toFixed(2)}`} />
            <Row k="per workout" v={`$${data.cost.costPerWorkout.toFixed(6)}`} />
          </Section>

          <Section title="Alerts">
            {data.alerts.length === 0 && <p className="text-xs text-smoke">No unresolved alerts.</p>}
            {data.alerts.map((a, i) => (
              <Row key={i} k={a.kind} v={<span className={a.severity === "critical" ? "text-ember" : "text-amber"}>{a.message}</span>} />
            ))}
          </Section>

          <Section title="Errors">
            {data.topErrors.length === 0 && <p className="text-xs text-smoke">No errors reported.</p>}
            {data.topErrors.map((e, i) => (
              <Row key={i} k={e.message.slice(0, 40)} v={`${e.count}x (${e.kind})`} />
            ))}
          </Section>

          <Section title="Retention">
            <Row k="DAU / WAU / MAU" v={`${data.retention.dau} / ${data.retention.wau} / ${data.retention.mau}`} />
          </Section>

          <Section title="Feature Usage">
            {data.featureUsage.map((stage) => (
              <Row
                key={stage.stage}
                k={stage.stage}
                v={`${stage.userCount}${stage.conversionFromPrevious != null ? ` (${pct(stage.conversionFromPrevious)})` : ""}`}
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
