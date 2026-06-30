// Offline OCR via tesseract.js. Language data is fetched once and cached.
import { createWorker, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng");
  }
  return workerPromise;
}

export async function extractText(blob: Blob): Promise<string> {
  const w = await getWorker();
  const url = URL.createObjectURL(blob);
  try {
    const { data } = await w.recognize(url);
    return data.text.trim();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function terminateOcr() {
  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
  }
}
