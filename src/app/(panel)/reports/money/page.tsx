"use client";

import { useQuery } from "@tanstack/react-query";
import { Figure } from "@/components/distribution-ui";
import { ReportActions } from "@/components/report-ui";
import { Card, Empty, ErrorNote, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { downloadCsv } from "@/lib/export";
import { money } from "@/lib/format";
import type { MoneySummaryRow } from "@/lib/types";

export default function MoneyReportPage() {
  const { data, error, refetch } = useQuery({
    queryKey: ["/reports/money-summary"],
    queryFn: () => api<MoneySummaryRow[]>("/reports/money-summary"),
  });
  const rows = data ?? [];
  const total = (pick: (row: MoneySummaryRow) => string) => rows.reduce((sum, row) => sum + Number(pick(row)), 0);
  const owedToCompany = total((row) => row.balance);
  const outletDue = total((row) => row.outletDue);

  return (
    <div className="print-doc mx-auto max-w-6xl space-y-4 p-4 md:p-8">
      <PageHeader title="Money" subtitle="What distributors owe the company, and what outlets owe distributors">
        <ReportActions
          disabled={rows.length === 0}
          onExport={() =>
            downloadCsv(
              "money-summary",
              ["Distributor", "Stock received", "Deposits", "Claims", "Owed to company", "Sold to outlets", "Collected", "Outlet dues"],
              rows.map((row) => [row.name, row.received, row.deposits, row.claims, row.balance, row.sold, row.collected, row.outletDue]),
            )
          }
        />
      </PageHeader>

      {error && <ErrorNote error={error} onRetry={() => refetch()} />}
      {!data && !error && <Skeleton className="h-60" />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Figure label="Owed to company" value={money(owedToCompany)} hint="All distributors" tone={owedToCompany > 0 ? "bad" : undefined} />
            <Figure label="Outlet dues" value={money(outletDue)} hint="Owed to distributors" tone={outletDue > 0 ? "bad" : undefined} />
          </div>
          <Card className="overflow-x-auto">
            <table className="num w-full min-w-[52rem] text-sm">
              <thead className="text-left text-ink-2">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-medium">Distributor</th>
                  <th className="px-5 py-3 text-right font-medium">Received</th>
                  <th className="px-5 py-3 text-right font-medium">Deposits</th>
                  <th className="px-5 py-3 text-right font-medium">Claims</th>
                  <th className="px-5 py-3 text-right font-medium">Owed to company</th>
                  <th className="px-5 py-3 text-right font-medium">Sold</th>
                  <th className="px-5 py-3 text-right font-medium">Collected</th>
                  <th className="px-5 py-3 text-right font-medium">Outlet dues</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.distributor} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-semibold">{row.name}</td>
                    <td className="px-5 py-3 text-right">{money(row.received)}</td>
                    <td className="px-5 py-3 text-right">{money(row.deposits)}</td>
                    <td className="px-5 py-3 text-right">{money(row.claims)}</td>
                    <td className="px-5 py-3 text-right font-semibold">{money(row.balance)}</td>
                    <td className="px-5 py-3 text-right">{money(row.sold)}</td>
                    <td className="px-5 py-3 text-right">{money(row.collected)}</td>
                    <td className="px-5 py-3 text-right font-semibold">{money(row.outletDue)}</td>
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
