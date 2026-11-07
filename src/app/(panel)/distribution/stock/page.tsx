"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Figure, useDistributor } from "@/components/distribution-ui";
import { FormDialog, PagedTable, usePagedList } from "@/components/setup-ui";
import { Button, Card, Empty, ErrorNote, Input, PageHeader, Skeleton } from "@/components/ui";
import { api, post } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import { day, money, TIME_ZONE } from "@/lib/format";
import type { DailyStock, DistributorBalance, Movement, StockRow } from "@/lib/types";

const kinds: Record<Movement["kind"], string> = {
  RECEIPT: "Received",
  DELIVERY: "Delivered",
  DAMAGE: "Damaged",
  ADJUSTMENT: "Adjustment",
};

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());

function Balance({ distributor }: { distributor: number }) {
  const { data, error, refetch } = useQuery({
    queryKey: ["/distribution/balance", distributor],
    queryFn: () => api<DistributorBalance>(`/distribution/balance?distributor=${distributor}`),
  });

  if (error) return <ErrorNote error={error} onRetry={() => refetch()} />;
  if (!data) return <Skeleton className="h-24" />;

  const owing = Number(data.balance);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Figure label={owing < 0 ? "In credit" : "Owed to company"} value={money(Math.abs(owing))} tone={owing > 0 ? "bad" : "ok"} />
      <Figure label="Stock received" value={money(data.received)} />
      <Figure label="Deposits confirmed" value={money(data.deposits)} />
      <Figure label="Claims approved" value={money(data.claims)} />
    </div>
  );
}

function DailyTable({ distributor }: { distributor: number }) {
  const [date, setDate] = useState(today);
  const { data, error, refetch } = useQuery({
    queryKey: ["/stock/daily", distributor, date],
    queryFn: () => api<DailyStock>(`/stock/daily?distributor=${distributor}&date=${date}`),
  });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Daily stock</h2>
        <Input type="date" aria-label="Date" className="max-w-44" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>
      {error ? (
        <ErrorNote error={error} onRetry={() => refetch()} />
      ) : !data ? (
        <Skeleton className="h-40" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="num w-full min-w-[36rem] text-sm">
            <thead className="text-left text-ink-2">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 text-right font-medium">Opening</th>
                <th className="px-5 py-3 text-right font-medium">In</th>
                <th className="px-5 py-3 text-right font-medium">Out</th>
                <th className="px-5 py-3 text-right font-medium">Closing</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.product} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-semibold">{row.name}</td>
                  <td className="px-5 py-3 text-right">{row.opening}</td>
                  <td className="px-5 py-3 text-right">{row.stockIn || "—"}</td>
                  <td className="px-5 py-3 text-right">{row.stockOut || "—"}</td>
                  <td className="px-5 py-3 text-right font-semibold">{row.closing}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.rows.length === 0 && <Empty title="No stock on this date" />}
        </Card>
      )}
    </section>
  );
}

function History({ distributor }: { distributor: number }) {
  const list = usePagedList<Movement>("/stock/movements", { distributor });
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-bold">Stock history</h2>
      <PagedTable
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="No stock movements yet"
        columns={[
          { header: "Date", cell: (row) => day(row.date) },
          { header: "Product", cell: (row) => <span className="font-semibold">{row.productName}</span> },
          { header: "What", cell: (row) => kinds[row.kind] },
          { header: "Reference", cell: (row) => row.reference || row.note || "—" },
          { header: "Quantity", align: "right", cell: (row) => (row.quantity > 0 ? `+${row.quantity}` : row.quantity) },
        ]}
      />
    </section>
  );
}

function AdjustDialog({ distributor, rows, onClose }: { distributor: number; rows: StockRow[]; onClose: () => void }) {
  const client = useQueryClient();
  return (
    <FormDialog
      title="Adjust stock to a count"
      submitLabel="Adjust"
      fields={[
        { name: "product", label: "Product", type: "select", required: true, options: rows.map((row) => ({ value: row.product, label: `${row.name} (${row.quantity})` })) },
        { name: "counted", label: "Counted quantity", type: "number", required: true },
        { name: "note", label: "Reason", required: true, wide: true, placeholder: "Monthly stock count" },
      ]}
      onClose={onClose}
      onSubmit={async (values) => {
        await post("/stock/adjust", { ...values, distributor, counted: Number(values.counted) });
        client.invalidateQueries();
      }}
    />
  );
}

export default function StockPage() {
  const { user } = useAuth();
  const { id, select, ready } = useDistributor();
  const [adjusting, setAdjusting] = useState(false);
  const { data, error, refetch } = useQuery({
    queryKey: ["/stock", id],
    queryFn: () => api<StockRow[]>(`/stock?distributor=${id}`),
    enabled: id !== undefined,
  });
  const units = data?.reduce((sum, row) => sum + row.quantity, 0) ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <PageHeader title="Stock" subtitle={data ? `${units.toLocaleString("en-US")} units on hand` : "What each distributor holds"}>
        {can.manageAccounts(user?.role) && data && (
          <Button onClick={() => setAdjusting(true)}>Adjust</Button>
        )}
      </PageHeader>

      {select && <div className="max-w-sm">{select}</div>}
      {ready && id === undefined && <Empty title="No distributors yet" hint="Add one under Sales setup first." />}

      {id !== undefined && (
        <>
          <Balance distributor={id} />
          {error ? (
            <ErrorNote error={error} onRetry={() => refetch()} />
          ) : !data ? (
            <Skeleton className="h-40" />
          ) : (
            <Card className="overflow-x-auto">
              <table className="num w-full min-w-[30rem] text-sm">
                <thead className="text-left text-ink-2">
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 font-medium">Product</th>
                    <th className="px-5 py-3 font-medium">SKU</th>
                    <th className="px-5 py-3 text-right font-medium">Cases</th>
                    <th className="px-5 py-3 text-right font-medium">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.product} className="border-b border-line last:border-0">
                      <td className="px-5 py-3 font-semibold">{row.name}</td>
                      <td className="px-5 py-3">{row.sku}</td>
                      <td className="px-5 py-3 text-right">{row.cases}</td>
                      <td className={`px-5 py-3 text-right font-semibold ${row.quantity === 0 ? "text-bad" : ""}`}>{row.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length === 0 && <Empty title="No stock yet" hint="Stock appears when a company invoice is received." />}
            </Card>
          )}
          <DailyTable distributor={id} />
          <History distributor={id} />
        </>
      )}

      {adjusting && id !== undefined && data && <AdjustDialog distributor={id} rows={data} onClose={() => setAdjusting(false)} />}
    </div>
  );
}
