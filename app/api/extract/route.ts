import { callGroq, parseJsonLoose, MissingKeyError } from "@/lib/groq";
import type { RawRow } from "@/lib/types";

export const runtime = "nodejs";

// POST /api/extract  { text: string }
// Returns strict structured rows extracted from messy text. The model outputs
// JSON only; ambiguous fields become null and estimated fields are listed in
// `inferred` so the grid can mark them amber (spec §5 — Extraction).

const SYSTEM = `You are the extraction engine for SalesSheet AI, a sales-data spreadsheet tool.
Convert the user's messy text (pasted notes, exported tables, or PDF text) into clean, structured rows.

Output STRICT JSON ONLY — no prose, no markdown. Shape:
{
  "rows": [
    {
      "fields": { "<snake_case_field>": <value>, ... },
      "inferred": ["<field keys you estimated or inferred>"],
      "source_snippet": "<the exact source text this row came from>"
    }
  ]
}

Rules:
- Use consistent snake_case field keys across ALL rows (e.g. region, month, product, units, revenue).
- Numbers must be plain numbers: no currency symbols, no thousands separators, no units. Negative for refunds/returns.
- If a value is unreadable or ambiguous, set it to null. NEVER guess a value and present it as fact.
- If you infer or estimate a value (e.g. compute revenue from unit price × units), still include it, but add its key to "inferred".
- Do NOT perform analysis, totals, or commentary. Only extract rows.
- Preserve every distinct record you find, including likely duplicates (do not merge them).
- Return only the JSON object.`;

interface ExtractPayload {
  rows: RawRow[];
}

export async function POST(request: Request) {
  let text = "";
  try {
    const body = (await request.json()) as { text?: string };
    text = (body.text ?? "").trim();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  if (!text) return Response.json({ error: "empty" }, { status: 400 });
  // Guardrail: cap payload size sent to the model.
  const clipped = text.length > 24000 ? text.slice(0, 24000) : text;

  try {
    const raw = await callGroq(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: clipped },
      ],
      { json: true, temperature: 0, maxTokens: 4096 },
    );
    const parsed = parseJsonLoose<ExtractPayload>(raw);
    const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
    // Basic shape validation.
    const clean: RawRow[] = rows
      .filter((r) => r && typeof r === "object" && r.fields && typeof r.fields === "object")
      .map((r) => ({
        fields: r.fields,
        inferred: Array.isArray(r.inferred) ? r.inferred : [],
        source_snippet: typeof r.source_snippet === "string" ? r.source_snippet : undefined,
      }));

    if (clean.length === 0) {
      return Response.json({ error: "no_rows" }, { status: 422 });
    }
    return Response.json({ rows: clean, engine: "ai" });
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return Response.json({ error: "no_key" }, { status: 503 });
    }
    console.error("[/api/extract]", err);
    return Response.json({ error: "ai_error" }, { status: 502 });
  }
}
