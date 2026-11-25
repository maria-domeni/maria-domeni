import { addDays, diffDays, weekdayOf } from "./dates";
import type { Attendance, ClassSlot, Discipline, Grade, ISODate, Semester, Settings } from "./types";

/* ------------------------------------------------------------------ */
/* Grade horária                                                        */
/* ------------------------------------------------------------------ */

/** Horários da disciplina num dia da semana, em ordem de início. */
export function slotsOn(discipline: Pick<Discipline, "slots">, weekday: number): ClassSlot[] {
  return discipline.slots
    .filter((s) => s.weekday === weekday)
    .sort((a, b) => (a.start || "99:99").localeCompare(b.start || "99:99"));
}

/** O semestre está em andamento nessa data (sem datas = sempre). */
export function semesterCovers(semester: Semester | undefined, date: ISODate): boolean {
  if (!semester) return true;
  if (semester.start && diffDays(semester.start, date) < 0) return false;
  if (semester.end && diffDays(date, semester.end) < 0) return false;
  return true;
}

export interface ClassOccurrence {
  discipline: Discipline;
  slot: ClassSlot;
  date: ISODate;
}

/** Aulas da grade num dia, de todas as disciplinas em andamento. */
export function classesOn(
  date: ISODate,
  disciplines: Discipline[],
  semesters: Semester[],
): ClassOccurrence[] {
  const weekday = weekdayOf(date);
  const semesterById = new Map(semesters.map((s) => [s.id, s]));
  const result: ClassOccurrence[] = [];
  for (const discipline of disciplines) {
    if (discipline.status !== "andamento") continue;
    if (!semesterCovers(semesterById.get(discipline.semesterId), date)) continue;
    for (const slot of slotsOn(discipline, weekday)) result.push({ discipline, slot, date });
  }
  return result.sort((a, b) => (a.slot.start || "99:99").localeCompare(b.slot.start || "99:99"));
}

/** Próxima aula da disciplina a partir de uma data (inclusive), em até 8 semanas. */
export function nextClassOf(
  discipline: Discipline,
  from: ISODate,
  semester?: Semester,
): { date: ISODate; slot: ClassSlot } | null {
  if (discipline.slots.length === 0) return null;
  for (let i = 0; i < 56; i++) {
    const date = addDays(from, i);
    if (!semesterCovers(semester, date)) {
      if (semester?.end && diffDays(semester.end, date) > 0) return null;
      continue;
    }
    const slot = slotsOn(discipline, weekdayOf(date))[0];
    if (slot) return { date, slot };
  }
  return null;
}

/** Aulas por dia dessa disciplina (a maior quantidade da grade, ou o padrão). */
export function classesPerDayOf(discipline: Discipline, fallback: number): number {
  const counts = discipline.slots.map((s) => s.classes).filter((n) => n > 0);
  return counts.length > 0 ? Math.max(...counts) : fallback;
}

/** "Seg e Qua · 19:00–22:30" */
export function scheduleText(discipline: Discipline, weekdayShort: string[]): string {
  if (discipline.slots.length === 0) return "";
  const days = [...new Set(discipline.slots.map((s) => s.weekday))]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => weekdayShort[d]);
  const daysText = days.length > 1 ? `${days.slice(0, -1).join(", ")} e ${days.at(-1)}` : days[0];
  const first = discipline.slots[0];
  const time = first.start ? ` · ${first.start}${first.end ? `–${first.end}` : ""}` : "";
  return `${daysText}${time}`;
}

/* ------------------------------------------------------------------ */
/* Faltas                                                               */
/* ------------------------------------------------------------------ */

export interface AbsenceSummary {
  /** Aulas faltadas no total */
  used: number;
  /** Limite em aulas (null = não configurado) */
  limit: number | null;
  /** Quantas aulas ainda pode faltar (null sem limite) */
  remaining: number | null;
  /** O mesmo, em dias de aula inteiros */
  remainingDays: number | null;
  classesPerDay: number;
  ratio: number;
  level: "ok" | "atencao" | "risco" | "estourou" | "sem-limite" | "estagio";
}

export function absenceLimitOf(discipline: Discipline, settings: Pick<Settings, "defaultAbsenceLimit">): number | null {
  if (discipline.kind === "estagio") return null;
  return discipline.absenceLimit ?? settings.defaultAbsenceLimit;
}

