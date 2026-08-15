import type { CellValue, Sheet } from "./types";
import { detectFlags } from "./detect";
import { isNumericColumn, toNumber } from "./format";

/**
 * Apply a single cell edit and re-run rule-based detection so flags stay in
 * sync. Editing a cell clears its AI-estimated mark (the value is now
 * user-confirmed). Row order is preserved, so citation row numbers stay valid.
 */
export function applyCellEdit(sheet: Sheet, rowId: string, colKey: string, raw: string): Sheet {
  const col = sheet.columns.find((c) => c.key === colKey);
  if (!col) return sheet;

  const trimmed = raw.trim();
  let value: CellValue;
  if (trimmed === "") value = null;
  else if (isNumericColumn(col)) {
    const n = toNumber(trimmed);
    value = n === null ? trimmed : n; // keep unparseable text visible
  } else value = trimmed;

  const rows = sheet.rows.map((r) => {
    if (r.id !== rowId) return r;
    const data = { ...r.data, [colKey]: value };
    const ai = { ...r.ai };
    delete ai[colKey];
    return { ...r, data, ai };
  });

  return { ...sheet, rows: detectFlags(sheet.columns, rows), updatedAt: Date.now() };
}
