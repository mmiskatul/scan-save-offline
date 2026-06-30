import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, FolderOpen, Image as ImageIcon, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getAllDocuments, type DocRecord, formatBytes } from "@/lib/db";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Offline Smart Scanner" },
      { name: "description", content: "Scan, enhance, OCR and export PDFs entirely offline." },
    ],
  }),
  component: Home,
});

function Home() {
  const nav = useNavigate();
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => { getAllDocuments().then(setDocs); }, []);

  const filtered = docs.filter((d) =>
    d.name.toLowerCase().includes(q.toLowerCase()) ||
    d.ocrText.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppShell title="Smart Scanner">
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search documents or OCR text"
            className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          onClick={() => nav({ to: "/scan" })}
          className="mt-5 flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground shadow-sm active:scale-[0.99]"
        >
          <Camera className="h-9 w-9" />
          <span className="text-lg font-semibold">Scan Document</span>
        </button>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <ImportButton />
          <Link
            to="/documents"
            className="flex h-20 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card text-sm font-medium"
          >
            <FolderOpen className="h-5 w-5 text-primary" />
            All Documents
          </Link>
        </div>

        <h2 className="mt-7 mb-2 text-sm font-semibold text-muted-foreground">Recent</h2>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No documents yet. Tap <strong>Scan Document</strong> to start.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.slice(0, 8).map((d) => (
              <li key={d.id}>
                <Link
                  to="/documents/$id"
                  params={{ id: d.id }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 active:bg-accent"
                >
                  <Thumb blob={d.thumbBlob} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.pageCount} pages · {formatBytes(d.fileSize)} · {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function Thumb({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return <img src={url} alt="" className="h-14 w-12 rounded-md object-cover bg-muted" />;
}

function ImportButton() {
  const nav = useNavigate();
  return (
    <label className="flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card text-sm font-medium">
      <ImageIcon className="h-5 w-5 text-primary" />
      Import from Gallery
      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          if (!files.length) return;
          sessionStorage.setItem(
            "scanner.import",
            JSON.stringify({ count: files.length })
          );
          // Stash files via a transient global since File can't be serialized.
          (window as any).__importFiles = files;
          nav({ to: "/edit", search: { source: "import" } as any });
        }}
      />
    </label>
  );
}
