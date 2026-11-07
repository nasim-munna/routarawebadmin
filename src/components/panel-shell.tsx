"use client";

import clsx from "clsx";
import { Banknote, Boxes, CalendarCheck, ClipboardList, Footprints, CalendarDays, Goal, HandCoins, LayoutGrid, LogOut, MapPinned, MoreHorizontal, Network, PackageCheck, PackageOpen, PackageX, Route, Scale, Settings2, SlidersHorizontal, Store, Truck, Users, Warehouse } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Avatar, Logo, Skeleton, ThemeToggle } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { fullName, initials, roleLabel } from "@/lib/format";

const nav = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/live", label: "Live map", icon: MapPinned },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/people", label: "People", icon: Users },
];

export const fieldNav = [
  { href: "/field/orders", label: "Orders", icon: ClipboardList },
  { href: "/field/visits", label: "Visits", icon: Footprints },
];

export const distributionNav = [
  { href: "/distribution/stock", label: "Stock", icon: Warehouse },
  { href: "/distribution/deliveries", label: "Deliveries", icon: PackageCheck },
  { href: "/distribution/requests", label: "Stock requests", icon: PackageOpen },
  { href: "/distribution/deposits", label: "Deposits", icon: Banknote },
  { href: "/distribution/dues", label: "Outlet dues", icon: HandCoins },
  { href: "/distribution/claims", label: "Damage claims", icon: PackageX },
  { href: "/distribution/fill-rate", label: "Order vs delivery", icon: Scale },
];

export const setupNav = [
  { href: "/setup/territories", label: "Territories", icon: Network },
  { href: "/setup/distributors", label: "Distributors", icon: Truck },
  { href: "/setup/outlets", label: "Outlets", icon: Store },
  { href: "/setup/products", label: "Products", icon: Boxes },
  { href: "/setup/beats", label: "Beat plans", icon: Route },
  { href: "/setup/itinerary", label: "Itinerary", icon: CalendarDays },
  { href: "/setup/targets", label: "Targets", icon: Goal },
  { href: "/setup/field-rules", label: "Field rules", icon: SlidersHorizontal },
];

const mobileNav = [...nav, { href: "/setup", label: "Setup", icon: Settings2 }];
const operatorMobileNav = [...distributionNav.slice(0, 4), { href: "/distribution", label: "More", icon: MoreHorizontal }];

function SideLink({ href, label, icon: Icon, active }: (typeof nav)[number] & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition",
        active ? "bg-marigold text-[#3d2800]" : "text-[#c9d8d4] hover:bg-pine-2 hover:text-white",
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      {label}
    </Link>
  );
}

export function PanelShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const operator = user?.role === "DISTRIBUTOR";
  const lost = operator && !pathname.startsWith("/distribution");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (lost) router.replace("/distribution/stock");
  }, [loading, user, lost, router]);

  if (!user || lost) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  const isActive = (href: string) => (href === "/" || href === "/distribution" ? pathname === href : pathname.startsWith(href));
  const name = fullName(user);

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-pine p-4 text-[#f6f3ec] md:flex">
        <Link href="/" className="mb-8 flex items-center gap-2.5 px-2 pt-1">
          <Logo className="size-8" />
          <span className="font-display text-xl font-bold">Routara</span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Main">
          {!operator && (
            <>
              {nav.map((item) => (
                <SideLink key={item.href} {...item} active={isActive(item.href)} />
              ))}
              <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-[#a9bdb8] uppercase">Field sales</p>
              {fieldNav.map((item) => (
                <SideLink key={item.href} {...item} active={isActive(item.href)} />
              ))}
              <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-[#a9bdb8] uppercase">Distribution</p>
            </>
          )}
          {distributionNav.map((item) => (
            <SideLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
          {!operator && (
            <>
              <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-[#a9bdb8] uppercase">Sales setup</p>
              {setupNav.map((item) => (
                <SideLink key={item.href} {...item} active={isActive(item.href)} />
              ))}
            </>
          )}
        </nav>

        <div className="rounded-xl bg-pine-2 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar text={initials(name)} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-[#a9bdb8]">{user.distributorName ?? roleLabel[user.role]}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button onClick={logout} className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm text-[#c9d8d4] hover:text-white">
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
            <ThemeToggle className="text-[#c9d8d4] hover:text-white" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="flex items-center justify-between bg-pine px-4 py-2 text-[#f6f3ec] md:hidden">
          <span className="flex items-center gap-2">
            <Logo className="size-7" />
            <span className="font-display text-lg font-bold">Routara</span>
          </span>
          <span className="flex items-center">
            <ThemeToggle />
            <button onClick={logout} aria-label="Sign out" className="grid size-10 place-items-center">
              <LogOut className="size-5" aria-hidden="true" />
            </button>
          </span>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface md:hidden" aria-label="Main">
        {(operator ? operatorMobileNav : mobileNav).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={clsx("flex flex-col items-center gap-1 py-2 text-xs font-semibold", isActive(href) ? "text-brand" : "text-ink-2")}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
