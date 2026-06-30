import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Copy, RotateCw, Sliders, Trash2, FileOutput, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSession, type SessionPage } from "@/lib/session";
import { applyFilter, blobFromCanvas, loadImageToCanvas, FILTERS, type FilterKey } from "@/lib/filters";

export const Route = createFileRoute("/pages")({
  component: PageManager,
});

function PageManager() {
  const session = useSession();
  const nav = useNavigate();
  const [editing, setEditing] = useState<SessionPage | null>(null);

  useEffect(() => {
    if (session.pages.length === 0) nav({ to: "/" });
  }, [session.pages.length, nav]);

  return (
    <AppShell title={`Pages (${session.pages.length})`} back>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {session.pages.map((p, i) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative">
                <img src={p.thumbUrl} alt="" className="aspect-[3/4] w-full object-cover" />
                <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                  {i + 1}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 p-2">
                <IconBtn onClick={() => setEditing(p)} title="Filter"><Sliders className="h-4 w-4" /></IconBtn>
                <IconBtn onClick={() => rotate(p)} title="Rotate"><RotateCw className="h-4 w-4" /></IconBtn>
                <IconBtn onClick={() => i > 0 && session.reorder(i, i - 1)} title="Up"><ArrowUp className="h-4 w-4" /></IconBtn>
                <IconBtn onClick={() => i < session.pages.length - 1 && session.reorder(i, i + 1)} title="Down"><ArrowDown className="h-4 w-4" /></IconBtn>
                <IconBtn onClick={() => duplicate(p)} title="Duplicate"><Copy className="h-4 w-4" /></IconBtn>
                <IconBtn onClick={() => session.removePage(p.id)} title="Delete" danger><Trash2 className="h-4 w-4" /></IconBtn>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3">
          <button
            onClick={() => nav({ to: "/scan" })}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card font-medium"
          >
            <Plus className="h-4 w-4" /> Add more pages
          </button>
          <button
            onClick={() => nav({ to: "/preview" })}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground"
          >
            <FileOutput className="h-5 w-5" /> Preview & Save PDF
          </button>
        </div>
      </div>

      {editing && (
        <FilterModal
          page={editing}
          onClose={() => setEditing(null)}
          onApply={async (filter) => {
            const canvas = await loadImageToCanvas(editing.originalBlob, 2000);
            applyFilter(canvas, filter);
            const enhanced = await blobFromCanvas(canvas, 0.88);
            const thumb = await loadImageToCanvas(enhanced, 400);
            const thumbBlob = await blobFromCanvas(thumb, 0.8);
            URL.revokeObjectURL(editing.thumbUrl);
            session.updatePage(editing.id, {
              enhancedBlob: enhanced,
              filter,
              thumbUrl: URL.createObjectURL(thumbBlob),
              width: canvas.width,
              height: canvas.height,
            });
            setEditing(null);
          }}
        />
      )}
    </AppShell>
  );

  async function rotate(p: SessionPage) {
    const src = await loadImageToCanvas(p.enhancedBlob, 2000);
    const out = document.createElement("canvas");
    out.width = src.height; out.height = src.width;
    const ctx = out.getContext("2d")!;
    ctx.translate(out.width / 2, out.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(src, -src.width / 2, -src.height / 2);
    const enhanced = await blobFromCanvas(out, 0.88);
    const orig = await loadImageToCanvas(p.originalBlob, 2000);
    const oo = document.createElement("canvas");
    oo.width = orig.height; oo.height = orig.width;
    const octx = oo.getContext("2d")!;
    octx.translate(oo.width / 2, oo.height / 2);
    octx.rotate(Math.PI / 2);
    octx.drawImage(orig, -orig.width / 2, -orig.height / 2);
    const original = await blobFromCanvas(oo, 0.92);
    const thumb = await loadImageToCanvas(enhanced, 400);
    const thumbBlob = await blobFromCanvas(thumb, 0.8);
    URL.revokeObjectURL(p.thumbUrl);
    session.updatePage(p.id, {
      enhancedBlob: enhanced,
      originalBlob: original,
      thumbUrl: URL.createObjectURL(thumbBlob),
      width: out.width,
      height: out.height,
    });
  }

  async function duplicate(p: SessionPage) {
    const thumb = await loadImageToCanvas(p.enhancedBlob, 400);
    const thumbBlob = await blobFromCanvas(thumb, 0.8);
    session.addPage({
      ...p,
      id: crypto.randomUUID(),
      thumbUrl: URL.createObjectURL(thumbBlob),
    });
  }
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`grid h-8 w-8 place-items-center rounded-md hover:bg-accent ${danger ? "text-destructive" : "text-foreground"}`}
    >
      {children}
    </button>
  );
}

function FilterModal({ page, onClose, onApply }: {
  page: SessionPage;
  onClose: () => void;
  onApply: (f: FilterKey) => void;
}) {
  const [previews, setPreviews] = useState<{ key: FilterKey; url: string }[]>([]);
  const [selected, setSelected] = useState<FilterKey>(page.filter);
  const [bigUrl, setBigUrl] = useState<string>("");
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    (async () => {
      const big = await loadImageToCanvas(page.originalBlob, 1200);
      applyFilter(big, selected);
      const b = await blobFromCanvas(big, 0.85);
      if (cancelled) return;
      const u = URL.createObjectURL(b);
      urls.push(u);
      setBigUrl(u);
    })();
    return () => { cancelled = true; urls.forEach(URL.revokeObjectURL); };
  }, [page.originalBlob, selected]);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    (async () => {
      const out: { key: FilterKey; url: string }[] = [];
      for (const f of FILTERS) {
        if (cancelled) break;
        const c = await loadImageToCanvas(page.originalBlob, 140);
        applyFilter(c, f.key);
        const b = await blobFromCanvas(c, 0.7);
        const u = URL.createObjectURL(b);
        urls.push(u);
        out.push({ key: f.key, url: u });
        if (!cancelled) setPreviews([...out]);
      }
    })();
    return () => { cancelled = true; urls.forEach(URL.revokeObjectURL); };
  }, [page.originalBlob]);

  const [origUrl, setOrigUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(page.originalBlob);
    setOrigUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [page.originalBlob]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-background">
      <div className="flex h-14 items-center gap-2 border-b border-border px-3">
        <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm">Cancel</button>
        <h2 className="flex-1 text-center font-semibold">Apply Filter</h2>
        <button
          onClick={() => onApply(selected)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Apply
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden bg-muted">
        <img
          src={showOriginal ? origUrl : bigUrl}
          alt=""
          className="h-full w-full object-contain"
        />
        <button
          onPointerDown={() => setShowOriginal(true)}
          onPointerUp={() => setShowOriginal(false)}
          onPointerLeave={() => setShowOriginal(false)}
          className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white"
        >
          Hold to compare
        </button>
      </div>
      <div className="border-t border-border bg-card p-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const p = previews.find((x) => x.key === f.key);
            const active = selected === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setSelected(f.key)}
                className="flex w-20 shrink-0 flex-col items-center gap-1"
              >
                <div
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${active ? "border-primary" : "border-transparent"} bg-muted`}
                >
                  {p ? <img src={p.url} className="h-full w-full object-cover" alt="" /> : null}
                </div>
                <span className={`truncate text-[11px] ${active ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
