"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { day, hourLabel } from "@/lib/format";
import type { Overview } from "@/lib/types";

const axis = { fontSize: 12, fill: "var(--ink-3)" };

function tooltipBox(label: string, value: number, unit: string) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-card">
      <p className="text-ink-2">{label}</p>
      <p className="num font-semibold text-ink">
        {value} {unit}
      </p>
    </div>
  );
}

export function CheckInsChart({ data }: { data: Overview["checkInsByHour"] }) {
  // The working day, widened if anyone started outside it.
  const busy = data.filter((row) => row.count > 0).map((row) => row.hour);
  const from = Math.min(7, ...busy);
  const to = Math.max(14, ...busy);
  const rows = data.filter((row) => row.hour >= from && row.hour <= to).map((row) => ({ ...row, label: hourLabel(row.hour) }));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: -24, right: 4, top: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            content={({ active, payload }) =>
              active && payload?.[0] ? tooltipBox(String(payload[0].payload.label), Number(payload[0].value), "started") : null
            }
          />
          <Bar dataKey="count" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({ data }: { data: Overview["trend"] }) {
  const rows = data.map((row) => ({ ...row, label: day(row.date).slice(0, 3) }));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ left: -24, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ stroke: "var(--ink-3)" }}
            content={({ active, payload }) =>
              active && payload?.[0] ? tooltipBox(day(String(payload[0].payload.date)), Number(payload[0].value), "present") : null
            }
          />
          <Line
            dataKey="present"
            stroke="var(--brand)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--brand)", stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
