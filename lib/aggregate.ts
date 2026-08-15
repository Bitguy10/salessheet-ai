import type { Column, Row, Sheet } from "./types";
import { toNumber, isNumericColumn } from "./format";
import { primaryDimension, primaryMeasure } from "./detect";

export interface NumStats {
  sum: number;
  avg: number;
  min: number;
  max: number;
  count: number;
}

/** Stats for a single numeric column (used by the footer status bar). */
export function columnStats(rows: Row[], colKey: string): NumStats | null {
  const values: number[] = [];
  for (const r of rows) {
    const n = toNumber(r.data[colKey]);
    if (n !== null) values.push(n);
  }
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    sum,
    avg: sum / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  };
}

export interface GroupDatum {
  label: string;
  value: number;
  count: number;
}

/** Group rows by a dimension column, summing (or counting) a measure. */
export function groupBy(
  rows: Row[],
  dimKey: string,
  measureKey: string | null,
): GroupDatum[] {
  const map = new Map<string, { value: number; count: number }>();
  for (const r of rows) {
    const rawLabel = r.data[dimKey];
    const label = rawLabel === null || String(rawLabel).trim() === "" ? "—" : String(rawLabel);
    const entry = map.get(label) ?? { value: 0, count: 0 };
    entry.count += 1;
    if (measureKey) {
      const n = toNumber(r.data[measureKey]);
      if (n !== null) entry.value += n;
    }
    map.set(label, entry);
  }
  const out = [...map.entries()].map(([label, v]) => ({ label, value: v.value, count: v.count }));
  out.sort((a, b) => (measureKey ? b.value - a.value : b.count - a.count));
  return out;
}

function unitsColumn(columns: Column[]): Column | undefined {
  return columns.find((c) => {
    const hay = `${c.key} ${c.label}`.toLowerCase();
    return /(unit|qty|quantity|volume|count)/.test(hay) && isNumericColumn(c);
  });
}

export interface Kpis {
  totalRevenue: number | null;
  revenueLabel: string;
  unitsSold: number | null;
  unitsLabel: string;
  bestGroupLabel: string | null;
  bestGroupValue: number | null;
  bestGroupDimension: string | null;
  flaggedCount: number;
}

export function computeKpis(sheet: Sheet): Kpis {
  const measure = primaryMeasure(sheet.columns);
  const units = unitsColumn(sheet.columns);
  const dim = primaryDimension(sheet.columns);

  const revStats = measure ? columnStats(sheet.rows, measure.key) : null;
  const unitStats = units ? columnStats(sheet.rows, units.key) : null;

  let bestGroupLabel: string | null = null;
  let bestGroupValue: number | null = null;
  if (dim && measure) {
    const groups = groupBy(sheet.rows, dim.key, measure.key);
    if (groups.length > 0) {
      bestGroupLabel = groups[0].label;
      bestGroupValue = groups[0].value;
    }
  }

  return {
    totalRevenue: revStats?.sum ?? null,
    revenueLabel: measure?.label ?? "Total",
    unitsSold: unitStats?.sum ?? null,
    unitsLabel: units?.label ?? "Units",
    bestGroupLabel,
    bestGroupValue,
    bestGroupDimension: dim?.label ?? null,
    flaggedCount: sheet.rows.filter((r) => r.flags.length > 0).length,
  };
}

