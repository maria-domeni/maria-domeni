import Dexie, { type EntityTable, type Table } from "dexie";
import type { Discipline, Lesson, Review, Semester, Settings, Task } from "./types";

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
  }
}

export const db = new AtlasDB();

export const DATA_TABLES = ["semesters", "disciplines", "lessons", "reviews", "tasks"] as const;
export type DataTableName = (typeof DATA_TABLES)[number];
