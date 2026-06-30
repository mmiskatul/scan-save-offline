import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Share2, Trash2, FileSearch } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { deleteDocument, formatBytes, getDocument, renameDocument, type DocRecord } from "@/lib/db";

export const Route = createFileRoute("/documents/$id")({
  component: DocDetails,
});

function DocDetails() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [doc, setDoc] = useState<DocRecord | null>(null);
  const [url, setUrl] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    let u = "";
    getDocument(id).then((d) => {
      if (!d) return;
      setDoc(d);
      setName(d.name);
      u = URL.createObjectURL(d.pdfBlob);
      setUrl(u);
    });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [id]);

  async function share() {
    if (!doc) return;
    const file = new File([doc.pdfBlob], `${doc.name}.pdf`, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: doc.name }); return; } catch {}
    }
    const a = document.createElement("a");
    a.href = url; a.download = `${doc.name}.pdf`; a.click();
  }

  async function remove() {
    if (!doc) return;
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    await deleteDocument(doc.id);
    nav({ to: "/documents" });
  }

  if (!doc) return <AppShell title="Document" back><div className="p-6 text-sm text-muted-foreground">Loading…</div></AppShell>;

  return (
    <AppShell title={doc.name} back>
      <div className="space-y-4 p-4">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {url && <iframe title="PDF" src={url} className="h-[60vh] w-full" />}
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-border bg-card p-4 text-sm">
          <dt className="text-muted-foreground">Name</dt><dd className="truncate text-right">{doc.name}</dd>
          <dt className="text-muted-foreground">Pages</dt><dd className="text-right">{doc.pageCount}</dd>
          <dt className="text-muted-foreground">Size</dt><dd className="text-right">{formatBytes(doc.fileSize)}</dd>
          <dt className="text-muted-foreground">Created</dt><dd className="text-right">{new Date(doc.createdAt).toLocaleString()}</dd>
        </dl>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={share} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium">
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button onClick={() => setRenaming(true)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium">
            <Pencil className="h-4 w-4" /> Rename
          </button>
          <Link to="/documents/$id/ocr" params={{ id: doc.id }} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium">
            <FileSearch className="h-4 w-4" /> OCR Text
          </Link>
          <button onClick={remove} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-medium text-destructive-foreground">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      {renaming && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-4">
            <h3 className="font-semibold">Rename document</h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-3 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRenaming(false)} className="rounded-md px-3 py-1.5 text-sm">Cancel</button>
              <button
                onClick={async () => {
                  await renameDocument(doc.id, name.trim() || doc.name);
                  setDoc({ ...doc, name: name.trim() || doc.name });
                  setRenaming(false);
                }}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              >Save</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
