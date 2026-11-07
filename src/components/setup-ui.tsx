"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Page } from "@/lib/types";
import { Button, Card, Dialog, Empty, ErrorNote, Field, Input, Select, Skeleton } from "./ui";

const PickMap = dynamic(() => import("./maps").then((module) => module.PickMap), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

export type Option = { value: string | number; label: string };

export type FieldSpec = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "multiselect" | "checkbox" | "location";
  options?: Option[];
  required?: boolean;
  wide?: boolean;
  placeholder?: string;
};

type Values = Record<string, unknown>;

type FormDialogProps = {
  title: string;
  fields: FieldSpec[];
  initial?: Values;
  submitLabel?: string;
  onSubmit: (values: Values) => Promise<unknown>;
  onClose: () => void;
  onValues?: (values: Values) => void;
};

/** Selects hold strings in the DOM; the API wants ids. */
function toPayload(fields: FieldSpec[], values: Values) {
  const payload = { ...values };
  for (const field of fields) {
    if (field.type === "select" && payload[field.name] !== "" && payload[field.name] != null) {
      payload[field.name] = Number(payload[field.name]);
    }
  }
  return payload;
}

export function FormDialog({ title, fields, initial, submitLabel = "Save", onSubmit, onClose, onValues }: FormDialogProps) {
  const [values, setValues] = useState<Values>(initial ?? {});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  function change(patch: Values) {
    const next = { ...values, ...patch };
    setValues(next);
    onValues?.(next);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(toPayload(fields, values));
      onClose();
    } catch (failure) {
      setError(failure);
      setBusy(false);
    }
  }

  return (
    <Dialog title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error != null && <ErrorNote error={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <FieldInput key={field.name} field={field} values={values} change={change} />
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" busy={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function FieldInput({ field, values, change }: { field: FieldSpec; values: Values; change: (patch: Values) => void }) {
  const { name, label, type = "text", options = [], required, wide, placeholder } = field;
  const set = (key: string, next: unknown) => change({ [key]: next });
  const span = wide || type === "location" || type === "multiselect" ? "sm:col-span-2" : undefined;
  const value = values[name];

  if (type === "checkbox") {
    return (
      <label className={`flex items-center gap-2 text-sm font-medium ${span ?? ""}`}>
        <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={Boolean(value)} onChange={(event) => set(name, event.target.checked)} />
        {label}
      </label>
    );
  }

  if (type === "multiselect") {
    const chosen = (value as number[] | undefined) ?? [];
    return (
      <fieldset className={span}>
        <legend className="mb-1.5 text-sm font-medium text-ink-2">{label}</legend>
        <div className="grid max-h-40 gap-1 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-2">
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--brand)]"
                checked={chosen.includes(Number(option.value))}
                onChange={(event) =>
                  set(name, event.target.checked ? [...chosen, Number(option.value)] : chosen.filter((id) => id !== Number(option.value)))
                }
              />
              {option.label}
            </label>
          ))}
          {options.length === 0 && <p className="text-sm text-ink-2">Nothing to choose yet.</p>}
        </div>
      </fieldset>
    );
  }

  if (type === "location") {
    const latitude = values.latitude as number | null | undefined;
    const longitude = values.longitude as number | null | undefined;
    const point = latitude != null && longitude != null ? { latitude, longitude } : null;
    return (
      <div className={span}>
        <p className="mb-1.5 text-sm font-medium text-ink-2">{label}</p>
        <div className="h-48 overflow-hidden rounded-xl border border-line">
          <PickMap
            value={point}
            radiusM={Number(values.zoneRadiusM) || undefined}
            onChange={(next) => change({ latitude: Number(next.latitude.toFixed(6)), longitude: Number(next.longitude.toFixed(6)) })}
          />
        </div>
        <p className="num mt-1 text-xs text-ink-2">{point ? `${point.latitude}, ${point.longitude}` : (placeholder ?? "Click the map to place the outlet.")}</p>
      </div>
    );
  }

  return (
    <div className={span}>
      <Field label={label}>
        {type === "select" ? (
          <Select required={required} value={String(value ?? "")} onChange={(event) => set(name, event.target.value)}>
            <option value="">Choose…</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            type={type}
            required={required}
            step={type === "number" ? "0.01" : undefined}
            placeholder={placeholder}
            value={String(value ?? "")}
            onChange={(event) => set(name, event.target.value)}
          />
        )}
      </Field>
    </div>
  );
}

export function ActiveTag({ active }: { active: boolean }) {
  return active ? null : <span className="ml-2 rounded-full bg-off-soft px-2 py-0.5 text-xs font-semibold text-ink-2">Inactive</span>;
}

export function SearchBox({ value, onChange, placeholder = "Search" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="absolute top-3 left-3 size-4 text-ink-3" aria-hidden="true" />
      <Input aria-label={placeholder} placeholder={placeholder} className="pl-9" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

/** A server-paginated, searchable list with `filters` kept in its query key. */
export function usePagedList<T>(path: string, filters: Record<string, string | number | undefined> = {}) {
  const [page, setPage] = useState(1);
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(typed.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [typed]);

  const params = new URLSearchParams({ page: String(page), size: "20" });
  if (search) params.set("search", search);
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }

  const query = useQuery({
    queryKey: [path, params.toString()],
    queryFn: () => api<Page<T>>(`${path}?${params}`),
    placeholderData: keepPreviousData,
  });

  return { ...query, page, setPage, typed, setTyped };
}

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "right";
};

type PagedTableProps<T> = {
  list: ReturnType<typeof usePagedList<T>>;
  columns: Column<T>[];
  rowKey: (row: T) => number;
  emptyTitle: string;
  emptyHint?: string;
};

export function PagedTable<T>({ list, columns, rowKey, emptyTitle, emptyHint }: PagedTableProps<T>) {
  const { data, error, isPending, refetch, page, setPage } = list;

  if (error) return <ErrorNote error={error} onRetry={() => refetch()} />;
  if (isPending || !data) return <Skeleton className="h-80" />;

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="text-left text-ink-2">
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th key={column.header} className={`px-5 py-3 font-medium ${column.align === "right" ? "text-right" : ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.results.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line last:border-0 hover:bg-surface-2">
              {columns.map((column) => (
                <td key={column.header} className={`px-5 py-3 ${column.align === "right" ? "num text-right" : ""}`}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.results.length === 0 && <Empty title={emptyTitle} hint={emptyHint} />}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-ink-2">
          <span className="num">
            Page {data.currentPage} of {data.totalPages}
          </span>
          <span className="flex gap-2">
            <Button onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button onClick={() => setPage(page + 1)} disabled={page >= data.totalPages} aria-label="Next page">
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </span>
        </div>
      )}
    </Card>
  );
}

export const asOptions = (rows: { id: number; name: string | null }[] | undefined): Option[] =>
  (rows ?? []).map((row) => ({ value: row.id, label: row.name ?? `#${row.id}` }));
