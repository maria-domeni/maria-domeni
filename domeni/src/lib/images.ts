import { db } from "./db";
import { newId, nowStamp } from "./ids";
import type { ImageRecord } from "./types";

export class ImageError extends Error {}

/** Tipos aceitos. SVG fica de fora de propósito: pode carregar código. */
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";

const MAX_INPUT_BYTES = 40 * 1024 * 1024;
const KEEP_ORIGINAL_BYTES = 450 * 1024;

export interface SaveImageOptions {
  /** Maior lado da imagem guardada, em pixels */
  maxEdge: number;
  quality?: number;
}

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError("Não foi possível abrir esta imagem. Use JPG, PNG ou WebP.");
  }
}

/**
 * Guarda uma imagem no aparelho e devolve o id. Imagens grandes são reduzidas
 * e gravadas em JPEG; as pequenas são mantidas como estão.
 */
export async function saveImage(file: Blob, options: SaveImageOptions): Promise<string> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    throw new ImageError("Este arquivo não é uma imagem aceita. Use JPG, PNG ou WebP.");
  }
  if (file.size > MAX_INPUT_BYTES) throw new ImageError("Esta imagem é grande demais (limite de 40 MB).");

  const bitmap = await decode(file);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const fits = longest <= options.maxEdge;

    let blob: Blob = file;
    let width = bitmap.width;
    let height = bitmap.height;

    if (!fits || file.size > KEEP_ORIGINAL_BYTES || !IMAGE_TYPES.includes(file.type)) {
      const scale = Math.min(1, options.maxEdge / longest);
      width = Math.max(1, Math.round(bitmap.width * scale));
      height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new ImageError("Não foi possível preparar esta imagem.");
      // JPEG não tem transparência: fundo branco em vez de preto
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      const encoded = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", options.quality ?? 0.86),
      );
      if (!encoded) throw new ImageError("Não foi possível preparar esta imagem.");
      blob = encoded;
    }

    const record: ImageRecord = {
      id: newId(),
      type: blob.type || "image/jpeg",
      data: await blob.arrayBuffer(),
      width,
      height,
      createdAt: nowStamp(),
    };
    await db.images.add(record);
    return record.id;
  } finally {
    bitmap.close();
  }
}

/** Ids de imagem citados no HTML das anotações. */
export function imageIdsInHtml(html: string): string[] {
  const ids: string[] = [];
  const pattern = /data-image-id="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) ids.push(match[1]);
  return ids;
}

/** Todos os ids de imagem ainda em uso no app. */
export async function referencedImageIds(): Promise<Set<string>> {
  const used = new Set<string>();
  const settings = (await db.settings.get("app"))?.value;
  if (settings?.avatarImageId) used.add(settings.avatarImageId);
  await db.semesters.each((s) => {
    if (s.cover?.imageId) used.add(s.cover.imageId);
  });
  await db.disciplines.each((d) => {
    if (d.cover?.imageId) used.add(d.cover.imageId);
  });
  await db.lessons.each((lesson) => {
    for (const id of imageIdsInHtml(lesson.notes)) used.add(id);
  });
  await db.pages.each((page) => {
    for (const item of page.items) if (item.imageId) used.add(item.imageId);
  });
  await db.books.each((book) => {
    if (book.coverImageId) used.add(book.coverImageId);
  });
  return used;
}

/** Apaga imagens que não são mais usadas em lugar nenhum. Devolve quantas apagou. */
export async function pruneImages(graceMs = 10 * 60 * 1000): Promise<number> {
  return db.transaction("rw", [db.images, db.settings, db.semesters, db.disciplines, db.lessons, db.pages, db.books], async () => {
    const used = await referencedImageIds();
    const cutoff = Date.now() - graceMs;
    const stale: string[] = [];
    await db.images.each((image) => {
      // imagens recém-adicionadas podem ainda não ter sido gravadas na anotação
      if (!used.has(image.id) && Date.parse(image.createdAt) < cutoff) stale.push(image.id);
    });
    await db.images.bulkDelete(stale);
    return stale.length;
  });
}

/* ---------- conversão para o backup ---------- */

export function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
