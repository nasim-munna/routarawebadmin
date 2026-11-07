"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, patch, post } from "@/lib/api";
import { can, useAuth } from "@/lib/auth";
import { fullName, roleLabel } from "@/lib/format";
import type { District, Distributor, Division, Page, Person, Role, Territory } from "@/lib/types";
import { Button, Dialog, ErrorNote, Field, Input, Select } from "./ui";

const createPaths: Partial<Record<Role, string>> = {
  ADMIN: "/user/create/admin",
  MANAGER: "/user/create/manager",
  EMPLOYEE: "/user/create/employee",
  DISTRIBUTOR: "/user/create/operator",
};

function Actions({ onClose, busy, label, danger }: { onClose: () => void; busy: boolean; label: string; danger?: boolean }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" variant={danger ? "danger" : "primary"} busy={busy}>
        {label}
      </Button>
    </div>
  );
}

export function CreatePersonDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const roles = (["EMPLOYEE", "MANAGER", "ADMIN", "DISTRIBUTOR"] as Role[]).filter((role) => can.createRole(user?.role, role));
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", role: roles[0], distributor: "" });
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: event.target.value });

  const isOperator = form.role === "DISTRIBUTOR";
  const distributors = useQuery({
    queryKey: ["distributor-options"],
    queryFn: () => api<Page<Distributor>>("/distributors?size=100&is_active=true"),
    enabled: isOperator,
  });

  const create = useMutation({
    mutationFn: () => {
      const { role, distributor, ...body } = form;
      return post(createPaths[role]!, isOperator ? { ...body, distributor: Number(distributor) } : body);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["people"] });
      onClose();
    },
  });

  return (
    <Dialog title="Add a person" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        {create.error && <ErrorNote error={create.error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <Input required value={form.firstName} onChange={set("firstName")} />
          </Field>
          <Field label="Last name">
            <Input required value={form.lastName} onChange={set("lastName")} />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" required value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={set("role")}>
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabel[role]}
              </option>
            ))}
          </Select>
        </Field>
        {isOperator && (
          <Field label="Distributor">
            <Select required value={form.distributor} onChange={set("distributor")}>
              <option value="">Choose…</option>
              {distributors.data?.results.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Temporary password">
            <Input type="password" required minLength={8} maxLength={20} autoComplete="new-password" value={form.password} onChange={set("password")} />
          </Field>
          <Field label="Confirm password">
            <Input type="password" required autoComplete="new-password" value={form.confirmPassword} onChange={set("confirmPassword")} />
          </Field>
        </div>
        <p className="text-sm text-ink-2">
          {isOperator ? "They sign in to this panel and only see their own distributor." : "They add their phone, NID and district when they first sign in to the app."}
        </p>
        <Actions onClose={onClose} busy={create.isPending} label="Add person" />
      </form>
    </Dialog>
  );
}

export function EditPersonDialog({ person, onClose }: { person: Person; onClose: () => void }) {
  const client = useQueryClient();
  const [form, setForm] = useState({
    firstName: person.firstName ?? "",
    lastName: person.lastName ?? "",
    email: person.email,
    phone: person.phone ?? "",
    nid: person.nid ?? "",
    addressLine: person.addressLine ?? "",
    division: person.division ? String(person.division) : "",
    district: person.district ? String(person.district) : "",
    territory: person.territory ? String(person.territory) : "",
  });
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: event.target.value });

  const divisions = useQuery({ queryKey: ["divisions"], queryFn: () => api<Division[]>("/address/division"), staleTime: Infinity });
  const districts = useQuery({
    queryKey: ["districts", form.division],
    queryFn: () => api<District[]>(`/address/district/${form.division}`),
    enabled: Boolean(form.division),
    staleTime: Infinity,
  });

  const territories = useQuery({ queryKey: ["territories"], queryFn: () => api<Territory[]>("/territories") });

  const save = useMutation({
    mutationFn: () =>
      patch(`/user/update/personal-info/${person.id}`, {
        ...form,
        phone: form.phone || null,
        nid: form.nid || null,
        division: form.division ? Number(form.division) : null,
        district: form.district ? Number(form.district) : null,
        territory: form.territory ? Number(form.territory) : null,
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["people"] });
      client.invalidateQueries({ queryKey: ["person", person.id] });
      onClose();
    },
  });

  return (
    <Dialog title={`Edit ${fullName(person)}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        {save.error && <ErrorNote error={save.error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <Input value={form.firstName} onChange={set("firstName")} />
          </Field>
          <Field label="Last name">
            <Input value={form.lastName} onChange={set("lastName")} />
          </Field>
          <Field label="Email">
            <Input type="email" required value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Division">
            <Select value={form.division} onChange={(event) => setForm({ ...form, division: event.target.value, district: "" })}>
              <option value="">Not assigned</option>
              {divisions.data?.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="District">
            <Select value={form.district} onChange={set("district")} disabled={!form.division}>
              <option value="">Not assigned</option>
              {districts.data?.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sales territory">
            <Select value={form.territory} onChange={set("territory")}>
              <option value="">Not assigned</option>
              {territories.data?.map((territory) => (
                <option key={territory.id} value={territory.id}>
                  {territory.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="NID">
            <Input value={form.nid} onChange={set("nid")} />
          </Field>
          <Field label="Address">
            <Input value={form.addressLine} onChange={set("addressLine")} />
          </Field>
        </div>
        <Actions onClose={onClose} busy={save.isPending} label="Save changes" />
      </form>
    </Dialog>
  );
}

export function PasswordDialog({ person, onClose }: { person: Person; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const reset = useMutation({
    mutationFn: () => post(`/user/update/password/${person.id}`, { password, confirmPassword }),
    onSuccess: onClose,
  });

  return (
    <Dialog title={`Reset password for ${fullName(person)}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          reset.mutate();
        }}
      >
        {reset.error && <ErrorNote error={reset.error} />}
        <Field label="New password">
          <Input type="password" required minLength={8} maxLength={20} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <Field label="Confirm password">
          <Input type="password" required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        </Field>
        <Actions onClose={onClose} busy={reset.isPending} label="Reset password" />
      </form>
    </Dialog>
  );
}

export function DeleteDialog({ person, onClose, onDeleted }: { person: Person; onClose: () => void; onDeleted: () => void }) {
  const client = useQueryClient();

  const remove = useMutation({
    mutationFn: () => post(`/user/delete/${person.id}`),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["people"] });
      onDeleted();
    },
  });

  return (
    <Dialog title={`Remove ${fullName(person)}?`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          remove.mutate();
        }}
      >
        {remove.error && <ErrorNote error={remove.error} />}
        <p className="text-sm text-ink-2">They will no longer be able to sign in and will disappear from every list.</p>
        <Actions onClose={onClose} busy={remove.isPending} label="Remove person" danger />
      </form>
    </Dialog>
  );
}
