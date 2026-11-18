import { db } from "./db";
import { todayISO } from "./dates";
import { newId, nowStamp } from "./ids";
import { completeReview, planReviews, undoReview, type ReviewOps } from "./reviews";
import { normalizeSettings } from "./settings";
import {
  COLOR_HEX,
  COLOR_KEYS,
  defaultCover,
  type AiLogEntry,
  type AiOutput,
  type Attendance,
  type Book,
  type CalendarEvent,
  type ClassSlot,
  type ColorKey,
  type Difficulty,
  type Discipline,
  type FieldNote,
  type FileRecord,
  type Flashcard,
  type Grade,
  type HourEntry,
  type Internship,
  type ISODate,
  type Lesson,
  type LessonType,
  type NotebookCover,
  type PageLayer,
  type Question,
  type Report,
  type Semester,
  type Settings,
  type Task,
  type TaskType,
} from "./types";

/* ---------- Ajustes ---------- */

export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get("app");
  return normalizeSettings(row?.value);
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  return db.transaction("rw", db.settings, db.lessons, db.reviews, async () => {
    const current = await getSettings();
    const next = normalizeSettings({ ...current, ...patch });
    await db.settings.put({ key: "app", value: next });
    if (next.reviewIntervals.join(",") !== current.reviewIntervals.join(",")) {
      await resyncAllReviews(next.reviewIntervals);
    }
    return next;
  });
}

/* ---------- Semestres ---------- */

const SEMESTER_COVER_COLORS = ["#f4b6c8", "#c9b6f0", "#a8d5c2", "#f7d08a", "#a9c8ee", "#8e2f55", "#e9e4dc"];

export async function createSemester(input: {
  number: number;
  start?: ISODate;
  end?: ISODate;
  cover?: NotebookCover;
}): Promise<Semester> {
  const stamp = nowStamp();
  const semester: Semester = {
    id: newId(),
    number: input.number,
    start: input.start || undefined,
    end: input.end || undefined,
    cover:
      input.cover ??
      defaultCover(SEMESTER_COVER_COLORS[(input.number - 1) % SEMESTER_COVER_COLORS.length], "listras"),
    createdAt: stamp,
    updatedAt: stamp,
  };
  await db.semesters.add(semester);
  return semester;
}

export async function updateSemester(
  id: string,
  patch: Partial<Pick<Semester, "number" | "start" | "end" | "cover">>,
): Promise<void> {
  await db.semesters.update(id, { ...patch, updatedAt: nowStamp() });
}

export async function deleteSemester(id: string): Promise<void> {
  await db.transaction(
    "rw",
    [db.semesters, db.disciplines, db.lessons, db.reviews, db.tasks, db.settings, db.pages, db.attendance, db.grades, db.cards, db.questions, db.aiOutputs, db.recordings],
    async () => {
      const disciplineIds = await db.disciplines.where("semesterId").equals(id).primaryKeys();
      for (const disciplineId of disciplineIds) await removeDiscipline(disciplineId);
      await db.semesters.delete(id);
      const settings = await getSettings();
      if (settings.currentSemesterId === id) {
        await db.settings.put({ key: "app", value: { ...settings, currentSemesterId: null } });
      }
    },
  );
}

/* ---------- Disciplinas ---------- */

export type DisciplineInput = Pick<Discipline, "semesterId" | "name"> &
  Partial<Omit<Discipline, "id" | "semesterId" | "name" | "createdAt" | "updatedAt">>;

export async function createDiscipline(input: DisciplineInput): Promise<Discipline> {
  const stamp = nowStamp();
  const siblings = await db.disciplines.where("semesterId").equals(input.semesterId).toArray();
  const color = input.color ?? nextColor(siblings.map((d) => d.color));
  const discipline: Discipline = {
    id: newId(),
    semesterId: input.semesterId,
    name: input.name.trim(),
    kind: input.kind ?? "regular",
    professors: cleanList(input.professors ?? []),
    color,
    emoji: input.emoji ?? "",
    cover: input.cover ?? defaultCover(colorHex(color), "liso"),
    status: input.status ?? "andamento",
    slots: sortSlots(input.slots ?? []),
    absenceLimit: input.absenceLimit ?? null,
    passingGrade: input.passingGrade ?? null,
    ementa: input.ementa ?? "",
    notebookLmUrl: input.notebookLmUrl ?? "",
    theaUrl: input.theaUrl ?? "",
    createdAt: stamp,
    updatedAt: stamp,
  };
  await db.disciplines.add(discipline);
  return discipline;
}

