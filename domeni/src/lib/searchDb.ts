"use client";

import { db } from "./db";
import { formatShort } from "./dates";
import { fold, htmlToText, keywordsOf, scoreText, snippetAround, type SearchHit } from "./search";

/**
 * Procura nas anotações de todas as aulas (de todos os semestres), nos livros
 * e artigos da biblioteca, nos materiais e relatórios. Roda no aparelho.
 */
export async function searchEverything(query: string, limit = 24): Promise<{ terms: string[]; hits: SearchHit[] }> {
  const typed = fold(query).trim();
  const terms = keywordsOf(query);
  if (terms.length === 0 && typed.length >= 2) terms.push(typed);
  if (terms.length === 0) return { terms, hits: [] };

  const [lessons, disciplines, semesters, books, texts, outputs, reports, cards] = await Promise.all([
    db.lessons.toArray(),
    db.disciplines.toArray(),
    db.semesters.toArray(),
    db.books.toArray(),
    db.bookTexts.toArray(),
    db.aiOutputs.toArray(),
    db.reports.toArray(),
    db.cards.toArray(),
  ]);
  const disciplineById = new Map(disciplines.map((d) => [d.id, d]));
  const semesterById = new Map(semesters.map((s) => [s.id, s]));
  const hits: SearchHit[] = [];

  for (const lesson of lessons) {
    const body = [
      lesson.title,
      htmlToText(lesson.notes),
      lesson.transcript,
      lesson.reading,
      lesson.doubts,
      lesson.feynman,
      lesson.summary,
      lesson.questions,
    ].join("\n");
    const score = scoreText(body, terms) + (scoreText(lesson.title, terms) > 0 ? 15 : 0);
    if (score === 0) continue;
    const discipline = disciplineById.get(lesson.disciplineId);
    const semester = discipline ? semesterById.get(discipline.semesterId) : undefined;
    hits.push({
      kind: "aula",
      id: lesson.id,
      title: lesson.title || `Aula ${lesson.number ?? ""}`.trim(),
      subtitle: [discipline?.name, semester ? `${semester.number}º semestre` : null, lesson.date ? formatShort(lesson.date) : null]
        .filter(Boolean)
        .join(" · "),
      snippet: snippetAround(body, terms) ?? "",
      href: `#/aula/${lesson.id}`,
      score,
    });
  }

  const textByBook = new Map(texts.map((t) => [t.bookId, t.pages]));
  for (const book of books) {
    const meta = [book.title, book.author, book.tags.join(" "), book.notes].join(" ");
    let best: { page: number; score: number; snippet: string } | null = null;
    let total = scoreText(meta, terms) * 2;
    const pages = textByBook.get(book.id) ?? [];
    pages.forEach((text, index) => {
      const score = scoreText(text, terms);
      if (score === 0) return;
      total += score;
      if (!best || score > best.score) best = { page: index + 1, score, snippet: snippetAround(text, terms) ?? "" };
    });
    if (total === 0) continue;
    const found = best as { page: number; score: number; snippet: string } | null;
    hits.push({
      kind: "livro",
      id: book.id,
      title: book.title,
      subtitle: [book.author, found ? `página ${found.page}` : null].filter(Boolean).join(" · "),
      snippet: found?.snippet ?? snippetAround(meta, terms) ?? "",
      href: found ? `#/biblioteca/${book.id}/${found.page}` : `#/biblioteca/${book.id}`,
      score: total,
      page: found?.page,
    });
  }

  for (const output of outputs) {
    const score = scoreText(`${output.title}\n${output.content}`, terms);
    if (score === 0) continue;
    hits.push({
      kind: "material",
      id: output.id,
      title: output.title,
      subtitle: disciplineById.get(output.disciplineId ?? "")?.name ?? "Material",
      snippet: snippetAround(output.content, terms) ?? "",
      href: output.disciplineId ? `#/disciplina/${output.disciplineId}/materiais` : "#/estudar",
      score,
    });
  }

  for (const report of reports) {
    const score = scoreText(`${report.title}\n${report.content}`, terms);
    if (score === 0) continue;
    hits.push({
      kind: "relatorio",
      id: report.id,
      title: report.title,
      subtitle: "Relatório de estágio",
      snippet: snippetAround(report.content, terms) ?? "",
      href: report.internshipId ? `#/estagio/${report.internshipId}` : "#/estagio",
      score,
    });
  }

  for (const card of cards) {
    const score = scoreText(`${card.front}\n${card.back}`, terms);
    if (score === 0) continue;
    hits.push({
      kind: "cartao",
      id: card.id,
      title: card.front,
      subtitle: `Flashcard · ${disciplineById.get(card.disciplineId ?? "")?.name ?? "geral"}`,
      snippet: card.back.slice(0, 160),
      href: card.disciplineId ? `#/estudar/${card.disciplineId}` : "#/estudar",
      score,
    });
  }

  hits.sort((a, b) => b.score - a.score);
  return { terms, hits: hits.slice(0, limit) };
}
