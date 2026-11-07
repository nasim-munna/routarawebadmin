"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Figure, useDistributor } from "@/components/distribution-ui";
import { FormDialog } from "@/components/setup-ui";
import { Button, Card, Empty, ErrorNote, PageHeader, Skeleton } from "@/components/ui";
import { api, post } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import type { OutletDue } from "@/lib/types";

export default function DuesPage() {
  const { user } = useAuth();
  const { id, select, operator, ready } = useDistributor();
  const [paying, setPaying] = useState<OutletDue | null>(null);
  const client = useQueryClient();
  const { data, error, refetch } = useQuery({
    queryKey: ["/outlet-dues", id],
    queryFn: () => api<OutletDue[]>(`/outlet-dues?distributor=${id}`),
    enabled: id !== undefined,
  });

  const canCollect = operator || can.manageAccounts(user?.role);
  const owed = data?.reduce((sum, row) => sum + Number(row.due), 0) ?? 0;
  const owing = data?.filter((row) => Number(row.due) > 0).length ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <PageHeader title="Outlet dues" subtitle="What each outlet still owes its distributor" />

      {select && <div className="max-w-sm">{select}</div>}
      {ready && id === undefined && <Empty title="No distributors yet" />}
      {error && <ErrorNote error={error} onRetry={() => refetch()} />}
      {id !== undefined && !data && !error && <Skeleton className="h-60" />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Figure label="Total due" value={money(owed)} tone={owed > 0 ? "bad" : undefined} />
            <Figure label="Outlets owing" value={String(owing)} />
          </div>
          <Card className="overflow-x-auto">
            <table className="num w-full min-w-[34rem] text-sm">
              <thead className="text-left text-ink-2">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-medium">Outlet</th>
                  <th className="px-5 py-3 text-right font-medium">Billed</th>
                  <th className="px-5 py-3 text-right font-medium">Paid</th>
                  <th className="px-5 py-3 text-right font-medium">Due</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.outlet} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-semibold">{row.outletName}</td>
                    <td className="px-5 py-3 text-right">{money(row.billed)}</td>
                    <td className="px-5 py-3 text-right">{money(row.paid)}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${Number(row.due) > 0 ? "text-bad" : ""}`}>{money(row.due)}</td>
                    <td className="px-5 py-2 text-right">{canCollect && Number(row.due) > 0 && <Button onClick={() => setPaying(row)}>Take payment</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length === 0 && <Empty title="No dues yet" hint="Dues appear after the first delivery." />}
          </Card>
        </>
      )}

      {paying && (
        <FormDialog
          title={`Payment from ${paying.outletName}`}
          submitLabel="Record payment"
          initial={{ amount: paying.due }}
          fields={[{ name: "amount", label: `Amount (owes ${money(paying.due)})`, type: "number", required: true, wide: true }]}
          onClose={() => setPaying(null)}
          onSubmit={async (values) => {
            await post("/outlet-payments", { distributor: id, outlet: paying.outlet, amount: values.amount });
            client.invalidateQueries({ queryKey: ["/outlet-dues"] });
          }}
        />
      )}
    </div>
  );
}
