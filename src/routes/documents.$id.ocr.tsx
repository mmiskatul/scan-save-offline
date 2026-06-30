import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDocument, saveDocument, type DocRecord } from "@/lib/db";
import { extractText } from "@/lib/ocr";

export const Route = createFileRoute("/documents/$id/ocr")({
  component: OcrPage,
});

function OcrPage() {
  const { id } = Route.useParams();
  const [doc, setDoc] = useState<DocRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [progress, setProgress] = useState("");

  useEffect(() => { getDocument(id).then((d) => setDoc(d || null)); }, [id]);

  async function runOcr() {
    if (!doc) return;
    setBusy(true);
    try {
      // Re-render PDF pages to images is heavy; instead OCR isn't re-runnable here unless we kept page images.
      // For now we only support running OCR if it wasn't done at save time.
      // Since we don't store per-page images post-save, just OCR the thumbnail as a degraded fallback.
      setProgress("Recognizing text…");
      const t = await extractText(doc.thumbBlob);
      const updated = { ...doc, ocrText: t, pages: doc.pages.map((p) => ({ ...p, ocrText: t })) };
      await saveDocument(updated);
      setDoc(updated);
    } catch (e: any) {
      alert(`OCR failed: ${e.message}`);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const highlighted = useMemo(() => {
    if (!doc) return "";
    if (!q) return doc.ocrText;
    const re = new RegExp(q.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "gi");
    return doc.ocrText.replace(re, (m) => `__HL__${m}__/HL__`);
  }, [doc, q]);

  if (!doc) return <AppShell title="OCR" back><div className="p-6 text-sm text-muted-foreground">Loading…</div></AppShell>;

  return (
    <AppShell title="OCR Text" back>
      <div className="space-y-3 p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search inside text"
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={runOcr}
            disabled={busy}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {doc.ocrText ? "Re-run OCR" : "Run OCR"}
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(doc.ocrText)}
            disabled={!doc.ocrText}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm disabled:opacity-50"
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
          <button
            onClick={() => {
              const blob = new Blob([doc.ocrText], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `${doc.name}.txt`; a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={!doc.ocrText}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> .txt
          </button>
        </div>

        {busy && <div className="text-sm text-muted-foreground">{progress}</div>}

        <div className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {doc.ocrText ? renderHighlight(highlighted) : (
            <span className="text-muted-foreground">No OCR text yet. Tap “Run OCR” to recognize text from this document.</span>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function renderHighlight(s: string) {
  const parts = s.split(/(__HL__.*?__\/HL__)/g);
  return parts.map((p, i) =>
    p.startsWith("__HL__")
      ? <mark key={i} className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-500/40">{p.slice(6, -7)}</mark>
      : <span key={i}>{p}</span>
  );
}
