"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useState } from "react";
import { PagedTable, SearchBox, usePagedList } from "@/components/setup-ui";
import { Button, Dialog, ErrorNote, Input, PageHeader, Select } from "@/components/ui";
import { post } from "@/lib/api";
import { day, money, time } from "@/lib/format";
import type { Order } from "@/lib/types";

function OrderDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const client = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => post(`/orders/${order.id}/cancel`),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["/orders"] });
      onClose();
    },
  });

  return (
    <Dialog title={order.outletName} onClose={onClose}>
      {cancel.error && <ErrorNote error={cancel.error} />}
      <p className="num mb-3 text-sm text-ink-2">
        {order.employeeName} · {day(order.date)} at {time(order.capturedAt)} · {order.distributorName}
      </p>
      <table className="num w-full text-sm">
        <thead className="text-left text-ink-2">
          <tr className="border-b border-line">
            <th className="py-2 font-medium">Product</th>
            <th className="py-2 text-right font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Price</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line) => (
            <tr key={line.id} className="border-b border-line">
              <td className="py-2 font-semibold">{line.productName}</td>
              <td className="py-2 text-right">{line.quantity}</td>
              <td className="py-2 text-right">{money(line.tradePrice)}</td>
              <td className="py-2 text-right">{money(line.amount)}</td>
            </tr>
          ))}
          {Number(order.discountAmount) > 0 && (
            <>
              <tr>
                <td colSpan={3} className="pt-2">
                  Subtotal
                </td>
                <td className="pt-2 text-right">{money(order.grossTotal)}</td>
              </tr>
              <tr>
                <td colSpan={3}>Discount ({Number(order.discountPercent)}%)</td>
                <td className="text-right">− {money(order.discountAmount)}</td>
              </tr>
            </>
          )}
          <tr>
            <td colSpan={3} className="py-2 font-semibold">
              Total
            </td>
            <td className="py-2 text-right font-semibold">{money(order.total)}</td>
          </tr>
        </tbody>
      </table>
      {order.status === "SUBMITTED" && (
        <div className="mt-4 flex justify-end">
          <Button variant="danger" busy={cancel.isPending} onClick={() => cancel.mutate()}>
            Cancel order
          </Button>
        </div>
      )}
    </Dialog>
  );
}

export default function OrdersPage() {
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<Order | null>(null);
  const list = usePagedList<Order>("/orders", { date, status });

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader title="Orders" subtitle={list.data ? `${list.data.count.toLocaleString("en-US")} shown` : "Orders taken in the field"} />

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <SearchBox value={list.typed} onChange={list.setTyped} placeholder="Search outlet or person" />
        <Input type="date" aria-label="Date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>

      <PagedTable
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="No orders here"
        emptyHint="Orders appear once reps sync from the mobile app."
        columns={[
          {
            header: "Outlet",
            cell: (row) => (
              <button onClick={() => setOpen(row)} className="font-semibold hover:underline">
                {row.outletName}
              </button>
            ),
          },
          { header: "Taken by", cell: (row) => row.employeeName },
          { header: "When", cell: (row) => `${day(row.date)}, ${time(row.capturedAt)}` },
          { header: "Type", cell: (row) => (row.kind === "READY_SALE" ? "Ready sale" : "Regular") },
          {
            header: "Status",
            cell: (row) => (
              <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", row.status === "SUBMITTED" ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>
                {row.status === "SUBMITTED" ? "Submitted" : "Cancelled"}
              </span>
            ),
          },
          { header: "Discount", align: "right", cell: (row) => (Number(row.discountPercent) > 0 ? `${Number(row.discountPercent)}%` : "—") },
          { header: "Value", align: "right", cell: (row) => money(row.total) },
        ]}
      />

      {open && <OrderDialog order={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
