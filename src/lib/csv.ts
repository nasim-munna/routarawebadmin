function cell(value: string) {
  // A leading = + - @ would run as a formula when opened in Excel.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function downloadCsv(filename: string, rows: string[][]) {
  const text = rows.map((row) => row.map(cell).join(",")).join("\r\n");
  // The BOM makes Excel read Bangla names as UTF-8.
  const url = URL.createObjectURL(new Blob(["﻿", text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
