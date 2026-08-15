"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, Sheet, SheetMeta } from "@/lib/types";
import {
  deleteSheet,
  getChat,
  getSheet,
  listSheetMeta,
  saveChat,
  saveSheet,
} from "@/lib/db";
import { applyCellEdit } from "@/lib/edit";
import { downloadCsv } from "@/lib/csv";
import { relativeTime } from "@/lib/time";
import { formatNumber } from "@/lib/format";
import type { IngestOutcome } from "@/lib/ingest";
import Grid, { type SelectionStats, type SortState } from "./Grid";
import ChartView from "./ChartView";
import ChatSidebar from "./ChatSidebar";
import ImportPanel from "./ImportPanel";
import {
  Logo,
  PlusIcon,
  DownloadIcon,
  TableIcon,
  ChartIcon,
  ChevronDown,
  SparkIcon,
  AlertIcon,
  MessageIcon,
  TrashIcon,
} from "./icons";

type View = "grid" | "chart";

export default function Workspace() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recents, setRecents] = useState<SheetMeta[]>([]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [view, setView] = useState<View>("grid");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [selStats, setSelStats] = useState<SelectionStats | null>(null);
  const [highlight, setHighlight] = useState<{ row: number; nonce: number } | null>(null);
  const [mobileChat, setMobileChat] = useState(false);
  const [recentsOpen, setRecentsOpen] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshRecents = useCallback(async () => {
    try {
      setRecents(await listSheetMeta());
    } catch {
      /* IndexedDB unavailable — non-fatal */
    }
  }, []);

  // Load the recent-sheet list once on mount (setState in the async callback,
  // guarded so it can't fire after unmount).
  useEffect(() => {
    let alive = true;
    listSheetMeta()
      .then((m) => {
        if (alive) setRecents(m);
      })
      .catch(() => {
        /* IndexedDB unavailable — non-fatal */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Debounced persistence of the active sheet.
  useEffect(() => {
    if (!sheet) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveSheet(sheet).then(refreshRecents).catch(() => {});
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [sheet, refreshRecents]);

  // Debounced persistence of chat history.
  useEffect(() => {
    if (!sheet) return;
    if (chatTimer.current) clearTimeout(chatTimer.current);
    const id = sheet.id;
    chatTimer.current = setTimeout(() => {
      saveChat(id, messages).catch(() => {});
    }, 400);
    return () => {
      if (chatTimer.current) clearTimeout(chatTimer.current);
    };
  }, [messages, sheet]);

  const openOutcome = (outcome: IngestOutcome) => {
    setSheet(outcome.sheet);
    setMessages([]);
    setSort(null);
    setFlaggedOnly(false);
    setView("grid");
    setMobileChat(false);
  };

  const openRecent = async (id: string) => {
    setRecentsOpen(false);
    const s = await getSheet(id);
    if (!s) {
      refreshRecents();
      return;
    }
    setSheet(s);
    setMessages(await getChat(id));
    setSort(null);
    setFlaggedOnly(false);
    setView("grid");
    setMobileChat(false);
  };

  const removeRecent = async (id: string) => {
    await deleteSheet(id);
    if (sheet?.id === id) {
      setSheet(null);
      setMessages([]);
    }
    refreshRecents();
  };

  const newSheet = () => {
    setSheet(null);
    setMessages([]);
    setRecentsOpen(false);
  };

  const editCell = (rowId: string, colKey: string, value: string) => {
    setSheet((prev) => (prev ? applyCellEdit(prev, rowId, colKey, value) : prev));
  };

  const cite = (row: number) => {
    setHighlight((h) => ({ row, nonce: (h?.nonce ?? 0) + 1 }));
    setMobileChat(false);
    setView("grid");
  };

  const flaggedCount = sheet ? sheet.rows.filter((r) => r.flags.length > 0).length : 0;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper">
      {/* ===== Top bar ===== */}
      <header className="z-40 flex h-14 shrink-0 items-center gap-3 border-b border-gridline bg-white px-3 sm:px-4">
        <Link href="/" className="flex items-center gap-2 text-forest" aria-label="SalesSheet AI home">
          <Logo size={22} />
          <span className="hidden text-[15px] font-semibold tracking-tight text-ink sm:inline">
            SalesSheet<span className="text-forest"> AI</span>
          </span>
        </Link>

        {sheet && (
          <>
            <span className="text-gridline">/</span>
            <div className="relative min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setRecentsOpen((o) => !o)}
                className="flex max-w-full items-center gap-1.5 rounded-[3px] px-1.5 py-1 hover:bg-paper-dim"
              >
                <span className="truncate text-[14px] font-medium">{sheet.name}</span>
                <ChevronDown size={15} className="shrink-0 text-ink-soft" />
              </button>
              {recentsOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close menu"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setRecentsOpen(false)}
                  />
                  <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-72 overflow-auto rounded-[3px] border border-gridline bg-white py-1 shadow-[0_4px_16px_rgba(20,32,27,0.12)]">
                    <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                      Recent sheets
                    </div>
                    {recents.map((s) => (
                      <div
                        key={s.id}
                        className={`group flex items-center gap-2 px-2.5 py-1.5 hover:bg-row-hover ${
                          s.id === sheet.id ? "bg-paper-dim" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => openRecent(s.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <TableIcon size={15} className="shrink-0 text-forest" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium">{s.name}</span>
                            <span className="nums block text-[10.5px] text-ink-soft">
                              {s.rowCount} rows · {relativeTime(s.updatedAt)}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRecent(s.id)}
                          aria-label={`Delete ${s.name}`}
                          className="shrink-0 rounded-[2px] p-1 text-ink-soft opacity-0 hover:bg-brick-wash hover:text-brick group-hover:opacity-100"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {sheet && (
            <button
              type="button"
              onClick={() => downloadCsv(sheet)}
              className="inline-flex items-center gap-1.5 rounded-[3px] border border-gridline bg-white px-2.5 py-1.5 text-[13px] font-medium text-ink hover:bg-paper-dim"
            >
              <DownloadIcon size={16} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
          <button
            type="button"
            onClick={newSheet}
            className="inline-flex items-center gap-1.5 rounded-[3px] bg-forest px-2.5 py-1.5 text-[13px] font-semibold text-paper hover:bg-forest-deep"
          >
            <PlusIcon size={16} />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </header>

      {/* ===== Body ===== */}
      {!sheet ? (
        <div className="scroll-quiet min-h-0 flex-1 overflow-auto">
          <ImportPanel
            onSheet={openOutcome}
            recents={recents}
            onOpenRecent={openRecent}
            onDeleteRecent={removeRecent}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* Sheet column (grid/chart) */}
          <section
            className={`min-w-0 flex-1 flex-col ${mobileChat ? "hidden lg:flex" : "flex"}`}
          >
            {/* Toolbar */}
            <div className="flex h-11 shrink-0 items-center gap-3 border-b border-gridline bg-paper-dim px-3">
              <div className="flex rounded-[3px] border border-gridline bg-white p-0.5">
                <ViewTab active={view === "grid"} onClick={() => setView("grid")} icon={<TableIcon size={15} />}>
                  Grid
                </ViewTab>
                <ViewTab active={view === "chart"} onClick={() => setView("chart")} icon={<ChartIcon size={15} />}>
                  Chart
                </ViewTab>
              </div>

              {flaggedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFlaggedOnly((f) => !f)}
                  className={`inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-1 text-[12px] font-medium ${
                    flaggedOnly
                      ? "border-brick bg-brick-wash text-brick"
                      : "border-gridline bg-white text-ink-soft hover:text-ink"
                  }`}
                >
                  <AlertIcon size={14} /> {flaggedOnly ? "Showing flagged" : `${flaggedCount} flagged`}
                </button>
              )}

              <div className="ml-auto hidden items-center gap-3 text-[12px] text-ink-soft sm:flex">
                <Legend />
                <span className="nums">
                  {sheet.rows.length} rows · {sheet.columns.length} cols
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1">
              {view === "grid" ? (
                <Grid
                  sheet={sheet}
                  sort={sort}
                  onSortChange={setSort}
                  onEditCell={editCell}
                  onSelectionStats={setSelStats}
                  highlightRow={highlight?.row ?? null}
                  highlightNonce={highlight?.nonce}
                  filterFlagged={flaggedOnly}
                />
              ) : (
                <ChartView sheet={sheet} />
              )}
            </div>

            {/* Footer status bar */}
            <div className="flex h-8 shrink-0 items-center justify-between border-t border-gridline bg-paper-dim px-3 text-[11.5px] text-ink-soft">
              <span className="truncate">
                {sheet.origin === "upload" && sheet.sourceMeta?.fileName
                  ? sheet.sourceMeta.fileName
                  : "Pasted data"}
              </span>
              {selStats ? (
                <span className="nums flex items-center gap-3">
                  <span>Count {selStats.count}</span>
                  {selStats.numericCount > 0 && (
                    <>
                      <span>Sum {formatNumber(selStats.sum)}</span>
                      <span>Avg {formatNumber(Math.round(selStats.avg * 100) / 100)}</span>
                    </>
                  )}
                </span>
              ) : (
                <span>Ready</span>
              )}
            </div>
          </section>

          {/* Chat: persistent sidebar on desktop, full-screen tab on mobile */}
          <aside
            className={`w-full shrink-0 border-l border-gridline lg:flex lg:w-[360px] ${
              mobileChat ? "flex" : "hidden lg:flex"
            }`}
          >
            <div className="h-full w-full">
              <ChatSidebar
                sheet={sheet}
                messages={messages}
                onMessagesChange={setMessages}
                onCite={cite}
                onClose={mobileChat ? () => setMobileChat(false) : undefined}
              />
            </div>
          </aside>
        </div>
      )}

      {/* ===== Mobile bottom nav ===== */}
      {sheet && (
        <nav className="z-40 flex h-14 shrink-0 items-stretch border-t border-gridline bg-white lg:hidden">
          <BottomTab
            active={!mobileChat && view === "grid"}
            onClick={() => {
              setMobileChat(false);
              setView("grid");
            }}
            icon={<TableIcon size={20} />}
            label="Grid"
          />
          <BottomTab
            active={!mobileChat && view === "chart"}
            onClick={() => {
              setMobileChat(false);
              setView("chart");
            }}
            icon={<ChartIcon size={20} />}
            label="Chart"
          />
          <BottomTab
            active={mobileChat}
            onClick={() => setMobileChat(true)}
            icon={<MessageIcon size={20} />}
            label="Ask AI"
          />
        </nav>
      )}
    </div>
  );
}

function ViewTab({
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
      className={`inline-flex items-center gap-1.5 rounded-[2px] px-3 py-1 text-[13px] font-medium transition-colors ${
        active ? "bg-forest text-paper" : "text-ink-soft hover:text-ink"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function BottomTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium ${
        active ? "text-forest" : "text-ink-soft"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Legend() {
  return (
    <span className="flex items-center gap-3">
      <span className="inline-flex items-center gap-1">
        <SparkIcon size={12} className="text-amber" /> AI
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2.5 w-1 bg-brick" /> Flagged
      </span>
    </span>
  );
}
