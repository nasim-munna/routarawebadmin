"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Figure, useDistributor } from "@/components/distribution-ui";
import { ReportActions } from "@/components/report-ui";
import { Card, Empty, ErrorNote, Field, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { downloadCsv } from "@/lib/export";
import { day, money, TIME_ZONE } from "@/lib/format";
import type { SalesReport } from "@/lib/types";

const groups = { rep: "Rep", territory: "Territory", distributor: "Distributor", outlet: "Outlet", product: "Product" } as const;
type Group = keyof typeof groups;

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());

const fill = (ordered: string, delivered: string) => (Number(ordered) ? Math.round((Number(delivered) / Number(ordered)) * 1000) / 10 : 0);

export default function SalesReportPage() {
  const { id, select } = useDistributor({ allowAll: true });
  const [from, setFrom] = useState(() => `${today().slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [group, setGroup] = useState<Group>("rep");

  const params = new URLSearchParams({ from, to, group });
  if (id !== undefined) params.set("distributor", String(id));

  const { data, error, refetch } = useQuery({
    queryKey: ["/reports/sales", params.toString()],
    queryFn: () => api<SalesReport>(`/reports/sales?${params}`),
    enabled: Boolean(from && to),
  });

  const rows = data?.rows ?? [];
  const byProduct = data?.group === "product";
  const ordered = rows.reduce((sum, row) => sum + Number(row.ordered), 0);
  const delivered = rows.reduce((sum, row) => sum + Number(row.delivered), 0);
  const memos = byProduct ? undefined : rows.reduce((sum, row) => sum + row.orders, 0);

  function exportRows() {
    const label = groups[data?.group ?? group];
    downloadCsv(
      `sales-by-${group}-${from}-to-${to}`,
      byProduct ? [label, "Orders", "Units ordered", "Units delivered", "Ordered value", "Delivered value", "Fill %"] : [label, "Orders", "Ordered value", "Delivered value", "Fill %"],
      rows.map((row) =>
        byProduct
          ? [row.name, row.orders, row.units, row.deliveredUnits, row.ordered, row.delivered, fill(row.ordered, row.delivered)]
          : [row.name, row.orders, row.ordered, row.delivered, fill(row.ordered, row.delivered)],
      ),
    );
  }

  return (
    <div className="print-doc mx-auto max-w-6xl space-y-4 p-4 md:p-8">
      <PageHeader title={`Sales by ${groups[group].toLowerCase()}`} subtitle={from && to ? `${day(from)} to ${day(to)}` : "Choose your dates"}>
        <ReportActions onExport={exportRows} disabled={rows.length === 0} />
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <Field label="From">
          <Input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
        </Field>
        <Field label="Group by">
          <Select value={group} onChange={(event) => setGroup(event.target.value as Group)}>
            {Object.entries(groups).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        {select && <Field label="Distributor">{select}</Field>}
      </div>

      {error && <ErrorNote error={error} onRetry={() => refetch()} />}
      {!data && !error && <Skeleton className="h-60" />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Figure label="Ordered" value={money(ordered)} hint={byProduct ? "Before discount" : "After discount"} />
            <Figure label="Delivered" value={money(delivered)} hint={byProduct ? "Before discount" : "After discount"} />
            <Figure label="Fill rate" value={`${ordered ? Math.round((delivered / ordered) * 1000) / 10 : 0}%`} />
            {memos !== undefined && <Figure label="Orders" value={memos.toLocaleString("en-US")} />}
          </div>

          <Card className="overflow-x-auto">
            <table className="num w-full min-w-[36rem] text-sm">
              <thead className="text-left text-ink-2">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-medium">{groups[data.group]}</th>
                  <th className="px-5 py-3 text-right font-medium">Orders</th>
                  {byProduct && <th className="px-5 py-3 text-right font-medium">Units</th>}
                  {byProduct && <th className="px-5 py-3 text-right font-medium">Units delivered</th>}
                  <th className="px-5 py-3 text-right font-medium">Ordered</th>
                  <th className="px-5 py-3 text-right font-medium">Delivered</th>
                  <th className="px-5 py-3 text-right font-medium">Fill</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-semibold">{row.name}</td>
                    <td className="px-5 py-3 text-right">{row.orders}</td>
                    {byProduct && <td className="px-5 py-3 text-right">{row.units}</td>}
                    {byProduct && <td className="px-5 py-3 text-right">{row.deliveredUnits}</td>}
                    <td className="px-5 py-3 text-right">{money(row.ordered)}</td>
                    <td className="px-5 py-3 text-right">{money(row.delivered)}</td>
                    <td className="px-5 py-3 text-right font-semibold">{fill(row.ordered, row.delivered)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <Empty title="No sales in these dates" />}
          </Card>
        </>
      )}
    </div>
  );
}
