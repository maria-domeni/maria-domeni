import { addDays, diffDays, formatRelative, weekdayOf } from "./dates";
import { dueQueue, reviewLabel } from "./reviews";
import type { Discipline, ISODate, Lesson, Review, Semester, Settings, Task } from "./types";

export interface NextStep {
  kind: "comecar" | "leitura" | "revisao" | "prazo" | "feynman" | "criar-aula" | "livre";
  eyebrow: string;
  title: string;
  detail: string;
  href: string | null;
  action: string | null;
  /** Para "criar-aula": a disciplina em que a aula será criada */
  disciplineId?: string;
}

export interface DueReviewItem {
  review: Review;
  lesson: Lesson;
  discipline: Discipline | undefined;
  overdueDays: number;
}

export interface TodayModel {
  todayLessons: Lesson[];
  /** Disciplinas com aula hoje pela grade, mas ainda sem aula criada */
  scheduledWithoutLesson: Discipline[];
  dueReviews: DueReviewItem[];
  deadlines: Task[];
  preReading: Lesson[];
  nextStep: NextStep;
}

export interface TodayInput {
  today: ISODate;
  /** "HH:MM" atual, para saber se a aula de hoje já terminou */
  nowTime: string;
  semesters: Semester[];
  disciplines: Discipline[];
  lessons: Lesson[];
  reviews: Review[];
  tasks: Task[];
}

/** Semestre em uso: o escolhido nos Ajustes, senão o que contém hoje, senão o de maior número. */
export function resolveCurrentSemester(
  semesters: Semester[],
  settings: Pick<Settings, "currentSemesterId">,
  today: ISODate,
): Semester | null {
  if (semesters.length === 0) return null;
  const chosen = semesters.find((s) => s.id === settings.currentSemesterId);
  if (chosen) return chosen;
  const containing = semesters.find(
    (s) => s.start && s.end && diffDays(s.start, today) >= 0 && diffDays(today, s.end) >= 0,
  );
  if (containing) return containing;
  return [...semesters].sort((a, b) => b.number - a.number)[0];
}

const DEADLINE_WINDOW_DAYS = 14;
const PRE_READING_WINDOW_DAYS = 7;

export function buildToday(input: TodayInput): TodayModel {
  const { today, nowTime, semesters, disciplines, lessons, reviews, tasks } = input;
  const disciplineById = new Map(disciplines.map((d) => [d.id, d]));
  const semesterById = new Map(semesters.map((s) => [s.id, s]));
  const lessonById = new Map(lessons.map((l) => [l.id, l]));
  const startOf = (l: Lesson) => disciplineById.get(l.disciplineId)?.startTime || "99:99";

  const todayLessons = lessons
    .filter((l) => l.date === today)
    .sort((a, b) => startOf(a).localeCompare(startOf(b)) || a.title.localeCompare(b.title));

  const weekday = weekdayOf(today);
  const scheduledWithoutLesson = disciplines
    .filter((d) => {
      if (d.status !== "andamento" || !d.weekdays.includes(weekday)) return false;
      const semester = semesterById.get(d.semesterId);
      if (semester?.start && diffDays(semester.start, today) < 0) return false;
      if (semester?.end && diffDays(today, semester.end) < 0) return false;
      return !todayLessons.some((l) => l.disciplineId === d.id);
    })
    .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));

  const dueReviews: DueReviewItem[] = [];
  for (const review of dueQueue(reviews, today)) {
    const lesson = lessonById.get(review.lessonId);
    if (!lesson) continue;
    dueReviews.push({
      review,
      lesson,
      discipline: disciplineById.get(lesson.disciplineId),
      overdueDays: diffDays(review.dueDate, today),
    });
  }

  const deadlineLimit = addDays(today, DEADLINE_WINDOW_DAYS);
  const deadlines = tasks
    .filter((t) => !t.done && t.dueDate <= deadlineLimit)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const readingLimit = addDays(today, PRE_READING_WINDOW_DAYS);
  const preReading = lessons
    .filter(
      (l) =>
        l.date !== null &&
        l.date >= today &&
        l.date <= readingLimit &&
        l.reading.trim() !== "" &&
        !l.readingDone,
    )
    .sort((a, b) => (a.date as string).localeCompare(b.date as string));

  const nextStep = pickNextStep({
    today,
    nowTime,
    disciplines,
    disciplineById,
    todayLessons,
    scheduledWithoutLesson,
    dueReviews,
    deadlines,
    preReading,
  });

  return { todayLessons, scheduledWithoutLesson, dueReviews, deadlines, preReading, nextStep };
}

