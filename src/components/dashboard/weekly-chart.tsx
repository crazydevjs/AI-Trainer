"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface DayPoint {
  day: string;
  calories: number;
}

export function WeeklyChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 6, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="cal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff7a18" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#ff7a18" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          stroke="#6b6b76"
          tickLine={false}
          axisLine={false}
          fontSize={12}
        />
        <YAxis stroke="#6b6b76" tickLine={false} axisLine={false} fontSize={12} />
        <Tooltip
          cursor={{ stroke: "#ff7a18", strokeWidth: 1, strokeDasharray: "4 4" }}
          contentStyle={{
            background: "rgba(18,18,22,0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            color: "#f5f5f7",
          }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={(v) => [`${v} kcal`, "Burned"] as [string, string]}
        />
        <Area
          type="monotone"
          dataKey="calories"
          stroke="#ff7a18"
          strokeWidth={2.5}
          fill="url(#cal)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
