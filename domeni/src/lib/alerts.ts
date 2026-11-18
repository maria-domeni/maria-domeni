import { absenceLimitOf, classesOn, summarizeAbsences, summarizeGrades, formatGrade } from "./academics";
import { addDays, diffDays, formatRelative } from "./dates";
import { dueQueue } from "./reviews";
import type {
  Attendance,
  AvatarTone,
  Book,
  Discipline,
  Flashcard,
  Grade,
  HourEntry,
  ISODate,
  Lesson,
  Review,
  Semester,
  Settings,
  Task,
} from "./types";

/**
 * O "cérebro" do personagem: lê os dados do aparelho e monta os avisos.
 * Tudo é calculado no próprio aparelho, sem internet e sem IA.
 */

export type AlertLevel = "urgente" | "importante" | "lembrete" | "parabens";

export interface Alert {
  id: string;
  level: AlertLevel;
  emoji: string;
  text: string;
  href: string | null;
  action: string | null;
}

export type Mood = "feliz" | "preocupada" | "animada" | "sonolenta";

export interface AlertInput {
  today: ISODate;
  nowTime: string;
  settings: Settings;
  semesters: Semester[];
  disciplines: Discipline[];
  lessons: Lesson[];
  reviews: Review[];
  tasks: Task[];
  attendance: Attendance[];
  grades: Grade[];
  books: Book[];
  cards: Flashcard[];
  hours: HourEntry[];
  currentSemester: Semester | null;
}

const LEVEL_ORDER: Record<AlertLevel, number> = { urgente: 0, importante: 1, lembrete: 2, parabens: 3 };

