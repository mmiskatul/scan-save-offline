import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getSettings, setSettings, type AppSettings } from "@/lib/settings";
import { FILTERS } from "@/lib/filters";
import { getAllDocuments, getDB, type DocRecord, formatBytes } from "@/lib/db";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [s, setS] = useState<AppSettings>(() => getSettings());
  const [usage, setUsage] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    getAllDocuments().then((docs: DocRecord[]) => {
      setCount(docs.length);
      setUsage(docs.reduce((a, d) => a + d.fileSize, 0));
    });
  }, []);

  function update<K extends keyof AppSettings>(k: K, v: AppSettings[K]) {
    const next = { ...s, [k]: v };
    setS(next);
    setSettings(next);
  }

  async function clearAll() {
    if (!confirm("Delete ALL saved documents? This cannot be undone.")) return;
    const db = await getDB();
    await db.clear("documents");
    setCount(0); setUsage(0);
  }

  return (
    <AppShell title="Settings">
      <div className="space-y-4 p-4">
        <Row label="Theme">
          <select
            value={s.theme}
            onChange={(e) => update("theme", e.target.value as any)}
            className="rounded-md border border-border bg-card px-2 py-1 text-sm"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Row>

        <Row label="Default filter">
          <select
            value={s.defaultFilter}
            onChange={(e) => update("defaultFilter", e.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1 text-sm"
          >
            {FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </Row>

        <Row label="PDF quality">
          <input
            type="range" min={0.4} max={1} step={0.05}
            value={s.pdfQuality}
            onChange={(e) => update("pdfQuality", Number(e.target.value))}
          />
          <span className="ml-2 text-sm tabular-nums">{Math.round(s.pdfQuality * 100)}%</span>
        </Row>

        <Row label="Auto OCR on save">
          <input
            type="checkbox"
            checked={s.autoOcr}
            onChange={(e) => update("autoOcr", e.target.checked)}
            className="h-5 w-5 accent-[var(--primary)]"
          />
        </Row>

        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <div className="font-medium">Storage</div>
          <div className="mt-1 text-muted-foreground">
            {count} documents · {formatBytes(usage)} used
          </div>
          <button
            onClick={clearAll}
            className="mt-3 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground"
          >
            Clear all documents
          </button>
        </div>

        <p className="px-1 text-xs text-muted-foreground">
          All data stays on your device. This app does not send anything to a server.
        </p>
      </div>
    </AppShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}
