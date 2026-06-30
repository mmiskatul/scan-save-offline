// Canvas-based image filters. All run locally in the browser.
export type FilterKey =
  | "original"
  | "autoEnhance"
  | "bw"
  | "highContrast"
  | "grayscale"
  | "lighten"
  | "darken"
  | "sharpText"
  | "shadowRemove"
  | "receipt"
  | "invoice"
  | "idCard"
  | "handwriting"
  | "lowLight"
  | "softClean"
  | "strongClean"
  | "colorDoc"
  | "blueInk"
  | "pencil"
  | "printText";

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "original", label: "Original" },
  { key: "autoEnhance", label: "Auto Enhance" },
  { key: "bw", label: "B&W" },
  { key: "highContrast", label: "High Contrast" },
  { key: "grayscale", label: "Grayscale" },
  { key: "lighten", label: "Lighten" },
  { key: "darken", label: "Darken" },
  { key: "sharpText", label: "Sharp Text" },
  { key: "shadowRemove", label: "Shadow Remove" },
  { key: "receipt", label: "Receipt" },
  { key: "invoice", label: "Invoice" },
  { key: "idCard", label: "ID Card" },
  { key: "handwriting", label: "Handwriting" },
  { key: "lowLight", label: "Low Light" },
  { key: "softClean", label: "Soft Clean" },
  { key: "strongClean", label: "Strong Clean" },
  { key: "colorDoc", label: "Color Doc" },
  { key: "blueInk", label: "Blue Ink" },
  { key: "pencil", label: "Pencil Note" },
  { key: "printText", label: "Print Text" },
];

function adjust(d: Uint8ClampedArray, contrast: number, brightness: number) {
  const c = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.max(0, Math.min(255, c * (d[i] - 128) + 128 + brightness));
    d[i + 1] = Math.max(0, Math.min(255, c * (d[i + 1] - 128) + 128 + brightness));
    d[i + 2] = Math.max(0, Math.min(255, c * (d[i + 2] - 128) + 128 + brightness));
  }
}
function toGray(d: Uint8ClampedArray) {
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = g;
  }
}
function threshold(d: Uint8ClampedArray, t = 160) {
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = g > t ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
}
function boostChannel(d: Uint8ClampedArray, ch: 0 | 1 | 2, factor: number) {
  for (let i = 0; i < d.length; i += 4) {
    d[i + ch] = Math.min(255, d[i + ch] * factor);
  }
}
// Simple local-mean shadow removal: divide by box-blurred luminance.
function shadowRemove(img: ImageData) {
  const { data, width, height } = img;
  const lum = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lum[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  // box blur with large radius
  const r = Math.max(8, Math.floor(Math.min(width, height) / 24));
  const blurred = boxBlur(lum, width, height, r);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const ratio = lum[p] / Math.max(1, blurred[p]);
    const v = Math.min(255, ratio * 230);
    data[i] = data[i + 1] = data[i + 2] = v;
  }
}
function boxBlur(src: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / (2 * r + 1);
      const add = src[y * w + Math.min(w - 1, x + r + 1)] ?? src[y * w + w - 1];
      const sub = src[y * w + Math.max(0, x - r)] ?? src[y * w];
      sum += add - sub;
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / (2 * r + 1);
      const add = tmp[Math.min(h - 1, y + r + 1) * w + x] ?? tmp[(h - 1) * w + x];
      const sub = tmp[Math.max(0, y - r) * w + x] ?? tmp[x];
      sum += add - sub;
    }
  }
  return out;
}
function sharpen(ctx: CanvasRenderingContext2D, w: number, h: number, amount = 0.6) {
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let ky = -1; ky <= 1; ky++)
          for (let kx = -1; kx <= 1; kx++) {
            const i = ((y + ky) * w + (x + kx)) * 4 + c;
            s += src.data[i] * k[(ky + 1) * 3 + (kx + 1)];
          }
        const i0 = (y * w + x) * 4 + c;
        out.data[i0] = Math.max(0, Math.min(255, src.data[i0] * (1 - amount) + s * amount));
      }
      out.data[(y * w + x) * 4 + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

export function applyFilter(canvas: HTMLCanvasElement, filter: FilterKey) {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width, h = canvas.height;
  if (filter === "original") return;
  if (filter === "shadowRemove" || filter === "receipt" || filter === "invoice" || filter === "printText") {
    const img = ctx.getImageData(0, 0, w, h);
    shadowRemove(img);
    ctx.putImageData(img, 0, 0);
    if (filter === "receipt" || filter === "printText") {
      const img2 = ctx.getImageData(0, 0, w, h);
      adjust(img2.data, 50, 0);
      ctx.putImageData(img2, 0, 0);
    }
    if (filter === "invoice") sharpen(ctx, w, h, 0.4);
    return;
  }
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  switch (filter) {
    case "autoEnhance": adjust(d, 30, 10); break;
    case "bw": adjust(d, 20, 5); threshold(d, 150); break;
    case "highContrast": adjust(d, 60, 0); break;
    case "grayscale": toGray(d); break;
    case "lighten": adjust(d, 0, 30); break;
    case "darken": adjust(d, 0, -30); break;
    case "sharpText": toGray(d); adjust(d, 50, 10); break;
    case "idCard": adjust(d, 20, 15); break;
    case "handwriting": toGray(d); adjust(d, 40, 20); break;
    case "lowLight": adjust(d, 25, 45); break;
    case "softClean": adjust(d, 15, 10); break;
    case "strongClean": adjust(d, 40, 15); break;
    case "colorDoc": adjust(d, 25, 8); break;
    case "blueInk": boostChannel(d, 2, 1.25); adjust(d, 20, 5); break;
    case "pencil": toGray(d); adjust(d, 35, 25); break;
  }
  ctx.putImageData(img, 0, 0);
  if (filter === "sharpText" || filter === "handwriting") sharpen(ctx, w, h, 0.5);
}

export async function blobFromCanvas(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", quality));
}

export async function loadImageToCanvas(src: Blob | string, maxDim = 2000): Promise<HTMLCanvasElement> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Failed to load image"));
    img.src = url;
  });
  let w = img.naturalWidth, h = img.naturalHeight;
  if (Math.max(w, h) > maxDim) {
    const s = maxDim / Math.max(w, h);
    w = Math.round(w * s); h = Math.round(h * s);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  if (typeof src !== "string") URL.revokeObjectURL(url);
  return canvas;
}