export function colorHex(color: string): string {
  return color.startsWith("#") ? color : (COLOR_HEX[color as ColorKey] ?? "#f08bb0");
}

function cleanList(list: string[]): string[] {
  return [...new Set(list.map((p) => p.trim()).filter(Boolean))];
}

export function sortSlots(slots: ClassSlot[]): ClassSlot[] {
  return [...slots].sort(
    (a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || (a.start || "99").localeCompare(b.start || "99"),
  );
}

export async function updateDiscipline(
  id: string,
  patch: Partial<Omit<Discipline, "id" | "createdAt" | "updatedAt">>,
): Promise<void> {
  const clean = { ...patch };
  if (clean.slots) clean.slots = sortSlots(clean.slots);
  if (clean.professors) clean.professors = cleanList(clean.professors);
  if (typeof clean.name === "string") clean.name = clean.name.trim();
  await db.disciplines.update(id, { ...clean, updatedAt: nowStamp() });
}

export async function deleteDiscipline(id: string): Promise<void> {
  await db.transaction(
    "rw",
    [db.disciplines, db.lessons, db.reviews, db.tasks, db.pages, db.attendance, db.grades, db.cards, db.questions, db.aiOutputs, db.recordings],
    () => removeDiscipline(id),
  );
}

async function removeDiscipline(id: string): Promise<void> {
  const lessonIds = await db.lessons.where("disciplineId").equals(id).primaryKeys();
  await db.reviews.where("lessonId").anyOf(lessonIds).delete();
  await db.pages.bulkDelete(lessonIds);
  await db.recordings.where("lessonId").anyOf(lessonIds).delete();
  await db.lessons.bulkDelete(lessonIds);
  await db.tasks.where("disciplineId").equals(id).delete();
  await db.attendance.where("disciplineId").equals(id).delete();
  await db.grades.where("disciplineId").equals(id).delete();
  await db.cards.where("disciplineId").equals(id).delete();
  await db.questions.where("disciplineId").equals(id).delete();
  await db.aiOutputs.where("disciplineId").equals(id).delete();
  await db.disciplines.delete(id);
}

/** Primeira cor da paleta ainda não usada no semestre; se todas já foram, a menos usada. */
export function nextColor(used: string[]): ColorKey {
  const free = COLOR_KEYS.find((c) => !used.includes(c));
  if (free) return free;
  const count = (c: ColorKey) => used.filter((u) => u === c).length;
  return [...COLOR_KEYS].sort((a, b) => count(a) - count(b))[0];
}

/* ---------- Aulas ---------- */

export async function createLesson(input: {
  disciplineId: string;
  title?: string;
  date?: ISODate | null;
  type?: LessonType;
}): Promise<Lesson> {
  return db.transaction("rw", db.lessons, db.reviews, db.settings, async () => {
    const stamp = nowStamp();
    const siblings = await db.lessons.where("disciplineId").equals(input.disciplineId).toArray();
    const lastNumber = siblings.reduce((max, l) => Math.max(max, l.number ?? 0), 0);
    const type = input.type ?? "teorica";
    const lesson: Lesson = {
      id: newId(),
      disciplineId: input.disciplineId,
      number: lastNumber + 1,
      title: (input.title ?? "").trim(),
      date: input.date ?? null,
      type,
      attended: null,
      reading: "",
      readingDone: false,
      questions: "",
      notes: "",
      doubts: "",
      feynman: "",
      gaps: "",
      summary: "",
      mindmap: "",
      examQuestions: "",
      transcript: "",
      paper: null,
      paperColor: null,
      reviewsOn: type !== "prova",
      createdAt: stamp,
      updatedAt: stamp,
    };
    await db.lessons.add(lesson);
    await syncLessonReviews(lesson.id);
    return lesson;
  });
}

export type LessonPatch = Partial<Omit<Lesson, "id" | "disciplineId" | "createdAt" | "updatedAt">>;

export async function updateLesson(id: string, patch: LessonPatch): Promise<void> {
  const affectsReviews = "date" in patch || "reviewsOn" in patch;
  await db.transaction("rw", db.lessons, db.reviews, db.settings, async () => {
    await db.lessons.update(id, { ...patch, updatedAt: nowStamp() });
    if (affectsReviews) await syncLessonReviews(id);
  });
}

export async function deleteLesson(id: string): Promise<void> {
  await db.transaction("rw", [db.lessons, db.reviews, db.pages, db.recordings], async () => {
    await db.reviews.where("lessonId").equals(id).delete();
    await db.pages.delete(id);
    await db.recordings.where("lessonId").equals(id).delete();
    await db.lessons.delete(id);
  });
}

/* ---------- Revisões ---------- */

async function applyReviewOps(ops: ReviewOps): Promise<void> {
  if (ops.removeIds.length > 0) await db.reviews.bulkDelete(ops.removeIds);
  if (ops.put.length > 0) await db.reviews.bulkPut(ops.put);
}

export async function syncLessonReviews(lessonId: string, intervals?: number[]): Promise<void> {
  await db.transaction("rw", db.lessons, db.reviews, db.settings, async () => {
    const lesson = await db.lessons.get(lessonId);
    if (!lesson) return;
    const existing = await db.reviews.where("lessonId").equals(lessonId).toArray();
    const steps = intervals ?? (await getSettings()).reviewIntervals;
    await applyReviewOps(planReviews(lesson, existing, steps, newId));
  });
}

export async function resyncAllReviews(intervals?: number[]): Promise<void> {
  await db.transaction("rw", db.lessons, db.reviews, db.settings, async () => {
    const steps = intervals ?? (await getSettings()).reviewIntervals;
    const lessons = await db.lessons.toArray();
    const reviews = await db.reviews.toArray();
    const byLesson = new Map<string, typeof reviews>();
    for (const r of reviews) {
      const list = byLesson.get(r.lessonId);
      if (list) list.push(r);
      else byLesson.set(r.lessonId, [r]);
    }
    for (const lesson of lessons) {
      await applyReviewOps(planReviews(lesson, byLesson.get(lesson.id) ?? [], steps, newId));
    }
  });
}

export async function markReview(
  reviewId: string,
  difficulty: Difficulty,
  today: ISODate = todayISO(),
): Promise<{ reinforcedOn: ISODate | null }> {
  return db.transaction("rw", db.reviews, db.settings, async () => {
    const review = await db.reviews.get(reviewId);
    if (!review) return { reinforcedOn: null };
    const siblings = await db.reviews.where("lessonId").equals(review.lessonId).toArray();
    const { hardReinforceDays } = await getSettings();
    const ops = completeReview(review, difficulty, today, siblings, hardReinforceDays, newId);
    await applyReviewOps(ops);
    const reinforcement = ops.put.find((r) => r.kind === "reforco" && r.id !== review.id);
    return { reinforcedOn: reinforcement?.dueDate ?? null };
  });
}

export async function reopenReview(reviewId: string): Promise<void> {
  await db.transaction("rw", db.reviews, async () => {
    const review = await db.reviews.get(reviewId);
    if (!review) return;
    const siblings = await db.reviews.where("lessonId").equals(review.lessonId).toArray();
    await applyReviewOps(undoReview(review, siblings));
  });
}

/* ---------- Prazos ---------- */

export async function createTask(input: {
  disciplineId: string | null;
  title: string;
  type: TaskType;
  dueDate: ISODate;
  time?: string;
  remindMinutes?: number | null;
  countdown?: boolean;
  notes?: string;
}): Promise<Task> {
  const stamp = nowStamp();
  const task: Task = {
    id: newId(),
    disciplineId: input.disciplineId,
    title: input.title.trim(),
    type: input.type,
    dueDate: input.dueDate,
    time: input.time ?? "",
    remindMinutes: input.remindMinutes ?? null,
    countdown: input.countdown ?? (input.type === "prova" || input.type === "relatorio" || input.type === "trabalho"),
    done: false,
    notes: input.notes ?? "",
    createdAt: stamp,
    updatedAt: stamp,
  };
  await db.tasks.add(task);
  return task;
}

export async function updateTask(
  id: string,
  patch: Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>,
): Promise<void> {
  await db.tasks.update(id, { ...patch, updatedAt: nowStamp() });
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id);
}

