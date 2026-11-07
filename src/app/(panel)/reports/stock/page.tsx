"use client";

import { useQuery } from "@tanstack/react-query";
import { Figure } from "@/components/distribution-ui";
import { ReportActions } from "@/components/report-ui";
import { Card, Empty, ErrorNote, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { downloadCsv } from "@/lib/export";
import { money } from "@/lib/format";
import type { StockSummaryRow } from "@/lib/types";

export default function StockReportPage() {
  const { data, error, refetch } = useQuery({
    queryKey: ["/reports/stock-summary"],
    queryFn: () => api<StockSummaryRow[]>("/reports/stock-summary"),
  });
  const rows = data ?? [];
  const value = rows.reduce((sum, row) => sum + Number(row.value), 0);
  const units = rows.reduce((sum, row) => sum + row.units, 0);

  return (
    <div className="print-doc mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <PageHeader title="Stock value" subtitle="What each distributor holds now, at current trade price">
        <ReportActions
          disabled={rows.length === 0}
          onExport={() =>
            downloadCsv(
              "stock-value",
              ["Distributor", "Products in stock", "Units", "Value"],
              rows.map((row) => [row.name, row.products, row.units, row.value]),
            )
          }
        />
      </PageHeader>

      {error && <ErrorNote error={error} onRetry={() => refetch()} />}
      {!data && !error && <Skeleton className="h-60" />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Figure label="Total stock value" value={money(value)} />
            <Figure label="Total units" value={units.toLocaleString("en-US")} />
          </div>
          <Card className="overflow-x-auto">
            <table className="num w-full min-w-[30rem] text-sm">
              <thead className="text-left text-ink-2">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-medium">Distributor</th>
                  <th className="px-5 py-3 text-right font-medium">Products</th>
                  <th className="px-5 py-3 text-right font-medium">Units</th>
                  <th className="px-5 py-3 text-right font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.distributor} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-semibold">{row.name}</td>
                    <td className="px-5 py-3 text-right">{row.products}</td>
                    <td className="px-5 py-3 text-right">{row.units.toLocaleString("en-US")}</td>
                    <td className="px-5 py-3 text-right font-semibold">{money(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <Empty title="No distributors yet" />}
          </Card>
        </>
      )}
    </div>
  );
}
