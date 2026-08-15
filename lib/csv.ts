import type { Sheet } from "./types";
import { toNumber, isNumericColumn } from "./format";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Serialize a sheet to CSV. Numeric columns export raw numbers (no $ / commas)
 *  so the file re-imports cleanly. */
export function sheetToCsv(sheet: Sheet): string {
  const header = sheet.columns.map((c) => escapeCsv(c.label)).join(",");
  const lines = sheet.rows.map((row) =>
    sheet.columns
      .map((c) => {
        const raw = row.data[c.key];
        if (raw === null || raw === undefined) return "";
        if (isNumericColumn(c)) {
          const n = toNumber(raw);
          return n === null ? escapeCsv(String(raw)) : String(n);
        }
        return escapeCsv(String(raw));
      })
      .join(","),
  );
  return [header, ...lines].join("\r\n");
}

function safeFileName(name: string): string {
  return (
    name
      .trim()
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "salessheet"
  );
}

/** Trigger a client-side CSV download of the sheet. */
export function downloadCsv(sheet: Sheet): void {
  const csv = sheetToCsv(sheet);
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFileName(sheet.name)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
