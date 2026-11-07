import { Suspense } from "react";
import { PanelShell } from "@/components/panel-shell";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <PanelShell>{children}</PanelShell>
    </Suspense>
  );
}
