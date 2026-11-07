"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "./ui";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button className="print:hidden" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden="true" />
      {label}
    </Button>
  );
}

export function ReportActions({ onExport, disabled }: { onExport: () => void; disabled?: boolean }) {
  return (
    <span className="flex gap-2 print:hidden">
      <Button onClick={onExport} disabled={disabled}>
        <Download className="size-4" aria-hidden="true" />
        Export to Excel
      </Button>
      <PrintButton label="Print or PDF" />
    </span>
  );
}
