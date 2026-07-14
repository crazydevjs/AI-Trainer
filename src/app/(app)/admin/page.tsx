"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Activity, TrendingUp, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  onboarded: boolean;
  emailVerified: string | null;
  createdAt: string;
  lastActiveDate: string | null;
  subscription: { planId: string; status: string } | null;
}

interface UsersResponse {
  users: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
  analytics: {
    completion: { totalSessions: number; completedSessions: number; completionRate: number; avgCompletionPct: number };
    exercisePopularity: { exerciseId: string; exerciseName: string; sessionCount: number }[];
    coachUsage: { totalWorkoutLogs: number; logsWithCoachSummary: number; adoptionRate: number };
    personalization: { totalUsers: number; usersWithLearningProfile: number; adoptionRate: number };
  };
}

interface ObservabilityStatus {
  health: { score: number; status: string; components: { name: string; status: string; detail: string }[] };
  retention: { dau: number; wau: number; mau: number };
  topErrors: { fingerprint: string; message: string; kind: string; count: number; lastSeenAt: number }[];
  alerts: { kind: string; severity: "critical" | "warning"; message: string }[];
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const statusColor = (s: string) =>
  s === "ok" || s === "healthy" ? "text-neon" : s === "degraded" ? "text-amber" : "text-ember";

export default function AdminPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [obs, setObs] = useState<ObservabilityStatus | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const [usersRes, obsRes] = await Promise.all([
        fetch(`/api/admin/users?page=${p}`),
        fetch("/api/observability/status"),
      ]);
      if (usersRes.ok) setData(await usersRes.json());
      if (obsRes.ok) setObs(await obsRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(page);
  }, [page, refresh]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">Admin</h1>
        <button
          onClick={() => void refresh(page)}
          className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-fog hover:text-chalk"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {!data || !obs ? (
        <p className="text-sm text-fog">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Users className="h-5 w-5 text-ember" />} label="Total users" value={String(data.total)} />
            <StatCard
              icon={<Activity className="h-5 w-5 text-volt" />}
              label="Health"
              value={obs.health.score.toString()}
              sub={<span className={statusColor(obs.health.status)}>{obs.health.status}</span>}
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-neon" />}
              label="Completion rate"
              value={pct(data.analytics.completion.completionRate)}
              sub={`${data.analytics.completion.totalSessions} sessions (30d)`}
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5 text-amber" />}
              label="Active alerts"
              value={String(obs.alerts.length)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Daily / Weekly / Monthly Active Users">
              <Row k="DAU" v={String(obs.retention.dau)} />
              <Row k="WAU" v={String(obs.retention.wau)} />
              <Row k="MAU" v={String(obs.retention.mau)} />
            </Section>

            <Section title="Adoption">
              <Row k="Coach summary usage" v={pct(data.analytics.coachUsage.adoptionRate)} />
              <Row k="Personalization" v={pct(data.analytics.personalization.adoptionRate)} />
              <Row k="Avg completion %" v={`${Math.round(data.analytics.completion.avgCompletionPct)}%`} />
            </Section>

            <Section title="Most popular exercises (30d)">
              {data.analytics.exercisePopularity.length === 0 && (
                <p className="text-xs text-smoke">No sessions yet.</p>
              )}
              {data.analytics.exercisePopularity.map((e) => (
                <Row key={e.exerciseId} k={e.exerciseName} v={`${e.sessionCount} sessions`} />
              ))}
            </Section>

            <Section title="Top errors">
              {obs.topErrors.length === 0 && <p className="text-xs text-smoke">No errors recorded.</p>}
              {obs.topErrors.slice(0, 8).map((e) => (
                <Row key={e.fingerprint} k={e.message.slice(0, 48)} v={`${e.count}× · ${e.kind}`} />
              ))}
            </Section>

            <Section title="System health">
              {obs.health.components.map((c) => (
                <Row key={c.name} k={c.name} v={<span className={statusColor(c.status)}>{c.status}</span>} />
              ))}
            </Section>

            <Section title="Alerts">
              {obs.alerts.length === 0 && <p className="text-xs text-smoke">No active alerts.</p>}
              {obs.alerts.map((a, i) => (
                <Row
                  key={i}
                  k={a.kind}
                  v={<span className={a.severity === "critical" ? "text-ember" : "text-amber"}>{a.message}</span>}
                />
              ))}
            </Section>
          </div>

          <div className="glass space-y-3 rounded-3xl p-6">
            <p className="text-xs uppercase tracking-widest text-smoke">Users</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-widest text-smoke">
                    <th className="p-2">Email</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Role</th>
                    <th className="p-2">Plan</th>
                    <th className="p-2">Onboarded</th>
                    <th className="p-2">Verified</th>
                    <th className="p-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className="border-t border-white/5">
                      <td className="p-2 text-chalk">{u.email}</td>
                      <td className="p-2 text-fog">{u.name ?? "—"}</td>
                      <td className="p-2 text-fog">{u.role}</td>
                      <td className="p-2 text-fog">{u.subscription?.planId ?? "free"}</td>
                      <td className="p-2 text-fog">{u.onboarded ? "✓" : "—"}</td>
                      <td className="p-2 text-fog">{u.emailVerified ? "✓" : "—"}</td>
                      <td className="p-2 text-smoke">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-smoke">
                Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))} · {data.total} total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                  className="rounded-lg border border-white/10 p-1.5 text-fog disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={data.page * data.pageSize >= data.total}
                  className="rounded-lg border border-white/10 p-1.5 text-fog disabled:opacity-30"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="glass space-y-2 rounded-3xl p-6">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs uppercase tracking-widest text-smoke">{label}</p>
      </div>
      <p className="font-display text-3xl font-bold text-chalk">{value}</p>
      {sub && <p className="text-xs text-smoke">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass space-y-2 rounded-3xl p-6">
      <p className="text-xs uppercase tracking-widest text-smoke">{title}</p>
      <div className="space-y-1 text-sm">{children}</div>
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
