import { isHexColor } from "./color";
import { DATA_TABLES, db, type DataTableName } from "./db";
import { isISODate, todayISO } from "./dates";
import { base64ToBytes, bytesToBase64, IMAGE_TYPES, pruneImages } from "./images";
import { normalizeSettings } from "./settings";
import {
  COLOR_KEYS,
  type Discipline,
  type Lesson,
  type Review,
  type Semester,
  type Settings,
  type Task,
} from "./types";

/** v1: dados de estudo. v2: inclui imagens e personalização. */
export const BACKUP_FORMAT_VERSION = 2;

const MAX_IMAGE_BASE64_LENGTH = 16 * 1024 * 1024;

/** Imagem dentro do arquivo de backup, com os bytes em base64. */
export interface BackupImage {
  id: string;
  type: string;
  width: number;
  height: number;
  createdAt: string;
  data: string;
}
export const LAST_BACKUP_KEY = "atlas-ultimo-backup";

export interface BackupData {
  semesters: Semester[];
  disciplines: Discipline[];
  lessons: Lesson[];
  reviews: Review[];
  tasks: Task[];
  images: BackupImage[];
  settings: Settings;
}

export interface BackupFile {
  app: "atlas";
  formatVersion: number;
  exportedAt: string;
  data: BackupData;
}

export class BackupError extends Error {}

export async function exportBackup(): Promise<BackupFile> {
  await pruneImages();
  const [semesters, disciplines, lessons, reviews, tasks, imageRows, settingsRow] = await Promise.all([
    db.semesters.toArray(),
    db.disciplines.toArray(),
    db.lessons.toArray(),
    db.reviews.toArray(),
    db.tasks.toArray(),
    db.images.toArray(),
    db.settings.get("app"),
  ]);
  const images: BackupImage[] = imageRows.map((image) => ({
    id: image.id,
    type: image.type,
    width: image.width,
    height: image.height,
    createdAt: image.createdAt,
    data: bytesToBase64(image.data),
  }));
  return {
    app: "atlas",
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      semesters,
      disciplines,
      lessons,
      reviews,
      tasks,
      images,
      settings: normalizeSettings(settingsRow?.value),
    },
  };
}

export function backupFilename(date: string = todayISO()): string {
  return `atlas-backup-${date}.json`;
}

type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function rowsOf(data: Row, table: DataTableName): Row[] {
  const value = data[table];
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new BackupError(`O arquivo está danificado (${table}).`);
  for (const item of value) {
    if (!isRow(item) || typeof item.id !== "string" || item.id === "") {
      throw new BackupError(`O arquivo está danificado (${table}).`);
    }
  }
  return value as Row[];
}

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const bool = (v: unknown, fallback = false) => (typeof v === "boolean" ? v : fallback);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;
const dateOrNull = (v: unknown) => (isISODate(v) ? v : null);

/**
 * Lê um arquivo de backup e devolve os dados já conferidos, com cada campo
 * no tipo esperado. Registros que apontam para algo inexistente são descartados.
 */
