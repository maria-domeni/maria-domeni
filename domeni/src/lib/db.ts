import Dexie, { type EntityTable, type Table } from "dexie";
import type {
  AiLogEntry,
  AiOutput,
  Attendance,
  Book,
  BookText,
  CalendarEvent,
  Discipline,
  FieldNote,
  FileRecord,
  Flashcard,
  Grade,
  HourEntry,
  ImageRecord,
  Internship,
  Lesson,
  PageLayer,
  Question,
  Recording,
  Report,
  Review,
  Semester,
  Settings,
  Task,
} from "./types";

export interface SettingsRow {
  key: "app";
  value: Partial<Settings>;
}

export class DomeniDB extends Dexie {
  semesters!: EntityTable<Semester, "id">;
  disciplines!: EntityTable<Discipline, "id">;
  lessons!: EntityTable<Lesson, "id">;
  pages!: EntityTable<PageLayer, "lessonId">;
  recordings!: EntityTable<Recording, "id">;
  reviews!: EntityTable<Review, "id">;
  tasks!: EntityTable<Task, "id">;
  attendance!: EntityTable<Attendance, "id">;
  grades!: EntityTable<Grade, "id">;
  books!: EntityTable<Book, "id">;
  bookTexts!: EntityTable<BookText, "bookId">;
  cards!: EntityTable<Flashcard, "id">;
  questions!: EntityTable<Question, "id">;
  hours!: EntityTable<HourEntry, "id">;
  internships!: EntityTable<Internship, "id">;
  fieldNotes!: EntityTable<FieldNote, "id">;
  reports!: EntityTable<Report, "id">;
  aiOutputs!: EntityTable<AiOutput, "id">;
  aiLog!: EntityTable<AiLogEntry, "id">;
  calendar!: EntityTable<CalendarEvent, "id">;
  images!: EntityTable<ImageRecord, "id">;
  files!: EntityTable<FileRecord, "id">;
  settings!: Table<SettingsRow, "app">;

  constructor(name = "domeni") {
    super(name);
    this.version(1).stores({
      semesters: "id, number",
      disciplines: "id, semesterId, status",
      lessons: "id, disciplineId, date",
      pages: "lessonId",
      recordings: "id, lessonId",
      reviews: "id, lessonId, dueDate",
      tasks: "id, disciplineId, dueDate",
      attendance: "id, disciplineId, date",
      grades: "id, disciplineId",
      books: "id, status",
      bookTexts: "bookId",
      cards: "id, disciplineId, lessonId, due",
      questions: "id, disciplineId, lessonId",
      hours: "id, kind, date",
      internships: "id",
      fieldNotes: "id, internshipId, date",
      reports: "id, internshipId",
      aiOutputs: "id, disciplineId, lessonId, action",
      aiLog: "id, at",
      calendar: "id, date",
      images: "id",
      files: "id",
      settings: "key",
    });
  }
}

export const db = new DomeniDB();

/** Tabelas com dados da pessoa (entram no backup e no "apagar tudo"). */
export const DATA_TABLES = [
  "semesters",
  "disciplines",
  "lessons",
  "pages",
  "recordings",
  "reviews",
  "tasks",
  "attendance",
  "grades",
  "books",
  "bookTexts",
  "cards",
  "questions",
  "hours",
  "internships",
  "fieldNotes",
  "reports",
  "aiOutputs",
  "aiLog",
  "calendar",
  "images",
  "files",
] as const;
export type DataTableName = (typeof DATA_TABLES)[number];