/* ---------- Faltas ---------- */

export async function saveAttendance(input: {
  disciplineId: string;
  date: ISODate;
  absences: number;
  classes: number;
  professor?: string;
  note?: string;
}): Promise<void> {
  const existing = await db.attendance
    .where("disciplineId")
    .equals(input.disciplineId)
    .filter((a) => a.date === input.date)
    .first();
  const absences = Math.max(0, Math.min(input.classes, Math.round(input.absences)));
  if (existing) {
    if (absences === 0 && !input.note) await db.attendance.delete(existing.id);
    else
      await db.attendance.update(existing.id, {
        absences,
        classes: input.classes,
        professor: input.professor ?? existing.professor,
        note: input.note ?? existing.note,
      });
    return;
  }
  if (absences === 0 && !input.note) return;
  const record: Attendance = {
    id: newId(),
    disciplineId: input.disciplineId,
    date: input.date,
    absences,
    classes: input.classes,
    professor: input.professor ?? "",
    note: input.note ?? "",
    createdAt: nowStamp(),
  };
  await db.attendance.add(record);
}

export async function deleteAttendance(id: string): Promise<void> {
  await db.attendance.delete(id);
}

/* ---------- Notas ---------- */

export async function createGrade(input: Pick<Grade, "disciplineId" | "name"> & Partial<Grade>): Promise<Grade> {
  const stamp = nowStamp();
  const grade: Grade = {
    id: newId(),
    disciplineId: input.disciplineId,
    name: input.name.trim(),
    weight: input.weight ?? 1,
    value: input.value ?? null,
    date: input.date ?? null,
    professor: input.professor ?? "",
    createdAt: stamp,
    updatedAt: stamp,
  };
  await db.grades.add(grade);
  return grade;
}

