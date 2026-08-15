// Thin server-side Groq client. This module must only be imported from Route
// Handlers (server) so the API key is never sent to the browser (spec §6).

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Default model — override with GROQ_MODEL. llama-3.3-70b-versatile is a
 *  stable Groq production model well-suited to strict JSON extraction. */
export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export class MissingKeyError extends Error {
  constructor() {
    super("GROQ_API_KEY is not configured");
    this.name = "MissingKeyError";
  }
}

export class GroqError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GroqError";
    this.status = status;
  }
}

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export function hasGroqKey(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

interface CallOptions {
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export async function callGroq(messages: ChatTurn[], opts: CallOptions = {}): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new MissingKeyError();

  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2048,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GroqError(res.status, `Groq request failed (${res.status}): ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new GroqError(502, "Groq returned an empty response");
  return content;
}

/** Extract the first JSON object/array from a model response and parse it. */
export function parseJsonLoose<T>(raw: string): T {
  const trimmed = raw.trim();
  // strip ```json fences if present
  const fenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(fenced) as T;
  } catch {
    const start = fenced.search(/[[{]/);
    const end = Math.max(fenced.lastIndexOf("}"), fenced.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      return JSON.parse(fenced.slice(start, end + 1)) as T;
    }
    throw new Error("Model did not return valid JSON");
  }
}
