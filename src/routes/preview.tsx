import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Share2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSession } from "@/lib/session";
import { generatePdf } from "@/lib/pdf";
import { saveDocument, type DocRecord } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { extractText } from "@/lib/ocr";
import { loadImageToCanvas, blobFromCanvas } from "@/lib/filters";

export const Route = createFileRoute("/preview")({
  component: Preview,
});

function Preview() {
  const session = useSession();
  const nav = useNavigate();
  const [name, setName] = useState(() => `Scan ${new Date().toLocaleString()}`);
  const [pageNumbers, setPageNumbers] = useState(false);
  const [watermark, setWatermark] = useState("");
  const [compress, setCompress] = useState(true);
  const [autoOcr, setAutoOcr] = useState(() => getSettings().autoOcr);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    if (session.pages.length === 0) nav({ to: "/" });
  }, [session.pages.length, nav]);

  async function build() {
    setBusy(true);
    setProgress("Preparing pages…");
    try {
      const quality = getSettings().pdfQuality;
      const pageBlobs: Blob[] = [];
      for (let i = 0; i < session.pages.length; i++) {
        setProgress(`Compressing page ${i + 1} / ${session.pages.length}…`);
        const p = session.pages[i];
        if (compress) {
          const c = await loadImageToCanvas(p.enhancedBlob, 1600);
          pageBlobs.push(await blobFromCanvas(c, quality));
        } else {
          pageBlobs.push(p.enhancedBlob);
        }
      }
      setProgress("Generating PDF…");
      const blob = await generatePdf(pageBlobs, {
        pageNumbers,
        watermark: watermark || undefined,
        compressQuality: quality,
      });
      setPdfBlob(blob);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (e: any) {
      alert(`PDF generation failed: ${e.message}`);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  useEffect(() => { build(); /* eslint-disable-next-line */ }, []);

  async function save() {
    if (!pdfBlob) return;
    setBusy(true);
    let ocrText = "";
    const perPageOcr: { filter: string; ocrText?: string }[] = session.pages.map((p) => ({ filter: p.filter }));
    if (autoOcr) {
      for (let i = 0; i < session.pages.length; i++) {
        setProgress(`OCR page ${i + 1} / ${session.pages.length}…`);
        try {
          const t = await extractText(session.pages[i].enhancedBlob);
          perPageOcr[i].ocrText = t;
          ocrText += (i ? "\n\n--- Page " + (i + 1) + " ---\n" : "") + t;
        } catch (e) {
          console.warn("OCR failed", e);
        }
      }
    }
    const thumb = session.pages[0].enhancedBlob;
    const thumbCanvas = await loadImageToCanvas(thumb, 400);
    const thumbBlob = await blobFromCanvas(thumbCanvas, 0.8);
    const doc: DocRecord = {
      id: crypto.randomUUID(),
      name: name.trim() || "Untitled",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pageCount: session.pages.length,
      fileSize: pdfBlob.size,
      pdfBlob,
      thumbBlob,
      ocrText,
      pages: perPageOcr,
    };
    await saveDocument(doc);
    session.clear();
    setBusy(false);
    nav({ to: "/documents/$id", params: { id: doc.id } });
  }

  async function share() {
    if (!pdfBlob) return;
    const file = new File([pdfBlob], `${name}.pdf`, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; } catch {}
    }
    const a = document.createElement("a");
    a.href = pdfUrl; a.download = `${name}.pdf`; a.click();
  }

  return (
    <AppShell title="Preview PDF" back>
      <div className="space-y-4 p-4">
        <div>
          <label className="text-sm font-medium">PDF name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Toggle label="Page numbers" value={pageNumbers} onChange={setPageNumbers} />
          <Toggle label="Compress images" value={compress} onChange={setCompress} />
          <Toggle label="Auto OCR on save" value={autoOcr} onChange={setAutoOcr} />
        </div>

        <div>
          <label className="text-sm font-medium">Watermark (optional)</label>
          <input
            value={watermark}
            onChange={(e) => setWatermark(e.target.value)}
            placeholder="e.g. CONFIDENTIAL"
            className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button onClick={build} disabled={busy} className="text-sm text-primary underline disabled:opacity-50">
          Rebuild preview with current options
        </button>

        {busy && <div className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">{progress || "Working…"}</div>}

        {pdfUrl && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <iframe title="PDF preview" src={pdfUrl} className="h-[60vh] w-full" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={share}
            disabled={!pdfBlob || busy}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card font-medium disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button
            onClick={save}
            disabled={!pdfBlob || busy}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-success font-semibold text-success-foreground disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Save locally
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-[var(--primary)]"
      />
    </label>
  );
}
