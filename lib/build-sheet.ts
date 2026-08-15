import type {
  CellValue,
  Column,
  ColumnType,
  RawRow,
  Row,
  Sheet,
} from "./types";
import { toNumber } from "./format";
import { detectFlags } from "./detect";

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

/** "unit_price" / "unitPrice" -> "Unit Price" */
function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const CURRENCY_HINTS = ["revenue", "sales", "amount", "price", "total", "cost", "value", "spend"];
const DATE_HINTS = ["date", "month", "day", "period", "quarter", "year", "week"];

function looksLikeDate(v: string): boolean {
  const s = v.trim();
  if (!s) return false;
  if (/^\d{4}-\d{1,2}(-\d{1,2})?$/.test(s)) return true; // 2024-03 / 2024-03-01
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(s)) return true; // 3/1/2024
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(s) && s.length <= 20) return true;
  return false;
}

function inferType(key: string, values: CellValue[]): ColumnType {
  const nonNull = values.filter((v) => v !== null && String(v).trim() !== "");
  const hay = key.toLowerCase();
  const numeric = nonNull.filter((v) => toNumber(v) !== null);
  const numericRatio = nonNull.length ? numeric.length / nonNull.length : 0;

  if (numericRatio >= 0.8 && nonNull.length > 0) {
    if (CURRENCY_HINTS.some((h) => hay.includes(h))) return "currency";
    // values written with a currency symbol -> currency
    const hasSymbol = nonNull.some((v) => /[$£€]/.test(String(v)));
    return hasSymbol ? "currency" : "number";
  }
  if (
    DATE_HINTS.some((h) => hay.includes(h)) ||
    (nonNull.length > 0 && nonNull.filter((v) => looksLikeDate(String(v))).length / nonNull.length >= 0.7)
  ) {
    return "date";
  }
  return "text";
}

function coerce(value: CellValue, type: ColumnType): CellValue {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  if (type === "number" || type === "currency") {
    const n = toNumber(value);
    return n === null ? String(value) : n; // keep unparseable text visible
  }
  return typeof value === "string" ? value.trim() : value;
}

/**
 * Turn raw extracted rows into a normalized, flagged Sheet.
 * Columns and types are inferred here (application code), never trusted blindly
 * from the model.
 */
export function buildSheet(
  rawRows: RawRow[],
  opts: {
    name: string;
    origin: "paste" | "upload";
    sourceMeta?: Sheet["sourceMeta"];
  },
): Sheet {
  // 1. Column set in first-seen order.
  const keyOrder: string[] = [];
  for (const r of rawRows) {
    for (const k of Object.keys(r.fields ?? {})) {
      if (!keyOrder.includes(k)) keyOrder.push(k);
    }
  }

  // 2. Infer type per column from sampled values.
  const columns: Column[] = keyOrder.map((key) => {
    const values = rawRows.map((r) => r.fields?.[key] ?? null);
    return { key, label: humanize(key), type: inferType(key, values) };
  });
  const typeByKey = new Map(columns.map((c) => [c.key, c.type]));

  // 3. Build rows with coerced values + AI provenance.
  const rows: Row[] = rawRows.map((r) => {
    const data: Record<string, CellValue> = {};
    for (const col of columns) {
      data[col.key] = coerce(r.fields?.[col.key] ?? null, col.type);
    }
    const ai: Record<string, string> = {};
    for (const key of r.inferred ?? []) {
      if (typeByKey.has(key)) ai[key] = "Estimated by AI";
    }
    return { id: uid(), data, ai, flags: [], source: r.source_snippet };
  });

  // 4. Rule-based flags.
  const flagged = detectFlags(columns, rows);

  const now = Date.now();
  return {
    id: uid(),
    name: opts.name,
    columns,
    rows: flagged,
    createdAt: now,
    updatedAt: now,
    origin: opts.origin,
    sourceMeta: { ...opts.sourceMeta, fieldCount: columns.length },
  };
}

/** Convert a locally-parsed delimited table into RawRow[] (no AI). */
export function tableToRawRows(headers: string[], records: Record<string, string>[]): RawRow[] {
  return records.map((rec) => {
    const fields: Record<string, CellValue> = {};
    for (const h of headers) {
      const v = rec[h];
      fields[h] = v === undefined || v === "" ? null : v;
    }
    return { fields };
  });
}

export { uid };
