// Client-side input parsing: delimited text (CSV/TSV/…) and PDF text.
// No AI here — this is the deterministic path for already-structured data and
// the local fallback when the AI proxy is unavailable.

export interface DelimitedTable {
  headers: string[];
  /** each record maps header -> raw string value */
  records: Record<string, string>[];
}

const DELIMITERS = [",", "\t", ";", "|"] as const;

/** RFC-4180-ish field splitter for a single delimiter (handles quotes). */
function splitLines(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Pick the delimiter that yields the most consistent, multi-column split. */
function detectDelimiter(text: string): string | null {
  const sample = text.split("\n").slice(0, 12).join("\n");
  let best: { delimiter: string; score: number } | null = null;
  for (const delimiter of DELIMITERS) {
    const rows = splitLines(sample, delimiter);
    if (rows.length < 2) continue;
    const counts = rows.map((r) => r.length);
    const cols = counts[0];
    if (cols < 2) continue;
    const consistent = counts.filter((c) => c === cols).length / counts.length;
    // reward more columns + consistency
    const score = consistent * 10 + cols;
    if (!best || score > best.score) best = { delimiter, score };
  }
  return best && best.score >= 12 ? best.delimiter : null;
}

/** Returns a table if the text is cleanly delimited (>=2 columns), else null. */
export function parseDelimited(text: string): DelimitedTable | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const delimiter = detectDelimiter(trimmed);
  if (!delimiter) return null;

  const rows = splitLines(trimmed, delimiter);
  if (rows.length < 2) return null;

  const rawHeaders = rows[0].map((h) => h.trim());
  // De-duplicate / fill blank headers
  const seen = new Map<string, number>();
  const headers = rawHeaders.map((h, i) => {
    let name = h || `Column ${i + 1}`;
    if (seen.has(name)) {
      const n = seen.get(name)! + 1;
      seen.set(name, n);
      name = `${name} ${n}`;
    } else {
      seen.set(name, 1);
    }
    return name;
  });

  const records: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = (cells[i] ?? "").trim();
    });
    records.push(rec);
  }
  return { headers, records };
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export interface PdfExtract {
  text: string;
  pageCount: number;
}

let workerConfigured = false;

/** Extract text from a PDF entirely in the browser using pdf.js. */
export async function extractPdfText(
  file: File,
  onPage?: (page: number, total: number) => void,
): Promise<PdfExtract> {
  if (typeof window === "undefined") {
    throw new Error("PDF parsing is only available in the browser");
  }
  // Dynamic import keeps pdf.js out of the server bundle.
  const pdfjs = await import("pdfjs-dist");
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    workerConfigured = true;
  }

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pageCount = doc.numPages;
  const parts: string[] = [];

  for (let p = 1; p <= pageCount; p++) {
    onPage?.(p, pageCount);
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Reconstruct lines using item positions so tables stay row-aligned.
    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];
    for (const item of content.items) {
      // TextItem has `str` and `transform`; TextMarkedContent does not.
      if (!("str" in item)) continue;
      const y = item.transform?.[5] ?? 0;
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trimEnd());
        line = "";
      }
      line += item.str;
      if (item.hasEOL) {
        lines.push(line.trimEnd());
        line = "";
      }
      lastY = y;
    }
    if (line.trim()) lines.push(line.trimEnd());
    parts.push(lines.join("\n"));
  }
  await doc.destroy();
  return { text: parts.join("\n\n"), pageCount };
}
