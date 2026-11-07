"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ActiveTag, type FieldSpec, FormDialog, PagedTable, SearchBox, usePagedList } from "@/components/setup-ui";
import { Button, PageHeader } from "@/components/ui";
import { patch, post } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import { day } from "@/lib/format";
import type { Offer } from "@/lib/types";

const fields: FieldSpec[] = [
  { name: "title", label: "Title", required: true, wide: true },
  { name: "details", label: "Details", wide: true, placeholder: "Buy 10 cases, get 1 free" },
  { name: "startDate", label: "Starts", type: "date", required: true },
  { name: "endDate", label: "Ends", type: "date", required: true },
  { name: "isActive", label: "Show to reps", type: "checkbox" },
];

export default function OffersPage() {
  const { user } = useAuth();
  const admin = can.manageAccounts(user?.role);
  const client = useQueryClient();
  const list = usePagedList<Offer>("/offers");
  const [editing, setEditing] = useState<Offer | "new" | null>(null);

  async function save(values: Record<string, unknown>) {
    if (editing === "new") await post("/offers", values);
    else if (editing) await patch(`/offers/${editing.id}`, values);
    client.invalidateQueries({ queryKey: ["/offers"] });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <PageHeader title="Offers" subtitle="Reps see these in the app. They don't change prices on orders.">
        {admin && (
          <Button variant="primary" onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden="true" />
            New offer
          </Button>
        )}
      </PageHeader>

      <div className="max-w-sm">
        <SearchBox value={list.typed} onChange={list.setTyped} placeholder="Search offers" />
      </div>

      <PagedTable
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="No offers yet"
        columns={[
          {
            header: "Offer",
            cell: (row) =>
              admin ? (
                <button onClick={() => setEditing(row)} className="font-semibold hover:underline">
                  {row.title}
                  <ActiveTag active={row.isActive} />
                </button>
              ) : (
                <span className="font-semibold">{row.title}</span>
              ),
          },
          { header: "Details", cell: (row) => row.details || "—" },
          { header: "Runs", cell: (row) => `${day(row.startDate)} to ${day(row.endDate)}` },
        ]}
      />

      {editing && (
        <FormDialog
          title={editing === "new" ? "New offer" : "Edit offer"}
          fields={fields}
          initial={editing === "new" ? { isActive: true } : { ...editing }}
          onClose={() => setEditing(null)}
          onSubmit={save}
        />
      )}
    </div>
  );
}
