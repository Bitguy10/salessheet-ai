import type { Column, Row, RowFlag } from "./types";
import { toNumber, isNumericColumn } from "./format";

// ---------------------------------------------------------------------------
// Rule-based cleaning & anomaly detection (spec §5).
// The model is never asked to *decide* what is a duplicate or an outlier — only
// (elsewhere) to phrase the label. Everything here is deterministic JS.
// ---------------------------------------------------------------------------

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

/** Normalize a value for duplicate signatures. */
function norm(value: unknown): string {
  if (value === null || value === undefined) return "";
  const n = toNumber(value as never);
  if (n !== null && typeof value !== "string") return String(Math.round(n * 100));
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

/** First column matching any of the given key/label substrings. */
function findColumn(columns: Column[], needles: string[]): Column | undefined {
  return columns.find((c) => {
    const hay = `${c.key} ${c.label}`.toLowerCase();
    return needles.some((n) => hay.includes(n));
  });
}

/** The main money column, else the first numeric column. */
export function primaryMeasure(columns: Column[]): Column | undefined {
  return (
    columns.find((c) => c.type === "currency") ??
    findColumn(columns, ["revenue", "sales", "amount", "total", "price"]) ??
    columns.find((c) => c.type === "number")
  );
}

/** The main grouping dimension (region / category / product / …). */
export function primaryDimension(columns: Column[]): Column | undefined {
  return (
    findColumn(columns, ["region", "category", "product", "segment", "customer", "channel"]) ??
    columns.find((c) => c.type === "text")
  );
}

function dateColumn(columns: Column[]): Column | undefined {
  return (
    columns.find((c) => c.type === "date") ??
    findColumn(columns, ["date", "month", "day", "period", "quarter"])
  );
}

function ordinal(n: number): string {
  return `row ${n}`;
}

/**
 * Attach flags to rows. Returns new Row objects (does not mutate input).
 * Row numbers used in labels are 1-based positions in the passed array.
 */
export function detectFlags(columns: Column[], rows: Row[]): Row[] {
  const measure = primaryMeasure(columns);
  const dim = primaryDimension(columns);
  const dateCol = dateColumn(columns);

  // Build per-row flag lists keyed by index.
  const flags: RowFlag[][] = rows.map(() => []);

  // ---- Duplicates: exact match on (dimension(s) + date + rounded amount) ----
  const sigCols = [dim, dateCol, measure].filter(Boolean) as Column[];
  if (sigCols.length >= 2) {
    const firstSeen = new Map<string, number>();
    rows.forEach((row, i) => {
      const sig = sigCols.map((c) => norm(row.data[c.key])).join("¦");
      if (sigCols.every((c) => norm(row.data[c.key]) === "")) return; // all blank → skip
      if (firstSeen.has(sig)) {
        const original = firstSeen.get(sig)!;
        flags[i].push({
          type: "duplicate",
          label: `Looks like the same entry as ${ordinal(original + 1)} — same ${sigCols
            .map((c) => c.label.toLowerCase())
            .join(", ")}.`,
          columns: sigCols.map((c) => c.key),
        });
      } else {
        firstSeen.set(sig, i);
      }
    });
  }

  // ---- Returns: negative measure, or a status/type field marked return -----
  const statusCol = findColumn(columns, ["status", "type", "notes", "transaction"]);
  rows.forEach((row, i) => {
    const val = measure ? toNumber(row.data[measure.key]) : null;
    const statusText = statusCol ? String(row.data[statusCol.key] ?? "").toLowerCase() : "";
    const isReturn =
      (val !== null && val < 0) || /\b(return|refund|void|chargeback|reversal)\b/.test(statusText);
    if (isReturn) {
      flags[i].push({
        type: "return",
        label:
          val !== null && val < 0
            ? `Negative ${measure!.label.toLowerCase()} — likely a return or refund.`
            : "Marked as a return/refund.",
        columns: measure ? [measure.key] : statusCol ? [statusCol.key] : undefined,
      });
    }
  });

  // ---- Outliers: IQR fences on each numeric column (needs enough data) ------
  for (const col of columns.filter(isNumericColumn)) {
    const values: { i: number; v: number }[] = [];
    rows.forEach((row, i) => {
      const n = toNumber(row.data[col.key]);
      if (n !== null) values.push({ i, v: n });
    });
    if (values.length < 6) continue;
    const sorted = values.map((x) => x.v).sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;
    if (iqr <= 0) continue;
    const lo = q1 - 1.5 * iqr;
    const hi = q3 + 1.5 * iqr;
    const avg = mean(sorted);
    for (const { i, v } of values) {
      if (v > hi || v < lo) {
        // don't double-report a return as an outlier
        if (flags[i].some((f) => f.type === "return")) continue;
        flags[i].push({
          type: "outlier",
          label: `${col.label} of ${v.toLocaleString()} is ${
            v > hi ? "unusually high" : "unusually low"
          } vs. the typical ${Math.round(avg).toLocaleString()}.`,
          columns: [col.key],
        });
      }
    }
  }

  // ---- Missing data: null/blank in a measure or the primary dimension ------
  const requiredCols = [measure, dim].filter(Boolean) as Column[];
  rows.forEach((row, i) => {
    const missing = requiredCols.filter((c) => {
      const v = row.data[c.key];
      return v === null || v === undefined || String(v).trim() === "";
    });
    if (missing.length > 0) {
      flags[i].push({
        type: "missing",
        label: `Missing ${missing.map((c) => c.label.toLowerCase()).join(" and ")}.`,
        columns: missing.map((c) => c.key),
      });
    }
  });

  return rows.map((row, i) => ({ ...row, flags: flags[i] }));
}

/** Count of rows carrying at least one flag. */
export function flaggedCount(rows: Row[]): number {
  return rows.filter((r) => r.flags.length > 0).length;
}
