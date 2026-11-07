"use client";

import { useState } from "react";
import { StatusTag } from "@/components/distribution-ui";
import { DecisionButtons } from "@/components/request-ui";
import { PagedTable, SearchBox, usePagedList } from "@/components/setup-ui";
import { PageHeader, Select } from "@/components/ui";
import { day, money } from "@/lib/format";
import type { Expense } from "@/lib/types";

const categories = { TRANSPORT: "Transport", FOOD: "Food", PHONE: "Phone", OTHER: "Other" } as const;

export default function ExpensesPage() {
  const [status, setStatus] = useState("PENDING");
  const list = usePagedList<Expense>("/expenses", { status });

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-8">
      <PageHeader title="Expenses" subtitle="Claims from your team" />

      <div className="grid gap-2 sm:grid-cols-3">
        <SearchBox value={list.typed} onChange={list.setTyped} placeholder="Search person" />
        <Select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="PENDING">Waiting</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </div>

      <PagedTable
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="No expenses here"
        emptyHint="Reps claim expenses from the mobile app."
        columns={[
          { header: "Person", cell: (row) => <span className="font-semibold">{row.employeeName}</span> },
          { header: "Date", cell: (row) => day(row.date) },
          { header: "Type", cell: (row) => categories[row.category] },
          { header: "Note", cell: (row) => row.rejectionReason || row.note || "—" },
          { header: "Status", cell: (row) => <StatusTag status={row.status} /> },
          { header: "Amount", align: "right", cell: (row) => money(row.amount) },
          { header: "", align: "right", cell: (row) => row.status === "PENDING" && <DecisionButtons path="/expenses" id={row.id} subject={`${row.employeeName}'s expense`} /> },
        ]}
      />
    </div>
  );
}