export function parseBackup(text: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError("Este arquivo não é um backup do Atlas.");
  }
  if (!isRow(parsed) || parsed.app !== "atlas" || !isRow(parsed.data)) {
    throw new BackupError("Este arquivo não é um backup do Atlas.");
  }
  const version = Number(parsed.formatVersion);
  if (!Number.isInteger(version) || version < 1) {
    throw new BackupError("Este arquivo não é um backup do Atlas.");
  }
  if (version > BACKUP_FORMAT_VERSION) {
    throw new BackupError("Este backup foi feito em uma versão mais nova do Atlas. Atualize o app.");
  }
  const data = parsed.data;
  const stamp = new Date().toISOString();

  const images: BackupImage[] = [];
  for (const r of rowsOf(data, "images")) {
    if (
      !IMAGE_TYPES.includes(r.type as string) ||
      typeof r.data !== "string" ||
      r.data.length === 0 ||
      r.data.length > MAX_IMAGE_BASE64_LENGTH ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(r.data)
    ) {
      continue;
    }
    images.push({
      id: r.id as string,
      type: r.type as string,
      width: Number.isFinite(Number(r.width)) ? Math.max(1, Math.round(Number(r.width))) : 1,
      height: Number.isFinite(Number(r.height)) ? Math.max(1, Math.round(Number(r.height))) : 1,
      createdAt: str(r.createdAt, stamp),
      data: r.data,
    });
  }
  const imageIds = new Set(images.map((image) => image.id));
  const imageOrNull = (v: unknown) => (typeof v === "string" && imageIds.has(v) ? v : null);

  const semesters: Semester[] = rowsOf(data, "semesters").map((r) => ({
    id: r.id as string,
    number: Number.isFinite(Number(r.number)) ? Math.round(Number(r.number)) : 1,
    start: dateOrNull(r.start) ?? undefined,
    end: dateOrNull(r.end) ?? undefined,
    createdAt: str(r.createdAt, stamp),
    updatedAt: str(r.updatedAt, stamp),
  }));
  const semesterIds = new Set(semesters.map((s) => s.id));

  const disciplines: Discipline[] = rowsOf(data, "disciplines")
    .filter((r) => semesterIds.has(r.semesterId as string))
    .map((r) => ({
      id: r.id as string,
      semesterId: r.semesterId as string,
      name: str(r.name, "Disciplina"),
      professor: str(r.professor),
      color: isHexColor(r.color) ? r.color.toLowerCase() : oneOf(r.color, COLOR_KEYS, "indigo"),
      emoji: str(r.emoji).slice(0, 16),
      coverImageId: imageOrNull(r.coverImageId),
      status: oneOf(r.status, ["andamento", "concluida", "futura"] as const, "andamento"),
      weekdays: Array.isArray(r.weekdays)
        ? [...new Set(r.weekdays.map(Number))].filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
        : [],
      startTime: str(r.startTime),
      endTime: str(r.endTime),
      room: str(r.room),
      ementa: str(r.ementa),
      notebookLmUrl: str(r.notebookLmUrl),
      theaUrl: str(r.theaUrl),
      createdAt: str(r.createdAt, stamp),
      updatedAt: str(r.updatedAt, stamp),
    }));
  const disciplineIds = new Set(disciplines.map((d) => d.id));

  const lessons: Lesson[] = rowsOf(data, "lessons")
    .filter((r) => disciplineIds.has(r.disciplineId as string))
    .map((r) => ({
      id: r.id as string,
      disciplineId: r.disciplineId as string,
      number: Number.isFinite(Number(r.number)) && r.number !== null ? Number(r.number) : null,
      title: str(r.title),
      date: dateOrNull(r.date),
      type: oneOf(
        r.type,
        ["teorica", "pratica", "supervisao", "seminario", "revisao", "prova"] as const,
        "teorica",
      ),
      attended: typeof r.attended === "boolean" ? r.attended : null,
      reading: str(r.reading),
      readingDone: bool(r.readingDone),
      questions: str(r.questions),
      notes: str(r.notes),
      doubts: str(r.doubts),
      feynman: str(r.feynman),
      gaps: str(r.gaps),
      summary: str(r.summary),
      mindmap: str(r.mindmap),
      examQuestions: str(r.examQuestions),
      reviewsOn: bool(r.reviewsOn, true),
      createdAt: str(r.createdAt, stamp),
      updatedAt: str(r.updatedAt, stamp),
    }));
  const lessonIds = new Set(lessons.map((l) => l.id));

  const reviews: Review[] = [];
  for (const r of rowsOf(data, "reviews")) {
    if (!lessonIds.has(r.lessonId as string) || !isISODate(r.dueDate)) continue;
    const review: Review = {
      id: r.id as string,
      lessonId: r.lessonId as string,
      step: Number.isInteger(Number(r.step)) && Number(r.step) >= 0 ? Number(r.step) : 0,
      kind: oneOf(r.kind, ["regular", "reforco"] as const, "regular"),
      dueDate: r.dueDate,
    };
    if (isISODate(r.doneAt)) {
      review.doneAt = r.doneAt;
      review.difficulty = oneOf(r.difficulty, ["facil", "medio", "dificil"] as const, "medio");
    }
    if (typeof r.parentId === "string") review.parentId = r.parentId;
    reviews.push(review);
  }

  const tasks: Task[] = [];
  for (const r of rowsOf(data, "tasks")) {
    if (!isISODate(r.dueDate)) continue;
    const disciplineId = typeof r.disciplineId === "string" ? r.disciplineId : null;
    tasks.push({
      id: r.id as string,
      disciplineId: disciplineId && disciplineIds.has(disciplineId) ? disciplineId : null,
      title: str(r.title, "Prazo"),
      type: oneOf(
        r.type,
        ["prova", "trabalho", "seminario", "relatorio", "leitura", "outro"] as const,
        "outro",
      ),
      dueDate: r.dueDate,
      done: bool(r.done),
      notes: str(r.notes),
      createdAt: str(r.createdAt, stamp),
      updatedAt: str(r.updatedAt, stamp),
    });
  }

  const settings = normalizeSettings(isRow(data.settings) ? (data.settings as Partial<Settings>) : null);
  if (settings.currentSemesterId && !semesterIds.has(settings.currentSemesterId)) {
    settings.currentSemesterId = null;
  }
  settings.avatarImageId = imageOrNull(settings.avatarImageId);
  if (settings.todayCover.imageId && !imageIds.has(settings.todayCover.imageId)) {
    settings.todayCover = { ...settings.todayCover, kind: "predefinida", imageId: null };
  }
  // quem restaura um backup com dados já passou pela configuração inicial
  if (semesters.length > 0) settings.onboarded = true;

  return {
    app: "atlas",
    formatVersion: version,
    exportedAt: str(parsed.exportedAt, stamp),
    data: { semesters, disciplines, lessons, reviews, tasks, images, settings },
  };
}

