import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import { loadImageToCanvas, blobFromCanvas, applyFilter } from "@/lib/filters";
import { getSettings } from "@/lib/settings";

export const Route = createFileRoute("/edit")({
  component: EditRedirect,
});

// Ingests files stashed on window from the home Import button, then jumps to /pages.
function EditRedirect() {
  const session = useSession();
  const nav = useNavigate();
  const [msg, setMsg] = useState("Importing images…");
  useEffect(() => {
    (async () => {
      const files: File[] = (window as any).__importFiles || [];
      delete (window as any).__importFiles;
      if (!files.length) {
        nav({ to: "/" });
        return;
      }
      const filter = (getSettings().defaultFilter || "autoEnhance") as any;
      for (let i = 0; i < files.length; i++) {
        setMsg(`Importing ${i + 1} / ${files.length}…`);
        const f = files[i];
        const work = await loadImageToCanvas(f, 2000);
        applyFilter(work, filter);
        const enhanced = await blobFromCanvas(work, 0.88);
        const thumb = await loadImageToCanvas(enhanced, 400);
        const thumbBlob = await blobFromCanvas(thumb, 0.8);
        session.addPage({
          id: crypto.randomUUID(),
          originalBlob: f,
          enhancedBlob: enhanced,
          thumbUrl: URL.createObjectURL(thumbBlob),
          filter,
          width: work.width,
          height: work.height,
        });
      }
      nav({ to: "/pages" });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">{msg}</div>
  );
}
