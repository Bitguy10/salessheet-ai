import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ChatMessage, Sheet, SheetMeta } from "./types";

// Local-only persistence (spec §6): sheets + per-sheet chat history live in the
// browser via IndexedDB. No network, no accounts, no cross-device sync.

interface SalesSheetDB extends DBSchema {
  sheets: {
    key: string;
    value: Sheet;
    indexes: { "by-updated": number };
  };
  chats: {
    key: string; // sheetId
    value: { sheetId: string; messages: ChatMessage[] };
  };
}

const DB_NAME = "salessheet-ai";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SalesSheetDB>> | null = null;

function getDB(): Promise<IDBPDatabase<SalesSheetDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in the browser"));
  }
  if (!dbPromise) {
    dbPromise = openDB<SalesSheetDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("sheets", { keyPath: "id" });
        store.createIndex("by-updated", "updatedAt");
        db.createObjectStore("chats", { keyPath: "sheetId" });
      },
    });
  }
  return dbPromise;
}

export async function saveSheet(sheet: Sheet): Promise<void> {
  const db = await getDB();
  await db.put("sheets", sheet);
}

export async function getSheet(id: string): Promise<Sheet | undefined> {
  const db = await getDB();
  return db.get("sheets", id);
}

export async function deleteSheet(id: string): Promise<void> {
  const db = await getDB();
  await Promise.all([db.delete("sheets", id), db.delete("chats", id)]);
}

/** Sheet descriptors for the "Recent sheets" list, newest first. */
export async function listSheetMeta(): Promise<SheetMeta[]> {
  const db = await getDB();
  const sheets = await db.getAllFromIndex("sheets", "by-updated");
  return sheets
    .map((s) => ({
      id: s.id,
      name: s.name,
      updatedAt: s.updatedAt,
      rowCount: s.rows.length,
      columnCount: s.columns.length,
      flaggedCount: s.rows.filter((r) => r.flags.length > 0).length,
      origin: s.origin,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getChat(sheetId: string): Promise<ChatMessage[]> {
  const db = await getDB();
  const rec = await db.get("chats", sheetId);
  return rec?.messages ?? [];
}

export async function saveChat(sheetId: string, messages: ChatMessage[]): Promise<void> {
  const db = await getDB();
  await db.put("chats", { sheetId, messages });
}
