"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Lightbulb, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SetReport } from "@/lib/pose/set-analysis";

const fatigueColor = (lvl: string) =>
  lvl === "Low" ? "text-neon" : lvl === "Moderate" ? "text-amber" : "text-ember";

export function RestScreen({
  report,
  timeLeft,
  total,
  totalSets,
  onSkip,
  onAddTime,
}: {
  report: SetReport;
  timeLeft: number;
  total: number;
  totalSets: number;
  onSkip: () => void;
  onAddTime: () => void;
}) {
  const pct = total > 0 ? (timeLeft / total) * 100 : 0;
  const r = 70;
  const circ = 2 * Math.PI * r;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 overflow-y-auto bg-black/90 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-2xl px-5 py-8">
        {/* Countdown */}
        <div className="flex flex-col items-center">
          <p className="text-xs uppercase tracking-widest text-smoke">
            Rest · next set {report.setNumber + 1} of {totalSets}
          </p>
          <div className="relative my-3 grid place-items-center">
            <svg width="180" height="180" className="-rotate-90">
              <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
              <circle
                cx="90"
                cy="90"
                r={r}
                fill="none"
                stroke="url(#restgrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - pct / 100)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
              <defs>
                <linearGradient id="restgrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2bd4ff" />
                  <stop offset="100%" stopColor="#2bff88" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute font-display text-6xl font-bold">{timeLeft}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onAddTime}>
              <Plus className="h-4 w-4" /> 15s
            </Button>
            <Button size="sm" onClick={onSkip}>
              Skip rest <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Set summary */}
        <h3 className="font-display mt-8 mb-3 text-lg font-semibold uppercase tracking-wide">
          Set {report.setNumber} debrief
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Form" value={`${report.avgForm}%`} />
          <Metric label="Depth" value={`${report.avgRom}%`} />
          <Metric label="Stability" value={`${report.avgStability}%`} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Metric label="Correct" value={`${report.correctReps}`} good />
          <Metric label="Invalid" value={`${report.invalidReps}`} bad={report.invalidReps > 0} />
          <Metric
            label="Fatigue"
            value={report.fatigue.level}
            className={fatigueColor(report.fatigue.level)}
          />
        </div>

        {/* Comparison */}
        {report.comparison && (
          <div className="glass mt-3 flex items-center justify-between rounded-2xl p-4 text-sm">
            <span className="text-fog">
              Set {report.setNumber - 1}: {report.comparison.prevForm}% → Set {report.setNumber}:{" "}
              {report.comparison.curForm}%
            </span>
            <span
              className={
                report.comparison.curForm >= report.comparison.prevForm ? "text-neon" : "text-amber"
              }
            >
              {report.comparison.note}
            </span>
          </div>
        )}

        {/* Mistakes */}
        {report.mistakes.length > 0 && (
          <Section title="Mistakes detected" icon={<AlertTriangle className="h-4 w-4 text-amber" />}>
            {report.mistakes.map((m, i) => (
              <Li key={i} dot="text-amber">{m}</Li>
            ))}
          </Section>
        )}

        {/* Suggestions */}
        <Section title="Improvement tips" icon={<Lightbulb className="h-4 w-4 text-neon" />}>
          {report.suggestions.map((s, i) => (
            <Li key={i} dot="text-neon">{s}</Li>
          ))}
        </Section>

        {/* Next-set focus */}
        {report.focus.length > 0 && (
          <Section title="Focus next set" icon={<Target className="h-4 w-4 text-ember" />}>
            {report.focus.map((f, i) => (
              <Li key={i} dot="text-ember">{f}</Li>
            ))}
          </Section>
        )}

        {/* Muscle activation (mind-muscle connection) */}
        {report.muscles.length > 0 && (
          <div className="glass mt-3 rounded-2xl p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-fog">
              Target muscles
            </p>
            <div className="space-y-2">
              {report.muscles.map((m) => (
                <div key={m.name} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm text-chalk">{m.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-ember to-flame"
                      style={{ width: `${m.activation}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-smoke">{m.activation}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Motivation */}
        <div className="glass-strong mt-4 rounded-2xl p-4 text-center text-sm font-medium text-chalk">
          {report.motivation}
        </div>
      </div>
    </motion.div>
  );
}

function Metric({
  label,
  value,
  good,
  bad,
  className,
}: {
  label: string;
  value: string;
  good?: boolean;
  bad?: boolean;
  className?: string;
}) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-smoke">{label}</p>
      <p
        className={`font-display text-xl font-bold ${
          className ?? (good ? "text-neon" : bad ? "text-ember" : "text-chalk")
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="glass mt-3 rounded-2xl p-4">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-fog">
        {icon}
        {title}
      </p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function Li({ children, dot }: { children: React.ReactNode; dot: string }) {
  return (
    <li className="flex gap-2 text-sm text-fog">
      <span className={dot}>•</span>
      {children}
    </li>
  );
}