export function buildAlerts(input: AlertInput): Alert[] {
  const { today, settings, disciplines } = input;
  const alerts: Alert[] = [];
  const active = disciplines.filter(
    (d) => d.status === "andamento" && (!input.currentSemester || d.semesterId === input.currentSemester.id),
  );
  const tomorrow = addDays(today, 1);
  const classesTomorrow = classesOn(tomorrow, active, input.semesters);
  const classesToday = classesOn(today, active, input.semesters);

  // Faltas
  for (const discipline of active) {
    const summary = summarizeAbsences(discipline, input.attendance, settings);
    const hasTomorrow = classesTomorrow.some((c) => c.discipline.id === discipline.id);
    if (summary.level === "estourou") {
      alerts.push({
        id: `faltas-estourou-${discipline.id}`,
        level: "urgente",
        emoji: "🚨",
        text: `Você passou do limite de faltas em ${discipline.name} (${summary.used} de ${summary.limit}). Fale com a coordenação.`,
        href: `#/disciplina/${discipline.id}/faltas`,
        action: "Ver faltas",
      });
    } else if (summary.level === "risco") {
      alerts.push({
        id: `faltas-risco-${discipline.id}`,
        level: "urgente",
        emoji: "⚠️",
        text: hasTomorrow
          ? `Amanhã tem ${discipline.name} e você não pode faltar: restam só ${summary.remaining} aulas de falta.`
          : `Em ${discipline.name} restam só ${summary.remaining} aulas de falta. Menos de um dia inteiro!`,
        href: `#/disciplina/${discipline.id}/faltas`,
        action: "Ver faltas",
      });
    } else if (summary.level === "atencao") {
      alerts.push({
        id: `faltas-atencao-${discipline.id}`,
        level: hasTomorrow ? "importante" : "lembrete",
        emoji: "🗓️",
        text: `Você já usou ${summary.used} de ${summary.limit} faltas em ${discipline.name}. Ainda dá para faltar ${summary.remainingDays} ${summary.remainingDays === 1 ? "dia" : "dias"} de aula.`,
        href: `#/disciplina/${discipline.id}/faltas`,
        action: "Ver faltas",
      });
    }
  }
  if (settings.defaultAbsenceLimit === null && active.some((d) => d.kind === "regular" && absenceLimitOf(d, settings) === null)) {
    alerts.push({
      id: "regra-faltas",
      level: "lembrete",
      emoji: "⚙️",
      text: "Me conte o limite de faltas da sua faculdade para eu poder te avisar antes de estourar.",
      href: "#/ajustes/regras",
      action: "Configurar",
    });
  }

  // Notas
  for (const discipline of active) {
    const summary = summarizeGrades(discipline, input.grades, settings);
    if (summary.status === "precisa" && summary.needed !== null) {
      alerts.push({
        id: `nota-${discipline.id}`,
        level: "importante",
        emoji: "🎯",
        text: `Para passar em ${discipline.name} você precisa de média ${formatGrade(summary.needed)} nas próximas avaliações.`,
        href: `#/disciplina/${discipline.id}/notas`,
        action: "Ver notas",
      });
    } else if (summary.status === "impossivel") {
      alerts.push({
        id: `nota-impossivel-${discipline.id}`,
        level: "urgente",
        emoji: "🆘",
        text: `Pelas notas lançadas, ${discipline.name} não fecha a média. Vale conversar com o professor sobre recuperação.`,
        href: `#/disciplina/${discipline.id}/notas`,
        action: "Ver notas",
      });
    } else if (summary.status === "sem-regra") {
      alerts.push({
        id: "regra-nota",
        level: "lembrete",
        emoji: "⚙️",
        text: "Qual é a média para passar na sua faculdade? Configure e eu calculo quanto você precisa tirar.",
        href: "#/ajustes/regras",
        action: "Configurar",
      });
    }
  }

  // Provas e entregas
  for (const task of input.tasks) {
    if (task.done) continue;
    const delta = diffDays(today, task.dueDate);
    const name = disciplines.find((d) => d.id === task.disciplineId)?.name;
    const label = name ? `${task.title} (${name})` : task.title;
    if (delta < 0 && delta >= -14) {
      alerts.push({
        id: `prazo-vencido-${task.id}`,
        level: "urgente",
        emoji: "⏰",
        text: `${label} venceu ${formatRelative(task.dueDate, today)}. Já entregou? Marque como feito.`,
        href: "#/agenda",
        action: "Abrir agenda",
      });
    } else if (task.type === "prova" && delta >= 0 && delta <= 10) {
      alerts.push({
        id: `prova-${task.id}`,
        level: delta <= 3 ? "urgente" : "importante",
        emoji: "📝",
        text:
          delta === 0
            ? `Hoje é dia de ${label}. Você consegue!`
            : `${label} ${formatRelative(task.dueDate, today)}. ${delta <= 3 ? "Hora de revisar firme." : "Que tal começar a revisar?"}`,
        href: task.disciplineId ? `#/estudar/${task.disciplineId}` : "#/agenda",
        action: "Estudar",
      });
    } else if (delta >= 0 && delta <= 3) {
      alerts.push({
        id: `prazo-${task.id}`,
        level: delta <= 1 ? "urgente" : "importante",
        emoji: task.type === "lembrete" ? "🔔" : "📎",
        text: `${label}: ${formatRelative(task.dueDate, today)}${task.time ? ` às ${task.time}` : ""}.`,
        href: "#/agenda",
        action: "Abrir agenda",
      });
    }
  }

  // Revisões espaçadas
  const due = dueQueue(input.reviews, today);
  if (due.length > 0) {
    const lesson = input.lessons.find((l) => l.id === due[0].lessonId);
    alerts.push({
      id: "revisoes",
      level: "importante",
      emoji: "🔁",
      text:
        due.length === 1
          ? `Hoje é dia de revisar ${lesson?.title || "uma aula"}.`
          : `Você tem ${due.length} revisões para hoje, começando por ${lesson?.title || "uma aula"}.`,
      href: lesson ? `#/aula/${lesson.id}/revisao` : "#/revisoes",
      action: "Revisar",
    });
  }

  // Flashcards
  const dueCardCount = input.cards.filter((c) => c.due <= today).length;
  if (dueCardCount > 0) {
    alerts.push({
      id: "flashcards",
      level: "lembrete",
      emoji: "🃏",
      text: `${dueCardCount} ${dueCardCount === 1 ? "flashcard está esperando" : "flashcards estão esperando"} por você hoje.`,
      href: "#/estudar",
      action: "Estudar",
    });
  }

  // Leituras
  for (const book of input.books) {
    if (book.status !== "quero-ler" || !book.startBy) continue;
    const delta = diffDays(today, book.startBy);
    if (delta <= 0) {
      alerts.push({
        id: `leitura-${book.id}`,
        level: "lembrete",
        emoji: "📚",
        text: `Hora de começar a ler "${book.title}".`,
        href: `#/biblioteca/${book.id}`,
        action: "Abrir livro",
      });
    }
  }
  for (const lesson of input.lessons) {
    if (!lesson.date || lesson.readingDone || lesson.reading.trim() === "") continue;
    const delta = diffDays(today, lesson.date);
    if (delta >= 0 && delta <= 2) {
      alerts.push({
        id: `pre-leitura-${lesson.id}`,
        level: "lembrete",
        emoji: "📖",
        text: `Tem leitura para a aula ${formatRelative(lesson.date, today)}: ${lesson.title || "aula"}.`,
        href: `#/aula/${lesson.id}`,
        action: "Ver leitura",
      });
    }
  }

  // Horas complementares e de extensão
  const semesterRatio = input.currentSemester
    ? Math.min(1, input.currentSemester.number / Math.max(1, settings.totalSemesters))
    : null;
  for (const [kind, required, label] of [
    ["complementar", settings.requiredComplementary, "complementares"],
    ["extensao", settings.requiredExtension, "de extensão"],
  ] as const) {
    if (!required) continue;
    const done = input.hours.filter((h) => h.kind === kind).reduce((s, h) => s + h.hours, 0);
    if (done >= required) continue;
    const expected = semesterRatio !== null ? required * semesterRatio : 0;
    const missing = Math.round((required - done) * 10) / 10;
    alerts.push({
      id: `horas-${kind}`,
      level: done < expected * 0.7 ? "importante" : "lembrete",
      emoji: kind === "complementar" ? "🏅" : "🤝",
      text: `Faltam ${missing.toLocaleString("pt-BR")} horas ${label} (você tem ${done.toLocaleString("pt-BR")} de ${required}).`,
      href: "#/horas",
      action: "Ver horas",
    });
  }

  // Aulas de hoje
  for (const occ of classesToday) {
    if (occ.slot.end && input.nowTime > occ.slot.end) continue;
    alerts.push({
      id: `aula-hoje-${occ.discipline.id}-${occ.slot.id}`,
      level: "lembrete",
      emoji: occ.discipline.emoji || "🎒",
      text: `Hoje tem ${occ.discipline.name}${occ.slot.start ? ` às ${occ.slot.start}` : ""}${occ.slot.professor ? ` com ${occ.slot.professor}` : ""}.`,
      href: `#/disciplina/${occ.discipline.id}`,
      action: "Abrir caderno",
    });
  }

  if (alerts.length === 0 && active.length > 0) {
    alerts.push({
      id: "tudo-em-dia",
      level: "parabens",
      emoji: "🌷",
      text: "Tudo em dia por aqui. Orgulho de você!",
      href: null,
      action: null,
    });
  }

  return alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

export function moodFor(alerts: Alert[], nowTime: string): Mood {
  if (nowTime >= "23:30" || nowTime < "05:00") return "sonolenta";
  if (alerts.some((a) => a.level === "urgente")) return "preocupada";
  if (alerts.some((a) => a.level === "parabens")) return "animada";
  return "feliz";
}

/** Dá o jeito de falar do personagem ao aviso. */
export function speak(tone: AvatarTone, alert: Pick<Alert, "text" | "level">, userName: string): string {
  const name = userName.trim().split(/\s+/)[0];
  const hey = name ? `, ${name}` : "";
  switch (tone) {
    case "carinhosa":
      return alert.level === "urgente" ? `Ei${hey}, com carinho: ${alert.text}` : `${alert.text} 💗`;
    case "animada":
      return alert.level === "urgente" ? `Atenção total${hey}! ${alert.text}` : `${alert.text} Bora! ✨`;
    case "direta":
      return alert.text;
    case "engracada":
      return alert.level === "urgente"
        ? `Plantão urgente${hey}: ${alert.text} 🫣`
        : `${alert.text} (e eu não vou esquecer de te lembrar 😌)`;
    case "calma":
      return alert.level === "urgente" ? `Respira${hey}. ${alert.text}` : `${alert.text} 🌿`;
  }
}

export function greeting(tone: AvatarTone, userName: string, nowTime: string): string {
  const name = userName.trim().split(/\s+/)[0];
  const part = nowTime < "12:00" ? "Bom dia" : nowTime < "18:00" ? "Boa tarde" : "Boa noite";
  const who = name ? `, ${name}` : "";
  switch (tone) {
    case "carinhosa":
      return `${part}${who}! Que bom te ver 💗`;
    case "animada":
      return `${part}${who}! Bora brilhar hoje? ✨`;
    case "direta":
      return `${part}${who}. Aqui está o que importa hoje.`;
    case "engracada":
      return `${part}${who}! Sua assistente acadêmica favorita na área 😎`;
    case "calma":
      return `${part}${who}. Um passo de cada vez 🌿`;
  }
}
