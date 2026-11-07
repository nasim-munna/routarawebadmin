"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus, Tags } from "lucide-react";
import { useState } from "react";
import { ActiveTag, asOptions, FormDialog, PagedTable, SearchBox, usePagedList, type FieldSpec } from "@/components/setup-ui";
import { Button, Dialog, ErrorNote, Input, PageHeader, Select } from "@/components/ui";
import { api, patch, post } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import type { Distributor, Named, Outlet, OutletStatus, Page, Territory } from "@/lib/types";

const tabs: { value: OutletStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "PENDING", label: "To verify" },
  { value: "VERIFIED", label: "To approve" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const statusStyle: Record<OutletStatus, string> = {
  PENDING: "bg-warn-soft text-warn",
  VERIFIED: "bg-brand-soft text-brand",
  APPROVED: "bg-ok-soft text-ok",
  REJECTED: "bg-bad-soft text-bad",
};

const statusLabel: Record<OutletStatus, string> = {
  PENDING: "To verify",
  VERIFIED: "To approve",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function OutletDialog({ outlet, onClose }: { outlet: Outlet | null; onClose: () => void }) {
  const client = useQueryClient();
  const [territory, setTerritory] = useState(outlet ? String(outlet.territory) : "");

  const territories = useQuery({ queryKey: ["territories"], queryFn: () => api<Territory[]>("/territories") });
  const channels = useQuery({ queryKey: ["channels"], queryFn: () => api<Named[]>("/outlet-channels") });
  const distributors = useQuery({
    queryKey: ["distributors-for", territory],
    queryFn: () => api<Page<Distributor>>(`/distributors?territories=${territory}&is_active=true&size=100`),
    enabled: Boolean(territory),
  });

  const fields: FieldSpec[] = [
    { name: "name", label: "Outlet name", required: true },
    { name: "ownerName", label: "Owner" },
    { name: "phone", label: "Phone" },
    { name: "channel", label: "Channel", type: "select", options: asOptions(channels.data), required: true },
    { name: "territory", label: "Territory", type: "select", options: asOptions(territories.data), required: true },
    { name: "distributor", label: "Distributor", type: "select", options: asOptions(distributors.data?.results), required: true },
    { name: "address", label: "Address", wide: true },
    { name: "location", label: "Location", type: "location" },
    ...(outlet ? [{ name: "isActive", label: "Active", type: "checkbox", wide: true } as FieldSpec] : []),
  ];

  async function save(values: Record<string, unknown>) {
    await (outlet ? patch(`/outlets/${outlet.id}`, values) : post("/outlets", values));
    client.invalidateQueries({ queryKey: ["/outlets"] });
  }

  return (
    <FormDialog
      title={outlet ? `Edit ${outlet.name}` : "Add outlet"}
      fields={fields}
      initial={outlet ? { ...outlet } : {}}
      onValues={(values) => setTerritory(String(values.territory ?? ""))}
      onSubmit={save}
      onClose={onClose}
    />
  );
}

function ChannelsDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const channels = useQuery({ queryKey: ["channels"], queryFn: () => api<Named[]>("/outlet-channels") });

  const add = useMutation({
    mutationFn: () => post("/outlet-channels", { name: name.trim() }),
    onSuccess: () => {
      setName("");
      client.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  return (
    <Dialog title="Outlet channels" onClose={onClose}>
      {add.error && <ErrorNote error={add.error} />}
      <ul className="mb-4 flex flex-wrap gap-2">
        {channels.data?.map((channel) => (
          <li key={channel.id} className="rounded-full bg-surface-2 px-3 py-1 text-sm font-medium">
            {channel.name}
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
        <Input required placeholder="New channel, such as Pharmacy" aria-label="New channel" value={name} onChange={(event) => setName(event.target.value)} />
        <Button type="submit" variant="primary" busy={add.isPending}>
          Add
        </Button>
      </form>
    </Dialog>
  );
}

export default function OutletsPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const admin = can.manageAccounts(user?.role);
  const [status, setStatus] = useState<OutletStatus | "">("");
  const [territory, setTerritory] = useState("");
  const [editing, setEditing] = useState<Outlet | "new" | null>(null);
  const [rejecting, setRejecting] = useState<Outlet | null>(null);
  const [channelsOpen, setChannelsOpen] = useState(false);

  const list = usePagedList<Outlet>("/outlets", { status, territory });
  const territories = useQuery({ queryKey: ["territories"], queryFn: () => api<Territory[]>("/territories") });

  const move = useMutation({
    mutationFn: ({ id, step }: { id: number; step: "verify" | "approve" }) => post(`/outlets/${id}/${step}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ["/outlets"] }),
  });

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader title="Outlets" subtitle={list.data ? `${list.data.count.toLocaleString("en-US")} shown` : "The shops your team visits"}>
        {admin && (
          <Button onClick={() => setChannelsOpen(true)}>
            <Tags className="size-4" aria-hidden="true" />
            Channels
          </Button>
        )}
        <Button variant="primary" onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden="true" />
          Add outlet
        </Button>
      </PageHeader>

      <div className="mb-3 flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              list.setPage(1);
            }}
            aria-pressed={status === tab.value}
            className={clsx("flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap", status === tab.value ? "bg-surface text-ink shadow-sm" : "text-ink-2")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <SearchBox value={list.typed} onChange={list.setTyped} placeholder="Search outlets" />
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

      {move.error && (
        <div className="mb-3">
          <ErrorNote error={move.error} />
        </div>
      )}

      <PagedTable
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="No outlets here"
        emptyHint="Try another filter, or add an outlet."
        columns={[
          {
            header: "Outlet",
            cell: (row) => (
              <button onClick={() => setEditing(row)} className="text-left">
                <span className="block font-semibold hover:underline">
                  {row.name}
                  <ActiveTag active={row.isActive} />
                </span>
                <span className="text-xs text-ink-2">{row.code}</span>
              </button>
            ),
          },
          { header: "Channel", cell: (row) => row.channelName },
          { header: "Territory", cell: (row) => row.territoryName },
          { header: "Distributor", cell: (row) => row.distributorName },
          {
            header: "Status",
            cell: (row) => (
              <span title={row.rejectionReason || undefined} className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", statusStyle[row.status])}>
                {statusLabel[row.status]}
              </span>
            ),
          },
          {
            header: "Action",
            cell: (row) => (
              <span className="flex gap-3 text-sm font-semibold whitespace-nowrap">
                {row.status === "PENDING" && (
                  <button onClick={() => move.mutate({ id: row.id, step: "verify" })} className="text-brand hover:underline">
                    Verify
                  </button>
                )}
                {row.status === "VERIFIED" && admin && (
                  <button onClick={() => move.mutate({ id: row.id, step: "approve" })} className="text-brand hover:underline">
                    Approve
                  </button>
                )}
                {(row.status === "PENDING" || row.status === "VERIFIED") && (
                  <button onClick={() => setRejecting(row)} className="text-bad hover:underline">
                    Reject
                  </button>
                )}
              </span>
            ),
          },
        ]}
      />

      {editing && <OutletDialog outlet={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {channelsOpen && <ChannelsDialog onClose={() => setChannelsOpen(false)} />}
      {rejecting && (
        <FormDialog
          title={`Reject ${rejecting.name}?`}
          submitLabel="Reject outlet"
          fields={[{ name: "reason", label: "Reason", required: true, wide: true }]}
          onSubmit={async (values) => {
            await post(`/outlets/${rejecting.id}/reject`, values);
            client.invalidateQueries({ queryKey: ["/outlets"] });
          }}
          onClose={() => setRejecting(null)}
        />
      )}
    </div>
  );
}
