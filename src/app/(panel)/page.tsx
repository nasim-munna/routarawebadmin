"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CheckInsChart, TrendChart } from "@/components/charts";
import { Card, Empty, ErrorNote, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { day, money } from "@/lib/format";
import type { Overview } from "@/lib/types";

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-ink-2">{label}</p>
      <p className="num mt-1 font-display text-3xl font-bold">{value.toLocaleString("en-US")}</p>
      <p className="mt-1 text-xs text-ink-3">{note}</p>
    </Card>
  );
}

function SalesStrip({ sales }: { sales: Overview["sales"] }) {
  const tiles = [
    { label: "Net order today", value: money(sales.netOrder), note: `${sales.memos} ${sales.memos === 1 ? "memo" : "memos"}` },
    { label: "Calls", value: `${sales.calls} / ${sales.scheduled}`, note: `${sales.callPercent}% of plan` },
    { label: "Productive calls", value: String(sales.productive), note: `${sales.productivePercent}% of calls` },
    { label: "Value per memo", value: money(sales.valuePerMemo), note: "Today" },
  ];

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">Sales this month</h2>
          <p className="num text-sm text-ink-2">
            {money(sales.monthAchieved)} of {money(sales.monthTarget)} target
          </p>
        </div>
        <p className="num font-display text-3xl font-bold">{sales.monthPercent}%</p>
      </div>
      <div className="mb-5 h-2.5 rounded-full bg-surface-2" role="img" aria-label={`${sales.monthPercent}% of monthly target`}>
        <div className="h-2.5 rounded-full bg-marigold" style={{ width: `${Math.min(100, sales.monthPercent)}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label}>
            <p className="text-sm font-medium text-ink-2">{tile.label}</p>
            <p className="num font-display text-2xl font-bold">{tile.value}</p>
            <p className="text-xs text-ink-3">{tile.note}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PresenceStrip({ presence }: { presence: Overview["presence"] }) {
  const segments = [
    { key: "Online", value: presence.online, color: "#4cc791" },
    { key: "Idle", value: presence.idle, color: "#f2a93b" },
    { key: "Offline", value: presence.offline, color: "#7b8a87" },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={segments.map((s) => `${s.key} ${s.value}`).join(", ")}>
        {total === 0 && <div className="flex-1 bg-white/15" />}
        {segments.map(
          (segment) =>
            segment.value > 0 && <div key={segment.key} style={{ flexGrow: segment.value, background: segment.color }} title={`${segment.key}: ${segment.value}`} />,
        )}
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: segment.color }} aria-hidden="true" />
            <dt className="text-[#c9d8d4]">{segment.key}</dt>
            <dd className="num font-semibold">{segment.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function OverviewPage() {
  const { data, error, refetch, isPending } = useQuery({
    queryKey: ["overview"],
    queryFn: () => api<Overview>("/dashboard/overview"),
    refetchInterval: 60_000,
  });

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader title="Overview" subtitle={data ? `${day(data.date)} · updates every minute` : "Today across your team"} />

      {error && <ErrorNote error={error} onRetry={() => refetch()} />}
      {isPending && <Skeleton className="h-96" />}

      {data && (
        <div className="space-y-4">
          <section className="grid gap-6 rounded-2xl bg-pine p-6 text-[#f6f3ec] md:grid-cols-[auto_1fr] md:items-center md:gap-12 md:p-8">
            <div>
              <p className="text-sm text-[#c9d8d4]">Attendance today</p>
              <p className="num font-display text-6xl font-bold">{data.attendanceRate}%</p>
              <p className="num mt-1 text-sm text-[#c9d8d4]">
                {data.present} of {data.fieldStaff} checked in
              </p>
            </div>
            <div>
              <p className="mb-3 text-sm text-[#c9d8d4]">Who is connected right now</p>
              <PresenceStrip presence={data.presence} />
            </div>
          </section>

          <SalesStrip sales={data.sales} />

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Field staff" value={data.fieldStaff} note="Employees and managers" />
            <Stat label="Present" value={data.present} note="Checked in today" />
            <Stat label="Working now" value={data.working} note="Not checked out yet" />
            <Stat label="Absent" value={data.absent} note="No check-in today" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="font-display text-lg font-bold">When people started today</h2>
              <p className="mb-4 text-sm text-ink-2">First check-in of each person, by hour</p>
              {data.present ? <CheckInsChart data={data.checkInsByHour} /> : <Empty title="No check-ins yet today" />}
            </Card>
            <Card className="p-5">
              <h2 className="font-display text-lg font-bold">Last 7 days</h2>
              <p className="mb-4 text-sm text-ink-2">People present each day</p>
              <TrendChart data={data.trend} />
            </Card>
          </div>

          <Card className="overflow-x-auto">
            <div className="flex items-center justify-between p-5 pb-3">
              <h2 className="font-display text-lg font-bold">By division</h2>
              <Link href="/attendance" className="text-sm font-semibold text-brand hover:underline">
                See attendance
              </Link>
            </div>
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="text-left text-ink-2">
                <tr className="border-y border-line">
                  <th className="px-5 py-2 font-medium">Division</th>
                  <th className="px-5 py-2 text-right font-medium">Staff</th>
                  <th className="px-5 py-2 text-right font-medium">Present</th>
                  <th className="px-5 py-2 text-right font-medium">Online</th>
                  <th className="w-1/3 px-5 py-2 font-medium">Attendance</th>
                </tr>
              </thead>
              <tbody className="num">
                {data.divisions.map((row) => {
                  const rate = row.total ? Math.round((row.present / row.total) * 100) : 0;
                  return (
                    <tr key={row.divisionId ?? "none"} className="border-b border-line last:border-0">
                      <td className="px-5 py-3 font-semibold">{row.name ?? "Not assigned"}</td>
                      <td className="px-5 py-3 text-right">{row.total}</td>
                      <td className="px-5 py-3 text-right">{row.present}</td>
                      <td className="px-5 py-3 text-right">{row.online}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-surface-2">
                            <div className="h-2 rounded-full bg-brand" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="w-10 text-right text-ink-2">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.divisions.length === 0 && <Empty title="No field staff yet" hint="Add people to see them here." />}
          </Card>
        </div>
      )}
    </div>
  );
}
