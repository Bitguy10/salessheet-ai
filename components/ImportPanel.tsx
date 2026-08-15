"use client";

import { useCallback, useRef, useState } from "react";
import type { SheetMeta } from "@/lib/types";
import {
  ingestPastedText,
  ingestFile,
  ingestSample,
  IngestError,
  type IngestOutcome,
  type IngestProgress,
} from "@/lib/ingest";
import { SAMPLE_PASTE } from "@/lib/sample";
import { relativeTime } from "@/lib/time";
import {
  ClipboardIcon,
  UploadIcon,
  SparkIcon,
  SpinnerIcon,
  CheckIcon,
  ArrowRight,
  TableIcon,
  TrashIcon,
  AlertIcon,
} from "./icons";

type Mode = "paste" | "upload";

const STEPS: { stage: IngestProgress["stage"]; label: string }[] = [
  { stage: "reading", label: "Reading input" },
  { stage: "parsing", label: "Detecting structure" },
  { stage: "extracting", label: "Extracting with AI" },
  { stage: "detecting", label: "Checking for issues" },
];

interface Props {
  onSheet: (outcome: IngestOutcome) => void;
  recents: SheetMeta[];
  onOpenRecent: (id: string) => void;
  onDeleteRecent: (id: string) => void;
}

export default function ImportPanel({ onSheet, recents, onOpenRecent, onDeleteRecent }: Props) {
  const [mode, setMode] = useState<Mode>("paste");
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<IngestProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = useCallback(
    async (op: (onProgress: (p: IngestProgress) => void) => Promise<IngestOutcome>) => {
      setBusy(true);
      setError(null);
      setProgress({ stage: "reading", label: "Starting" });
      try {
        const outcome = await op((p) => setProgress(p));
        onSheet(outcome);
      } catch (err) {
        const msg =
          err instanceof IngestError
            ? err.message
            : "Something went wrong while processing. Please try again.";
        setError(msg);
        setBusy(false);
        setProgress(null);
      }
    },
    [onSheet],
  );

  const handlePaste = () => {
    if (!text.trim()) {
      setError("Paste some sales data first — rows of text, or CSV/TSV with a header row.");
      return;
    }
    run((onProgress) => ingestPastedText(text, { onProgress }));
  };

  const handleFile = (file: File) => {
    run((onProgress) => ingestFile(file, { onProgress }));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (busy && progress) {
    return <Processing progress={progress} />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Turn messy sales data into answers
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          Paste notes or drop a file. SalesSheet structures it into a clean spreadsheet, flags what
          needs review, and lets you ask questions in plain English.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="mx-auto mb-4 flex w-fit rounded-[3px] border border-gridline bg-paper-dim p-0.5">
        <ModeTab active={mode === "paste"} onClick={() => setMode("paste")} icon={<ClipboardIcon size={16} />}>
          Paste text
        </ModeTab>
        <ModeTab active={mode === "upload"} onClick={() => setMode("upload")} icon={<UploadIcon size={16} />}>
          Upload file
        </ModeTab>
      </div>

      <div className="rounded-[3px] border border-gridline bg-white shadow-[0_1px_2px_rgba(20,32,27,0.04)]">
        {mode === "paste" ? (
          <div className="p-3 sm:p-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={SAMPLE_PASTE}
              spellCheck={false}
              className="nums h-56 w-full resize-none rounded-[2px] border border-gridline bg-paper/40 p-3 text-[13px] leading-relaxed text-ink placeholder:text-ink-soft/55 focus:border-forest focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => run((onProgress) => ingestSample({ onProgress }))}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-forest hover:text-forest-deep hover:underline"
              >
                <SparkIcon size={15} /> Load sample data
              </button>
              <button
                type="button"
                onClick={handlePaste}
                className="inline-flex items-center gap-2 rounded-[3px] bg-forest px-4 py-2 text-[13px] font-semibold text-paper transition-colors hover:bg-forest-deep"
              >
                Structure it <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
              className={`flex h-56 cursor-pointer flex-col items-center justify-center rounded-[2px] border-2 border-dashed text-center transition-colors ${
                dragging ? "border-forest bg-amber-wash/40" : "border-gridline bg-paper/40 hover:border-ink-soft/50"
              }`}
            >
              <UploadIcon size={26} className="text-forest" />
              <p className="mt-3 text-[14px] font-medium">Drop a file here, or click to browse</p>
              <p className="mt-1 text-[12px] text-ink-soft">CSV, TSV, TXT, or PDF · stays in your browser</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt,.pdf,text/csv,text/plain,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => run((onProgress) => ingestSample({ onProgress }))}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-forest hover:text-forest-deep hover:underline"
              >
                <SparkIcon size={15} /> or load sample data
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-[3px] border-l-2 border-brick bg-brick-wash px-3.5 py-3 text-[13px] text-ink">
          <AlertIcon size={16} className="mt-0.5 shrink-0 text-brick" />
          <span>{error}</span>
        </div>
      )}

      {recents.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wide text-ink-soft">
            Recent sheets
          </h2>
          <ul className="divide-y divide-gridline overflow-hidden rounded-[3px] border border-gridline bg-white">
            {recents.map((s) => (
              <li key={s.id} className="group flex items-center gap-3 px-3.5 py-2.5 hover:bg-row-hover">
                <button
                  type="button"
                  onClick={() => onOpenRecent(s.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <TableIcon size={17} className="shrink-0 text-forest" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{s.name}</span>
                    <span className="nums block text-[11.5px] text-ink-soft">
                      {s.rowCount} rows · {s.columnCount} cols
                      {s.flaggedCount > 0 && <span className="text-brick"> · {s.flaggedCount} flagged</span>} ·{" "}
                      {relativeTime(s.updatedAt)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRecent(s.id)}
                  aria-label={`Delete ${s.name}`}
                  className="shrink-0 rounded-[2px] p-1.5 text-ink-soft opacity-0 transition-opacity hover:bg-brick-wash hover:text-brick focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <TrashIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-8 text-center text-[12px] text-ink-soft">
        No account, no upload to a server. Your data is processed in your browser and stored locally.
      </p>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-[2px] px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
        active ? "bg-white text-ink shadow-[0_1px_1px_rgba(20,32,27,0.06)]" : "text-ink-soft hover:text-ink"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Processing({ progress }: { progress: IngestProgress }) {
  // Which steps are relevant depends on the path taken; show the canonical list
  // and mark reached steps done, the current one active, later ones pending.
  const order = STEPS.map((s) => s.stage);
  const currentIdx = order.indexOf(progress.stage === "done" ? "detecting" : progress.stage);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-20">
      <div className="w-full rounded-[3px] border border-gridline bg-white p-6 shadow-[0_1px_2px_rgba(20,32,27,0.05)]">
        <div className="mb-5 flex items-center gap-2.5">
          <SparkIcon size={18} className="text-amber" />
          <h2 className="text-[15px] font-semibold">Structuring your data</h2>
        </div>
        <ul className="space-y-3">
          {STEPS.map((step, i) => {
            const state = i < currentIdx ? "done" : i === currentIdx ? "active" : "pending";
            return (
              <li key={step.stage} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    state === "done"
                      ? "border-forest bg-forest text-paper"
                      : state === "active"
                        ? "border-forest text-forest"
                        : "border-gridline text-ink-soft/40"
                  }`}
                >
                  {state === "done" ? (
                    <CheckIcon size={14} />
                  ) : state === "active" ? (
                    <SpinnerIcon size={14} className="animate-spin" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span className={`text-[13.5px] ${state === "pending" ? "text-ink-soft/50" : "text-ink"}`}>
                  {step.label}
                  {state === "active" && progress.detail && (
                    <span className="ml-1.5 text-[12px] text-ink-soft">— {progress.detail}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
