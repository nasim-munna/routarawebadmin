"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, Plus, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { SearchBox } from "@/components/setup-ui";
import { Button, Card, Empty, ErrorNote, Skeleton } from "@/components/ui";
import { api, put } from "@/lib/api";
import type { Beat, Outlet, Page } from "@/lib/types";

const StopsMap = dynamic(() => import("@/components/maps").then((module) => module.StopsMap), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

export default function BeatPage() {
  const id = Number(useParams<{ id: string }>().id);
  const client = useQueryClient();
  const [edits, setEdits] = useState<Outlet[] | null>(null);
  const [search, setSearch] = useState("");

  const beat = useQuery({ queryKey: ["beat", id], queryFn: () => api<Beat>(`/beats/${id}`) });
  const saved = useQuery({ queryKey: ["beat-outlets", id], queryFn: () => api<Outlet[]>(`/beats/${id}/outlets`) });
  const territory = beat.data?.territory;

  const available = useQuery({
    queryKey: ["beat-candidates", territory, search],
    queryFn: () =>
      api<Page<Outlet>>(`/outlets?territory=${territory}&status=APPROVED&is_active=true&size=100&search=${encodeURIComponent(search)}`),
    enabled: territory !== undefined,
  });

  const stops = edits ?? saved.data ?? [];
  const chosen = new Set(stops.map((stop) => stop.id));
  const candidates = (available.data?.results ?? []).filter((outlet) => !chosen.has(outlet.id));

  const save = useMutation({
    mutationFn: () => put<Outlet[]>(`/beats/${id}/outlets`, { outletIds: stops.map((stop) => stop.id) }),
    onSuccess: (result) => {
      client.setQueryData(["beat-outlets", id], result);
      client.invalidateQueries({ queryKey: ["/beats"] });
      setEdits(null);
    },
  });

  function moveStop(index: number, by: number) {
    const next = [...stops];
    const [stop] = next.splice(index, 1);
    next.splice(index + by, 0, stop);
    setEdits(next);
  }

  if (beat.error) {
    return (
      <div className="p-4 md:p-8">
        <ErrorNote error={beat.error} />
      </div>
    );
  }
  if (!beat.data) return <Skeleton className="m-8 h-96" />;

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <Link href="/setup/beats" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Beat plans
      </Link>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{beat.data.name}</h1>
          <p className="num text-sm text-ink-2">
            {beat.data.territoryName} · {stops.length} {stops.length === 1 ? "stop" : "stops"}
          </p>
        </div>
        <div className="flex gap-2">
          {edits && <Button onClick={() => setEdits(null)}>Discard</Button>}
          <Button variant="primary" busy={save.isPending} disabled={!edits} onClick={() => save.mutate()}>
            {edits ? "Save route" : "Saved"}
          </Button>
        </div>
      </header>

      {save.error && (
        <div className="mb-4">
          <ErrorNote error={save.error} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <h2 className="border-b border-line px-4 py-3 font-display font-bold">Route order</h2>
          {stops.length === 0 && <Empty title="No stops yet" hint="Add outlets from the list." />}
          <ol className="max-h-[28rem] overflow-y-auto">
            {stops.map((stop, index) => (
              <li key={stop.id} className="flex items-center gap-2 border-b border-line px-3 py-2 last:border-0">
                <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white dark:text-[#06201e]">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{stop.name}</span>
                <button onClick={() => moveStop(index, -1)} disabled={index === 0} aria-label={`Move ${stop.name} up`} className="p-1 text-ink-2 disabled:opacity-30">
                  <ArrowUp className="size-4" aria-hidden="true" />
                </button>
                <button onClick={() => moveStop(index, 1)} disabled={index === stops.length - 1} aria-label={`Move ${stop.name} down`} className="p-1 text-ink-2 disabled:opacity-30">
                  <ArrowDown className="size-4" aria-hidden="true" />
                </button>
                <button onClick={() => setEdits(stops.filter((item) => item.id !== stop.id))} aria-label={`Remove ${stop.name}`} className="p-1 text-bad">
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-line p-3">
            <SearchBox value={search} onChange={setSearch} placeholder="Find approved outlets" />
          </div>
          {available.error && (
            <div className="p-3">
              <ErrorNote error={available.error} />
            </div>
          )}
          {!available.isPending && candidates.length === 0 && <Empty title="No more outlets" hint="Only approved outlets in this territory appear here." />}
          <ul className="max-h-[28rem] overflow-y-auto">
            {candidates.map((outlet) => (
              <li key={outlet.id}>
                <button onClick={() => setEdits([...stops, outlet])} className="flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left hover:bg-surface-2">
                  <Plus className="size-4 shrink-0 text-brand" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{outlet.name}</span>
                  <span className="text-xs text-ink-2">{outlet.channelName}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="h-96 overflow-hidden lg:h-auto lg:min-h-96">
          <StopsMap stops={stops} />
        </Card>
      </div>
    </div>
  );
}
