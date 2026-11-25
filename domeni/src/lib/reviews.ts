import { addDays, diffDays } from "./dates";
import type { Difficulty, ISODate, Lesson, Review } from "./types";

export interface ReviewOps {
  put: Review[];
  removeIds: string[];
}

type LessonForPlan = Pick<Lesson, "id" | "date" | "reviewsOn">;

/**
 * Calcula o que precisa mudar nas revisões de uma aula para que elas
 * correspondam à data da aula e aos intervalos configurados.
 * Revisões já feitas nunca são alteradas nem apagadas.
 */
export function planReviews(
  lesson: LessonForPlan,
  existing: Review[],
  intervals: number[],
  newId: () => string,
): ReviewOps {
  const ops: ReviewOps = { put: [], removeIds: [] };
  const mine = existing.filter((r) => r.lessonId === lesson.id);

  if (!lesson.reviewsOn || !lesson.date) {
    for (const r of mine) if (!r.doneAt) ops.removeIds.push(r.id);
    return ops;
  }

  const regular = mine.filter((r) => r.kind === "regular");

  intervals.forEach((interval, step) => {
    const dueDate = addDays(lesson.date as ISODate, interval);
    const current = regular.find((r) => r.step === step);
    if (!current) {
      ops.put.push({ id: newId(), lessonId: lesson.id, step, kind: "regular", dueDate });
    } else if (!current.doneAt && current.dueDate !== dueDate) {
      ops.put.push({ ...current, dueDate });
    }
  });

  for (const r of regular) {
    if (r.step >= intervals.length && !r.doneAt) ops.removeIds.push(r.id);
  }

  return ops;
}

/**
 * Marca uma revisão como feita. Se foi Difícil e o reforço está ligado,
 * agenda um reforço, a não ser que já exista outra revisão da mesma aula
 * chegando dentro desse prazo.
 */
export function completeReview(
  review: Review,
  difficulty: Difficulty,
  today: ISODate,
  siblings: Review[],
  reinforceDays: number,
  newId: () => string,
): ReviewOps {
  const done: Review = { ...review, doneAt: today, difficulty };
  const ops: ReviewOps = { put: [done], removeIds: [] };

  if (difficulty === "dificil" && reinforceDays > 0) {
    const reinforceDate = addDays(today, reinforceDays);
    const alreadyComing = siblings.some(
      (r) =>
        r.id !== review.id &&
        r.lessonId === review.lessonId &&
        !r.doneAt &&
        diffDays(r.dueDate, reinforceDate) >= 0,
    );
    if (!alreadyComing) {
      ops.put.push({
        id: newId(),
        lessonId: review.lessonId,
        step: review.step,
        kind: "reforco",
        dueDate: reinforceDate,
        parentId: review.id,
      });
    }
  }
  return ops;
}

/** Desfaz uma revisão feita e remove o reforço pendente que ela gerou. */
export function undoReview(review: Review, siblings: Review[]): ReviewOps {
  const reopened: Review = { ...review };
  delete reopened.doneAt;
  delete reopened.difficulty;
  return {
    put: [reopened],
    removeIds: siblings.filter((r) => r.parentId === review.id && !r.doneAt).map((r) => r.id),
  };
}

export function reviewLabel(review: Pick<Review, "kind" | "step">): string {
  return review.kind === "reforco" ? "Reforço" : `R${review.step + 1}`;
}

/** Dificuldade atual da aula: a da revisão feita mais recentemente. */
export function lessonDifficulty(reviews: Review[]): Difficulty | null {
  let latest: Review | null = null;
  for (const r of reviews) {
    if (!r.doneAt || !r.difficulty) continue;
    if (
      !latest ||
      r.doneAt > (latest.doneAt as string) ||
      (r.doneAt === latest.doneAt && r.step >= latest.step)
    ) {
      latest = r;
    }
  }
  return latest?.difficulty ?? null;
}

const DIFFICULTY_RANK: Record<string, number> = { dificil: 0, novo: 1, medio: 2, facil: 3 };

/**
 * Fila de revisões pendentes até hoje. Ordem: aulas marcadas como Difícil
 * primeiro, depois as que nunca foram revisadas, Médio e Fácil; dentro de
 * cada grupo, a mais atrasada primeiro.
 */
export function dueQueue(reviews: Review[], today: ISODate): Review[] {
  const byLesson = new Map<string, Review[]>();
  for (const r of reviews) {
    const list = byLesson.get(r.lessonId);
    if (list) list.push(r);
    else byLesson.set(r.lessonId, [r]);
  }
  const rank = (r: Review) =>
    DIFFICULTY_RANK[lessonDifficulty(byLesson.get(r.lessonId) ?? []) ?? "novo"];

  return reviews
    .filter((r) => !r.doneAt && diffDays(r.dueDate, today) >= 0)
    .sort(
      (a, b) =>
        rank(a) - rank(b) || a.dueDate.localeCompare(b.dueDate) || a.step - b.step,
    );
}

/** Orientação de cada revisão, seguindo o método de estudo de quem usa o app. */
export function reviewGuidance(review: Pick<Review, "kind" | "step">): string {
  if (review.kind === "reforco") {
    return "Volte ao material só nas lacunas e explique de novo, em voz alta ou por escrito.";
  }
  if (review.step === 0) {
    return "Explique o conteúdo como uma aula (Feynman) e marque as lacunas.";
  }
  if (review.step === 1) {
    return "Refaça o mapa mental de memória e compare com o original.";
  }
  return "Responda às perguntas de prova sem olhar o material.";
}
