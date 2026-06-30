import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getAllDocuments, type DocRecord, formatBytes } from "@/lib/db";

export const Route = createFileRoute("/documents/")({
  head: () => ({ meta: [{ title: "Saved Documents — Smart Scanner" }] }),
  component: List,
});

type Sort = "newest" | "oldest" | "name" | "size";

function List() {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");

  useEffect(() => { getAllDocuments().then(setDocs); }, []);

  const filtered = useMemo(() => {
    const f = docs.filter(
      (d) => d.name.toLowerCase().includes(q.toLowerCase()) || d.ocrText.toLowerCase().includes(q.toLowerCase())
    );
    const sorters: Record<Sort, (a: DocRecord, b: DocRecord) => number> = {
      newest: (a, b) => b.createdAt - a.createdAt,
      oldest: (a, b) => a.createdAt - b.createdAt,
      name: (a, b) => a.name.localeCompare(b.name),
      size: (a, b) => b.fileSize - a.fileSize,
    };
    return [...f].sort(sorters[sort]);
  }, [docs, q, sort]);

  return (
    <AppShell title="Documents">
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or OCR text"
            className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-md border border-border bg-card px-2 py-1 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No documents found.
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {filtered.map((d) => (
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
