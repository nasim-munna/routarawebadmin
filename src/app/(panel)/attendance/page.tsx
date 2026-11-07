"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AttendanceBadge, Button, Card, Empty, ErrorNote, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { day, hours, time } from "@/lib/format";
import type { AttendanceStatus, Roster } from "@/lib/types";

export default function AttendancePage() {
  const [date, setDate] = useState("");
  const [division, setDivision] = useState("");
  const [status, setStatus] = useState<AttendanceStatus | "">("");
  const [search, setSearch] = useState("");

  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["roster", date],
    queryFn: () => api<Roster>(`/attendance/roster${date ? `?date=${date}` : ""}`),
    placeholderData: keepPreviousData,
  });

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const divisions = useMemo(() => [...new Set(rows.map((row) => row.divisionName).filter(Boolean))].sort() as string[], [rows]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (!division || row.divisionName === division) &&
        (!status || row.status === status) &&
        (!term || row.userName.toLowerCase().includes(term) || row.email.toLowerCase().includes(term)),
    );
  }, [rows, division, status, search]);

  function exportCsv() {
    if (!data) return;
    downloadCsv(`attendance-${data.date}.csv`, [
      ["Name", "Email", "Division", "District", "Status", "First check-in", "Last check-out", "Hours"],
      ...shown.map((row) => [
        row.userName,
        row.email,
        row.divisionName ?? "",
        row.districtName ?? "",
        row.status,
        row.firstCheckIn ? time(row.firstCheckIn) : "",
        row.lastCheckOut ? time(row.lastCheckOut) : "",
        String(row.totalHours),
      ]),
    ]);
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader title="Attendance" subtitle={data ? day(data.date) : "Daily check-ins"}>
        <Button onClick={exportCsv} disabled={!shown.length}>
          <Download className="size-4" aria-hidden="true" />
          Export CSV
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input type="date" aria-label="Date" value={date || data?.date || ""} onChange={(event) => setDate(event.target.value)} />
        <Input placeholder="Search people" aria-label="Search people" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select aria-label="Division" value={division} onChange={(event) => setDivision(event.target.value)}>
          <option value="">All divisions</option>
          {divisions.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </Select>
        <Select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as AttendanceStatus | "")}>
          <option value="">All statuses</option>
          <option value="WORKING">Working</option>
          <option value="COMPLETED">Finished</option>
          <option value="ABSENT">Absent</option>
          <option value="ON_LEAVE">On leave</option>
        </Select>
      </div>

      {error && <ErrorNote error={error} onRetry={() => refetch()} />}
      {isPending && <Skeleton className="h-80" />}

      {data && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="text-left text-ink-2">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Division</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">First check-in</th>
                <th className="px-5 py-3 font-medium">Last check-out</th>
                <th className="px-5 py-3 text-right font-medium">Hours</th>
              </tr>
            </thead>
            <tbody className="num">
              {shown.map((row) => (
                <tr key={row.userId} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <td className="px-5 py-3">
                    <Link href={`/people/${row.userId}`} className="font-semibold hover:underline">
                      {row.userName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-2">{row.divisionName ?? "—"}</td>
                  <td className="px-5 py-3">
                    <AttendanceBadge status={row.status} />
                  </td>
                  <td className="px-5 py-3">{time(row.firstCheckIn)}</td>
                  <td className="px-5 py-3">{time(row.lastCheckOut)}</td>
                  <td className="px-5 py-3 text-right">{hours(row.totalHours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <Empty title="No matching people" hint="Try a different date or filter." />}
        </Card>
      )}
    </div>
  );
}
