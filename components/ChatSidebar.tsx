"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, Sheet } from "@/lib/types";
import { buildContext, computeKpis } from "@/lib/aggregate";
import { primaryDimension, primaryMeasure } from "@/lib/detect";
import { formatCurrency, formatNumber } from "@/lib/format";
import { uid } from "@/lib/build-sheet";
import { nowMs } from "@/lib/time";
import { SendIcon, SparkIcon, CloseIcon, MessageIcon, AlertIcon } from "./icons";

interface Props {
  sheet: Sheet;
  messages: ChatMessage[];
  onMessagesChange: (m: ChatMessage[]) => void;
  onCite: (row: number) => void;
  onClose?: () => void;
}

function suggestedQuestions(sheet: Sheet): string[] {
  const measure = primaryMeasure(sheet.columns);
  const dim = primaryDimension(sheet.columns);
  const qs: string[] = [];
  if (measure && dim) qs.push(`Which ${dim.label.toLowerCase()} has the highest ${measure.label.toLowerCase()}?`);
  if (measure) qs.push(`What's the total ${measure.label.toLowerCase()}?`);
  qs.push("What issues should I review?");
  if (measure && dim) qs.push(`Break down ${measure.label.toLowerCase()} by ${dim.label.toLowerCase()}.`);
  return qs.slice(0, 4);
}

/** Offline fallback answer built entirely from app-computed KPIs (no AI, no
 *  invented numbers) so the assistant stays useful without a key. */
function offlineAnswer(sheet: Sheet): string {
  const k = computeKpis(sheet);
  const lines: string[] = [
    "The AI assistant isn't configured (no GROQ_API_KEY), so I can't answer free-form questions. Here are the figures computed directly from your data:",
    "",
  ];
  if (k.totalRevenue !== null) lines.push(`• ${k.revenueLabel}: ${formatCurrency(k.totalRevenue)}`);
  if (k.unitsSold !== null) lines.push(`• ${k.unitsLabel}: ${formatNumber(k.unitsSold)}`);
  if (k.bestGroupLabel && k.bestGroupValue !== null)
    lines.push(`• Top ${k.bestGroupDimension}: ${k.bestGroupLabel} (${formatCurrency(k.bestGroupValue)})`);
  lines.push(`• Rows flagged for review: ${k.flaggedCount}`);
  return lines.join("\n");
}

export default function ChatSidebar({ sheet, messages, onMessagesChange, onCite, onClose }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => suggestedQuestions(sheet), [sheet]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (raw: string) => {
    const question = raw.trim();
    if (!question || loading) return;
    const userMsg: ChatMessage = { id: uid(), role: "user", text: question, createdAt: nowMs() };
    const base = [...messages, userMsg];
    onMessagesChange(base);
    setInput("");
    setLoading(true);

    try {
      const context = buildContext(sheet, question);
      const history = messages.slice(-4).map((m) => ({ role: m.role, text: m.text }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context, history }),
      });

      let assistant: ChatMessage;
      if (res.status === 503) {
        assistant = { id: uid(), role: "assistant", text: offlineAnswer(sheet), createdAt: nowMs() };
      } else if (!res.ok) {
        assistant = {
          id: uid(),
          role: "assistant",
          text: "I hit an error answering that. Please try again in a moment.",
          notInData: true,
          createdAt: nowMs(),
        };
      } else {
        const data = (await res.json()) as {
          text: string;
          citations?: ChatMessage["citations"];
          followups?: string[];
          notInData?: boolean;
        };
        assistant = {
          id: uid(),
          role: "assistant",
          text: data.text,
          citations: data.citations,
          followups: data.followups,
          notInData: data.notInData,
          createdAt: nowMs(),
        };
      }
      onMessagesChange([...base, assistant]);
    } catch {
      onMessagesChange([
        ...base,
        {
          id: uid(),
          role: "assistant",
          text: "I couldn't reach the assistant. Check your connection and try again.",
          notInData: true,
          createdAt: nowMs(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-paper">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gridline bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <SparkIcon size={16} className="text-forest" />
          <h2 className="text-[14px] font-semibold">Ask your data</h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[2px] p-1 text-ink-soft hover:bg-paper-dim hover:text-ink"
          >
            <CloseIcon size={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="scroll-quiet flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center pt-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-[3px] border border-gridline bg-white text-forest">
              <MessageIcon size={20} />
            </div>
            <p className="mt-3 text-[13px] font-medium">Ask anything about this sheet</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              Answers are grounded in your data and cite the exact rows they came from. The AI never
              does the math itself.
            </p>
            <div className="mt-5 w-full space-y-2">
              {suggestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="block w-full rounded-[3px] border border-gridline bg-white px-3 py-2 text-left text-[13px] text-ink transition-colors hover:border-forest hover:bg-row-hover"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => (
              <li key={m.id}>
                {m.role === "user" ? (
                  <div className="ml-6 rounded-[3px] rounded-tr-none border border-gridline bg-white px-3 py-2 text-[13px]">
                    {m.text}
                  </div>
                ) : (
                  <AssistantBubble message={m} onCite={onCite} onFollowup={send} />
                )}
              </li>
            ))}
            {loading && (
              <li>
                <div className="inline-flex items-center gap-1.5 rounded-[3px] border-l-2 border-forest bg-white px-3 py-2.5">
                  <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-gridline bg-white px-3 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about totals, trends, or flagged rows…"
            className="scroll-quiet max-h-28 min-h-[38px] flex-1 resize-none rounded-[3px] border border-gridline bg-paper/50 px-3 py-2 text-[13px] focus:border-forest focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Send"
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[3px] bg-forest text-paper transition-colors hover:bg-forest-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendIcon size={17} />
          </button>
        </form>
        <p className="mt-1.5 px-0.5 text-[10.5px] text-ink-soft">
          Grounded in your sheet · cites rows · refuses to guess
        </p>
      </div>
    </div>
  );
}

function AssistantBubble({
  message,
  onCite,
  onFollowup,
}: {
  message: ChatMessage;
  onCite: (row: number) => void;
  onFollowup: (q: string) => void;
}) {
  return (
    <div
      className={`rounded-[3px] border-l-2 bg-white px-3 py-2.5 ${
        message.notInData ? "border-brick" : "border-forest"
      }`}
    >
      {message.notInData && (
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brick">
          <AlertIcon size={13} /> Not in the data
        </div>
      )}
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{message.text}</p>

      {message.citations && message.citations.length > 0 && (
        <ul className="mt-2.5 space-y-1 border-t border-gridline pt-2">
          {message.citations.map((c, i) => (
            <li key={`${c.row}-${i}`}>
              <button
                type="button"
                onClick={() => onCite(c.row)}
                className="group flex w-full items-baseline gap-1.5 text-left text-[12px] text-ink-soft hover:text-ink"
              >
                <span className="nums shrink-0 font-semibold text-forest group-hover:underline">
                  → Row {c.row}
                </span>
                <span className="truncate">{c.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {message.followups && message.followups.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {message.followups.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFollowup(f)}
              className="rounded-[2px] border border-gridline bg-paper px-2 py-1 text-[11.5px] text-ink-soft transition-colors hover:border-forest hover:text-ink"
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-forest"
      style={{ animation: "ss-blink 1s ease-in-out infinite", animationDelay: delay }}
    />
  );
}
