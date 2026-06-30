"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SMOOTHING_DEFAULTS,
  loadSmoothing,
  saveSmoothing,
  resetSmoothing,
  type SmoothingParams,
} from "@/lib/pose/smoothing-config";
import { detectTier } from "@/lib/pose/device-tier";

const UNLOCK_CODE = "forge";

export default function DeveloperSettingsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [params, setParams] = useState<SmoothingParams>(SMOOTHING_DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [tier, setTier] = useState<string>("");

  useEffect(() => {
    // Unlock via ?unlock=forge (persisted). Always available in dev builds.
    const q = new URLSearchParams(window.location.search).get("unlock");
    if (q === UNLOCK_CODE) localStorage.setItem("forge:dev", "1");
    const isDev = process.env.NODE_ENV !== "production";
    setUnlocked(isDev || localStorage.getItem("forge:dev") === "1");
    setParams(loadSmoothing());
    setTier(detectTier());
  }, []);

  if (!unlocked) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <FlaskConical className="mb-3 h-8 w-8 text-smoke" />
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">
          Developer settings
        </h1>
        <p className="mt-2 text-sm text-fog">This area isn&apos;t available.</p>
      </div>
    );
  }

  const update = (k: keyof SmoothingParams, v: number) => {
    setParams((p) => ({ ...p, [k]: v }));
    setSaved(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-6 w-6 text-volt" />
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">
          Developer settings
        </h1>
      </div>
      <p className="text-sm text-fog">
        One-Euro smoothing tuning. Device tier detected:{" "}
        <span className="font-semibold text-chalk">{tier || "…"}</span>. Changes
        apply the next time you start a workout.
      </p>

      <div className="glass space-y-6 rounded-3xl p-6">
        <Slider
          label="minCutoff"
          value={params.minCutoff}
          min={0.1}
          max={5}
          step={0.1}
          onChange={(v) => update("minCutoff", v)}
          help="Baseline smoothing when nearly still. Lower = smoother/steadier but more lag; higher = snappier but more jitter."
        />
        <Slider
          label="beta"
          value={params.beta}
          min={0}
          max={0.1}
          step={0.001}
          onChange={(v) => update("beta", v)}
          help="Speed reactivity. Higher = less lag during fast/heavy reps (but more jitter at speed); lower = steadier but can lag quick movements."
        />
        <Slider
          label="dCutoff"
          value={params.dCutoff}
          min={0.1}
          max={5}
          step={0.1}
          onChange={(v) => update("dCutoff", v)}
          help="Smoothing of the speed estimate itself. Rarely needs changing; lower it only if the filter feels twitchy when accelerating."
        />

        <div className="flex gap-3">
          <Button
            onClick={() => {
              saveSmoothing(params);
              setSaved(true);
            }}
          >
            <Save className="h-4 w-4" />
            {saved ? "Saved" : "Save"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              resetSmoothing();
              setParams(SMOOTHING_DEFAULTS);
              setSaved(true);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset to defaults
          </Button>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 text-sm text-fog">
        <h2 className="font-display mb-3 text-lg font-semibold uppercase tracking-wide text-chalk">
          Recommended defaults
        </h2>
        <ul className="space-y-2">
          <li>
            <b className="text-chalk">minCutoff = {SMOOTHING_DEFAULTS.minCutoff}</b> — good
            balance of stability and latency for rep turnaround detection.
          </li>
          <li>
            <b className="text-chalk">beta = {SMOOTHING_DEFAULTS.beta}</b> — keeps fast/heavy
            reps responsive without introducing rep miscounts.
          </li>
          <li>
            <b className="text-chalk">dCutoff = {SMOOTHING_DEFAULTS.dCutoff}</b> — standard;
            leave as-is unless tracking feels twitchy.
          </li>
        </ul>
        <p className="mt-4 text-xs text-smoke">
          Effect on the coach: more smoothing → steadier angles &amp; form scores and
          fewer false reps, but a touch more latency; less smoothing → snappier
          counting but more jitter and risk of double-counts. Tune one parameter
          at a time and re-test slow, fast, and heavy reps.
        </p>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  help: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="font-mono text-sm text-chalk">{label}</label>
        <span className="font-mono text-sm text-volt">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-ember"
      />
      <p className="mt-1 text-xs text-smoke">{help}</p>
    </div>
  );
}
