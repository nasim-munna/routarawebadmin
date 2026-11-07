"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActiveTag, asOptions, FormDialog, PagedTable, SearchBox, usePagedList, type FieldSpec } from "@/components/setup-ui";
import { Button, PageHeader, Select } from "@/components/ui";
import { api, post } from "@/lib/api";
import type { Beat, Territory } from "@/lib/types";

export default function BeatsPage() {
  const client = useQueryClient();
  const [territory, setTerritory] = useState("");
  const [creating, setCreating] = useState(false);
  const list = usePagedList<Beat>("/beats", { territory });
  const territories = useQuery({ queryKey: ["territories"], queryFn: () => api<Territory[]>("/territories") });

  const fields: FieldSpec[] = [
    { name: "name", label: "Beat name", required: true },
    { name: "code", label: "Code", required: true },
    { name: "territory", label: "Territory", type: "select", options: asOptions(territories.data), required: true, wide: true },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader title="Beat plans" subtitle="Routes of outlets, each worked in one day">
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Add beat
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <SearchBox value={list.typed} onChange={list.setTyped} placeholder="Search beats" />
        <Select
          aria-label="Territory"
          value={territory}
          onChange={(event) => {
            setTerritory(event.target.value);
            list.setPage(1);
          }}
        >
          <option value="">All territories</option>
          {territories.data?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </div>

      <PagedTable
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="No beats yet"
        emptyHint="Add a beat, then choose its outlets."
        columns={[
          {
            header: "Beat",
            cell: (row) => (
              <Link href={`/setup/beats/${row.id}`} className="font-semibold hover:underline">
                {row.name}
                <ActiveTag active={row.isActive} />
              </Link>
            ),
          },
          { header: "Code", cell: (row) => row.code },
          { header: "Territory", cell: (row) => row.territoryName },
          { header: "Outlets", align: "right", cell: (row) => row.outletCount },
        ]}
      />

      {creating && (
        <FormDialog
          title="Add beat"
          fields={fields}
          onSubmit={async (values) => {
            await post("/beats", values);
            client.invalidateQueries({ queryKey: ["/beats"] });
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
