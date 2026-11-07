"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Eraser } from "lucide-react";
import { useState } from "react";
import { Button, Card, Empty, ErrorNote, Field, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import { api, put } from "@/lib/api";
import { fullName, TIME_ZONE } from "@/lib/format";
import type { Beat, ItineraryDay, Page, Person } from "@/lib/types";

const FRIDAY = 5;
const ERASE = 0;

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

function datesOf(month: string) {
  const [year, number] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length: last }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}

const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

function Calendar({ employee, month, beats }: { employee: Person; month: string; beats: Beat[] }) {
  const client = useQueryClient();
  const key = ["itinerary", employee.id, month];
  const today = todayIso();
  const [brush, setBrush] = useState<number>(beats[0]?.id ?? ERASE);
  const [edits, setEdits] = useState<Record<string, number> | null>(null);

  const saved = useQuery({ queryKey: key, queryFn: () => api<ItineraryDay[]>(`/itinerary?employee=${employee.id}&month=${month}`) });

  const plan = edits ?? Object.fromEntries((saved.data ?? []).map((day) => [day.date, day.beat]));
  const beatName = (id: number) => beats.find((beat) => beat.id === id)?.name ?? saved.data?.find((day) => day.beat === id)?.beatName ?? "Beat";

  const save = useMutation({
    mutationFn: () =>
      put<ItineraryDay[]>("/itinerary", {
        employee: employee.id,
        month,
        days: Object.entries(plan).map(([date, beat]) => ({ date, beat })),
      }),
    onSuccess: (result) => {
      client.setQueryData(key, result);
      setEdits(null);
    },
  });

  function paint(date: string) {
    const next = { ...plan };
    if (brush === ERASE) delete next[date];
    else next[date] = brush;
    setEdits(next);
  }

  function fillWorkdays() {
    const next = { ...plan };
    for (const date of datesOf(month)) {
      if (date >= today && weekday(date) !== FRIDAY && brush !== ERASE) next[date] = brush;
    }
    setEdits(next);
  }

  const dates = datesOf(month);

  return (
    <>
      <Card className="mb-4 p-4">
        <p className="mb-2 text-sm font-medium text-ink-2">Choose a beat, then click days to plan them</p>
        <div className="flex flex-wrap items-center gap-2">
          {beats.map((beat) => (
            <button
              key={beat.id}
              onClick={() => setBrush(beat.id)}
              aria-pressed={brush === beat.id}
              className={clsx("rounded-full border px-3 py-1 text-sm font-semibold", brush === beat.id ? "border-brand bg-brand text-white dark:text-[#06201e]" : "border-line")}
            >
              {beat.name}
            </button>
          ))}
          <button
            onClick={() => setBrush(ERASE)}
            aria-pressed={brush === ERASE}
            className={clsx("flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold", brush === ERASE ? "border-bad bg-bad-soft text-bad" : "border-line")}
          >
            <Eraser className="size-4" aria-hidden="true" />
            Clear
          </button>
          <span className="flex-1" />
          <Button onClick={fillWorkdays} disabled={brush === ERASE}>
            Fill Sat to Thu
          </Button>
          <Button variant="primary" busy={save.isPending} disabled={!edits} onClick={() => save.mutate()}>
            {edits ? "Save plan" : "Saved"}
          </Button>
        </div>
      </Card>

      {save.error && (
        <div className="mb-4">
          <ErrorNote error={save.error} />
        </div>
      )}
      {saved.error && <ErrorNote error={saved.error} onRetry={() => saved.refetch()} />}
      {saved.isPending && <Skeleton className="h-96" />}

      {saved.data && (
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => (
            <span key={name} className="py-1 text-center text-xs font-medium text-ink-2">
              {name}
            </span>
          ))}
          {Array.from({ length: weekday(dates[0]) }, (_, index) => (
            <span key={`blank-${index}`} />
          ))}
          {dates.map((date) => {
            const past = date < today;
            const beat = plan[date];
            return (
              <button
                key={date}
                disabled={past}
                onClick={() => paint(date)}
                aria-label={`${date}${beat ? `, ${beatName(beat)}` : ", not planned"}`}
                className={clsx(
                  "num min-h-16 rounded-lg border p-1.5 text-left text-xs transition sm:min-h-20",
                  beat ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-surface-2",
                  past && "cursor-not-allowed opacity-50",
                  weekday(date) === FRIDAY && !beat && "bg-surface-2",
                )}
              >
                <span className="font-semibold">{Number(date.slice(8))}</span>
                {beat && <span className="mt-1 line-clamp-2 block font-semibold text-brand">{beatName(beat)}</span>}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function ItineraryPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(() => todayIso().slice(0, 7));

  const people = useQuery({ queryKey: ["employees"], queryFn: () => api<Page<Person>>("/user/others?role=EMPLOYEE&size=100") });
  const employee = people.data?.results.find((person) => String(person.id) === employeeId);
  const territory = employee?.territory;

  const beats = useQuery({
    queryKey: ["beats-of", territory],
    queryFn: () => api<Page<Beat>>(`/beats?territory=${territory}&is_active=true&size=100`),
    enabled: Boolean(territory),
  });

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <PageHeader title="Itinerary" subtitle="Who works which beat, day by day" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Person">
          <Select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
            <option value="">Choose a person…</option>
            {people.data?.results.map((person) => (
              <option key={person.id} value={person.id}>
                {fullName(person)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Month">
          <Input type="month" required value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} />
        </Field>
      </div>

      {people.error && <ErrorNote error={people.error} />}
      {!employee && <Empty title="Choose a person to plan their month" />}
      {employee && !territory && <Empty title="This person has no territory" hint="Give them one on their People page first." />}
      {employee && territory && beats.data?.results.length === 0 && <Empty title="No beats in this territory" hint="Create a beat under Beat plans first." />}
      {employee && !!beats.data?.results.length && <Calendar key={`${employee.id}-${month}`} employee={employee} month={month} beats={beats.data.results} />}
    </div>
  );
}
