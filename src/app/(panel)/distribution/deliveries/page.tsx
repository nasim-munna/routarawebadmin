"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useState } from "react";
import { LinesTable, useDistributor } from "@/components/distribution-ui";
import { PagedTable, SearchBox, usePagedList } from "@/components/setup-ui";
import { Button, Dialog, ErrorNote, Field, Input, PageHeader, Skeleton } from "@/components/ui";
import { api, post } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import { day, money } from "@/lib/format";
import type { Delivery, Order, StockRow } from "@/lib/types";

function DeliverForm({ order, stock, onClose }: { order: Order; stock: StockRow[]; onClose: () => void }) {
  const client = useQueryClient();
  const onHand = (product: number) => stock.find((row) => row.product === product)?.quantity ?? 0;
  const [quantities, setQuantities] = useState<Record<number, string>>(() =>
    Object.fromEntries(order.lines.map((line) => [line.id, String(Math.min(line.quantity, onHand(line.product)))])),
  );
  const [collected, setCollected] = useState("");

  const gross = order.lines.reduce((sum, line) => sum + Number(line.tradePrice) * Number(quantities[line.id] || 0), 0);
  const discount = Math.round(gross * Number(order.discountPercent)) / 100;
  const total = gross - discount;

  const deliver = useMutation({
    mutationFn: () =>
      post("/deliveries", {
        order: order.id,
        collected: collected || "0",
        lines: order.lines.map((line) => ({ orderLine: line.id, quantity: Number(quantities[line.id] || 0) })),
      }),
    onSuccess: () => {
      client.invalidateQueries();
      onClose();
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        deliver.mutate();
      }}
    >
      {deliver.error && <ErrorNote error={deliver.error} />}
      <table className="num w-full text-sm">
        <thead className="text-left text-ink-2">
          <tr className="border-b border-line">
            <th className="py-2 font-medium">Product</th>
            <th className="py-2 text-right font-medium">Ordered</th>
            <th className="py-2 text-right font-medium">In stock</th>
            <th className="py-2 text-right font-medium">Deliver</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line) => {
            const available = onHand(line.product);
            return (
              <tr key={line.id} className="border-b border-line">
                <td className="py-2 font-semibold">{line.productName}</td>
                <td className="py-2 text-right">{line.quantity}</td>
                <td className={clsx("py-2 text-right", available < line.quantity && "font-semibold text-bad")}>{available}</td>
                <td className="py-2 pl-3">
                  <Input
                    aria-label={`Deliver ${line.productName}`}
                    type="number"
                    min={0}
                    max={Math.min(line.quantity, available)}
                    step={1}
                    className="ml-auto w-24 text-right"
                    value={quantities[line.id]}
                    onChange={(event) => setQuantities({ ...quantities, [line.id]: event.target.value })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <dl className="num space-y-1 text-sm">
        {discount > 0 && (
          <div className="flex justify-between text-ink-2">
            <dt>Discount ({Number(order.discountPercent)}%)</dt>
            <dd>− {money(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between font-semibold">
          <dt>Invoice total</dt>
          <dd>{money(total)}</dd>
        </div>
      </dl>

      <Field label="Cash collected now">
        <Input type="number" min={0} max={total} step="0.01" placeholder="0" value={collected} onChange={(event) => setCollected(event.target.value)} />
      </Field>
      <p className="text-sm text-ink-2">Anything not collected is added to what this outlet owes.</p>

      <div className="flex justify-end gap-2">
        <Button type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" busy={deliver.isPending} disabled={gross === 0}>
          Confirm delivery
        </Button>
      </div>
    </form>
  );
}

function DeliverDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const stock = useQuery({
    queryKey: ["/stock", order.distributor],
    queryFn: () => api<StockRow[]>(`/stock?distributor=${order.distributor}`),
    staleTime: 0,
  });

  return (
    <Dialog title={`Deliver to ${order.outletName}`} onClose={onClose}>
      <p className="mb-3 text-sm text-ink-2">
        Ordered {day(order.date)} by {order.employeeName}
      </p>
      {stock.error ? <ErrorNote error={stock.error} onRetry={() => stock.refetch()} /> : stock.data ? <DeliverForm order={order} stock={stock.data} onClose={onClose} /> : <Skeleton className="h-48" />}
    </Dialog>
  );
}

function InvoiceDialog({ delivery, onClose }: { delivery: Delivery; onClose: () => void }) {
  const due = Number(delivery.total) - Number(delivery.collected);
  return (
    <Dialog title={delivery.number} onClose={onClose}>
      <p className="mb-3 text-sm text-ink-2">
        {delivery.outletName} · {delivery.distributorName} · {day(delivery.date)}
      </p>
      <LinesTable lines={delivery.lines} />
      <dl className="num mt-3 space-y-1 text-sm">
        {Number(delivery.discountAmount) > 0 && (
          <div className="flex justify-between text-ink-2">
            <dt>Discount</dt>
            <dd>− {money(delivery.discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between font-semibold">
          <dt>Total</dt>
          <dd>{money(delivery.total)}</dd>
        </div>
        <div className="flex justify-between text-ink-2">
          <dt>Collected at delivery</dt>
          <dd>{money(delivery.collected)}</dd>
        </div>
        {due > 0 && (
          <div className="flex justify-between font-semibold text-bad">
            <dt>Not collected at delivery</dt>
            <dd>{money(due)}</dd>
          </div>
        )}
      </dl>
    </Dialog>
  );
}

function Waiting({ distributor, canDeliver }: { distributor?: number; canDeliver: boolean }) {
  const list = usePagedList<Order>("/deliveries/pending", { distributor });
  const [open, setOpen] = useState<Order | null>(null);

  return (
    <>
      <div className="mb-4 max-w-sm">
        <SearchBox value={list.typed} onChange={list.setTyped} placeholder="Search outlet" />
      </div>
      <PagedTable
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="Nothing waiting to go out"
        emptyHint="Orders appear here as soon as reps sync them."
        columns={[
          { header: "Outlet", cell: (row) => <span className="font-semibold">{row.outletName}</span> },
          { header: "Distributor", cell: (row) => row.distributorName },
          { header: "Taken by", cell: (row) => row.employeeName },
          { header: "Ordered", cell: (row) => day(row.date) },
          { header: "Value", align: "right", cell: (row) => money(row.total) },
          { header: "", align: "right", cell: (row) => canDeliver && <Button onClick={() => setOpen(row)}>Deliver</Button> },
        ]}
      />
      {open && <DeliverDialog order={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Delivered({ distributor }: { distributor?: number }) {
  const list = usePagedList<Delivery>("/deliveries", { distributor });
  const [open, setOpen] = useState<Delivery | null>(null);

  return (
    <>
      <div className="mb-4 max-w-sm">
        <SearchBox value={list.typed} onChange={list.setTyped} placeholder="Search invoice or outlet" />
      </div>
      <PagedTable
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="No deliveries yet"
        columns={[
          {
            header: "Invoice",
            cell: (row) => (
              <button onClick={() => setOpen(row)} className="font-semibold hover:underline">
                {row.number}
              </button>
            ),
          },
          { header: "Outlet", cell: (row) => row.outletName },
          { header: "Date", cell: (row) => day(row.date) },
          { header: "Collected", align: "right", cell: (row) => money(row.collected) },
          { header: "Total", align: "right", cell: (row) => money(row.total) },
        ]}
      />
      {open && <InvoiceDialog delivery={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export default function DeliveriesPage() {
  const { user } = useAuth();
  const { id, select, operator } = useDistributor({ allowAll: true });
  const [tab, setTab] = useState<"waiting" | "delivered">("waiting");

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader title="Deliveries" subtitle="Rep orders going out to outlets" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Deliveries">
          {(["waiting", "delivered"] as const).map((name) => (
            <button
              key={name}
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              className={clsx("rounded-lg px-3 py-1.5 text-sm font-semibold", tab === name ? "bg-surface shadow-card" : "text-ink-2")}
            >
              {name === "waiting" ? "To deliver" : "Delivered"}
            </button>
          ))}
        </div>
        {select && <div className="w-full max-w-xs">{select}</div>}
      </div>

      {tab === "waiting" ? <Waiting distributor={id} canDeliver={operator || can.manageAccounts(user?.role)} /> : <Delivered distributor={id} />}
    </div>
  );
}