/** Default axes for the bar chart: dimension (category) + measure. */
export function chartDefaults(sheet: Sheet): { dim: Column | null; measure: Column | null } {
  return {
    dim: primaryDimension(sheet.columns) ?? null,
    measure: primaryMeasure(sheet.columns) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Grounded context for chat / summary (spec §5).
// The model receives already-computed numbers + the relevant rows, and is told
// to answer only from them. This is the retrieval + pre-aggregation layer.
// ---------------------------------------------------------------------------

const STOP = new Set([
  "the","a","an","of","in","on","for","and","or","to","is","are","was","were","what","which",
  "how","many","much","show","me","my","our","total","average","avg","by","per","vs","versus",
  "compare","with","that","this","it","do","does","did","have","has","had","get","give","tell",
]);

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function rowText(sheet: Sheet, row: Row): string {
  return sheet.columns.map((c) => String(row.data[c.key] ?? "")).join(" ").toLowerCase();
}

export interface GroundedContext {
  sheetName: string;
  columns: { key: string; label: string; type: string }[];
  rowCount: number;
  includedRows: number;
  rows: Record<string, unknown>[];
  aggregates: {
    byColumn: Record<string, NumStats>;
    groups: Record<string, GroupDatum[]>;
    kpis: Kpis;
  };
  flagged: { row: number; label: string }[];
}

const MAX_ROWS_INLINE = 80;
const MAX_ROWS_RETRIEVED = 45;

/**
 * Build the JSON context injected into the chat/summary prompt. Includes every
 * pre-computed aggregate plus either all rows (small sheets) or a retrieved
 * subset ranked by keyword overlap with the question (large sheets).
 */
export function buildContext(sheet: Sheet, question?: string): GroundedContext {
  const numeric = sheet.columns.filter(isNumericColumn);
  const byColumn: Record<string, NumStats> = {};
  for (const c of numeric) {
    const s = columnStats(sheet.rows, c.key);
    if (s) byColumn[c.key] = s;
  }

  // Group breakdowns for text/date dimensions against the primary measure.
  const measure = primaryMeasure(sheet.columns);
  const groups: Record<string, GroupDatum[]> = {};
  const dims = sheet.columns.filter((c) => c.type === "text" || c.type === "date");
  for (const d of dims.slice(0, 4)) {
    const g = groupBy(sheet.rows, d.key, measure?.key ?? null);
    if (g.length > 1 && g.length <= 40) groups[d.label] = g;
  }

  // Pick which rows to include.
  let indices: number[];
  if (sheet.rows.length <= MAX_ROWS_INLINE || !question) {
    indices = sheet.rows.map((_, i) => i);
  } else {
    const tokens = tokenize(question);
    const scored = sheet.rows.map((r, i) => {
      const text = rowText(sheet, r);
      const score = tokens.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0);
      return { i, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const keyword = scored.filter((s) => s.score > 0).slice(0, MAX_ROWS_RETRIEVED).map((s) => s.i);
    const flaggedIdx = sheet.rows
      .map((r, i) => (r.flags.length > 0 ? i : -1))
      .filter((i) => i >= 0)
      .slice(0, 20);
    // top rows by primary measure, so "highest/lowest" questions have data
    const topByMeasure = measure
      ? [...sheet.rows.keys()]
          .sort((a, b) => (toNumber(sheet.rows[b].data[measure.key]) ?? -Infinity) -
            (toNumber(sheet.rows[a].data[measure.key]) ?? -Infinity))
          .slice(0, 12)
      : [];
    indices = [...new Set([...keyword, ...flaggedIdx, ...topByMeasure])].slice(0, MAX_ROWS_INLINE);
    indices.sort((a, b) => a - b);
  }

  const rows = indices.map((i) => {
    const r = sheet.rows[i];
    const obj: Record<string, unknown> = { row: i + 1 };
    for (const c of sheet.columns) obj[c.label] = r.data[c.key];
    if (r.flags.length) obj._flags = r.flags.map((f) => f.label);
    const aiKeys = Object.keys(r.ai);
    if (aiKeys.length) obj._ai_estimated = aiKeys.map((k) => sheet.columns.find((c) => c.key === k)?.label ?? k);
    return obj;
  });

  const flagged = sheet.rows
    .map((r, i) => ({ row: i + 1, labels: r.flags.map((f) => f.label) }))
    .filter((x) => x.labels.length > 0)
    .flatMap((x) => x.labels.map((label) => ({ row: x.row, label })));

  return {
    sheetName: sheet.name,
    columns: sheet.columns.map((c) => ({ key: c.key, label: c.label, type: c.type })),
    rowCount: sheet.rows.length,
    includedRows: rows.length,
    rows,
    aggregates: { byColumn, groups, kpis: computeKpis(sheet) },
    flagged,
  };
}
