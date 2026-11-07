type Cell = string | number | null | undefined;

/** A leading = + - or @ makes a spreadsheet run the cell as a formula, and
 * names here are typed in the field, so text is kept as text. */
function cell(value: Cell) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  const numeric = value.trim() !== "" && !Number.isNaN(Number(value));
  const safe = !numeric && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** Saves a CSV that Excel opens directly. The byte-order mark keeps Bangla
 * text readable there. */
export function downloadCsv(name: string, headers: string[], rows: Cell[][]) {
  const text = [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
