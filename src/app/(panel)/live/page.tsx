"use client";

import clsx from "clsx";
import { Layers, Radio, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { MapLayer } from "@/components/maps";
import { Avatar, Empty, ErrorNote, Input, PresenceBadge, Select, Skeleton } from "@/components/ui";
import { ago, initials } from "@/lib/format";
import type { Presence } from "@/lib/types";
import { useLivePositions, type SocketState } from "@/lib/use-live-positions";

const LiveMap = dynamic(() => import("@/components/maps"), { ssr: false, loading: () => <Skeleton className="size-full rounded-none" /> });

const socketText: Record<SocketState, string> = {
  connecting: "Connecting…",
  live: "Live updates on",
  down: "Reconnecting… positions refresh every minute",
};

const filters: { value: Presence | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ONLINE", label: "Online" },
  { value: "IDLE", label: "Idle" },
  { value: "OFFLINE", label: "Offline" },
];

export default function LivePage() {
  const { positions, socketState, error, isPending, refetch } = useLivePositions();
  const [status, setStatus] = useState<Presence | "ALL">("ALL");
  const [division, setDivision] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [layer, setLayer] = useState<MapLayer>("streets");

  const divisions = useMemo(() => [...new Set(positions.map((p) => p.divisionName).filter(Boolean))].sort() as string[], [positions]);

  const inScope = useMemo(() => {
    const term = search.trim().toLowerCase();
    return positions.filter(
      (p) => (!division || p.divisionName === division) && (!term || p.name.toLowerCase().includes(term) || p.email.toLowerCase().includes(term)),
    );
  }, [positions, division, search]);

  const shown = useMemo(() => inScope.filter((p) => status === "ALL" || p.status === status), [inScope, status]);
  const count = (value: Presence | "ALL") => (value === "ALL" ? inScope.length : inScope.filter((p) => p.status === value).length);
  const selected = positions.find((p) => p.userId === selectedId);

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col md:h-dvh md:flex-row">
      <div className="relative min-h-0 flex-1">
        <LiveMap positions={shown} selectedId={selectedId} onSelect={setSelectedId} layer={layer} />

        <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold shadow-card" role="status">
          <Radio className={clsx("size-3.5", socketState === "live" ? "text-ok" : "text-warn")} aria-hidden="true" />
          {socketText[socketState]}
        </div>

        <button
          onClick={() => setLayer(layer === "streets" ? "satellite" : "streets")}
          className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold shadow-card hover:bg-surface-2"
        >
          <Layers className="size-3.5" aria-hidden="true" />
          {layer === "streets" ? "Satellite" : "Streets"}
        </button>

        {selected && (
          <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-surface p-4 shadow-card sm:right-auto sm:w-80">
            <div className="flex items-start gap-3">
              <Avatar text={initials(selected.name)} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{selected.name}</p>
                <p className="truncate text-sm text-ink-2">{[selected.districtName, selected.divisionName].filter(Boolean).join(", ") || selected.email}</p>
              </div>
              <button onClick={() => setSelectedId(null)} aria-label="Close details" className="rounded-lg p-1 text-ink-2 hover:bg-surface-2">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-sm">
              <PresenceBadge status={selected.status ?? "OFFLINE"} />
              <span className="text-ink-2">{selected.isLive ? "Position" : "Last known"} · {ago(selected.syncTime)}</span>
            </div>
            <div className="mt-3 flex gap-3 text-sm font-semibold text-brand">
              <Link href={`/people/${selected.userId}`} className="hover:underline">
                View route and attendance
              </Link>
              {selected.phone && (
                <a href={`tel:${selected.phone}`} className="hover:underline">
                  Call
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <aside className="flex h-2/5 flex-col border-line bg-surface md:h-auto md:w-80 md:border-l">
        <div className="space-y-2 border-b border-line p-3">
          <div className="relative">
            <Search className="absolute top-3 left-3 size-4 text-ink-3" aria-hidden="true" />
            <Input placeholder="Search people" aria-label="Search people" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
          </div>
          {divisions.length > 0 && (
            <Select aria-label="Division" value={division} onChange={(event) => setDivision(event.target.value)}>
              <option value="">All divisions</option>
              {divisions.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </Select>
          )}
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
            {filters.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatus(value)}
                aria-pressed={status === value}
                className={clsx("rounded-lg py-1 text-xs font-semibold", status === value ? "bg-surface text-ink shadow-sm" : "text-ink-2")}
              >
                {label}
                <span className="num block text-sm">{count(value)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3">
              <ErrorNote error={error} onRetry={() => refetch()} />
            </div>
          )}
          {isPending && <Skeleton className="m-3 h-40" />}
          {!isPending && !error && shown.length === 0 && (
            <Empty title="Nobody to show" hint={positions.length ? "Try a different filter." : "People appear here once their app shares a location."} />
          )}
          <ul>
            {shown.map((person) => (
              <li key={person.userId}>
                <button
                  onClick={() => setSelectedId(person.userId)}
                  className={clsx("flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left hover:bg-surface-2", person.userId === selectedId && "bg-brand-soft")}
                >
                  <Avatar text={initials(person.name)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{person.name}</span>
                    <span className="block truncate text-xs text-ink-2">{ago(person.syncTime)}</span>
                  </span>
                  <PresenceBadge status={person.status ?? "OFFLINE"} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
