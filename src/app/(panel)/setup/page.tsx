"use client";

import Link from "next/link";
import { distributionNav, fieldNav, setupNav } from "@/components/panel-shell";
import { Card, PageHeader } from "@/components/ui";

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <PageHeader title="Sales" subtitle="Field work, distribution, your sales structure and plans" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[...fieldNav, ...distributionNav, ...setupNav].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="flex h-full flex-col gap-3 p-4 hover:bg-surface-2">
              <Icon className="size-6 text-brand" aria-hidden="true" />
              <span className="font-semibold">{label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
