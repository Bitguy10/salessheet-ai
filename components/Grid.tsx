"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Row, Sheet } from "@/lib/types";
import { formatCell, isNumericColumn, toNumber } from "@/lib/format";
import { SortIcon, SparkIcon, AlertIcon } from "./icons";

export interface SortState {
  colKey: string;
  dir: "asc" | "desc";
}

export interface SelectionStats {
  count: number;
  numericCount: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
}

interface Props {
  sheet: Sheet;
  sort: SortState | null;
  onSortChange: (s: SortState | null) => void;
  onEditCell: (rowId: string, colKey: string, value: string) => void;
  onSelectionStats: (stats: SelectionStats | null) => void;
  highlightRow?: number | null;
  highlightNonce?: number;
  filterFlagged?: boolean;
}

interface Rect {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

function norm(rect: Rect) {
  return {
    top: Math.min(rect.r0, rect.r1),
    bottom: Math.max(rect.r0, rect.r1),
    left: Math.min(rect.c0, rect.c1),
    right: Math.max(rect.c0, rect.c1),
  };
}

export default function Grid({
  sheet,
  sort,
  onSortChange,
  onEditCell,
  onSelectionStats,
  highlightRow,
  highlightNonce,
  filterFlagged,
}: Props) {
  const { columns, rows } = sheet;

  // View order — a permutation of original indices. NEVER mutate sheet.rows, so
  // citation row numbers (original position + 1) stay valid (spec §5).
  const viewOrder = useMemo(() => {
    let idx = rows.map((_, i) => i);
    if (filterFlagged) idx = idx.filter((i) => rows[i].flags.length > 0);
    if (!sort) return idx;
    const col = columns.find((c) => c.key === sort.colKey);
    if (!col) return idx;
    const numeric = isNumericColumn(col);
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...idx].sort((a, b) => {
      const va = rows[a].data[col.key];
      const vb = rows[b].data[col.key];
      const aNull = va === null || va === undefined || va === "";
      const bNull = vb === null || vb === undefined || vb === "";
      if (aNull && bNull) return a - b;
      if (aNull) return 1; // blanks always sink
      if (bNull) return -1;
      if (numeric) {
        const na = toNumber(va) ?? 0;
        const nb = toNumber(vb) ?? 0;
        return (na - nb) * dir;
      }
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [rows, columns, sort, filterFlagged]);

  const [selection, setSelection] = useState<Rect | null>(null);
  const [focus, setFocus] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const selecting = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const editRef = useRef<HTMLInputElement>(null);

  // Report selection stats upward for the footer status bar.
  useEffect(() => {
    if (!selection) {
      onSelectionStats(null);
      return;
    }
    const { top, bottom, left, right } = norm(selection);
    const nums: number[] = [];
    let count = 0;
    for (let vr = top; vr <= bottom; vr++) {
      const orig = viewOrder[vr];
      if (orig === undefined) continue;
      for (let c = left; c <= right; c++) {
        count++;
        const col = columns[c];
        if (col && isNumericColumn(col)) {
          const n = toNumber(rows[orig].data[col.key]);
          if (n !== null) nums.push(n);
        }
      }
    }
    if (count <= 1) {
      onSelectionStats(null);
      return;
    }
    const sum = nums.reduce((a, b) => a + b, 0);
    onSelectionStats({
      count,
      numericCount: nums.length,
      sum,
      avg: nums.length ? sum / nums.length : 0,
      min: nums.length ? Math.min(...nums) : 0,
      max: nums.length ? Math.max(...nums) : 0,
    });
  }, [selection, viewOrder, columns, rows, onSelectionStats]);

  // End drag-selection on mouseup anywhere.
  useEffect(() => {
    const up = () => (selecting.current = false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  // Scroll to + flash a cited row (highlightRow is 1-based original index).
  // The flash is applied imperatively to the row element — a transient visual
  // that doesn't belong in render state.
  useEffect(() => {
    if (!highlightRow) return;
    const vr = viewOrder.indexOf(highlightRow - 1);
    if (vr < 0) return;
    const el = rowRefs.current[vr];
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    // Restart the animation even when the same row is re-cited: drop the
    // class, force a reflow, then re-add.
    el.classList.remove("ss-cite-pulse");
    el.getBoundingClientRect();
    el.classList.add("ss-cite-pulse");
    const t = setTimeout(() => el.classList.remove("ss-cite-pulse"), 1800);
    return () => {
      clearTimeout(t);
      el.classList.remove("ss-cite-pulse");
    };
  }, [highlightRow, highlightNonce, viewOrder]);

  const toggleSort = (colKey: string) => {
    if (!sort || sort.colKey !== colKey) onSortChange({ colKey, dir: "asc" });
    else if (sort.dir === "asc") onSortChange({ colKey, dir: "desc" });
    else onSortChange(null);
  };

  const beginEdit = useCallback(
    (vr: number, c: number, initial?: string) => {
      const orig = viewOrder[vr];
      if (orig === undefined) return;
      const col = columns[c];
      if (!col) return;
      const raw = rows[orig].data[col.key];
      setEditValue(initial ?? (raw === null || raw === undefined ? "" : String(raw)));
      setEditing(true);
      setFocus({ r: vr, c });
    },
    [viewOrder, columns, rows],
  );

  const commitEdit = useCallback(
    (move: "down" | "right" | null) => {
      const orig = viewOrder[focus.r];
      const col = columns[focus.c];
      if (orig !== undefined && col) onEditCell(rows[orig].id, col.key, editValue);
      setEditing(false);
      if (move === "down") setFocus((f) => ({ ...f, r: Math.min(f.r + 1, rows.length - 1) }));
      if (move === "right") setFocus((f) => ({ ...f, c: Math.min(f.c + 1, columns.length - 1) }));
    },
    [viewOrder, columns, rows, focus, editValue, onEditCell],
  );

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return; // input handles its own keys
    const { r, c } = focus;
    const move = (nr: number, nc: number, extend: boolean) => {
      e.preventDefault();
      const cr = Math.max(0, Math.min(nr, rows.length - 1));
      const cc = Math.max(0, Math.min(nc, columns.length - 1));
      setFocus({ r: cr, c: cc });
      setSelection((sel) =>
        extend && sel ? { ...sel, r1: cr, c1: cc } : { r0: cr, c0: cc, r1: cr, c1: cc },
      );
    };
    switch (e.key) {
      case "ArrowDown": move(r + 1, c, e.shiftKey); break;
      case "ArrowUp": move(r - 1, c, e.shiftKey); break;
      case "ArrowRight": move(r, c + 1, e.shiftKey); break;
      case "ArrowLeft": move(r, c - 1, e.shiftKey); break;
      case "Enter": e.preventDefault(); beginEdit(r, c); break;
      case "Backspace":
      case "Delete": e.preventDefault(); onEditCellDelete(r, c); break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) beginEdit(r, c, e.key);
    }
  };

  const onEditCellDelete = (vr: number, c: number) => {
    const orig = viewOrder[vr];
    const col = columns[c];
    if (orig !== undefined && col) onEditCell(rows[orig].id, col.key, "");
  };

  const inRect = (vr: number, c: number): boolean => {
    if (!selection) return false;
    const { top, bottom, left, right } = norm(selection);
    return vr >= top && vr <= bottom && c >= left && c <= right;
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="scroll-quiet h-full overflow-auto bg-white outline-none"
    >
      <table className="border-separate border-spacing-0 text-[13px]">
        <thead className="sticky top-0 z-20">
          <tr>
            <th className="sticky left-0 z-30 w-12 border-b border-r border-gridline bg-paper-dim px-2 py-2 text-[11px] font-semibold text-ink-soft">
              #
            </th>
            {columns.map((col) => {
              const active = sort?.colKey === col.key;
              return (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`group cursor-pointer select-none border-b border-r border-gridline bg-paper-dim px-3 py-2 font-semibold whitespace-nowrap ${
                    isNumericColumn(col) ? "text-right" : "text-left"
                  } hover:bg-[#e4e6dd]`}
                  title={`Sort by ${col.label}`}
                >
                  <span className={`inline-flex items-center gap-1.5 ${isNumericColumn(col) ? "flex-row-reverse" : ""}`}>
                    <span className="text-ink">{col.label}</span>
                    <SortIcon
                      size={13}
                      dir={active ? sort!.dir : null}
                      className={active ? "text-forest" : "text-ink-soft/40 group-hover:text-ink-soft"}
                    />
                  </span>
                  <span className="ml-1.5 block text-[10px] font-normal uppercase tracking-wide text-ink-soft/70">
                    {col.type}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {viewOrder.map((orig, vr) => {
            const row = rows[orig];
            const flagged = row.flags.length > 0;
            return (
              <tr
                key={row.id}
                ref={(el) => {
                  rowRefs.current[vr] = el;
                }}
                className={vr % 2 === 1 ? "bg-zebra" : "bg-white"}
              >
                <RowNumberCell n={orig + 1} flagged={flagged} row={row} />
                {columns.map((col, c) => {
                  const value = row.data[col.key];
                  const isAi = Boolean(row.ai[col.key]);
                  const cellFlag = row.flags.find((f) => f.columns?.includes(col.key));
                  const selected = inRect(vr, c);
                  const isFocus = focus.r === vr && focus.c === c;
                  const numeric = isNumericColumn(col);

                  const shadows: string[] = [];
                  if (cellFlag) shadows.push("inset 2px 0 0 var(--brick)");
                  else if (isAi) shadows.push("inset 2px 0 0 var(--amber)");
                  if (isFocus) shadows.push("inset 0 0 0 2px var(--forest)");
                  else if (selected) shadows.push("inset 0 0 0 1px color-mix(in srgb, var(--forest) 45%, transparent)");

                  const bg = selected
                    ? "color-mix(in srgb, var(--forest) 9%, var(--paper))"
                    : cellFlag
                      ? "var(--brick-wash)"
                      : isAi
                        ? "var(--amber-wash)"
                        : undefined;

                  return (
                    <td
                      key={col.key}
                      onMouseDown={(e) => {
                        if (editing) return;
                        e.preventDefault();
                        selecting.current = true;
                        setFocus({ r: vr, c });
                        if (e.shiftKey && selection) setSelection({ ...selection, r1: vr, c1: c });
                        else setSelection({ r0: vr, c0: c, r1: vr, c1: c });
                      }}
                      onMouseEnter={() => {
                        if (selecting.current) setSelection((s) => (s ? { ...s, r1: vr, c1: c } : s));
                      }}
                      onDoubleClick={() => beginEdit(vr, c)}
                      title={
                        cellFlag ? cellFlag.label : isAi ? row.ai[col.key] : undefined
                      }
                      style={{ boxShadow: shadows.join(", ") || undefined, background: bg }}
                      className={`relative border-b border-r border-gridline px-3 py-1.5 ${
                        numeric ? "nums text-right" : "text-left"
                      } ${value === null || value === "" ? "text-ink-soft/40" : "text-ink"}`}
                    >
                      {isFocus && editing ? (
                        <input
                          ref={editRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); commitEdit("down"); }
                            else if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
                            else if (e.key === "Tab") { e.preventDefault(); commitEdit("right"); }
                            e.stopPropagation();
                          }}
                          className={`absolute inset-0 h-full w-full border-0 bg-white px-3 py-1.5 text-[13px] outline-none ${
                            numeric ? "nums text-right" : "text-left"
                          }`}
                        />
                      ) : (
                        <>
                          {formatCell(value, col.type) || (value === null ? "—" : "")}
                          {cellFlag ? (
                            <CornerMark color="var(--brick)" />
                          ) : isAi ? (
                            <CornerMark color="var(--amber)" />
                          ) : null}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="p-10 text-center text-[13px] text-ink-soft">This sheet has no rows.</div>
      )}
    </div>
  );
}

function RowNumberCell({ n, flagged, row }: { n: number; flagged: boolean; row: Row }) {
  const hasAi = Object.keys(row.ai).length > 0;
  return (
    <td
      className="sticky left-0 z-10 w-12 border-b border-r border-gridline bg-paper-dim px-2 py-1.5 text-center align-middle"
      title={flagged ? row.flags.map((f) => f.label).join("\n") : undefined}
    >
      <span className="nums inline-flex items-center gap-1 text-[11px] text-ink-soft">
        {n}
        {flagged ? (
          <AlertIcon size={12} className="text-brick" />
        ) : hasAi ? (
          <SparkIcon size={11} className="text-amber" />
        ) : null}
      </span>
    </td>
  );
}

/** Small Excel-style corner marker for AI/flagged cells (redundant w/ color). */
function CornerMark({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-0 top-0"
      style={{
        width: 0,
        height: 0,
        borderTop: `6px solid ${color}`,
        borderLeft: "6px solid transparent",
      }}
    />
  );
}
