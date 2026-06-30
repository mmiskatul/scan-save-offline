// IndexedDB wrapper for documents + pages. Fully offline.
import { openDB, type IDBPDatabase } from "idb";

export interface DocPage {
  id: string;
  index: number;
  blob: Blob; // enhanced image blob (jpeg)
  thumbBlob: Blob;
  width: number;
  height: number;
  filter: string;
  ocrText?: string;
}

export interface DocRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  pageCount: number;
  fileSize: number;
  pdfBlob: Blob;
  thumbBlob: Blob;
  ocrText: string;
  pages: { filter: string; ocrText?: string }[];
}

const DB_NAME = "smart-scanner";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;
export function getDB() {
  if (typeof window === "undefined") throw new Error("DB only available in browser");
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("documents")) {
          const s = db.createObjectStore("documents", { keyPath: "id" });
          s.createIndex("createdAt", "createdAt");
        }
      },
    });
  }
  return dbPromise;
}

export async function saveDocument(doc: DocRecord) {
  const db = await getDB();
  await db.put("documents", doc);
}

export async function getAllDocuments(): Promise<DocRecord[]> {
  const db = await getDB();
  const all = await db.getAll("documents");
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getDocument(id: string): Promise<DocRecord | undefined> {
  const db = await getDB();
  return db.get("documents", id);
}

export async function deleteDocument(id: string) {
  const db = await getDB();
  await db.delete("documents", id);
}

export async function renameDocument(id: string, name: string) {
  const db = await getDB();
  const doc = await db.get("documents", id);
  if (!doc) return;
  doc.name = name;
  doc.updatedAt = Date.now();
  await db.put("documents", doc);
}

export function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}
