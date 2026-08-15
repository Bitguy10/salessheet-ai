// Core data model for SalesSheet AI.
// A Sheet holds columns + rows. Provenance is tracked separately from values so
// that (a) numeric aggregation always reads clean values and (b) the UI can
// apply the amber "AI-touched" and brick-red "flagged" conventions from spec §2.

export type CellValue = string | number | null;

export type ColumnType = "text" | "number" | "currency" | "date";

export interface Column {
  key: string; // stable identifier, e.g. "revenue"
  label: string; // display label, e.g. "Revenue"
  type: ColumnType;
}

/** Rule-detected issues (brick-red). Never decided by the model. */
export type FlagType = "duplicate" | "missing" | "outlier" | "return";

export interface RowFlag {
  type: FlagType;
  /** Plain-language explanation (rule-generated; AI may refine the wording). */
  label: string;
  /** Columns this flag concerns — used to highlight specific cells brick-red. */
  columns?: string[];
}

export interface Row {
  id: string;
  /** colKey -> value */
  data: Record<string, CellValue>;
  /** colKey -> short reason, for cells the AI inferred/estimated (amber). */
  ai: Record<string, string>;
  /** Row-level flags (may reference specific columns). */
  flags: RowFlag[];
  /** Raw source text this row was extracted from (provenance). */
  source?: string;
}

export interface Sheet {
  id: string;
  name: string;
  columns: Column[];
  rows: Row[];
  createdAt: number;
  updatedAt: number;
  origin: "paste" | "upload";
  sourceMeta?: {
    fileName?: string;
    pageCount?: number;
    fieldCount?: number;
  };
}

/** Lightweight sheet descriptor for the "Recent sheets" list. */
export interface SheetMeta {
  id: string;
  name: string;
  updatedAt: number;
  rowCount: number;
  columnCount: number;
  flaggedCount: number;
  origin: "paste" | "upload";
}

/** A grounding reference back to a specific grid row (spec: "→ Row N — ..."). */
export interface Citation {
  row: number; // 1-based row number as shown in the grid
  detail: string; // short description of what that row contains
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  /** Suggested follow-up chips shown under an AI answer. */
  followups?: string[];
  /** True when the assistant explicitly refused (answer not in the sheet). */
  notInData?: boolean;
  createdAt: number;
}

// ---- Extraction contract (what the AI proxy / local parser returns) ---------

/** One raw row as returned by extraction, before normalization into a Sheet. */
export interface RawRow {
  /** field key -> value (null when unreadable/ambiguous). */
  fields: Record<string, CellValue>;
  /** field keys the model inferred or estimated (rendered amber). */
  inferred?: string[];
  /** the source text snippet this row came from. */
  source_snippet?: string;
}

export interface ExtractionResult {
  rows: RawRow[];
  /** Which engine produced the result — surfaced to the user for trust. */
  engine: "ai" | "local";
  note?: string;
}
