import { db } from "./db";
import { todayISO } from "./dates";
import { newId, nowStamp } from "./ids";
import { completeReview, planReviews, undoReview, type ReviewOps } from "./reviews";
import { normalizeSettings } from "./settings";
import {
  COLOR_KEYS,
  type ColorKey,
  type Difficulty,
  type Discipline,
  type ISODate,
  type Lesson,
  type LessonType,
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

export async function createSemester(input: {
  number: number;
  start?: ISODate;
  end?: ISODate;
}): Promise<Semester> {
  const stamp = nowStamp();
  const semester: Semester = {
    id: newId(),
    number: input.number,
    start: input.start || undefined,
    end: input.end || undefined,
    createdAt: stamp,
    updatedAt: stamp,
  };
  await db.semesters.add(semester);
  return semester;
}

export async function updateSemester(
  id: string,
  patch: Partial<Pick<Semester, "number" | "start" | "end">>,
): Promise<void> {
  await db.semesters.update(id, { ...patch, updatedAt: nowStamp() });
}

export async function deleteSemester(id: string): Promise<void> {
  await db.transaction(
    "rw",
    [db.semesters, db.disciplines, db.lessons, db.reviews, db.tasks, db.settings],
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
  const discipline: Discipline = {
    id: newId(),
    semesterId: input.semesterId,
    name: input.name.trim(),
    professor: input.professor ?? "",
    color: input.color ?? nextColor(siblings.map((d) => d.color)),
    status: input.status ?? "andamento",
    weekdays: [...(input.weekdays ?? [])].sort((a, b) => a - b),
    startTime: input.startTime ?? "",
    endTime: input.endTime ?? "",
    room: input.room ?? "",
    ementa: input.ementa ?? "",
    notebookLmUrl: input.notebookLmUrl ?? "",
    theaUrl: input.theaUrl ?? "",
    createdAt: stamp,
    updatedAt: stamp,
  };
  await db.disciplines.add(discipline);
  return discipline;
}

export async function updateDiscipline(
  id: string,
  patch: Partial<Omit<Discipline, "id" | "createdAt" | "updatedAt">>,
): Promise<void> {
  const clean = { ...patch };
  if (clean.weekdays) clean.weekdays = [...clean.weekdays].sort((a, b) => a - b);
  if (typeof clean.name === "string") clean.name = clean.name.trim();
  await db.disciplines.update(id, { ...clean, updatedAt: nowStamp() });
}

export async function deleteDiscipline(id: string): Promise<void> {
  await db.transaction("rw", db.disciplines, db.lessons, db.reviews, db.tasks, () =>
    removeDiscipline(id),
  );
}

async function removeDiscipline(id: string): Promise<void> {
  const lessonIds = await db.lessons.where("disciplineId").equals(id).primaryKeys();
  await db.reviews.where("lessonId").anyOf(lessonIds).delete();
  await db.lessons.bulkDelete(lessonIds);
  await db.tasks.where("disciplineId").equals(id).delete();
  await db.disciplines.delete(id);
}

/** Primeira cor da paleta ainda não usada no semestre; se todas já foram, a menos usada. */
export function nextColor(used: ColorKey[]): ColorKey {
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
  await db.transaction("rw", db.lessons, db.reviews, async () => {
    await db.reviews.where("lessonId").equals(id).delete();
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
  notes?: string;
}): Promise<Task> {
  const stamp = nowStamp();
  const task: Task = {
    id: newId(),
    disciplineId: input.disciplineId,
    title: input.title.trim(),
    type: input.type,
    dueDate: input.dueDate,
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
