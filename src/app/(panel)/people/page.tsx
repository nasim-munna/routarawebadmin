"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CreatePersonDialog } from "@/components/person-dialogs";
import { Avatar, Button, Card, Empty, ErrorNote, Input, PageHeader, PresenceBadge, Select, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { ago, fullName, initials, roleLabel } from "@/lib/format";
import type { Division, Page, Person } from "@/lib/types";

const PAGE_SIZE = 20;

export default function PeoplePage() {
  const [page, setPage] = useState(1);
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [division, setDivision] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(typed.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [typed]);

  const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (search) params.set("search", search);
  if (role) params.set("role", role);
  if (division) params.set("division", division);

  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["people", params.toString()],
    queryFn: () => api<Page<Person>>(`/user/others?${params}`),
    placeholderData: keepPreviousData,
  });
  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/address/division"), staleTime: Infinity });

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <PageHeader title="People" subtitle={data ? `${data.count.toLocaleString("en-US")} ${data.count === 1 ? "person" : "people"}` : "Your team"}>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Add person
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Input placeholder="Search by name or email" aria-label="Search" value={typed} onChange={(event) => setTyped(event.target.value)} />
        <Select
          aria-label="Role"
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          {Object.entries(roleLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Division"
          value={division}
          onChange={(event) => {
            setDivision(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All divisions</option>
          {divisions.data?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <ErrorNote error={error} onRetry={() => refetch()} />}
      {isPending && <Skeleton className="h-96" />}

      {data && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="text-left text-ink-2">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Division</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((person) => (
                <tr key={person.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <td className="px-5 py-2.5">
                    <Link href={`/people/${person.id}`} className="flex items-center gap-3">
                      <Avatar text={initials(fullName(person))} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold hover:underline">{fullName(person)}</span>
                        <span className="block truncate text-xs text-ink-2">{person.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-2.5">{roleLabel[person.role]}</td>
                  <td className="px-5 py-2.5 text-ink-2">{person.divisionName ?? "—"}</td>
                  <td className="num px-5 py-2.5 text-ink-2">{person.phone ?? "—"}</td>
                  <td className="px-5 py-2.5">
                    {!person.isAccountCompleted ? (
                      <span className="text-xs font-semibold text-warn">Setup pending</span>
                    ) : person.active ? (
                      <PresenceBadge status="ONLINE" />
                    ) : (
                      <span className="text-xs text-ink-2">{ago(person.lastActiveAt)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.results.length === 0 && <Empty title="No people found" hint="Try a different search or filter." />}

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
      )}

      {creating && <CreatePersonDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
