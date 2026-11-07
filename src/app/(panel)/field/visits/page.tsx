"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Image as ImageIcon, Tags } from "lucide-react";
import { useState } from "react";
import { PagedTable, SearchBox, usePagedList } from "@/components/setup-ui";
import { Button, Dialog, ErrorNote, Input, PageHeader, Select } from "@/components/ui";
import { api, post } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import { day, time } from "@/lib/format";
import type { Named, VisitRow } from "@/lib/types";

function ReasonsDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const reasons = useQuery({ queryKey: ["reasons"], queryFn: () => api<Named[]>("/non-productive-reasons") });

  const add = useMutation({
    mutationFn: () => post("/non-productive-reasons", { name: name.trim() }),
    onSuccess: () => {
      setName("");
      client.invalidateQueries({ queryKey: ["reasons"] });
    },
  });

  return (
    <Dialog title="No-order reasons" onClose={onClose}>
      {add.error && <ErrorNote error={add.error} />}
      <ul className="mb-4 flex flex-wrap gap-2">
        {reasons.data?.map((reason) => (
          <li key={reason.id} className="rounded-full bg-surface-2 px-3 py-1 text-sm font-medium">
            {reason.name}
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          add.mutate();
        }}
      >
        <Input required placeholder="New reason, such as Shop closed" aria-label="New reason" value={name} onChange={(event) => setName(event.target.value)} />
        <Button type="submit" variant="primary" busy={add.isPending}>
          Add
        </Button>
      </form>
    </Dialog>
  );
}

export default function VisitsPage() {
  const { user } = useAuth();
  const [date, setDate] = useState("");
  const [outcome, setOutcome] = useState("");
  const [photo, setPhoto] = useState<VisitRow | null>(null);
  const [reasonsOpen, setReasonsOpen] = useState(false);

  const list = usePagedList<VisitRow>("/visits", { date, outcome });

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader title="Visits" subtitle={list.data ? `${list.data.count.toLocaleString("en-US")} shown` : "Outlet calls from the field"}>
        {can.manageAccounts(user?.role) && (
          <Button onClick={() => setReasonsOpen(true)}>
            <Tags className="size-4" aria-hidden="true" />
            No-order reasons
          </Button>
        )}
      </PageHeader>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <SearchBox value={list.typed} onChange={list.setTyped} placeholder="Search outlet or person" />
        <Input type="date" aria-label="Date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Select aria-label="Outcome" value={outcome} onChange={(event) => setOutcome(event.target.value)}>
          <option value="">All outcomes</option>
          <option value="PRODUCTIVE">Order taken</option>
          <option value="NON_PRODUCTIVE">No order</option>
        </Select>
      </div>

      <PagedTable
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="No visits here"
        emptyHint="Visits appear once reps sync from the mobile app."
        columns={[
          { header: "Outlet", cell: (row) => <span className="font-semibold">{row.outletName}</span> },
          { header: "Rep", cell: (row) => row.employeeName },
          { header: "When", cell: (row) => `${day(row.date)}, ${time(row.capturedAt)}` },
          {
            header: "Outcome",
            cell: (row) => (
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
                  row.outcome === "PRODUCTIVE" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn",
                )}
              >
                {row.outcome === "PRODUCTIVE" ? "Order taken" : (row.reasonName ?? "No order")}
              </span>
            ),
          },
          {
            header: "Distance",
            cell: (row) =>
              row.distanceM === null ? "—" : <span className="num">{Math.round(row.distanceM).toLocaleString("en-US")} m</span>,
          },
          {
            header: "Photo",
            cell: (row) =>
              row.photoUrl ? (
                <button onClick={() => setPhoto(row)} aria-label={`View photo of ${row.outletName}`} className="text-brand">
                  <ImageIcon className="size-5" aria-hidden="true" />
                </button>
              ) : (
                "—"
              ),
          },
        ]}
      />

      {photo && (
        <Dialog title={photo.outletName} onClose={() => setPhoto(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/backend/${photo.photoUrl!.replace(/^\//, "")}`} alt={`Shop front of ${photo.outletName}`} className="w-full rounded-xl" />
        </Dialog>
      )}
      {reasonsOpen && <ReasonsDialog onClose={() => setReasonsOpen(false)} />}
    </div>
  );
}
