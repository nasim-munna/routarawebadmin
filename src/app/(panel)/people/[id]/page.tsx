"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ArrowLeft, KeyRound, Pencil, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteDialog, EditPersonDialog, PasswordDialog } from "@/components/person-dialogs";
import { Avatar, Button, Card, Empty, ErrorNote, Input, PresenceBadge, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import { ago, fullName, hours, initials, roleLabel, time, TIME_ZONE } from "@/lib/format";
import type { MonthDay, Person, SnapshotPage } from "@/lib/types";

const RouteMap = dynamic(() => import("@/components/maps").then((module) => module.RouteMap), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

function Detail({ label, value, wide }: { label: string; value: string | null; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="text-sm font-medium break-words">{value || "—"}</dd>
    </div>
  );
}

function MonthGrid({ userId, month }: { userId: number; month: string }) {
  const { data, error, isPending } = useQuery({
    queryKey: ["month", userId, month],
    queryFn: () => api<MonthDay[]>(`/attendance/user/monthly/${userId}?month=${month}`),
  });

  if (error) return <ErrorNote error={error} />;
  if (isPending) return <Skeleton className="h-52" />;

  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const byDay = new Map(data.map((row) => [Number(row.date.slice(8, 10)), row]));
  const worked = data.reduce((sum, row) => sum + row.totalHours, 0);

  return (
    <>
      <p className="num mb-3 text-sm text-ink-2">
        {data.length} {data.length === 1 ? "day" : "days"} present · {hours(worked)} total
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["S", "M", "T", "W", "T", "F", "S"].map((letter, index) => (
          <span key={index} className="py-1 text-ink-3">
            {letter}
          </span>
        ))}
        {Array.from({ length: offset }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: lastDay }, (_, index) => {
          const row = byDay.get(index + 1);
          return (
            <span
              key={index}
              title={row ? `${time(row.firstCheckIn)} – ${time(row.lastCheckOut)} · ${hours(row.totalHours)}` : "No attendance"}
              className={clsx("num rounded-lg py-2 font-semibold", row ? "bg-brand text-white dark:text-[#06201e]" : "bg-surface-2 text-ink-3")}
            >
              {index + 1}
            </span>
          );
        })}
      </div>
    </>
  );
}

export default function PersonPage() {
  const id = Number(useParams<{ id: string }>().id);
  const router = useRouter();
  const { user } = useAuth();
  const [date, setDate] = useState(today);
  const [dialog, setDialog] = useState<"edit" | "password" | "delete" | null>(null);

  const person = useQuery({ queryKey: ["person", id], queryFn: () => api<Person>(`/user/${id}`) });
  const route = useQuery({
    queryKey: ["route", id, date],
    queryFn: () => api<SnapshotPage>(`/location/snapshots/${id}?date=${date}&size=100`),
    enabled: Boolean(date),
  });

  if (person.error) {
    return (
      <div className="p-4 md:p-8">
        <ErrorNote error={person.error} />
      </div>
    );
  }
  if (!person.data) return <Skeleton className="m-8 h-96" />;

  const data = person.data;
  const name = fullName(data);
  const points = route.data?.results ?? [];
  const editable = can.editPerson(user?.role, data.role);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <Link href="/people" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        People
      </Link>

      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar text={initials(name)} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">{name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
            {roleLabel[data.role]}
            {data.active ? <PresenceBadge status="ONLINE" /> : <span>· {ago(data.lastActiveAt)}</span>}
          </p>
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDialog("edit")}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </Button>
            <Button onClick={() => setDialog("password")}>
              <KeyRound className="size-4" aria-hidden="true" />
              Reset password
            </Button>
            <Button onClick={() => setDialog("delete")} aria-label="Remove person">
              <Trash2 className="size-4 text-bad" aria-hidden="true" />
            </Button>
          </div>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h2 className="font-display text-lg font-bold">Route</h2>
              <p className="num text-sm text-ink-2">
                {points.length
                  ? `${route.data?.distanceKm ?? 0} km · ${time(points[0].createdAt)} to ${time(points[points.length - 1].createdAt)}`
                  : "No location saved for this day"}
              </p>
            </div>
            <Input type="date" aria-label="Route date" className="w-auto" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="h-96">
            {route.error ? (
              <div className="p-4">
                <ErrorNote error={route.error} />
              </div>
            ) : points.length ? (
              <RouteMap key={date} points={points} />
            ) : (
              <Empty title={route.isPending ? "Loading route…" : "Nothing to show"} hint={route.isPending ? undefined : "Try another date."} />
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Details</h2>
            <dl className="grid grid-cols-2 gap-3">
              <Detail label="Email" value={data.email} wide />
              <Detail label="Phone" value={data.phone} wide />
              <Detail label="Division" value={data.divisionName} />
              <Detail label="District" value={data.districtName} />
              <Detail label="Sales territory" value={data.territoryName} wide />
            </dl>
          </Card>
          <Card className="p-5">
            <h2 className="font-display text-lg font-bold">Attendance this month</h2>
            <MonthGrid userId={id} month={today().slice(0, 7)} />
          </Card>
        </div>
      </div>

      {dialog === "edit" && <EditPersonDialog person={data} onClose={() => setDialog(null)} />}
      {dialog === "password" && <PasswordDialog person={data} onClose={() => setDialog(null)} />}
      {dialog === "delete" && <DeleteDialog person={data} onClose={() => setDialog(null)} onDeleted={() => router.replace("/people")} />}
    </div>
  );
}
