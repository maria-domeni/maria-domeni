"use client";

import { strokePath, PAGE_WIDTH } from "@/components/editor/ink";
import { db } from "./db";
import { formatLong } from "./dates";
import { bytesToBase64 } from "./images";
import type { Discipline, Lesson, PageLayer } from "./types";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function imageDataUrl(id: string): Promise<string | null> {
  const image = await db.images.get(id);
  if (!image) return null;
  return `data:${image.type};base64,${bytesToBase64(image.data)}`;
}

/**
 * Gera um arquivo HTML independente com a página da aula (texto, imagens,
 * adesivos, post-its e o que foi escrito com a caneta). Abre em qualquer
 * navegador e pode ser impresso ou salvo como PDF.
 */
export async function lessonToHtml(lesson: Lesson, discipline: Discipline, layer: PageLayer | undefined): Promise<string> {
  let notes = lesson.notes || "<p></p>";
  const ids = [...notes.matchAll(/data-image-id="([^"]+)"/g)].map((m) => m[1]);
  for (const id of new Set(ids)) {
    const url = await imageDataUrl(id);
    if (url) notes = notes.split(`data-image-id="${id}"`).join(`data-image-id="${id}" src="${url}"`);
  }

  const strokes = layer?.strokes ?? [];
  const items = layer?.items ?? [];
  let bottom = 1000;
  for (const s of strokes) for (let i = 1; i < s.points.length; i += 3) bottom = Math.max(bottom, s.points[i] + 80);
  for (const item of items) bottom = Math.max(bottom, item.y + item.w + 80);

  const itemHtml: string[] = [];
  for (const item of [...items].sort((a, b) => a.z - b.z)) {
    const style = `left:${item.x}px;top:${item.y}px;width:${item.w}px;transform:rotate(${item.rotation}deg)`;
    if (item.kind === "imagem" && item.imageId) {
      const url = await imageDataUrl(item.imageId);
      if (url) itemHtml.push(`<img class="item" style="${style}" src="${url}" alt="">`);
    } else if (item.kind === "adesivo") {
      const value = item.value ?? "";
      const label = value.startsWith("txt:") ? `<span class="tag">${escapeHtml(value.slice(4))}</span>` : escapeHtml(value);
      itemHtml.push(`<div class="item sticker" style="${style};font-size:${item.w * 0.8}px">${label}</div>`);
    } else if (item.kind === "postit") {
      itemHtml.push(
        `<div class="item postit" style="${style};background:${escapeHtml(item.color ?? "#fff3a8")};min-height:${item.w * 0.9}px">${escapeHtml(item.text ?? "").replace(/\n/g, "<br>")}</div>`,
      );
    }
  }
  const paths = strokes
    .map((s) => `<path d="${strokePath(s, true)}" fill="${escapeHtml(s.color)}"${s.tool === "marca" ? ' opacity="0.42"' : ""}/>`)
    .join("");

  const title = escapeHtml(lesson.title || "Aula");
  const meta = escapeHtml([discipline.name, lesson.date ? formatLong(lesson.date) : ""].filter(Boolean).join(" · "));
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
body{margin:0;background:#f4eef1;font-family:-apple-system,system-ui,"Segoe UI",Roboto,sans-serif;color:#2a2230}
.page{position:relative;width:${PAGE_WIDTH}px;min-height:${bottom}px;margin:24px auto;background:#fffefc;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);
background-image:linear-gradient(rgba(120,140,200,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(120,140,200,.18) 1px,transparent 1px);background-size:28px 28px}
.text{position:relative;padding:52px 64px 40px;font-size:17px;line-height:1.6}
.head{width:${PAGE_WIDTH}px;margin:24px auto 0;padding:0 8px;box-sizing:border-box}.head h1{margin:0;font-size:32px}.head p{margin:4px 0 0;color:#7a5d69;font-weight:600}
.text img{max-width:100%;border-radius:12px;display:block;margin:12px auto}
.text img[data-size="p"]{width:34%}.text img[data-size="m"]{width:62%}
mark{border-radius:3px;padding:0 2px}blockquote{border-left:4px solid #d14d82;margin:0;padding:6px 14px;background:#fbeef2;border-radius:0 10px 10px 0}
.item{position:absolute;transform-origin:center}.item.sticker{line-height:1;text-align:center}
.tag{display:inline-block;font-size:.55em;padding:.15em .5em;border-radius:.5em;background:#ffd1e1;font-weight:700}
.postit{padding:12px;border-radius:3px 3px 14px 3px;box-shadow:0 8px 16px -8px rgba(0,0,0,.4);font-size:20px;line-height:1.25;box-sizing:border-box}
svg{position:absolute;inset:0;pointer-events:none}
@media print{body{background:#fff}.page{margin:0;box-shadow:none;zoom:.85}}
</style></head><body>
<div class="head"><h1>${title}</h1><p>${meta}</p></div>
<div class="page"><div class="text">${notes}</div>${itemHtml.join("")}
<svg width="${PAGE_WIDTH}" height="${bottom}" viewBox="0 0 ${PAGE_WIDTH} ${bottom}">${paths}</svg></div>
${lesson.transcript ? `<div class="page" style="min-height:0"><div class="text"><h2>Transcrição</h2><p>${escapeHtml(lesson.transcript).replace(/\n/g, "<br>")}</p></div></div>` : ""}
</body></html>`;
}

export function safeFileName(text: string): string {
  return (text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 60) || "aula").replace(/\s+/g, "-");
}
