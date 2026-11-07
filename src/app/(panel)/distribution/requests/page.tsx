"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { type ChosenLine, LinesTable, ProductLines, StatusTag, toLines, useDistributor } from "@/components/distribution-ui";
import { PrintButton } from "@/components/report-ui";
import { PagedTable, usePagedList } from "@/components/setup-ui";
import { Button, Dialog, ErrorNote, Field, Input, PageHeader } from "@/components/ui";
import { post } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import { day, money } from "@/lib/format";
import type { Indent, PrimaryInvoice } from "@/lib/types";

function NewRequest({ distributor, onClose }: { distributor?: number; onClose: () => void }) {
  const client = useQueryClient();
  const [rows, setRows] = useState<ChosenLine[]>([{ product: "", quantity: "" }]);
  const [note, setNote] = useState("");
  const create = useMutation({
    mutationFn: () => post("/indents", { distributor, note, lines: toLines(rows) }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["/indents"] });
      onClose();
    },
  });

  return (
    <Dialog title="Request stock" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        {create.error && <ErrorNote error={create.error} />}
        <ProductLines rows={rows} onChange={setRows} />
        <Field label="Note">
          <Input value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" busy={create.isPending}>
            Send request
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RequestDialog({ indent, admin, onClose }: { indent: Indent; admin: boolean; onClose: () => void }) {
  const client = useQueryClient();
  const decide = useMutation({
    mutationFn: (action: "approve" | "reject") => post(`/indents/${indent.id}/${action}`),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["/indents"] });
      client.invalidateQueries({ queryKey: ["/primary-invoices"] });
      onClose();
    },
  });

  return (
    <Dialog title={indent.number} onClose={onClose}>
      {decide.error && <ErrorNote error={decide.error} />}
      <p className="mb-3 text-sm text-ink-2">
        {indent.distributorName} · {day(indent.date)}
        {indent.note && ` · ${indent.note}`}
      </p>
      <LinesTable lines={indent.lines} />
      {admin && indent.status === "REQUESTED" && (
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="danger" disabled={decide.isPending} onClick={() => decide.mutate("reject")}>
            Reject
          </Button>
          <Button variant="primary" busy={decide.isPending} onClick={() => decide.mutate("approve")}>
            Approve and invoice
          </Button>
        </div>
      )}
    </Dialog>
  );
}

function InvoiceDialog({ invoice, canReceive, onClose }: { invoice: PrimaryInvoice; canReceive: boolean; onClose: () => void }) {
  const client = useQueryClient();
  const receive = useMutation({
    mutationFn: () => post(`/primary-invoices/${invoice.id}/receive`),
    onSuccess: () => {
      client.invalidateQueries();
      onClose();
    },
  });

  return (
    <Dialog title={invoice.number} onClose={onClose}>
      {receive.error && <ErrorNote error={receive.error} />}
      <div className="print-doc print:p-8">
        <p className="mb-2 hidden font-display text-lg font-bold print:block">Company invoice {invoice.number}</p>
        <p className="mb-3 text-sm text-ink-2">
          {invoice.distributorName}
          {invoice.distributorAddress && `, ${invoice.distributorAddress}`} · {day(invoice.date)}
        </p>
        <LinesTable lines={invoice.lines} total={invoice.total} />
        <div className="mt-4 flex justify-end">
          <PrintButton label="Print invoice" />
        </div>
      </div>
      {canReceive && invoice.status === "ISSUED" && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-ink-2">Stock goes up once this is marked received.</p>
          <Button variant="primary" busy={receive.isPending} onClick={() => receive.mutate()}>
            Mark received
          </Button>
        </div>
      )}
    </Dialog>
  );
}

export default function RequestsPage() {
  const { user } = useAuth();
  const admin = can.manageAccounts(user?.role);
  const { id, select, operator } = useDistributor({ allowAll: true });
  const [adding, setAdding] = useState(false);
  const [openIndent, setOpenIndent] = useState<Indent | null>(null);
  const [openInvoice, setOpenInvoice] = useState<PrimaryInvoice | null>(null);
  const indents = usePagedList<Indent>("/indents", { distributor: id });
  const invoices = usePagedList<PrimaryInvoice>("/primary-invoices", { distributor: id });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <PageHeader title="Stock requests" subtitle="From request to company invoice to received stock">
        {(operator || id !== undefined) && (
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Request stock
          </Button>
        )}
      </PageHeader>

      {select && <div className="max-w-sm">{select}</div>}

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Requests</h2>
        <PagedTable
          list={indents}
          rowKey={(row) => row.id}
          emptyTitle="No stock requests yet"
          columns={[
            {
              header: "Number",
              cell: (row) => (
                <button onClick={() => setOpenIndent(row)} className="font-semibold hover:underline">
                  {row.number}
                </button>
              ),
            },
            { header: "Distributor", cell: (row) => row.distributorName },
            { header: "Date", cell: (row) => day(row.date) },
            { header: "Status", cell: (row) => <StatusTag status={row.status} /> },
            { header: "Units", align: "right", cell: (row) => row.lines.reduce((sum, line) => sum + line.quantity, 0) },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Company invoices</h2>
        <PagedTable
          list={invoices}
          rowKey={(row) => row.id}
          emptyTitle="No invoices yet"
          emptyHint="Approving a request creates its invoice."
          columns={[
            {
              header: "Number",
              cell: (row) => (
                <button onClick={() => setOpenInvoice(row)} className="font-semibold hover:underline">
                  {row.number}
                </button>
              ),
            },
            { header: "Distributor", cell: (row) => row.distributorName },
            { header: "Date", cell: (row) => day(row.date) },
            { header: "Status", cell: (row) => <StatusTag status={row.status} /> },
            { header: "Total", align: "right", cell: (row) => money(row.total) },
          ]}
        />
      </section>

      {adding && <NewRequest distributor={id} onClose={() => setAdding(false)} />}
      {openIndent && <RequestDialog indent={openIndent} admin={admin} onClose={() => setOpenIndent(null)} />}
      {openInvoice && <InvoiceDialog invoice={openInvoice} canReceive={admin || operator} onClose={() => setOpenInvoice(null)} />}
    </div>
  );
}
