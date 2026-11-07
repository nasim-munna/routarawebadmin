"use client";

import clsx from "clsx";
import { CircleAlert, Clock3, LoaderCircle, Moon, Sun, Wifi, WifiOff, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useSyncExternalStore } from "react";
import type { AttendanceStatus, Presence } from "@/lib/types";

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#F2A93B" />
      <path d="M9 23c0-6 14-3 14-9.5C23 9 16 9 13 9" fill="none" stroke="#0B3B3C" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="9" cy="23" r="3" fill="#0B3B3C" />
      <circle cx="12" cy="9" r="3" fill="#F6F3EC" stroke="#0B3B3C" strokeWidth="2.2" />
    </svg>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={clsx("rounded-2xl border border-line bg-surface shadow-card", className)}>{children}</section>;
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger"; busy?: boolean };

export function Button({ variant = "ghost", busy, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || busy}
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-marigold text-marigold-ink hover:brightness-105",
        variant === "ghost" && "border border-line bg-surface text-ink hover:bg-surface-2",
        variant === "danger" && "bg-bad text-white hover:brightness-110 dark:text-[#2b0a10]",
        className,
      )}
    >
      {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

const fieldClass =
  "h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(fieldClass, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(fieldClass, "pr-8", props.className)} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}

const presence = {
  ONLINE: { label: "Online", icon: Wifi, className: "bg-ok-soft text-ok" },
  IDLE: { label: "Idle", icon: Clock3, className: "bg-warn-soft text-warn" },
  OFFLINE: { label: "Offline", icon: WifiOff, className: "bg-off-soft text-ink-2" },
} as const;

export function PresenceBadge({ status }: { status: Presence }) {
  const { label, icon: Icon, className } = presence[status];
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", className)}>
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}

const attendance = {
  WORKING: { label: "Working", className: "bg-ok-soft text-ok" },
  COMPLETED: { label: "Finished", className: "bg-brand-soft text-brand" },
  ABSENT: { label: "Absent", className: "bg-bad-soft text-bad" },
} as const;

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const { label, className } = attendance[status];
  return <span className={clsx("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", className)}>{label}</span>;
}

export function Avatar({ text }: { text: string }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand" aria-hidden="true">
      {text}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-xl bg-surface-2", className)} />;
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-xl bg-bad-soft p-4 text-sm text-bad">
      <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
      <span className="flex-1">{error instanceof Error ? error.message : "Something went wrong."}</span>
      {onRetry && (
        <button onClick={onRetry} className="font-semibold underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-semibold">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-2">{hint}</p>}
    </div>
  );
}

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/50"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-ink-2 hover:bg-surface-2">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

const subscribeNever = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Use light theme" : "Use dark theme"}
      className={clsx("grid size-10 place-items-center rounded-xl", className)}
    >
      {dark ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
    </button>
  );
}
