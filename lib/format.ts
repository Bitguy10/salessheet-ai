import type { CellValue, Column, ColumnType } from "./types";

/** Parse a possibly-messy value into a number, or null. Strips $, commas, %,
 *  parentheses (accounting negatives), and stray whitespace. */
export function toNumber(value: CellValue): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  if (raw === "") return null;
  const negative = /^\(.*\)$/.test(raw);
  const cleaned = raw.replace(/[(),$£€\s]/g, "").replace(/%/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const currencyWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatCurrency(n: number): string {
  return Number.isInteger(n) ? currencyWhole.format(n) : currencyFmt.format(n);
}

export function formatNumber(n: number): string {
  return numberFmt.format(n);
}

/** Compact form for KPIs / axis labels: 1.2K, 3.4M. */
export function formatCompact(n: number, currency = false): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  let out: string;
  if (abs >= 1_000_000) out = `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  else if (abs >= 1_000) out = `${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  else out = numberFmt.format(abs);
  return `${currency ? "$" : ""}${sign}${out}`;
}

/** Render a cell value for display, according to its column type. */
export function formatCell(value: CellValue, type: ColumnType): string {
  if (value === null || value === undefined || value === "") return "";
  if (type === "currency") {
    const n = toNumber(value);
    return n === null ? String(value) : formatCurrency(n);
  }
  if (type === "number") {
    const n = toNumber(value);
    return n === null ? String(value) : formatNumber(n);
  }
  return String(value);
}

/** Numeric columns (number/currency) are right-aligned & mono per spec §3.2. */
export function isNumericColumn(col: Column): boolean {
  return col.type === "number" || col.type === "currency";
}