function pickNextStep(ctx: {
  today: ISODate;
  nowTime: string;
  disciplines: Discipline[];
  disciplineById: Map<string, Discipline>;
  todayLessons: Lesson[];
  scheduledWithoutLesson: Discipline[];
  dueReviews: DueReviewItem[];
  deadlines: Task[];
  preReading: Lesson[];
}): NextStep {
  const { today, nowTime, disciplineById } = ctx;
  const nameOf = (id: string | null) => (id ? (disciplineById.get(id)?.name ?? "") : "");

  if (ctx.disciplines.length === 0) {
    return {
      kind: "comecar",
      eyebrow: "Para começar",
      title: "Monte o seu semestre",
      detail: "Crie o semestre atual e cadastre as disciplinas com os dias de aula.",
      href: "#/cadernos",
      action: "Abrir Cadernos",
    };
  }

  // 1. Leitura prévia de uma aula de hoje que ainda não terminou
  const readingToday = ctx.preReading.find((l) => {
    if (l.date !== today) return false;
    const end = disciplineById.get(l.disciplineId)?.endTime;
    return !end || nowTime < end;
  });
  if (readingToday) {
    return {
      kind: "leitura",
      eyebrow: "Antes da aula de hoje",
      title: `Leia para ${readingToday.title || "a aula"}`,
      detail: firstLine(readingToday.reading),
      href: `#/aula/${readingToday.id}/antes`,
      action: "Abrir leitura",
    };
  }

  // 2. Revisões vencidas (a fila já vem com as difíceis primeiro)
  const due = ctx.dueReviews[0];
  if (due) {
    const when = due.overdueDays === 0 ? "vence hoje" : `venceu ${formatRelative(due.review.dueDate, today)}`;
    const more = ctx.dueReviews.length > 1 ? ` · mais ${ctx.dueReviews.length - 1} na fila` : "";
    return {
      kind: "revisao",
      eyebrow: "Revisão espaçada",
      title: `Revise ${due.lesson.title || "a aula"}`,
      detail: `${reviewLabel(due.review)} · ${when}${more}`,
      href: `#/aula/${due.lesson.id}/revisao`,
      action: "Revisar agora",
    };
  }

  // 3. Prazo em até 2 dias (ou já vencido)
  const urgent = ctx.deadlines.find((t) => diffDays(today, t.dueDate) <= 2);
  if (urgent) return deadlineStep(urgent, today, nameOf(urgent.disciplineId));

  // 4. Aula de hoje que já terminou e ainda não tem o Feynman
  const toExplain = ctx.todayLessons.find((l) => {
    if (l.type === "prova" || l.attended === false || l.feynman.trim() !== "") return false;
    const end = disciplineById.get(l.disciplineId)?.endTime;
    return !!end && nowTime >= end;
  });
  if (toExplain) {
    return {
      kind: "feynman",
      eyebrow: "Depois da aula",
      title: `Explique ${toExplain.title || "a aula de hoje"} com as suas palavras`,
      detail: "Técnica Feynman: explique como uma aula e marque o que não conseguiu explicar.",
      href: `#/aula/${toExplain.id}/depois`,
      action: "Fazer agora",
    };
  }

  // 5. Leitura prévia das próximas aulas
  const reading = ctx.preReading[0];
  if (reading) {
    return {
      kind: "leitura",
      eyebrow: `Leitura prévia · aula ${formatRelative(reading.date as string, today)}`,
      title: `Leia para ${reading.title || "a próxima aula"}`,
      detail: firstLine(reading.reading),
      href: `#/aula/${reading.id}/antes`,
      action: "Abrir leitura",
    };
  }

  // 6. Próximo prazo dentro da janela
  const deadline = ctx.deadlines[0];
  if (deadline) return deadlineStep(deadline, today, nameOf(deadline.disciplineId));

  // 7. Aula de hoje ainda não criada
  const toCreate = ctx.scheduledWithoutLesson[0];
  if (toCreate) {
    return {
      kind: "criar-aula",
      eyebrow: "Aula de hoje",
      title: `Abra a aula de ${toCreate.name}`,
      detail: "Crie a página da aula para anotar e ativar as revisões.",
      href: null,
      action: "Criar aula de hoje",
      disciplineId: toCreate.id,
    };
  }

  return {
    kind: "livre",
    eyebrow: "Tudo em dia",
    title: "Nada pendente por agora",
    detail: "Sem revisões vencidas, prazos próximos ou leituras atrasadas.",
    href: null,
    action: null,
  };
}

function deadlineStep(task: Task, today: ISODate, disciplineName: string): NextStep {
  const delta = diffDays(today, task.dueDate);
  const when = delta < 0 ? `venceu ${formatRelative(task.dueDate, today)}` : formatRelative(task.dueDate, today);
  return {
    kind: "prazo",
    eyebrow: delta < 0 ? "Prazo vencido" : "Prazo chegando",
    title: task.title,
    detail: [disciplineName, when].filter(Boolean).join(" · "),
    href: task.disciplineId ? `#/disciplina/${task.disciplineId}` : null,
    action: task.disciplineId ? "Ver disciplina" : null,
  };
}

function firstLine(text: string): string {
  const line = text.trim().split("\n")[0];
  return line.length > 140 ? `${line.slice(0, 137)}…` : line;
}
