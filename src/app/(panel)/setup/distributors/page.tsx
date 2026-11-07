"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ActiveTag, asOptions, FormDialog, PagedTable, SearchBox, usePagedList, type FieldSpec } from "@/components/setup-ui";
import { Button, PageHeader } from "@/components/ui";
import { api, patch, post } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import type { Distributor, Territory } from "@/lib/types";

export default function DistributorsPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const admin = can.manageAccounts(user?.role);
  const list = usePagedList<Distributor>("/distributors");
  const [editing, setEditing] = useState<Distributor | "new" | null>(null);
  const territories = useQuery({ queryKey: ["territories"], queryFn: () => api<Territory[]>("/territories") });

  const fields: FieldSpec[] = [
    { name: "name", label: "Name", required: true },
    { name: "code", label: "Code", required: true },
    { name: "ownerName", label: "Owner" },
    { name: "phone", label: "Phone" },
    { name: "address", label: "Address", wide: true },
    { name: "territories", label: "Territories served", type: "multiselect", options: asOptions(territories.data) },
    ...(editing !== "new" ? [{ name: "isActive", label: "Active", type: "checkbox", wide: true } as FieldSpec] : []),
  ];

  async function save(values: Record<string, unknown>) {
    await (editing === "new" ? post("/distributors", values) : patch(`/distributors/${(editing as Distributor).id}`, values));
    client.invalidateQueries({ queryKey: ["/distributors"] });
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader title="Distributors" subtitle={list.data ? `${list.data.count} in total` : "Who supplies your outlets"}>
        {admin && (
          <Button variant="primary" onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden="true" />
            Add distributor
          </Button>
        )}
      </PageHeader>

      <div className="mb-4 max-w-sm">
        <SearchBox value={list.typed} onChange={list.setTyped} placeholder="Search distributors" />
      </div>

      <PagedTable
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="No distributors yet"
        emptyHint="Add one to start creating outlets."
        columns={[
          {
            header: "Name",
            cell: (row) =>
              admin ? (
                <button onClick={() => setEditing(row)} className="font-semibold hover:underline">
                  {row.name}
                  <ActiveTag active={row.isActive} />
                </button>
              ) : (
                <span className="font-semibold">{row.name}</span>
              ),
          },
          { header: "Code", cell: (row) => row.code },
          { header: "Owner", cell: (row) => row.ownerName || "—" },
          { header: "Phone", cell: (row) => row.phone || "—" },
          { header: "Territories", cell: (row) => row.territoryNames.join(", ") || "None yet" },
        ]}
      />

      {editing && (
        <FormDialog
          title={editing === "new" ? "Add distributor" : `Edit ${editing.name}`}
          fields={fields}
          initial={editing === "new" ? { territories: [] } : { ...editing }}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
