// PDF generation via pdf-lib. Runs entirely client-side.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface PdfOptions {
  pageNumbers?: boolean;
  watermark?: string;
  compressQuality?: number; // 0..1
}

export async function generatePdf(blobs: Blob[], opts: PdfOptions = {}): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const font = opts.pageNumbers || opts.watermark ? await pdf.embedFont(StandardFonts.Helvetica) : null;
  for (let i = 0; i < blobs.length; i++) {
    const ab = await blobs[i].arrayBuffer();
    const img = await pdf.embedJpg(ab);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    if (opts.pageNumbers && font) {
      const txt = `${i + 1} / ${blobs.length}`;
      page.drawText(txt, {
        x: img.width / 2 - 20, y: 20, size: 14, font, color: rgb(0.3, 0.3, 0.3),
      });
    }
    if (opts.watermark && font) {
      page.drawText(opts.watermark, {
        x: 40, y: img.height - 40, size: 28, font,
        color: rgb(0.7, 0.7, 0.7), opacity: 0.4, rotate: { type: "degrees", angle: -30 } as any,
      });
    }
  }
  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
