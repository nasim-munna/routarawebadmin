"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button, Card, Empty, ErrorNote, Input, PageHeader, Skeleton } from "@/components/ui";
import { api, put } from "@/lib/api";
import { money, TIME_ZONE } from "@/lib/format";
import type { TargetRow } from "@/lib/types";

function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date()).slice(0, 7);
}

function Sheet({ month }: { month: string }) {
  const client = useQueryClient();
  const key = ["targets", month];
  const [edits, setEdits] = useState<Record<number, string>>({});
  const { data, error, isPending, refetch } = useQuery({ queryKey: key, queryFn: () => api<TargetRow[]>(`/targets?month=${month}`) });

  const save = useMutation({
    mutationFn: () =>
      put<TargetRow[]>("/targets", {
        month,
        rows: Object.entries(edits).map(([employee, amount]) => ({ employee: Number(employee), amount: amount || "0" })),
      }),
    onSuccess: (rows) => {
      client.setQueryData(key, rows);
      setEdits({});
    },
  });

  if (error) return <ErrorNote error={error} onRetry={() => refetch()} />;
  if (isPending) return <Skeleton className="h-80" />;

  const amountOf = (row: TargetRow) => edits[row.employee] ?? row.amount;
  const total = data.reduce((sum, row) => sum + Number(amountOf(row) || 0), 0);
  const changed = Object.keys(edits).length;

  return (
    <>
      {save.error && (
        <div className="mb-4">
          <ErrorNote error={save.error} />
        </div>
      )}
      <Card className="overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm text-ink-2">Total target</p>
            <p className="num font-display text-3xl font-bold">{money(total)}</p>
          </div>
          <Button variant="primary" busy={save.isPending} disabled={!changed} onClick={() => save.mutate()}>
            {changed ? `Save ${changed} ${changed === 1 ? "change" : "changes"}` : "Saved"}
          </Button>
        </div>
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="text-left text-ink-2">
            <tr className="border-y border-line">
              <th className="px-5 py-2 font-medium">Name</th>
              <th className="px-5 py-2 font-medium">Territory</th>
              <th className="px-5 py-2 font-medium">Division</th>
              <th className="w-48 px-5 py-2 text-right font-medium">Target (৳)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.employee} className="border-b border-line last:border-0">
                <td className="px-5 py-2 font-semibold">{row.name}</td>
                <td className="px-5 py-2 text-ink-2">{row.territoryName ?? "—"}</td>
                <td className="px-5 py-2 text-ink-2">{row.divisionName ?? "—"}</td>
                <td className="px-5 py-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    aria-label={`Target for ${row.name}`}
                    className="num text-right"
                    value={amountOf(row)}
                    onChange={(event) => setEdits({ ...edits, [row.employee]: event.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <Empty title="No field staff to set targets for" />}
      </Card>
    </>
  );
}

export default function TargetsPage() {
  const [month, setMonth] = useState(currentMonth);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader title="Targets" subtitle="Monthly sales target for each person">
        <Input type="month" aria-label="Month" required className="w-auto" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} />
      </PageHeader>
      <Sheet key={month} month={month} />
    </div>
  );
}