/** Substitui todos os dados do app pelos do backup. */
export async function restoreBackup(file: BackupFile): Promise<void> {
  await db.transaction(
    "rw",
    [db.semesters, db.disciplines, db.lessons, db.reviews, db.tasks, db.images, db.settings],
    async () => {
      for (const table of DATA_TABLES) await db.table(table).clear();
      await db.images.bulkAdd(
        file.data.images.map((image) => ({
          id: image.id,
          type: image.type,
          width: image.width,
          height: image.height,
          createdAt: image.createdAt,
          data: base64ToBytes(image.data),
        })),
      );
      await db.semesters.bulkAdd(file.data.semesters);
      await db.disciplines.bulkAdd(file.data.disciplines);
      await db.lessons.bulkAdd(file.data.lessons);
      await db.reviews.bulkAdd(file.data.reviews);
      await db.tasks.bulkAdd(file.data.tasks);
      await db.settings.put({ key: "app", value: file.data.settings });
    },
  );
}

export async function eraseEverything(): Promise<void> {
  await db.transaction(
    "rw",
    [db.semesters, db.disciplines, db.lessons, db.reviews, db.tasks, db.images, db.settings],
    async () => {
      for (const table of DATA_TABLES) await db.table(table).clear();
      await db.settings.clear();
    },
  );
}

export function backupSummary(file: BackupFile): string {
  const { semesters, disciplines, lessons, images } = file.data;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const parts = [
    plural(semesters.length, "semestre", "semestres"),
    plural(disciplines.length, "disciplina", "disciplinas"),
    plural(lessons.length, "aula", "aulas"),
  ];
  if (images.length > 0) parts.push(plural(images.length, "imagem", "imagens"));
  return parts.join(", ");
}

/**
 * Entrega o arquivo ao usuário. No iPad abre a folha de compartilhamento
 * (Salvar em Arquivos); no computador baixa direto.
 */
export async function deliverBackup(file: BackupFile): Promise<"compartilhado" | "baixado" | "cancelado"> {
  const name = backupFilename();
  const json = JSON.stringify(file, null, 2);
  const blob = new File([json], name, { type: "application/json" });

  const touch = typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;
  if (touch && typeof navigator.canShare === "function" && navigator.canShare({ files: [blob] })) {
    try {
      await navigator.share({ files: [blob], title: name });
      markBackupDone();
      return "compartilhado";
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return "cancelado";
      // sem permissão para compartilhar: cai para o download
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  markBackupDone();
  return "baixado";
}

function markBackupDone(): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, todayISO());
  } catch {
    // sem armazenamento local: só não lembramos a data
  }
}

export function lastBackupDate(): string | null {
  try {
    const value = localStorage.getItem(LAST_BACKUP_KEY);
    return isISODate(value) ? value : null;
  } catch {
    return null;
  }
}