export async function updateGrade(id: string, patch: Partial<Omit<Grade, "id" | "createdAt">>): Promise<void> {
  await db.grades.update(id, { ...patch, updatedAt: nowStamp() });
}

export async function deleteGrade(id: string): Promise<void> {
  await db.grades.delete(id);
}

/* ---------- Folha da aula (caneta e itens soltos) ---------- */

export async function savePageLayer(lessonId: string, patch: Partial<Pick<PageLayer, "strokes" | "items">>): Promise<void> {
  const existing = await db.pages.get(lessonId);
  await db.pages.put({
    lessonId,
    strokes: patch.strokes ?? existing?.strokes ?? [],
    items: patch.items ?? existing?.items ?? [],
    updatedAt: nowStamp(),
  });
}

/* ---------- Arquivos ---------- */

export async function saveFile(file: Blob, name: string): Promise<FileRecord> {
  const record: FileRecord = {
    id: newId(),
    name,
    type: file.type || "application/octet-stream",
    size: file.size,
    data: await file.arrayBuffer(),
    createdAt: nowStamp(),
  };
  await db.files.add(record);
  return record;
}

/* ---------- Biblioteca ---------- */

export async function createBook(input: Pick<Book, "title"> & Partial<Book>): Promise<Book> {
  const stamp = nowStamp();
  const book: Book = {
    id: newId(),
    title: input.title.trim() || "Sem título",
    author: input.author ?? "",
    year: input.year ?? "",
    kind: input.kind ?? "livro",
    status: input.status ?? "quero-ler",
    disciplineIds: input.disciplineIds ?? [],
    tags: input.tags ?? [],
    color: input.color ?? "#d9748f",
    fileId: input.fileId ?? null,
    coverImageId: input.coverImageId ?? null,
    pages: input.pages ?? 0,
    currentPage: input.currentPage ?? 0,
    startBy: input.startBy ?? null,
    notes: input.notes ?? "",
    createdAt: stamp,
    updatedAt: stamp,
  };
  await db.books.add(book);
  return book;
}

export async function updateBook(id: string, patch: Partial<Omit<Book, "id" | "createdAt">>): Promise<void> {
  await db.books.update(id, { ...patch, updatedAt: nowStamp() });
}

export async function deleteBook(id: string): Promise<void> {
  await db.transaction("rw", [db.books, db.bookTexts, db.files], async () => {
    const book = await db.books.get(id);
    if (book?.fileId) await db.files.delete(book.fileId);
    await db.bookTexts.delete(id);
    await db.books.delete(id);
  });
}

/* ---------- Flashcards e questões ---------- */

export async function createCards(
  cards: { front: string; back: string }[],
  context: { disciplineId: string | null; lessonId: string | null; source: Flashcard["source"]; today: ISODate },
): Promise<number> {
  const stamp = nowStamp();
  const rows: Flashcard[] = cards
    .filter((c) => c.front.trim() && c.back.trim())
    .map((c) => ({
      id: newId(),
      disciplineId: context.disciplineId,
      lessonId: context.lessonId,
      front: c.front.trim(),
      back: c.back.trim(),
      due: context.today,
      interval: 0,
      ease: 2.5,
      reps: 0,
      lapses: 0,
      source: context.source,
      createdAt: stamp,
    }));
  await db.cards.bulkAdd(rows);
  return rows.length;
}

export async function updateCard(id: string, patch: Partial<Omit<Flashcard, "id">>): Promise<void> {
  await db.cards.update(id, patch);
}

export async function deleteCard(id: string): Promise<void> {
  await db.cards.delete(id);
}

