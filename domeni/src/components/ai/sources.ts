"use client";

import { db } from "@/lib/db";
import { formatShort } from "@/lib/dates";
import { fold, htmlToText } from "@/lib/search";
import type { Discipline, Lesson } from "@/lib/types";

/** Limite de texto enviado à IA por pedido (evita gastar demais). */
export const MAX_SOURCE_CHARS = 60_000;

export interface AiSource {
  title: string;
  date: string;
  text: string;
}

/** Monta as fontes (anotações e transcrições) das aulas escolhidas. */
export function lessonSources(lessons: Lesson[], includeTranscript = true): AiSource[] {
  const sources: AiSource[] = [];
  let used = 0;
  for (const lesson of lessons) {
    const parts = [
      htmlToText(lesson.notes),
      lesson.reading ? `Leitura prévia: ${lesson.reading}` : "",
      lesson.doubts ? `Dúvidas anotadas: ${lesson.doubts}` : "",
      lesson.feynman ? `Explicação com minhas palavras: ${lesson.feynman}` : "",
      lesson.summary ? `Resumo meu: ${lesson.summary}` : "",
      includeTranscript && lesson.transcript ? `Transcrição da aula:\n${lesson.transcript}` : "",
    ].filter(Boolean);
    let text = parts.join("\n\n").trim();
    if (!text) continue;
    const room = MAX_SOURCE_CHARS - used;
    if (room <= 200) break;
    if (text.length > room) text = `${text.slice(0, room)}\n[…texto cortado para caber no limite]`;
    used += text.length;
    sources.push({
      title: lesson.title || `Aula ${lesson.number ?? ""}`.trim(),
      date: lesson.date ? formatShort(lesson.date) : "",
      text,
    });
  }
  return sources;
}

export function disciplineContext(discipline: Discipline | null | undefined) {
  if (!discipline) return null;
  return { name: discipline.name, professors: discipline.professors, ementa: discipline.ementa.slice(0, 3000) };
}

/** Trechos da biblioteca que falam do assunto (busca local). */
export async function libraryExcerpts(terms: string[], limit = 6): Promise<AiSource[]> {
  if (terms.length === 0) return [];
  const [books, texts] = await Promise.all([db.books.toArray(), db.bookTexts.toArray()]);
  const byId = new Map(books.map((b) => [b.id, b]));
  const out: { score: number; source: AiSource }[] = [];
  for (const entry of texts) {
    const book = byId.get(entry.bookId);
    if (!book) continue;
    entry.pages.forEach((page, index) => {
      const lower = fold(page);
      const score = terms.reduce((s, t) => s + (lower.includes(t) ? 1 : 0), 0);
      if (score > 0) {
        out.push({
          score,
          source: { title: `${book.title}${book.author ? `, ${book.author}` : ""}, p. ${index + 1}`, date: "", text: page.slice(0, 2500) },
        });
      }
    });
  }
  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((o) => o.source);
}
