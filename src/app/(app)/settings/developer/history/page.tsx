"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star, Trash2, Download, FlaskConical } from "lucide-react";
import {
  loadSessions,
  deleteSession,
  toggleFavorite,
  type DevSession,
} from "@/lib/dev-history";

type SortKey = "date" | "fps" | "inference" | "confidence" | "accuracy";

const acc = (s: DevSession) =>
  s.actualReps + s.missedReps > 0
    ? Math.round((100 * s.actualReps) / (s.actualReps + s.missedReps))
    : 100;

export default function DevHistoryPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [sessions, setSessions] = useState<DevSession[]>([]);
  const [q, setQ] = useState("");
  const [engine, setEngine] = useState<"all" | "2D" | "3D">("all");
  const [favOnly, setFavOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("date");
  const [sel, setSel] = useState<Set<string>>(new Set());

  const refresh = () => setSessions(loadSessions());

  useEffect(() => {
    const isDev = process.env.NODE_ENV !== "production";
    setUnlocked(isDev || localStorage.getItem("forge:dev") === "1");
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = sessions.filter((s) => {
      if (engine !== "all" && s.engine !== engine) return false;
      if (favOnly && !s.favorite) return false;
      if (!term) return true;
      return (
        s.exercise.toLowerCase().includes(term) ||
        (s.device ?? "").toLowerCase().includes(term) ||
        (s.notes ?? "").toLowerCase().includes(term) ||
        s.aiBuild.toLowerCase().includes(term)
      );
    });
    const by: Record<SortKey, (a: DevSession, b: DevSession) => number> = {
      date: (a, b) => b.ts - a.ts,
      fps: (a, b) => b.avgFps - a.avgFps,
      inference: (a, b) => a.avgInferenceMs - b.avgInferenceMs,
      confidence: (a, b) => b.confidence - a.confidence,
      accuracy: (a, b) => acc(b) - acc(a),
    };
    return [...list].sort(by[sort]);
  }, [sessions, q, engine, favOnly, sort]);

  const selected = sessions.filter((s) => sel.has(s.id));

  if (!unlocked) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <FlaskConical className="mb-3 h-8 w-8 text-smoke" />
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">
          Session history
        </h1>
        <p className="mt-2 text-sm text-fog">This area isn&apos;t available.</p>
      </div>
    );
  }

  const toggleSel = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="space-y-6">
      <Link
        href="/settings/developer"
        className="inline-flex items-center gap-2 text-sm text-fog hover:text-chalk"
      >
        <ArrowLeft className="h-4 w-4" />
        Developer settings
      </Link>
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">
        Session history <span className="text-base text-smoke">({sessions.length})</span>
      </h1>

      {/* Trends */}
      <Trends sessions={sessions} />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          placeholder="Search exercise / device / notes / build…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-chalk outline-none focus:border-ember/50"
        />
        <select value={engine} onChange={(e) => setEngine(e.target.value as never)} className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-sm text-chalk">
          <option value="all">All engines</option>
          <option value="2D">2D</option>
          <option value="3D">3D</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-sm text-chalk">
          <option value="date">Sort: Date</option>
          <option value="fps">Sort: FPS</option>
          <option value="inference">Sort: Inference</option>
          <option value="confidence">Sort: Confidence</option>
          <option value="accuracy">Sort: Accuracy</option>
        </select>
        <button
          onClick={() => setFavOnly((v) => !v)}
          className={`h-10 rounded-xl border px-3 text-sm ${favOnly ? "border-amber/50 bg-amber/15 text-amber" : "border-white/10 bg-white/[0.03] text-fog"}`}
        >
          ★ Favorites
        </button>
      </div>

      {/* Export selected */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-fog">{selected.length} selected</span>
          <button onClick={() => exportJson(selected)} className="rounded-lg border border-volt/30 bg-volt/10 px-3 py-1.5 text-xs font-mono text-volt">
            <Download className="mr-1 inline h-3 w-3" /> JSON
          </button>
          <button onClick={() => exportCsv(selected)} className="rounded-lg border border-volt/30 bg-volt/10 px-3 py-1.5 text-xs font-mono text-volt">
            <Download className="mr-1 inline h-3 w-3" /> CSV
          </button>
          <button onClick={() => setSel(new Set())} className="text-xs text-smoke hover:text-chalk">clear</button>
        </div>
      )}

      {/* Comparison */}
      {selected.length >= 2 && <Compare sessions={selected} />}

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="glass rounded-2xl p-8 text-center text-fog">No sessions recorded yet.</p>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-widest text-smoke">
              <tr className="border-b border-white/10">
                <th className="p-3"></th>
                <th className="p-3">Date</th>
                <th className="p-3">Exercise</th>
                <th className="p-3">Eng</th>
                <th className="p-3">FPS</th>
                <th className="p-3">Inf</th>
                <th className="p-3">Conf</th>
                <th className="p-3">Reps</th>
                <th className="p-3">Acc</th>
                <th className="p-3">TL/FB</th>
                <th className="p-3">Device</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3">
                    <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggleSel(s.id)} className="accent-ember" />
                  </td>
                  <td className="whitespace-nowrap p-3 text-fog">{new Date(s.ts).toLocaleString()}</td>
                  <td className="p-3 text-chalk">{s.exercise}{s.weight ? ` · ${s.weight}` : ""}</td>
                  <td className="p-3">
                    <span className={s.engine === "3D" ? "text-volt" : "text-fog"}>{s.engine}</span>
                  </td>
                  <td className="p-3">{s.avgFps}</td>
                  <td className="p-3">{s.avgInferenceMs}ms</td>
                  <td className="p-3">{s.confidence}%</td>
                  <td className="p-3">{s.actualReps}</td>
                  <td className="p-3">{acc(s)}%</td>
                  <td className="p-3 text-smoke">{s.trackingLoss}/{s.fallbackEvents}</td>
                  <td className="max-w-[120px] truncate p-3 text-smoke" title={s.device}>{s.device}</td>
                  <td className="whitespace-nowrap p-3">
                    <button onClick={() => { toggleFavorite(s.id); refresh(); }} className={s.favorite ? "text-amber" : "text-smoke hover:text-chalk"}>
                      <Star className={`h-4 w-4 ${s.favorite ? "fill-amber" : ""}`} />
                    </button>
                    <button onClick={() => { if (confirm("Delete session?")) { deleteSession(s.id); refresh(); } }} className="ml-2 text-smoke hover:text-ember">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Trends({ sessions }: { sessions: DevSession[] }) {
  if (sessions.length === 0) return null;
  const asc = [...sessions].sort((a, b) => a.ts - b.ts);
  const fps = asc.map((s) => s.avgFps);
  const inf = asc.map((s) => s.avgInferenceMs);
  const accs = asc.map(acc);
  const totalTL = sessions.reduce((s, x) => s + x.trackingLoss, 0);
  const totalFB = sessions.reduce((s, x) => s + x.fallbackEvents, 0);

  // per-exercise error rate
  const byEx: Record<string, { miss: number; tot: number }> = {};
  sessions.forEach((s) => {
    const e = (byEx[s.exercise] ??= { miss: 0, tot: 0 });
    e.miss += s.missedReps;
    e.tot += s.actualReps + s.missedReps;
  });
  const errRates = Object.entries(byEx)
    .map(([k, v]) => ({ ex: k, rate: v.tot ? Math.round((100 * v.miss) / v.tot) : 0 }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  return (
    <div className="glass grid gap-4 rounded-3xl p-5 sm:grid-cols-2 lg:grid-cols-4">
      <TrendCard label="Avg FPS over time" data={fps} max={60} color="#2bd4ff" />
      <TrendCard label="Avg inference (ms)" data={inf} max={Math.max(40, ...inf)} color="#ffc24b" />
      <TrendCard label="Rep accuracy %" data={accs} max={100} color="#2bff88" />
      <div>
        <p className="text-xs uppercase tracking-widest text-smoke">Failures</p>
        <p className="mt-2 text-sm text-fog">Tracking loss: <b className="text-chalk">{totalTL}</b></p>
        <p className="text-sm text-fog">Auto-fallbacks: <b className="text-chalk">{totalFB}</b></p>
        <p className="mt-2 text-xs uppercase tracking-widest text-smoke">Top error exercises</p>
        {errRates.map((e) => (
          <p key={e.ex} className="text-xs text-fog">{e.ex}: <b className="text-ember">{e.rate}%</b></p>
        ))}
      </div>
    </div>
  );
}

function TrendCard({ label, data, max, color }: { label: string; data: number[]; max: number; color: string }) {
  const w = 150, h = 36, n = data.length;
  const pts = n > 1 ? data.map((d, i) => `${(i / (n - 1)) * w},${h - Math.max(0, Math.min(1, d / max)) * h}`).join(" ") : "";
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-smoke">{label}</p>
      <svg width={w} height={h} className="mt-2 w-full">
        {pts && <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />}
      </svg>
      <p className="text-sm text-chalk">{data.length ? data[data.length - 1] : "—"}</p>
    </div>
  );
}

function Compare({ sessions }: { sessions: DevSession[] }) {
  const rows: [string, (s: DevSession) => string | number][] = [
    ["Engine", (s) => s.engine],
    ["Avg FPS", (s) => s.avgFps],
    ["Avg inference (ms)", (s) => s.avgInferenceMs],
    ["Confidence %", (s) => s.confidence],
    ["Reps", (s) => s.actualReps],
    ["Accuracy %", (s) => acc(s)],
    ["Tracking loss", (s) => s.trackingLoss],
    ["Fallbacks", (s) => s.fallbackEvents],
    ["Camera", (s) => s.cameraAngle ?? "—"],
    ["Tier", (s) => s.tier],
    ["Build", (s) => s.aiBuild],
  ];
  return (
    <div className="glass overflow-x-auto rounded-3xl p-5">
      <h2 className="font-display mb-3 text-lg font-semibold uppercase tracking-wide">Compare ({sessions.length})</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-widest text-smoke">
            <th className="p-2">Metric</th>
            {sessions.map((s) => (
              <th key={s.id} className="p-2 text-chalk">{s.exercise}<br /><span className="text-[10px] text-smoke">{new Date(s.ts).toLocaleDateString()}</span></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, fn]) => (
            <tr key={label} className="border-t border-white/5">
              <td className="p-2 text-fog">{label}</td>
              {sessions.map((s) => (
                <td key={s.id} className="p-2 text-chalk">{fn(s)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

function exportJson(list: DevSession[]) {
  download(`forge-sessions-${Date.now()}.json`, new Blob([JSON.stringify(list, null, 2)], { type: "application/json" }));
}

function exportCsv(list: DevSession[]) {
  const cols: (keyof DevSession)[] = [
    "ts", "exercise", "weight", "cameraAngle", "device", "tier", "engine",
    "avgFps", "avgInferenceMs", "confidence", "actualReps", "falseReps",
    "missedReps", "trackingLoss", "fallbackEvents", "aiBuild", "notes",
  ];
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["date", ...cols.filter((c) => c !== "ts")];
  const rows = list.map((s) => [
    new Date(s.ts).toISOString(),
    ...cols.filter((c) => c !== "ts").map((c) => s[c]),
  ]);
  const csv = [head, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  download(`forge-sessions-${Date.now()}.csv`, new Blob([csv], { type: "text/csv" }));
}
