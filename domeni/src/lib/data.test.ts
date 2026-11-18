import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { exportBackup, parseBackup, restoreBackup, BackupError } from "./backup";
import { db } from "./db";
import {
  createBook,
  createCards,
  createDiscipline,
  createGrade,
  createLesson,
  createSemester,
  deleteDiscipline,
  saveAttendance,
  saveFile,
  savePageLayer,
  saveSettings,
} from "./store";

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("dados no aparelho", () => {
  it("registra faltas por dia e apaga ao voltar para presente", async () => {
    const s = await createSemester({ number: 5 });
    const d = await createDiscipline({ semesterId: s.id, name: "Psicodinâmica" });
    await saveAttendance({ disciplineId: d.id, date: "2026-11-16", absences: 4, classes: 4 });
    await saveAttendance({ disciplineId: d.id, date: "2026-11-16", absences: 2, classes: 4 });
    expect((await db.attendance.toArray()).map((a) => a.absences)).toEqual([2]);
    await saveAttendance({ disciplineId: d.id, date: "2026-11-16", absences: 0, classes: 4 });
    expect(await db.attendance.count()).toBe(0);
  });

  it("apaga tudo da disciplina junto com ela", async () => {
    const s = await createSemester({ number: 5 });
    const d = await createDiscipline({ semesterId: s.id, name: "Psicodinâmica" });
    const lesson = await createLesson({ disciplineId: d.id, date: "2026-11-16" });
    await savePageLayer(lesson.id, { strokes: [{ id: "x", tool: "caneta", color: "#000", size: 3, points: [1, 2, 0.5] }] });
    await createGrade({ disciplineId: d.id, name: "P1", weight: 1, value: 7 });
    await saveAttendance({ disciplineId: d.id, date: "2026-11-16", absences: 4, classes: 4 });
    await createCards([{ front: "a", back: "b" }], { disciplineId: d.id, lessonId: lesson.id, source: "manual", today: "2026-11-16" });
    await deleteDiscipline(d.id);
    expect(await db.lessons.count()).toBe(0);
    expect(await db.pages.count()).toBe(0);
    expect(await db.grades.count()).toBe(0);
    expect(await db.attendance.count()).toBe(0);
    expect(await db.cards.count()).toBe(0);
    expect(await db.reviews.count()).toBe(0);
  });

  it("faz backup e restaura tudo, inclusive arquivos, sem levar o código da IA", async () => {
    const s = await createSemester({ number: 5 });
    const d = await createDiscipline({ semesterId: s.id, name: "Psicodinâmica", slots: [] });
    await createLesson({ disciplineId: d.id, title: "Klein", date: "2026-11-16" });
    const file = await saveFile(new Blob([new Uint8Array([1, 2, 3, 250])], { type: "application/pdf" }), "texto.pdf");
    await createBook({ title: "Inveja e gratidão", fileId: file.id });
    await saveSettings({ profileName: "Maria", aiAccessCode: "segredo", defaultAbsenceLimit: 40 });

    const backup = parseBackup(JSON.stringify(await exportBackup()));
    expect(backup.settings.aiAccessCode).toBe("");
    await Promise.all(db.tables.map((t) => t.clear()));
    await saveSettings({ aiAccessCode: "do-aparelho" });
    await restoreBackup(backup);

    expect((await db.lessons.toArray())[0].title).toBe("Klein");
    expect((await db.books.toArray())[0].title).toBe("Inveja e gratidão");
    const restored = await db.files.get(file.id);
    expect(Array.from(new Uint8Array(restored!.data))).toEqual([1, 2, 3, 250]);
    const settings = (await db.settings.get("app"))!.value;
    expect(settings.profileName).toBe("Maria");
    expect(settings.defaultAbsenceLimit).toBe(40);
    expect(settings.aiAccessCode).toBe("do-aparelho");
  });

  it("recusa arquivos que não são backup do Domeni", () => {
    expect(() => parseBackup("{}")).toThrow(BackupError);
    expect(() => parseBackup("não é json")).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ app: "domeni", formatVersion: 1, tables: { lessons: [{ title: "sem id" }] } }))).toThrow(BackupError);
  });
});
