"use client";

import { useState } from "react";
import { StatusTag } from "@/components/distribution-ui";
import { DecisionButtons } from "@/components/request-ui";
import { PagedTable, SearchBox, usePagedList } from "@/components/setup-ui";
import { PageHeader, Select } from "@/components/ui";
import { day } from "@/lib/format";
import type { LeaveRequest } from "@/lib/types";

const kinds = { CASUAL: "Casual", SICK: "Sick", ANNUAL: "Annual", OTHER: "Other" } as const;

export default function LeavePage() {
  const [status, setStatus] = useState("PENDING");
  const list = usePagedList<LeaveRequest>("/leave-requests", { status });

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-8">
      <PageHeader title="Leave" subtitle="Requests from your team. Approved leave shows on the attendance page." />

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
        emptyTitle="No leave requests here"
        emptyHint="Reps ask for leave from the mobile app."
        columns={[
          { header: "Person", cell: (row) => <span className="font-semibold">{row.employeeName}</span> },
          { header: "Type", cell: (row) => kinds[row.kind] },
          { header: "Dates", cell: (row) => (row.startDate === row.endDate ? day(row.startDate) : `${day(row.startDate)} to ${day(row.endDate)}`) },
          { header: "Days", align: "right", cell: (row) => row.days },
          { header: "Reason", cell: (row) => row.rejectionReason || row.reason || "—" },
          { header: "Status", cell: (row) => <StatusTag status={row.status} /> },
          { header: "", align: "right", cell: (row) => row.status === "PENDING" && <DecisionButtons path="/leave-requests" id={row.id} subject={`${row.employeeName}'s leave`} /> },
        ]}
      />
    </div>
  );
}
