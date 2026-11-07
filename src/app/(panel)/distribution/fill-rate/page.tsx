"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Figure, useDistributor } from "@/components/distribution-ui";
import { Card, Empty, ErrorNote, Input, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { money, TIME_ZONE } from "@/lib/format";
import type { FillRow } from "@/lib/types";

const thisMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date()).slice(0, 7);

export default function FillRatePage() {
  const { id, select } = useDistributor({ allowAll: true });
  const [month, setMonth] = useState(thisMonth);
  const params = new URLSearchParams({ month });
  if (id !== undefined) params.set("distributor", String(id));

  const { data, error, refetch } = useQuery({
    queryKey: ["/reports/order-vs-delivery", params.toString()],
    queryFn: () => api<FillRow[]>(`/reports/order-vs-delivery?${params}`),
    enabled: Boolean(month),
  });

  const ordered = data?.reduce((sum, row) => sum + Number(row.orderedValue), 0) ?? 0;
  const delivered = data?.reduce((sum, row) => sum + Number(row.deliveredValue), 0) ?? 0;
  const percent = ordered ? Math.round((delivered / ordered) * 1000) / 10 : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <PageHeader title="Order vs delivery" subtitle="What reps sold against what actually reached outlets" />

      <div className="grid gap-2 sm:grid-cols-3">
        {select}
        <Input type="month" aria-label="Month" value={month} onChange={(event) => setMonth(event.target.value)} />
      </div>

      {error && <ErrorNote error={error} onRetry={() => refetch()} />}
      {!data && !error && <Skeleton className="h-60" />}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Figure label="Ordered" value={money(ordered)} hint="Before discount" />
            <Figure label="Delivered" value={money(delivered)} hint="Before discount" />
            <Figure label="Fill rate" value={`${percent}%`} />
          </div>
          <Card className="overflow-x-auto">
            <table className="num w-full min-w-[36rem] text-sm">
              <thead className="text-left text-ink-2">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 text-right font-medium">Ordered</th>
                  <th className="px-5 py-3 text-right font-medium">Delivered</th>
                  <th className="px-5 py-3 text-right font-medium">Short</th>
                  <th className="px-5 py-3 text-right font-medium">Fill</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.product} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-semibold">{row.name}</td>
                    <td className="px-5 py-3 text-right">{row.ordered}</td>
                    <td className="px-5 py-3 text-right">{row.delivered}</td>
                    <td className="px-5 py-3 text-right">{row.ordered - row.delivered || "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold">{row.fillPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length === 0 && <Empty title="No orders this month" />}
          </Card>
        </>
      )}
    </div>
  );
}
