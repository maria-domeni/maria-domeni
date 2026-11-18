import { addDays } from "./dates";
import type { Flashcard, ISODate } from "./types";

export type CardAnswer = "errei" | "dificil" | "bom" | "facil";

export const CARD_ANSWER_LABEL: Record<CardAnswer, string> = {
  errei: "Errei",
  dificil: "Difícil",
  bom: "Bom",
  facil: "Fácil",
};

/**
 * Agenda o próximo estudo do cartão (variação simples do SM-2).
 * Errar volta o cartão para amanhã; acertar aumenta o intervalo.
 */
export function scheduleCard(card: Flashcard, answer: CardAnswer, today: ISODate): Flashcard {
  let { interval, ease, reps, lapses } = card;
  if (answer === "errei") {
    lapses += 1;
    reps = 0;
    interval = 1;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    reps += 1;
    if (answer === "dificil") ease = Math.max(1.3, ease - 0.15);
    if (answer === "facil") ease = Math.min(3, ease + 0.15);
    if (reps === 1) interval = answer === "facil" ? 3 : 1;
    else if (reps === 2) interval = answer === "dificil" ? 3 : answer === "facil" ? 7 : 5;
    else interval = Math.round(interval * (answer === "dificil" ? 1.2 : answer === "facil" ? ease * 1.3 : ease));
    interval = Math.min(365, Math.max(1, interval));
  }
  return { ...card, interval, ease: Math.round(ease * 100) / 100, reps, lapses, due: addDays(today, interval) };
}

/** Cartões para hoje: vencidos primeiro, depois os novos. */
export function dueCards(cards: Flashcard[], today: ISODate): Flashcard[] {
  return cards
    .filter((c) => c.due <= today)
    .sort((a, b) => a.due.localeCompare(b.due) || a.createdAt.localeCompare(b.createdAt));
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
