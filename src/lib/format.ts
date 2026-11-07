import type { Person } from "./types";

export const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE ?? "Asia/Dhaka";

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function time(value: string | number | null | undefined) {
  return value ? timeFormat.format(new Date(value)) : "—";
}

/** `value` is a plain YYYY-MM-DD calendar date, so it's never shifted by zone. */
export function day(value: string) {
  return dayFormat.format(new Date(`${value}T00:00:00Z`));
}

export function ago(value: string | number | null | undefined, now = Date.now()) {
  if (!value) return "No activity yet";
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

export function hours(value: number) {
  if (!value) return "—";
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  return `${whole}h ${String(minutes).padStart(2, "0")}m`;
}

export function hourLabel(hour: number) {
  const suffix = hour < 12 ? "am" : "pm";
  return `${hour % 12 || 12}${suffix}`;
}

export function fullName(person: Pick<Person, "firstName" | "lastName" | "email">) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email;
}

export function initials(name: string) {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const taka = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export function money(value: string | number | null | undefined) {
  return value === null || value === undefined ? "—" : `৳ ${taka.format(Number(value))}`;
}

export const roleLabel = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
} as const;
