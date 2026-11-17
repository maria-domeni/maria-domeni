import Dexie, { type EntityTable, type Table } from "dexie";
import type { Discipline, ImageRecord, Lesson, Review, Semester, Settings, Task } from "./types";

export interface SettingsRow {
  key: "app";
  value: Partial<Settings>;
}

export class AtlasDB extends Dexie {
  semesters!: EntityTable<Semester, "id">;
  disciplines!: EntityTable<Discipline, "id">;
  lessons!: EntityTable<Lesson, "id">;
  reviews!: EntityTable<Review, "id">;
  tasks!: EntityTable<Task, "id">;
  images!: EntityTable<ImageRecord, "id">;
  settings!: Table<SettingsRow, "app">;

  constructor(name = "atlas") {
    super(name);
    this.version(1).stores({
      semesters: "id, number",
      disciplines: "id, semesterId, status",
      lessons: "id, disciplineId, date",
      reviews: "id, lessonId, dueDate",
      tasks: "id, disciplineId, dueDate",
      settings: "key",
    });
    // v2: imagens guardadas no aparelho; disciplinas ganham emoji e capa
    this.version(2)
      .stores({ images: "id" })
      .upgrade((tx) =>
        tx
          .table("disciplines")
          .toCollection()
          .modify((discipline: Partial<Discipline>) => {
            discipline.emoji ??= "";
            discipline.coverImageId ??= null;
          }),
      );
  }
}

export const db = new AtlasDB();

export const DATA_TABLES = [
  "semesters",
  "disciplines",
  "lessons",
  "reviews",
  "tasks",
  "images",
] as const;
export type DataTableName = (typeof DATA_TABLES)[number];
