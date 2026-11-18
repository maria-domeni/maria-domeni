"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";

/** Carrega o pdf.js só quando a biblioteca precisa (ele é grande). */
async function pdfjs() {
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
  return lib;
}

export async function openPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const lib = await pdfjs();
  return lib.getDocument({
    data: new Uint8Array(data.slice(0)),
    wasmUrl: "/vendor/pdfjs/wasm/",
    standardFontDataUrl: "/vendor/pdfjs/standard_fonts/",
    enableXfa: false,
  }).promise;
}

/** Desenha uma página num canvas com a largura pedida (em pixels CSS). */
export async function renderPage(doc: PDFDocumentProxy, pageNumber: number, canvas: HTMLCanvasElement, cssWidth: number): Promise<void> {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const ratio = Math.min(2.5, window.devicePixelRatio || 1);
  const viewport = page.getViewport({ scale: (cssWidth / base.width) * ratio });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
  await page.render({ canvas, viewport }).promise;
}

/** Texto de cada página (para a busca do personagem). */
export async function extractText(doc: PDFDocumentProxy, onProgress?: (done: number, total: number) => void): Promise<string[]> {
  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : ""))
      .join("")
      .replace(/[ \t]+/g, " ")
      .trim();
    pages.push(text);
    onProgress?.(n, doc.numPages);
  }
  return pages;
}

/** Imagem da primeira página, para a capa do livro na estante. */
export async function coverBlob(doc: PDFDocumentProxy): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  await renderPage(doc, 1, canvas, 320);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
}

/** Título e autor gravados no PDF, quando existem. */
export async function pdfInfo(doc: PDFDocumentProxy): Promise<{ title: string; author: string }> {
  try {
    const meta = await doc.getMetadata();
    const info = meta.info as { Title?: string; Author?: string };
    return { title: (info.Title ?? "").trim(), author: (info.Author ?? "").trim() };
  } catch {
    return { title: "", author: "" };
  }
}

/** Fecha o documento e libera o leitor em segundo plano. */
export async function closePdf(doc: PDFDocumentProxy | null | undefined): Promise<void> {
  try {
    await doc?.loadingTask.destroy();
  } catch {
    // já fechado
  }
}
