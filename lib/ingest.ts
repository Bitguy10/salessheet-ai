// Client-side ingestion orchestrator. Decides between the deterministic local
// parser and the AI extraction proxy, emits step-by-step progress for the
// processing UI, and returns a fully-built, flagged Sheet.
//
// Routing (spec §4/§5):
//   cleanly-delimited text  -> local parse (no AI)
//   messy text / PDF text   -> POST /api/extract (AI), with a graceful message
//                              if the proxy is unavailable.

import type { RawRow, Sheet } from "./types";
import { parseDelimited, readFileAsText, extractPdfText } from "./parse";
import { buildSheet, tableToRawRows } from "./build-sheet";
import { sampleRawRows } from "./sample";

export type IngestStage = "reading" | "parsing" | "extracting" | "detecting" | "done";

export interface IngestProgress {
  stage: IngestStage;
  label: string;
  detail?: string;
}

export interface IngestOptions {
  onProgress?: (p: IngestProgress) => void;
  signal?: AbortSignal;
}

export interface IngestOutcome {
  sheet: Sheet;
  engine: "ai" | "local";
  note?: string;
}

/** User-facing ingestion failure with actionable guidance. */
export class IngestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestError";
  }
}

const AI_UNAVAILABLE =
  "Couldn't structure this automatically. The AI proxy isn't configured (add a GROQ_API_KEY), so paste data as CSV/TSV with a header row, or load the sample to explore.";

function report(opts: IngestOptions, stage: IngestStage, label: string, detail?: string) {
  opts.onProgress?.({ stage, label, detail });
}

async function structureText(
  text: string,
  origin: "paste" | "upload",
  sourceMeta: Sheet["sourceMeta"],
  name: string,
  opts: IngestOptions,
): Promise<IngestOutcome> {
  const trimmed = text.trim();
  if (!trimmed) throw new IngestError("There's nothing to read here — paste some data or pick a file.");

  // 1. Deterministic path: already-structured, cleanly delimited data.
  report(opts, "parsing", "Detecting structure", "Looking for columns and headers");
  const table = parseDelimited(trimmed);
  if (table && table.headers.length >= 2 && table.records.length >= 1) {
    const rawRows = tableToRawRows(table.headers, table.records);
    return finalize(rawRows, origin, sourceMeta, name, "local", undefined, opts);
  }

  // 2. AI path: messy free text or PDF-extracted text.
  report(opts, "extracting", "Extracting with AI", "Structuring messy text into rows");
  let res: Response;
  try {
    res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new IngestError("Couldn't reach the extraction service. Check your connection and try again.");
  }

  if (!res.ok) {
    // No key or upstream error -> try one more local salvage, else guide the user.
    if (res.status === 503) throw new IngestError(AI_UNAVAILABLE);
    if (res.status === 422) throw new IngestError("The AI couldn't find any tabular data in this text.");
    throw new IngestError("AI extraction failed. Try again, paste as CSV/TSV, or load the sample.");
  }

  const data = (await res.json()) as { rows?: RawRow[] };
  const rawRows = Array.isArray(data.rows) ? data.rows : [];
  if (rawRows.length === 0) throw new IngestError("The AI couldn't find any rows in this text.");
  return finalize(rawRows, origin, sourceMeta, name, "ai", undefined, opts);
}

function finalize(
  rawRows: RawRow[],
  origin: "paste" | "upload",
  sourceMeta: Sheet["sourceMeta"],
  name: string,
  engine: "ai" | "local",
  note: string | undefined,
  opts: IngestOptions,
): IngestOutcome {
  report(opts, "detecting", "Checking for issues", "Duplicates, outliers, gaps, and returns");
  const sheet = buildSheet(rawRows, { name, origin, sourceMeta });
  if (sheet.rows.length === 0) throw new IngestError("No usable rows were found.");
  report(opts, "done", "Ready");
  return { sheet, engine, note };
}

/** Paste-box ingestion. */
export function ingestPastedText(text: string, opts: IngestOptions = {}): Promise<IngestOutcome> {
  return structureText(text, "paste", undefined, "Pasted sales data", opts);
}

const PDF_RE = /\.pdf$/i;

/** File-drop ingestion (CSV/TSV/TXT read directly; PDF text-extracted first). */
export async function ingestFile(file: File, opts: IngestOptions = {}): Promise<IngestOutcome> {
  const baseName = file.name.replace(/\.[^.]+$/, "") || "Uploaded data";
  const isPdf = file.type === "application/pdf" || PDF_RE.test(file.name);

  if (isPdf) {
    report(opts, "reading", "Reading PDF", "Extracting text from pages");
    const { text, pageCount } = await extractPdfText(file, (page, total) => {
      report(opts, "reading", "Reading PDF", `Page ${page} of ${total}`);
    });
    if (!text.trim()) {
      throw new IngestError("This PDF has no selectable text (it may be scanned images). Try a CSV or paste the numbers.");
    }
    return structureText(text, "upload", { fileName: file.name, pageCount }, baseName, opts);
  }

  report(opts, "reading", "Reading file", file.name);
  const text = await readFileAsText(file);
  return structureText(text, "upload", { fileName: file.name }, baseName, opts);
}

/** Built-in sample dataset — fully offline, exercises every flag type. */
export function ingestSample(opts: IngestOptions = {}): Promise<IngestOutcome> {
  return Promise.resolve(
    finalize(sampleRawRows(), "paste", undefined, "Sample — Q1 outdoor gear", "local", undefined, opts),
  );
}
