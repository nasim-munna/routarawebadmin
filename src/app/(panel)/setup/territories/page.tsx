"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { ChevronRight, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { ActiveTag, asOptions, FormDialog, type FieldSpec } from "@/components/setup-ui";
import { Card, Empty, ErrorNote, PageHeader, Skeleton } from "@/components/ui";
import { api, patch, post } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import type { Area, Division, Region, Territory } from "@/lib/types";

type Item = { id: number; name: string; code: string; isActive: boolean; zoneRadiusM?: number | null; zoneLatitude?: number | null; zoneLongitude?: number | null };

type ColumnProps = {
  title: string;
  items?: Item[];
  isLoading: boolean;
  error: unknown;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  onAdd?: () => void;
  onEdit?: (item: Item) => void;
  hint: string;
};

function Column({ title, items, isLoading, error, selectedId, onSelect, onAdd, onEdit, hint }: ColumnProps) {
  return (
    <Card className="flex min-h-80 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-display font-bold">{title}</h2>
        {onAdd && (
          <button onClick={onAdd} aria-label={`Add to ${title}`} className="rounded-lg p-1 text-brand hover:bg-surface-2">
            <Plus className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>
      {error != null && (
        <div className="p-3">
          <ErrorNote error={error} />
        </div>
      )}
      {isLoading && <Skeleton className="m-3 h-32" />}
      {items?.length === 0 && <Empty title="Nothing here yet" hint={hint} />}
      <ul className="flex-1 overflow-y-auto">
        {items?.map((item) => (
          <li key={item.id} className={clsx("group flex items-center border-b border-line last:border-0", item.id === selectedId && "bg-brand-soft")}>
            <button onClick={() => onSelect?.(item.id)} disabled={!onSelect} className="min-w-0 flex-1 px-4 py-2.5 text-left">
              <span className="block truncate text-sm font-semibold">
                {item.name}
                <ActiveTag active={item.isActive} />
              </span>
              <span className="text-xs text-ink-2">
                {item.code}
                {item.zoneRadiusM === null && <span className="ml-2 font-semibold text-warn">No zone yet</span>}
                {!!item.zoneRadiusM && ` · ${(item.zoneRadiusM / 1000).toLocaleString("en-US")} km zone`}
              </span>
            </button>
            {onEdit && (
              <button onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`} className="p-2 text-ink-3 hover:text-ink">
                <Pencil className="size-4" aria-hidden="true" />
              </button>
            )}
            {onSelect && <ChevronRight className="mr-3 size-4 text-ink-3" aria-hidden="true" />}
          </li>
        ))}
      </ul>
    </Card>
  );
}

type Form = { title: string; fields: FieldSpec[]; initial: Record<string, unknown>; path: string; id?: number; extra?: Record<string, unknown> };

const nameAndCode: FieldSpec[] = [
  { name: "name", label: "Name", required: true },
  { name: "code", label: "Code", required: true },
];
const activeField: FieldSpec = { name: "isActive", label: "Active", type: "checkbox", wide: true };

export default function TerritoriesPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const admin = can.manageAccounts(user?.role);
  const [regionId, setRegionId] = useState<number | null>(null);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [form, setForm] = useState<Form | null>(null);

  const regions = useQuery({ queryKey: ["regions"], queryFn: () => api<Region[]>("/regions") });
  const areas = useQuery({ queryKey: ["areas", regionId], queryFn: () => api<Area[]>(`/areas?region=${regionId}`), enabled: regionId !== null });
  const territories = useQuery({
    queryKey: ["territories", areaId],
    queryFn: () => api<Territory[]>(`/territories?area=${areaId}`),
    enabled: areaId !== null,
  });
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/address/division"), staleTime: Infinity });

  const territoryFields: FieldSpec[] = [
    ...nameAndCode,
    { name: "division", label: "Division", type: "select", options: asOptions(divisions.data), required: true, wide: true },
    { name: "zoneRadiusM", label: "Check-in zone radius (metres)", type: "number", required: true, wide: true },
    { name: "zone", label: "Zone centre", type: "location", placeholder: "Click the map to set the middle of the zone." },
  ];

  const open = (title: string, path: string, fields: FieldSpec[], item?: Item, extra?: Record<string, unknown>) =>
    setForm({
      title: `${item ? "Edit" : "Add"} ${title}`,
      path,
      id: item?.id,
      extra,
      fields: item ? [...fields, activeField] : fields,
      initial: item ? { ...item, latitude: item.zoneLatitude, longitude: item.zoneLongitude } : { zoneRadiusM: 2000 },
    });

  async function save(values: Record<string, unknown>) {
    if (!form) return;
    const { latitude, longitude, ...rest } = values;
    const zone = form.path === "/territories" ? { zoneLatitude: latitude, zoneLongitude: longitude, zoneRadiusM: Number(values.zoneRadiusM) } : {};
    if (form.path === "/territories" && latitude == null) throw new Error("Click the map to set the zone centre.");
    const body = { ...rest, ...zone, ...form.extra };
    await (form.id ? patch(`${form.path}/${form.id}`, body) : post(form.path, body));
    for (const key of ["regions", "areas", "territories"]) client.invalidateQueries({ queryKey: [key] });
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader title="Territories" subtitle="Region, then area, then territory: the shape of your sales team" />

      <div className="grid gap-4 md:grid-cols-3">
        <Column
          title="Regions"
          items={regions.data}
          isLoading={regions.isPending}
          error={regions.error}
          selectedId={regionId}
          onSelect={(id) => {
            setRegionId(id);
            setAreaId(null);
          }}
          onAdd={admin ? () => open("region", "/regions", nameAndCode) : undefined}
          onEdit={admin ? (item) => open("region", "/regions", nameAndCode, item) : undefined}
          hint="Start by adding a region."
        />
        <Column
          title="Areas"
          items={regionId ? areas.data : undefined}
          isLoading={regionId !== null && areas.isPending}
          error={areas.error}
          selectedId={areaId}
          onSelect={setAreaId}
          onAdd={admin && regionId ? () => open("area", "/areas", nameAndCode, undefined, { region: regionId }) : undefined}
          onEdit={admin ? (item) => open("area", "/areas", nameAndCode, item) : undefined}
          hint="Add the first area in this region."
        />
        <Column
          title="Territories"
          items={areaId ? territories.data : undefined}
          isLoading={areaId !== null && territories.isPending}
          error={territories.error}
          onAdd={admin && areaId ? () => open("territory", "/territories", territoryFields, undefined, { area: areaId }) : undefined}
          onEdit={admin ? (item) => open("territory", "/territories", territoryFields, item) : undefined}
          hint="Add the first territory in this area."
        />
      </div>

      {form && <FormDialog title={form.title} fields={form.fields} initial={form.initial} onSubmit={save} onClose={() => setForm(null)} />}
    </div>
  );
}
