"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, FlaskConical, RefreshCw } from "lucide-react";
import { useDevUnlocked } from "@/lib/dev";

interface PlatformStatus {
  health: { status: string; checks: { name: string; status: string; latencyMs: number; message?: string }[] };
  cache: { provider: string; entries: number; hits: number; misses: number };
  queues: { name: string; pending: number; processing: boolean; processedCount: number; failedCount: number }[];
  jobs: { name: string; intervalMs: number; running: boolean; lastResult?: { ok: boolean; ranAt: number } }[];
  flags: { key: string; enabled: boolean; rolloutPercentage?: number; enabledForYou: boolean }[];
  rateLimiter: { activeBuckets: number };
  metrics: { counters: Record<string, number>; gauges: Record<string, number>; histograms: Record<string, { count: number; avg: number; p95: number }> };
  telemetry: { recentEvents: { name: string; timestamp: number }[]; recentErrors: { message: string; timestamp: number }[] };
  subscription: { state: { planId: string; status: string }; limits: Record<string, number> };
  usage: { month: string; usage: Record<string, number> };
  recentAudit: { action: string; actorId: string | null; timestamp: number }[];
}

const statusColor = (status: string) =>
  status === "ok" ? "text-neon" : status === "degraded" ? "text-amber" : "text-ember";

export default function PlatformDashboardPage() {
  const unlocked = useDevUnlocked();
  const [data, setData] = useState<PlatformStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/status");
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
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Platform</h1>
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

      {!data ? (
        <p className="text-sm text-fog">Loading platform status…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Platform Health">
            <Row k="overall" v={<span className={statusColor(data.health.status)}>{data.health.status}</span>} />
            {data.health.checks.map((c) => (
              <Row key={c.name} k={c.name} v={<span className={statusColor(c.status)}>{c.status} · {c.latencyMs}ms</span>} />
            ))}
          </Section>

          <Section title="Cache Status">
            <Row k="provider" v={data.cache.provider} />
            <Row k="entries" v={String(data.cache.entries)} />
            <Row k="hits / misses" v={`${data.cache.hits} / ${data.cache.misses}`} />
          </Section>

          <Section title="Queue Status">
            {data.queues.length === 0 && <p className="text-xs text-smoke">No queues registered yet.</p>}
            {data.queues.map((q) => (
              <Row key={q.name} k={q.name} v={`${q.pending} pending · ${q.processedCount} done · ${q.failedCount} failed`} />
            ))}
          </Section>

          <Section title="Job Metrics">
            {data.jobs.map((j) => (
              <Row
                key={j.name}
                k={j.name}
                v={j.lastResult ? `${j.lastResult.ok ? "✓" : "✗"} last run ${new Date(j.lastResult.ranAt).toLocaleTimeString()}` : "not yet run"}
              />
            ))}
          </Section>

          <Section title="Feature Flags">
            {data.flags.map((f) => (
              <Row
                key={f.key}
                k={f.key}
                v={`${f.enabledForYou ? "on" : "off"}${f.rolloutPercentage != null ? ` · ${f.rolloutPercentage}%` : ""}`}
              />
            ))}
          </Section>

          <Section title="Rate Limits">
            <Row k="active buckets" v={String(data.rateLimiter.activeBuckets)} />
          </Section>

          <Section title="Subscription Status">
            <Row k="plan" v={data.subscription.state.planId} />
            <Row k="status" v={data.subscription.state.status} />
            {Object.entries(data.usage.usage).map(([metric, value]) => (
              <Row key={metric} k={metric} v={`${value} / ${data.subscription.limits[`${metric}PerMonth`] ?? data.subscription.limits[metric] ?? "∞"}`} />
            ))}
          </Section>

          <Section title="API Metrics">
            {Object.entries(data.metrics.counters).map(([name, value]) => (
              <Row key={name} k={name} v={String(value)} />
            ))}
            {Object.entries(data.metrics.histograms).map(([name, h]) => (
              <Row key={name} k={name} v={`avg ${h.avg.toFixed(1)} · p95 ${h.p95.toFixed(1)} (n=${h.count})`} />
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
