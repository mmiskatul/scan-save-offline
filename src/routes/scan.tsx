import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Aperture, X, Check, Image as ImageIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSession, type SessionPage } from "@/lib/session";
import { loadImageToCanvas, blobFromCanvas, applyFilter } from "@/lib/filters";
import { getSettings } from "@/lib/settings";

export const Route = createFileRoute("/scan")({
  component: Scanner,
});

function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const session = useSession();
  const nav = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        setError(
          e?.name === "NotAllowedError"
            ? "Camera permission denied. Enable it in your browser settings and reload."
            : "Camera unavailable. Try importing images from your gallery instead."
        );
      }
    })();
    return () => { active = false; stream?.getTracks().forEach((t) => t.stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const originalBlob = await blobFromCanvas(canvas, 0.92);

    const filter = (getSettings().defaultFilter || "autoEnhance") as any;
    const work = await loadImageToCanvas(originalBlob, 2000);
    applyFilter(work, filter);
    const enhancedBlob = await blobFromCanvas(work, 0.88);

    const thumb = await loadImageToCanvas(enhancedBlob, 400);
    const thumbBlob = await blobFromCanvas(thumb, 0.8);
    const thumbUrl = URL.createObjectURL(thumbBlob);

    const page: SessionPage = {
      id: crypto.randomUUID(),
      originalBlob,
      enhancedBlob,
      thumbUrl,
      filter,
      width: work.width,
      height: work.height,
    };
    session.addPage(page);
    setCount((c) => c + 1);
  }

  function finish() {
    stream?.getTracks().forEach((t) => t.stop());
    nav({ to: "/pages" });
  }

  return (
    <AppShell title="Scan" back>
      <div className="relative flex h-[calc(100vh-3.5rem-4rem)] flex-col bg-black">
        {error ? (
          <div className="m-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full flex-1 object-contain"
          />
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-gradient-to-t from-black/80 to-transparent px-6 pb-6 pt-10">
          <label className="rounded-full bg-white/10 p-3 text-white">
            <ImageIcon className="h-6 w-6" />
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                for (const f of files) await ingestFile(f);
              }}
            />
          </label>

          <button
            onClick={capture}
            disabled={!stream}
            className="grid h-18 w-18 place-items-center rounded-full bg-white p-1 shadow-xl disabled:opacity-50"
            aria-label="Capture"
            style={{ height: 72, width: 72 }}
          >
            <span className="grid h-full w-full place-items-center rounded-full bg-white ring-4 ring-white/40">
              <Aperture className="h-8 w-8 text-black" />
            </span>
          </button>

          <button
            onClick={finish}
            disabled={count === 0 && session.pages.length === 0}
            className="relative rounded-full bg-success p-3 text-success-foreground disabled:opacity-50"
            aria-label="Done"
          >
            <Check className="h-6 w-6" />
            {(count + session.pages.length - count) > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                {session.pages.length}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={() => { stream?.getTracks().forEach((t) => t.stop()); nav({ to: "/" }); }}
          className="absolute right-3 top-3 rounded-full bg-black/40 p-2 text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </AppShell>
  );

  async function ingestFile(file: File) {
    const filter = (getSettings().defaultFilter || "autoEnhance") as any;
    const work = await loadImageToCanvas(file, 2000);
    applyFilter(work, filter);
    const enhancedBlob = await blobFromCanvas(work, 0.88);
    const thumb = await loadImageToCanvas(enhancedBlob, 400);
    const thumbBlob = await blobFromCanvas(thumb, 0.8);
    session.addPage({
      id: crypto.randomUUID(),
      originalBlob: file,
      enhancedBlob,
      thumbUrl: URL.createObjectURL(thumbBlob),
      filter,
      width: work.width,
      height: work.height,
    });
    setCount((c) => c + 1);
  }
}
