"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { type ChosenLine, LinesTable, ProductLines, StatusTag, toLines, useDistributor } from "@/components/distribution-ui";
import { PagedTable, usePagedList } from "@/components/setup-ui";
import { Button, Dialog, ErrorNote, Field, Input, PageHeader, Select } from "@/components/ui";
import { api, post } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import { day, money } from "@/lib/format";
import type { DamageClaim, Outlet, Page } from "@/lib/types";

function NewClaim({ distributor, onClose }: { distributor?: number; onClose: () => void }) {
  const client = useQueryClient();
  const [kind, setKind] = useState<DamageClaim["kind"]>("WAREHOUSE");
  const [outlet, setOutlet] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<ChosenLine[]>([{ product: "", quantity: "" }]);

  const filter = distributor ? `&distributor=${distributor}` : "";
  const outlets = useQuery({
    queryKey: ["claim-outlets", distributor],
    queryFn: () => api<Page<Outlet>>(`/outlets?size=100&status=APPROVED${filter}`),
    enabled: kind === "TRADE",
  });

  const create = useMutation({
    mutationFn: () => post("/damage-claims", { distributor, kind, note, outlet: kind === "TRADE" ? Number(outlet) : null, lines: toLines(rows) }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["/damage-claims"] });
      onClose();
    },
  });

  return (
    <Dialog title="New damage claim" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        {create.error && <ErrorNote error={create.error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Where was it damaged?">
            <Select value={kind} onChange={(event) => setKind(event.target.value as DamageClaim["kind"])}>
              <option value="WAREHOUSE">In our warehouse</option>
              <option value="TRADE">Returned by an outlet</option>
            </Select>
          </Field>
          {kind === "TRADE" && (
            <Field label="Outlet">
              <Select required value={outlet} onChange={(event) => setOutlet(event.target.value)}>
                <option value="">Choose…</option>
                {outlets.data?.results.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        <ProductLines rows={rows} onChange={setRows} />
        <Field label="What happened?">
          <Input value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" busy={create.isPending}>
            Submit claim
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ClaimDialog({ claim, onClose }: { claim: DamageClaim; onClose: () => void }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const act = useMutation({
    mutationFn: (action: "verify" | "approve" | "reject") => post(`/damage-claims/${claim.id}/${action}`, action === "reject" ? { reason } : undefined),
    onSuccess: () => {
      client.invalidateQueries();
      onClose();
    },
  });

  const admin = can.manageAccounts(user?.role);
  const staff = admin || user?.role === "MANAGER";
  const open = claim.status === "SUBMITTED" || claim.status === "VERIFIED";

  return (
    <Dialog title={claim.number} onClose={onClose}>
      {act.error && <ErrorNote error={act.error} />}
      <p className="mb-1 text-sm text-ink-2">
        {claim.distributorName} · {day(claim.date)} · {claim.kind === "WAREHOUSE" ? "Warehouse" : `Returned by ${claim.outletName}`}
      </p>
      {claim.note && <p className="mb-3 text-sm">{claim.note}</p>}
      <LinesTable lines={claim.lines} total={claim.total} />
      {claim.rejectionReason && <p className="mt-3 text-sm text-bad">Rejected: {claim.rejectionReason}</p>}

      {staff && open && !rejecting && (
        <div className="mt-4 flex items-center justify-end gap-2">
          {claim.status === "VERIFIED" && !admin && <p className="mr-auto text-sm text-ink-2">Waiting for an admin to approve.</p>}
          <Button variant="danger" disabled={act.isPending} onClick={() => setRejecting(true)}>
            Reject
          </Button>
          {claim.status === "SUBMITTED" && (
            <Button variant="primary" busy={act.isPending} onClick={() => act.mutate("verify")}>
              Verify
            </Button>
          )}
          {claim.status === "VERIFIED" && admin && (
            <Button variant="primary" busy={act.isPending} onClick={() => act.mutate("approve")}>
              Approve
            </Button>
          )}
        </div>
      )}

      {rejecting && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            act.mutate("reject");
          }}
        >
          <Field label="Why is this being rejected?">
            <Input required maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setRejecting(false)}>
              Back
            </Button>
            <Button type="submit" variant="danger" busy={act.isPending}>
              Reject claim
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

export default function ClaimsPage() {
  const { id, select, operator } = useDistributor({ allowAll: true });
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<DamageClaim | null>(null);
  const list = usePagedList<DamageClaim>("/damage-claims", { distributor: id, status });

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-8">
      <PageHeader title="Damage claims" subtitle="A manager verifies each claim, then an admin approves it">
        {(operator || id !== undefined) && (
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New claim
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-2 sm:grid-cols-3">
        {select}
        <Select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="VERIFIED">Verified</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </Select>
      </div>

      <PagedTable
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="No damage claims"
        columns={[
          {
            header: "Number",
            cell: (row) => (
              <button onClick={() => setOpen(row)} className="font-semibold hover:underline">
                {row.number}
              </button>
            ),
          },
          { header: "Distributor", cell: (row) => row.distributorName },
          { header: "Type", cell: (row) => (row.kind === "WAREHOUSE" ? "Warehouse" : (row.outletName ?? "Trade")) },
          { header: "Date", cell: (row) => day(row.date) },
          { header: "Status", cell: (row) => <StatusTag status={row.status} /> },
          { header: "Value", align: "right", cell: (row) => money(row.total) },
        ]}
      />

      {adding && <NewClaim distributor={id} onClose={() => setAdding(false)} />}
      {open && <ClaimDialog claim={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
