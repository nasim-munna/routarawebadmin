"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import type { Distributor, DocLine, Page, Product } from "@/lib/types";
import { Button, Input, Select } from "./ui";

let remembered = "";

/** Which distributor a page shows. Operators always get their own; everyone
 * else gets a picker that carries over between pages. With `allowAll` the
 * picker can also show every distributor at once. */
export function useDistributor({ allowAll = false } = {}) {
  const { user } = useAuth();
  const operator = user?.role === "DISTRIBUTOR";
  const [chosen, setChosen] = useState(remembered);

  const list = useQuery({
    queryKey: ["distributor-options"],
    queryFn: () => api<Page<Distributor>>("/distributors?size=100&is_active=true"),
    enabled: !operator,
    staleTime: 60_000,
  });
  const options = list.data?.results ?? [];

  const fallback = allowAll ? undefined : options[0]?.id;
  const id = operator ? (user?.distributor ?? undefined) : Number(chosen) || fallback;

  const select = operator ? null : (
    <Select
      aria-label="Distributor"
      value={id ?? ""}
      onChange={(event) => {
        remembered = event.target.value;
        setChosen(event.target.value);
      }}
    >
      {allowAll && <option value="">All distributors</option>}
      {options.map((row) => (
        <option key={row.id} value={row.id}>
          {row.name}
        </option>
      ))}
    </Select>
  );

  return { id, select, operator, ready: operator || list.isSuccess };
}

const tones: Record<string, [string, string]> = {
  REQUESTED: ["Requested", "bg-warn-soft text-warn"],
  INVOICED: ["Invoiced", "bg-ok-soft text-ok"],
  ISSUED: ["On the way", "bg-warn-soft text-warn"],
  RECEIVED: ["Received", "bg-ok-soft text-ok"],
  PENDING: ["Waiting", "bg-warn-soft text-warn"],
  CANCELLED: ["Cancelled", "bg-off-soft text-ink-2"],
  CONFIRMED: ["Confirmed", "bg-ok-soft text-ok"],
  SUBMITTED: ["Submitted", "bg-warn-soft text-warn"],
  VERIFIED: ["Verified", "bg-brand-soft text-brand"],
  APPROVED: ["Approved", "bg-ok-soft text-ok"],
  REJECTED: ["Rejected", "bg-bad-soft text-bad"],
};

export function StatusTag({ status }: { status: string }) {
  const [label, tone] = tones[status] ?? [status, "bg-off-soft text-ink-2"];
  return <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", tone)}>{label}</span>;
}

export function Figure({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "bad" | "ok" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm text-ink-2">{label}</p>
      <p className={clsx("num mt-1 font-display text-2xl font-bold", tone === "bad" && "text-bad", tone === "ok" && "text-ok")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-2">{hint}</p>}
    </div>
  );
}

export type ChosenLine = { product: string; quantity: string };

export const toLines = (rows: ChosenLine[]) => rows.map((row) => ({ product: Number(row.product), quantity: Number(row.quantity) }));

/** Pick products and quantities for a stock request or a damage claim. */
export function ProductLines({ rows, onChange }: { rows: ChosenLine[]; onChange: (rows: ChosenLine[]) => void }) {
  const products = useQuery({
    queryKey: ["product-options"],
    queryFn: () => api<Page<Product>>("/products?size=100&is_active=true"),
    staleTime: 60_000,
  });
  const taken = new Set(rows.map((row) => row.product));
  const priceOf = (id: string) => products.data?.results.find((row) => String(row.id) === id)?.tradePrice ?? 0;
  const total = rows.reduce((sum, row) => sum + Number(priceOf(row.product)) * Number(row.quantity || 0), 0);
  const update = (index: number, patch: Partial<ChosenLine>) => onChange(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink-2">Products</p>
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_6rem_auto] gap-2">
          <Select aria-label="Product" required value={row.product} onChange={(event) => update(index, { product: event.target.value })}>
            <option value="">Choose…</option>
            {products.data?.results
              .filter((product) => String(product.id) === row.product || !taken.has(String(product.id)))
              .map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
          </Select>
          <Input
            aria-label="Quantity"
            type="number"
            min={1}
            step={1}
            required
            placeholder="Qty"
            value={row.quantity}
            onChange={(event) => update(index, { quantity: event.target.value })}
          />
          <Button type="button" aria-label="Remove product" disabled={rows.length === 1} onClick={() => onChange(rows.filter((_, at) => at !== index))}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button type="button" onClick={() => onChange([...rows, { product: "", quantity: "" }])}>
          <Plus className="size-4" aria-hidden="true" />
          Add product
        </Button>
        <span className="num text-sm font-semibold">{money(total)}</span>
      </div>
    </div>
  );
}

export function LinesTable({ lines, total }: { lines: DocLine[]; total?: string }) {
  const priced = lines.some((line) => line.amount !== undefined);
  return (
    <table className="num w-full text-sm">
      <thead className="text-left text-ink-2">
        <tr className="border-b border-line">
          <th className="py-2 font-medium">Product</th>
          <th className="py-2 text-right font-medium">Qty</th>
          {priced && <th className="py-2 text-right font-medium">Price</th>}
          {priced && <th className="py-2 text-right font-medium">Amount</th>}
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr key={line.id} className="border-b border-line">
            <td className="py-2 font-semibold">{line.productName}</td>
            <td className="py-2 text-right">{line.quantity}</td>
            {priced && <td className="py-2 text-right">{money(line.unitPrice)}</td>}
            {priced && <td className="py-2 text-right">{money(line.amount)}</td>}
          </tr>
        ))}
        {total !== undefined && (
          <tr>
            <td colSpan={3} className="py-2 font-semibold">
              Total
            </td>
            <td className="py-2 text-right font-semibold">{money(total)}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
