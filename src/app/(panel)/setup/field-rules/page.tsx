"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button, Card, ErrorNote, Field, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import { api, patch } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import type { FieldRules } from "@/lib/types";

const INTERVALS = [5, 10, 15, 30, 60];

function RulesForm({ rules, canEdit }: { rules: FieldRules; canEdit: boolean }) {
  const client = useQueryClient();
  const [snapshotMinutes, setSnapshotMinutes] = useState(String(rules.snapshotMinutes));
  const [orderRadiusM, setOrderRadiusM] = useState(String(rules.orderRadiusM));
  const [photoRequired, setPhotoRequired] = useState(rules.photoRequired);
  const [maxDiscount, setMaxDiscount] = useState(String(Number(rules.maxDiscountPercent)));

  const save = useMutation({
    mutationFn: () =>
      patch<FieldRules>("/field-settings", {
        snapshotMinutes: Number(snapshotMinutes),
        orderRadiusM: Number(orderRadiusM),
        photoRequired,
        maxDiscountPercent: maxDiscount || "0",
      }),
    onSuccess: (saved) => client.setQueryData(["field-settings"], saved),
  });

  const changed =
    snapshotMinutes !== String(rules.snapshotMinutes) ||
    orderRadiusM !== String(rules.orderRadiusM) ||
    photoRequired !== rules.photoRequired ||
    Number(maxDiscount) !== Number(rules.maxDiscountPercent);

  return (
    <Card className="space-y-5 p-5">
      {save.error && <ErrorNote error={save.error} />}
      <Field label="Save a location snapshot every">
        <Select disabled={!canEdit} value={snapshotMinutes} onChange={(event) => setSnapshotMinutes(event.target.value)}>
          {INTERVALS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} minutes
            </option>
          ))}
        </Select>
      </Field>
      <p className="-mt-3 text-sm text-ink-2">The live map keeps updating. This sets how often a point is saved to the route history.</p>

      <Field label="Order distance from the store (metres)">
        <Input disabled={!canEdit} type="number" min="20" max="2000" required value={orderRadiusM} onChange={(event) => setOrderRadiusM(event.target.value)} />
      </Field>
      <p className="-mt-3 text-sm text-ink-2">Reps further away than this cannot start a visit or take an order at a store.</p>

      <Field label="Largest discount a rep can give (%)">
        <Input disabled={!canEdit} type="number" min="0" max="100" step="0.01" required value={maxDiscount} onChange={(event) => setMaxDiscount(event.target.value)} />
      </Field>
      <p className="-mt-3 text-sm text-ink-2">Comes off the whole order. Set it to 0 to turn discounts off.</p>

      <label className="flex items-start gap-3">
        <input disabled={!canEdit} type="checkbox" className="mt-0.5 size-5 accent-[var(--brand)]" checked={photoRequired} onChange={(event) => setPhotoRequired(event.target.checked)} />
        <span>
          <span className="block text-sm font-medium">Require an outlet photo on every visit</span>
          <span className="block text-sm text-ink-2">When this is off, reps can skip the photo.</span>
        </span>
      </label>

      {canEdit && (
        <div className="flex justify-end">
          <Button variant="primary" busy={save.isPending} disabled={!changed} onClick={() => save.mutate()}>
            {changed ? "Save rules" : "Saved"}
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function FieldRulesPage() {
  const { user } = useAuth();
  const { data, error, refetch } = useQuery({ queryKey: ["field-settings"], queryFn: () => api<FieldRules>("/field-settings") });

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <PageHeader title="Field rules" subtitle="These apply to everyone in the company" />
      {error && <ErrorNote error={error} onRetry={() => refetch()} />}
      {!data && !error && <Skeleton className="h-64" />}
      {data && <RulesForm rules={data} canEdit={can.manageAccounts(user?.role)} />}
    </div>
  );
}
