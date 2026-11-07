"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tags } from "lucide-react";
import { useState } from "react";
import { ActiveTag, asOptions, FormDialog, PagedTable, SearchBox, usePagedList, type FieldSpec } from "@/components/setup-ui";
import { Button, Dialog, Empty, ErrorNote, Field, Input, PageHeader, Select } from "@/components/ui";
import { api, patch, post } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import { day, money } from "@/lib/format";
import type { Named, Price, Product } from "@/lib/types";

function PricesDialog({ product, canEdit, onClose }: { product: Product; canEdit: boolean; onClose: () => void }) {
  const client = useQueryClient();
  const [form, setForm] = useState({ tradePrice: "", mrp: "", effectiveFrom: "" });
  const path = `/products/${product.id}/prices`;
  const prices = useQuery({ queryKey: [path], queryFn: () => api<Price[]>(path) });

  const add = useMutation({
    mutationFn: () => post(path, form),
    onSuccess: () => {
      setForm({ tradePrice: "", mrp: "", effectiveFrom: "" });
      client.invalidateQueries({ queryKey: [path] });
      client.invalidateQueries({ queryKey: ["/products"] });
    },
  });

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });

  return (
    <Dialog title={`Prices for ${product.name}`} onClose={onClose}>
      {prices.data?.length === 0 && <Empty title="No price yet" hint="Reps can't sell this until it has one." />}
      {!!prices.data?.length && (
        <table className="num mb-4 w-full text-sm">
          <thead className="text-left text-ink-2">
            <tr className="border-b border-line">
              <th className="py-2 font-medium">From</th>
              <th className="py-2 text-right font-medium">Trade price</th>
              <th className="py-2 text-right font-medium">MRP</th>
            </tr>
          </thead>
          <tbody>
            {prices.data.map((price) => (
              <tr key={price.id} className="border-b border-line last:border-0">
                <td className="py-2">{day(price.effectiveFrom)}</td>
                <td className="py-2 text-right">{money(price.tradePrice)}</td>
                <td className="py-2 text-right">{money(price.mrp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {canEdit && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            add.mutate();
          }}
        >
          {add.error && <ErrorNote error={add.error} />}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Trade price">
              <Input type="number" step="0.01" min="0.01" required value={form.tradePrice} onChange={set("tradePrice")} />
            </Field>
            <Field label="MRP">
              <Input type="number" step="0.01" min="0.01" required value={form.mrp} onChange={set("mrp")} />
            </Field>
            <Field label="Starts on">
              <Input type="date" required value={form.effectiveFrom} onChange={set("effectiveFrom")} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" busy={add.isPending}>
              Add price
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function CategoriesDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api<Named[]>("/product-categories") });

  const add = useMutation({
    mutationFn: () => post("/product-categories", { name: name.trim() }),
    onSuccess: () => {
      setName("");
      client.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  return (
    <Dialog title="Product categories" onClose={onClose}>
      {add.error && <ErrorNote error={add.error} />}
      <ul className="mb-4 flex flex-wrap gap-2">
        {categories.data?.map((category) => (
          <li key={category.id} className="rounded-full bg-surface-2 px-3 py-1 text-sm font-medium">
            {category.name}
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
        <Input required placeholder="New category" aria-label="New category" value={name} onChange={(event) => setName(event.target.value)} />
        <Button type="submit" variant="primary" busy={add.isPending}>
          Add
        </Button>
      </form>
    </Dialog>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const admin = can.manageAccounts(user?.role);
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [pricing, setPricing] = useState<Product | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const list = usePagedList<Product>("/products", { category });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api<Named[]>("/product-categories") });

  const fields: FieldSpec[] = [
    { name: "name", label: "Product name", required: true, wide: true },
    { name: "sku", label: "SKU", required: true },
    { name: "category", label: "Category", type: "select", options: asOptions(categories.data), required: true },
    { name: "unitName", label: "Unit", placeholder: "pcs" },
    { name: "unitsPerCase", label: "Units per case", type: "number", required: true },
    ...(editing !== "new" ? [{ name: "isActive", label: "Active", type: "checkbox", wide: true } as FieldSpec] : []),
  ];

  async function save(values: Record<string, unknown>) {
    await (editing === "new" ? post("/products", values) : patch(`/products/${(editing as Product).id}`, values));
    client.invalidateQueries({ queryKey: ["/products"] });
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader title="Products" subtitle={list.data ? `${list.data.count.toLocaleString("en-US")} SKUs` : "What your team sells"}>
        {admin && (
          <>
            <Button onClick={() => setCategoriesOpen(true)}>
              <Tags className="size-4" aria-hidden="true" />
              Categories
            </Button>
            <Button variant="primary" onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden="true" />
              Add product
            </Button>
          </>
        )}
      </PageHeader>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <SearchBox value={list.typed} onChange={list.setTyped} placeholder="Search by name or SKU" />
        <Select
          aria-label="Category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            list.setPage(1);
          }}
        >
          <option value="">All categories</option>
          {categories.data?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </div>

      <PagedTable
        list={list}
        rowKey={(row) => row.id}
        emptyTitle="No products yet"
        emptyHint="Add a category, then your first product."
        columns={[
          {
            header: "Product",
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
          { header: "SKU", cell: (row) => row.sku },
          { header: "Category", cell: (row) => row.categoryName },
          { header: "Pack", cell: (row) => `${row.unitsPerCase} ${row.unitName} / case` },
          { header: "Trade price", align: "right", cell: (row) => money(row.tradePrice) },
          { header: "MRP", align: "right", cell: (row) => money(row.mrp) },
          {
            header: "Prices",
            cell: (row) => (
              <button onClick={() => setPricing(row)} className="font-semibold text-brand hover:underline">
                {row.tradePrice ? "History" : "Set price"}
              </button>
            ),
          },
        ]}
      />

      {editing && (
        <FormDialog
          title={editing === "new" ? "Add product" : `Edit ${editing.name}`}
          fields={fields}
          initial={editing === "new" ? { unitName: "pcs", unitsPerCase: 1 } : { ...editing }}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
      {pricing && <PricesDialog product={pricing} canEdit={admin} onClose={() => setPricing(null)} />}
      {categoriesOpen && <CategoriesDialog onClose={() => setCategoriesOpen(false)} />}
    </div>
  );
}
