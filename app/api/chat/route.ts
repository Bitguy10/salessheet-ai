import { callGroq, parseJsonLoose, MissingKeyError } from "@/lib/groq";
import type { GroundedContext } from "@/lib/aggregate";
import type { Citation } from "@/lib/types";

export const runtime = "nodejs";

// POST /api/chat  { question, context, history? }
// Retrieval-grounded Q&A (spec §5). The model receives already-computed numbers
// and the relevant rows, and may ONLY narrate them — it never calculates and
// never states a number that is not in the context.

const SYSTEM = `You are the analyst inside SalesSheet AI. You answer questions about ONE spreadsheet, using ONLY the JSON context you are given.

The context contains:
- "rows": the relevant data rows. Each has a "row" number (its position in the sheet) plus its column values. "_flags" marks issues; "_ai_estimated" lists columns whose value was AI-estimated.
- "aggregates": numbers ALREADY COMPUTED by the application — use these for any total, average, percentage, or ranking, and never recompute them:
  - "byColumn": sum/avg/min/max/count per numeric column (all rows).
  - "groups": breakdown of the primary measure per dimension (all rows).
  - "kpis": headline totals.
  - "derived": pre-computed figures for the common "excluding flagged" and per-group questions —
    - "measures" (keyed by column label): "total" (all rows), "excludingFlagged" (rows carrying NO flag), "averageExcludingFlagged", and "excludingFlagType" — the total with the rows carrying a specific flag type removed (e.g. excludingFlagType.duplicate is the total minus duplicate-flagged rows). "flagTypesPresent" lists which flag types exist in this sheet.
    - "breakdowns" (keyed by dimension label): for each group, per-measure "sum", "average", "sumExcludingFlagged", and "averageExcludingFlagged".
    - "comparisons": pre-computed A-vs-B differences for the main dimension/measure. Each has "a", "b", "aValue", "bValue", "difference" (aValue − bValue, so a is the larger), plus the "...ExcludingFlagged" variants. To answer "how much more/less did A make than B", read "difference" from the matching pair — never subtract the two values yourself. If the exact pair is not listed, state each group's own value and say the difference isn't computed.
- "flagged": rows flagged for review.

Absolute rules:
1. You must never perform addition, subtraction, multiplication, division, or any other calculation yourself, even if you show your work. Every number in your answer must appear verbatim in "aggregates" or be a single specific row's value. If answering the question requires a calculation that is not already present in the provided aggregates/context, respond that the number isn't available yet and suggest what data or calculation would need to be added — do not compute it inline, and set "not_in_data" to true.
2. Ground every factual claim in specific rows. Put the row number(s) you used in "citations".
3. If the answer is not present in the context, set "not_in_data" to true and say plainly that the data does not contain it. Never guess or extrapolate.
4. Be concise and neutral — a spreadsheet analyst, not a marketer. Refer to flagged/estimated values honestly when relevant.
5. Output STRICT JSON ONLY:
{
  "answer": "<plain-language answer>",
  "citations": [ { "row": <number>, "detail": "<what this row contributes>" } ],
  "followups": [ "<a natural next question>", "..." ],
  "not_in_data": <true|false>
}`;

interface ChatPayload {
  answer?: string;
  citations?: { row?: number; detail?: string }[];
  followups?: string[];
  not_in_data?: boolean;
}

interface RequestBody {
  question?: string;
  context?: GroundedContext;
  history?: { role: "user" | "assistant"; text: string }[];
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  const context = body.context;
  if (!question) return Response.json({ error: "empty_question" }, { status: 400 });
  if (!context || !Array.isArray(context.rows)) {
    return Response.json({ error: "no_context" }, { status: 400 });
  }

  // A short, trimmed history helps with follow-ups without bloating the prompt.
  const history = (body.history ?? []).slice(-4);
  const historyText = history.length
    ? `\n\nRecent conversation (for context on follow-ups):\n${history
        .map((h) => `${h.role === "user" ? "Q" : "A"}: ${h.text}`)
        .join("\n")}`
    : "";

  const userContent = `DATA CONTEXT (JSON):\n${JSON.stringify(context)}${historyText}\n\nQUESTION: ${question}`;

  try {
    const raw = await callGroq(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
      { json: true, temperature: 0.1, maxTokens: 1200 },
    );
    const parsed = parseJsonLoose<ChatPayload>(raw);

    const validRowNumbers = new Set(
      context.rows
        .map((r) => (typeof r.row === "number" ? r.row : null))
        .filter((n): n is number => n !== null),
    );
    const citations: Citation[] = Array.isArray(parsed.citations)
      ? parsed.citations
          .filter((c) => c && typeof c.row === "number" && validRowNumbers.has(c.row))
          .map((c) => ({ row: c.row as number, detail: String(c.detail ?? "") }))
      : [];

    const followups = Array.isArray(parsed.followups)
      ? parsed.followups.filter((f) => typeof f === "string" && f.trim()).slice(0, 3)
      : [];

    return Response.json({
      text: typeof parsed.answer === "string" ? parsed.answer : "I couldn't produce an answer from this data.",
      citations,
      followups,
      notInData: Boolean(parsed.not_in_data),
      engine: "ai",
    });
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return Response.json({ error: "no_key" }, { status: 503 });
    }
    console.error("[/api/chat]", err);
    return Response.json({ error: "ai_error" }, { status: 502 });
  }
}