export function summarizeAbsences(
  discipline: Discipline,
  records: Attendance[],
  settings: Pick<Settings, "defaultAbsenceLimit" | "classesPerDay">,
): AbsenceSummary {
  const used = records
    .filter((r) => r.disciplineId === discipline.id)
    .reduce((sum, r) => sum + Math.max(0, r.absences), 0);
  const classesPerDay = classesPerDayOf(discipline, settings.classesPerDay);
  if (discipline.kind === "estagio") {
    return { used, limit: null, remaining: null, remainingDays: null, classesPerDay, ratio: 0, level: "estagio" };
  }
  const limit = absenceLimitOf(discipline, settings);
  if (limit === null || limit <= 0) {
    return { used, limit: null, remaining: null, remainingDays: null, classesPerDay, ratio: 0, level: "sem-limite" };
  }
  const remaining = limit - used;
  const ratio = Math.min(1, used / limit);
  const remainingDays = remaining > 0 ? Math.floor(remaining / classesPerDay) : 0;
  let level: AbsenceSummary["level"] = "ok";
  if (remaining < 0) level = "estourou";
  else if (remaining < classesPerDay) level = "risco";
  else if (ratio >= 0.6) level = "atencao";
  return { used, limit, remaining, remainingDays, classesPerDay, ratio, level };
}

/* ------------------------------------------------------------------ */
/* Notas                                                                */
/* ------------------------------------------------------------------ */

export interface GradeSummary {
  /** Média ponderada das notas já lançadas (null sem notas) */
  current: number | null;
  /** Média final se as notas que faltam forem zero (pior caso) */
  floor: number | null;
  passing: number | null;
  gradedWeight: number;
  pendingWeight: number;
  /** Média necessária nas avaliações que faltam para passar */
  needed: number | null;
  status: "sem-notas" | "sem-regra" | "aprovada" | "no-caminho" | "precisa" | "impossivel";
}

export function passingOf(discipline: Discipline, settings: Pick<Settings, "passingGrade">): number | null {
  return discipline.passingGrade ?? settings.passingGrade;
}

export function summarizeGrades(
  discipline: Discipline,
  grades: Grade[],
  settings: Pick<Settings, "passingGrade" | "gradeMax">,
): GradeSummary {
  const own = grades.filter((g) => g.disciplineId === discipline.id && g.weight > 0);
  const graded = own.filter((g) => g.value !== null);
  const pending = own.filter((g) => g.value === null);
  const gradedWeight = graded.reduce((s, g) => s + g.weight, 0);
  const pendingWeight = pending.reduce((s, g) => s + g.weight, 0);
  const totalWeight = gradedWeight + pendingWeight;
  const weightedSum = graded.reduce((s, g) => s + (g.value as number) * g.weight, 0);
  const current = gradedWeight > 0 ? round2(weightedSum / gradedWeight) : null;
  const floor = totalWeight > 0 && gradedWeight > 0 ? round2(weightedSum / totalWeight) : null;
  const passing = passingOf(discipline, settings);

  if (own.length === 0) {
    return { current: null, floor: null, passing, gradedWeight, pendingWeight, needed: null, status: "sem-notas" };
  }
  if (passing === null) {
    return { current, floor, passing, gradedWeight, pendingWeight, needed: null, status: "sem-regra" };
  }
  if (pendingWeight === 0) {
    const final = current ?? 0;
    return {
      current,
      floor,
      passing,
      gradedWeight,
      pendingWeight,
      needed: null,
      status: final >= passing ? "aprovada" : "impossivel",
    };
  }
  const needed = round2((passing * totalWeight - weightedSum) / pendingWeight);
  let status: GradeSummary["status"] = "precisa";
  if (needed <= 0) status = "aprovada";
  else if (needed > settings.gradeMax) status = "impossivel";
  else if (current !== null && current >= passing) status = "no-caminho";
  return { current, floor, passing, gradedWeight, pendingWeight, needed: Math.max(0, needed), status };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Formata nota com vírgula: 7,5 */
export function formatGrade(n: number | null): string {
  if (n === null) return "-";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** Converte "7,5" ou "7.5" em número. Vazio = null. */
export function parseDecimal(value: string): number | null {
  const clean = value.trim().replace(",", ".");
  if (clean === "") return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}