export async function createQuestions(
  items: { stem: string; options: string[]; answer: number | null; explanation: string }[],
  context: { disciplineId: string | null; lessonId: string | null; source: Question["source"] },
): Promise<number> {
  const stamp = nowStamp();
  const rows: Question[] = items
    .filter((q) => q.stem.trim())
    .map((q) => ({
      id: newId(),
      disciplineId: context.disciplineId,
      lessonId: context.lessonId,
      stem: q.stem.trim(),
      options: q.options.map((o) => o.trim()).filter(Boolean),
      answer: q.answer,
      explanation: q.explanation.trim(),
      right: 0,
      wrong: 0,
      source: context.source,
      createdAt: stamp,
    }));
  await db.questions.bulkAdd(rows);
  return rows.length;
}

export async function answerQuestion(id: string, correct: boolean): Promise<void> {
  const q = await db.questions.get(id);
  if (!q) return;
  await db.questions.update(id, correct ? { right: q.right + 1 } : { wrong: q.wrong + 1 });
}

export async function deleteQuestion(id: string): Promise<void> {
  await db.questions.delete(id);
}

/* ---------- Horas ---------- */

export async function createHour(input: Omit<HourEntry, "id" | "createdAt">): Promise<void> {
  await db.hours.add({ ...input, title: input.title.trim(), id: newId(), createdAt: nowStamp() });
}

export async function deleteHour(id: string): Promise<void> {
  await db.hours.delete(id);
}

/* ---------- Estágio ---------- */

export async function createInternship(input: Pick<Internship, "name"> & Partial<Internship>): Promise<Internship> {
  const stamp = nowStamp();
  const internship: Internship = {
    id: newId(),
    name: input.name.trim(),
    place: input.place ?? "",
    supervisor: input.supervisor ?? "",
    disciplineId: input.disciplineId ?? null,
    requiredHours: input.requiredHours ?? null,
    start: input.start ?? null,
    end: input.end ?? null,
    notes: input.notes ?? "",
    createdAt: stamp,
    updatedAt: stamp,
  };
  await db.internships.add(internship);
  return internship;
}

export async function updateInternship(id: string, patch: Partial<Omit<Internship, "id" | "createdAt">>): Promise<void> {
  await db.internships.update(id, { ...patch, updatedAt: nowStamp() });
}

export async function deleteInternship(id: string): Promise<void> {
  await db.transaction("rw", [db.internships, db.fieldNotes, db.reports], async () => {
    await db.fieldNotes.where("internshipId").equals(id).delete();
    await db.reports.where("internshipId").equals(id).modify({ internshipId: null });
    await db.internships.delete(id);
  });
}

export async function createFieldNote(input: Omit<FieldNote, "id" | "createdAt">): Promise<void> {
  await db.fieldNotes.add({ ...input, id: newId(), createdAt: nowStamp() });
}

export async function deleteFieldNote(id: string): Promise<void> {
  await db.fieldNotes.delete(id);
}

export async function saveReport(input: Partial<Report> & Pick<Report, "title" | "content">): Promise<Report> {
  const stamp = nowStamp();
  if (input.id) {
    await db.reports.update(input.id, { title: input.title, content: input.content, updatedAt: stamp });
    return (await db.reports.get(input.id)) as Report;
  }
  const report: Report = {
    id: newId(),
    internshipId: input.internshipId ?? null,
    title: input.title,
    content: input.content,
    createdAt: stamp,
    updatedAt: stamp,
  };
  await db.reports.add(report);
  return report;
}

export async function deleteReport(id: string): Promise<void> {
  await db.reports.delete(id);
}

/* ---------- IA ---------- */

export async function saveAiOutput(input: Omit<AiOutput, "id" | "createdAt">): Promise<AiOutput> {
  const output: AiOutput = { ...input, id: newId(), createdAt: nowStamp() };
  await db.aiOutputs.add(output);
  return output;
}

export async function deleteAiOutput(id: string): Promise<void> {
  await db.aiOutputs.delete(id);
}

export async function logAiUse(entry: Omit<AiLogEntry, "id" | "at">): Promise<void> {
  await db.aiLog.add({ ...entry, id: newId(), at: nowStamp() });
}

/* ---------- Agenda do Google ---------- */

export async function replaceCalendar(events: CalendarEvent[]): Promise<void> {
  await db.transaction("rw", db.calendar, async () => {
    await db.calendar.clear();
    const unique = new Map(events.map((e) => [e.id, e]));
    await db.calendar.bulkPut([...unique.values()]);
  });
}
