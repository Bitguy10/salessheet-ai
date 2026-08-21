// Thin server-side Groq client. This module must only be imported from Route
// Handlers (server) so the API key is never sent to the browser (spec §6).

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Default model — override with GROQ_MODEL. openai/gpt-oss-120b is a current
 *  Groq production model with JSON mode + strong reasoning, well-suited to
 *  strict JSON extraction and grounded Q&A. (llama-3.3-70b-versatile was
 *  decommissioned by Groq.) */
export const DEFAULT_MODEL = "openai/gpt-oss-120b";

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

/** Strip a leading UTF-8 BOM (U+FEFF, char code 0xFEFF) and surrounding
 *  whitespace from an env value. A BOM commonly sneaks into a secret when it is
 *  pasted from, or imported out of, a BOM-prefixed file. Left in the API key it
 *  makes the `Authorization` header value un-encodable — an HTTP header is a
 *  ByteString and every code point must be <= 255 — so fetch() throws a
 *  TypeError and every request dies before it leaves the server. */
function sanitizeKey(raw: string): string {
  const noBom = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return noBom.trim();
}

export async function callGroq(messages: ChatTurn[], opts: CallOptions = {}): Promise<string> {
  const rawKey = process.env.GROQ_API_KEY;
  if (!rawKey) throw new MissingKeyError();
  const key = sanitizeKey(rawKey);
  if (!key) throw new MissingKeyError();

  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2048,
  };
  if (opts.json) {
    body.response_format = { type: "json_object" };
    // Reasoning models must keep their chain-of-thought out of the JSON payload.
    // gpt-oss returns reasoning in a separate field automatically (and rejects
    // reasoning_format), so we just cap the effort to stay within max_tokens.
    // Other current Groq reasoning models (e.g. qwen3.6) require
    // reasoning_format=hidden in JSON mode or they 400 / leak <think> tags.
    if (model.includes("gpt-oss")) {
      body.reasoning_effort = "low";
    } else {
      body.reasoning_format = "hidden";
    }
  }

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
