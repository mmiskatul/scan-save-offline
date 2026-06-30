// In-memory scan session (current pages being edited before PDF generation).
import { createContext, useContext, useState, type ReactNode } from "react";
import type { FilterKey } from "./filters";

export interface SessionPage {
  id: string;
  originalBlob: Blob;   // raw capture
  enhancedBlob: Blob;   // after filter
  thumbUrl: string;
  filter: FilterKey;
  width: number;
  height: number;
}

interface Ctx {
  pages: SessionPage[];
  addPage: (p: SessionPage) => void;
  updatePage: (id: string, patch: Partial<SessionPage>) => void;
  removePage: (id: string) => void;
  reorder: (from: number, to: number) => void;
  clear: () => void;
}

const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<SessionPage[]>([]);
  const value: Ctx = {
    pages,
    addPage: (p) => setPages((prev) => [...prev, p]),
    updatePage: (id, patch) =>
      setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    removePage: (id) =>
      setPages((prev) => {
        const found = prev.find((p) => p.id === id);
        if (found) URL.revokeObjectURL(found.thumbUrl);
        return prev.filter((p) => p.id !== id);
      }),
    reorder: (from, to) =>
      setPages((prev) => {
        const arr = [...prev];
        const [item] = arr.splice(from, 1);
        arr.splice(to, 0, item);
        return arr;
      }),
    clear: () =>
      setPages((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.thumbUrl));
        return [];
      }),
  };
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession outside provider");
  return ctx;
}
