"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { StatusTag, useDistributor } from "@/components/distribution-ui";
import { FormDialog, PagedTable, usePagedList } from "@/components/setup-ui";
import { Button, ErrorNote, PageHeader } from "@/components/ui";
import { post } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import { day, money, TIME_ZONE } from "@/lib/format";
import type { Deposit } from "@/lib/types";

const methods = { BANK: "Bank", CASH: "Cash", MOBILE: "Mobile banking" } as const;

export default function DepositsPage() {
  const { user } = useAuth();
  const admin = can.manageAccounts(user?.role);
  const { id, select, operator } = useDistributor({ allowAll: true });
  const [adding, setAdding] = useState(false);
  const list = usePagedList<Deposit>("/deposits", { distributor: id });
  const client = useQueryClient();

  const decide = useMutation({
    mutationFn: ({ deposit, action }: { deposit: Deposit; action: "confirm" | "reject" }) => post(`/deposits/${deposit.id}/${action}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ["/deposits"] }),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-8">
      <PageHeader title="Deposits" subtitle="Money paid to the company. It counts once confirmed.">
        {(operator || (admin && id !== undefined)) && (
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Record deposit
          </Button>
        )}
      </PageHeader>

      {select && <div className="max-w-sm">{select}</div>}
      {decide.error && <ErrorNote error={decide.error} />}

      <PagedTable
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="No deposits yet"
        columns={[
          { header: "Date", cell: (row) => day(row.date) },
          { header: "Distributor", cell: (row) => <span className="font-semibold">{row.distributorName}</span> },
          { header: "Method", cell: (row) => methods[row.method] },
          { header: "Reference", cell: (row) => row.reference || "—" },
          { header: "Status", cell: (row) => <StatusTag status={row.status} /> },
          { header: "Amount", align: "right", cell: (row) => money(row.amount) },
          {
            header: "",
            align: "right",
            cell: (row) =>
              admin &&
              row.status === "PENDING" && (
                <span className="flex justify-end gap-2">
                  <Button disabled={decide.isPending} onClick={() => decide.mutate({ deposit: row, action: "reject" })}>
                    Reject
                  </Button>
                  <Button variant="primary" disabled={decide.isPending} onClick={() => decide.mutate({ deposit: row, action: "confirm" })}>
                    Confirm
                  </Button>
                </span>
              ),
          },
        ]}
      />

      {adding && (
        <FormDialog
          title="Record a deposit"
          initial={{ date: new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date()), method: "BANK" }}
          fields={[
            { name: "date", label: "Date", type: "date", required: true },
            { name: "amount", label: "Amount", type: "number", required: true },
            { name: "method", label: "Paid by", type: "select", required: true, options: Object.entries(methods).map(([value, label]) => ({ value, label })) },
            { name: "reference", label: "Bank or transaction reference", wide: true },
          ]}
          onClose={() => setAdding(false)}
          onSubmit={async (values) => {
            await post("/deposits", { ...values, distributor: id });
            client.invalidateQueries({ queryKey: ["/deposits"] });
          }}
        />
      )}
    </div>
  );
}
