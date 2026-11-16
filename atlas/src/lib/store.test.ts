import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { eraseEverything, exportBackup, parseBackup, restoreBackup } from "./backup";
import { db } from "./db";
import {
  createDiscipline,
  createLesson,
  createSemester,
  createTask,
  deleteDiscipline,
  deleteSemester,
  getSettings,
  markReview,
  reopenReview,
  saveSettings,
  updateLesson,
} from "./store";

async function seed() {
  const semester = await createSemester({ number: 5, start: "2026-08-03", end: "2026-12-11" });
  const discipline = await createDiscipline({ semesterId: semester.id, name: "  Avaliação  " });
  const lesson = await createLesson({ disciplineId: discipline.id, title: "Entrevista", date: "2026-11-10" });
  return { semester, discipline, lesson };
}

const dueDates = async (lessonId: string) =>
  (await db.reviews.where("lessonId").equals(lessonId).sortBy("dueDate")).map((r) => r.dueDate);

beforeEach(async () => {
  await eraseEverything();
});

describe("banco local", () => {
  it("cria a aula já com as revisões em 1, 7 e 30 dias", async () => {
    const { discipline, lesson } = await seed();
    expect(discipline.name).toBe("Avaliação");
    expect(lesson.number).toBe(1);
    expect(await dueDates(lesson.id)).toEqual(["2026-11-11", "2026-11-17", "2026-12-10"]);
    const second = await createLesson({ disciplineId: discipline.id });
    expect(second.number).toBe(2);
    expect(await dueDates(second.id)).toEqual([]);
  });

  it("não cria revisões para aula do tipo prova", async () => {
    const { discipline } = await seed();
    const exam = await createLesson({ disciplineId: discipline.id, date: "2026-11-20", type: "prova" });
    expect(exam.reviewsOn).toBe(false);
    expect(await dueDates(exam.id)).toEqual([]);
  });

  it("reagenda ao mudar a data e ao mudar os intervalos nos Ajustes", async () => {
    const { lesson } = await seed();
    await updateLesson(lesson.id, { date: "2026-11-12" });
    expect(await dueDates(lesson.id)).toEqual(["2026-11-13", "2026-11-19", "2026-12-12"]);
    await saveSettings({ reviewIntervals: [2, 10] });
    expect(await dueDates(lesson.id)).toEqual(["2026-11-14", "2026-11-22"]);
    expect((await getSettings()).reviewIntervals).toEqual([2, 10]);
  });

  it("marca revisão como Difícil com reforço e desfaz", async () => {
    const { lesson } = await seed();
    const [r1] = await db.reviews.where("lessonId").equals(lesson.id).sortBy("dueDate");
    // R2 vence dia 17; reforço de 3 dias a partir do dia 11 cairia no dia 14
    const result = await markReview(r1.id, "dificil", "2026-11-11");
    expect(result.reinforcedOn).toBe("2026-11-14");
    expect(await dueDates(lesson.id)).toEqual(["2026-11-11", "2026-11-14", "2026-11-17", "2026-12-10"]);
    await reopenReview(r1.id);
    expect(await dueDates(lesson.id)).toEqual(["2026-11-11", "2026-11-17", "2026-12-10"]);
    expect((await db.reviews.get(r1.id))?.doneAt).toBeUndefined();
  });

  it("apaga em cascata disciplina e semestre", async () => {
    const { semester, discipline, lesson } = await seed();
    await createTask({ disciplineId: discipline.id, title: "P2", type: "prova", dueDate: "2026-11-25" });
    await saveSettings({ currentSemesterId: semester.id });
    await deleteDiscipline(discipline.id);
    expect(await db.lessons.count()).toBe(0);
    expect(await db.reviews.count()).toBe(0);
    expect(await db.tasks.count()).toBe(0);
    expect(await db.lessons.get(lesson.id)).toBeUndefined();

    const again = await createDiscipline({ semesterId: semester.id, name: "Outra" });
    await createLesson({ disciplineId: again.id, date: "2026-11-10" });
    await deleteSemester(semester.id);
    expect(await db.semesters.count()).toBe(0);
    expect(await db.disciplines.count()).toBe(0);
    expect(await db.reviews.count()).toBe(0);
    expect((await getSettings()).currentSemesterId).toBeNull();
  });

  it("exporta e restaura um backup idêntico", async () => {
    const { lesson } = await seed();
    await updateLesson(lesson.id, { notes: "<p>Transferência</p>", feynman: "Explicação" });
    await saveSettings({ accent: "rosa", reviewIntervals: [1, 7, 30, 60] });
    const before = await exportBackup();
    const text = JSON.stringify(before);

    await eraseEverything();
    expect(await db.lessons.count()).toBe(0);

    await restoreBackup(parseBackup(text));
    const after = await exportBackup();
    expect(after.data).toEqual(before.data);
    expect(after.data.lessons[0].notes).toBe("<p>Transferência</p>");
    expect(after.data.reviews).toHaveLength(4);
  });

  it("distribui cores diferentes entre as disciplinas do semestre", async () => {
    const { semester } = await seed();
    const b = await createDiscipline({ semesterId: semester.id, name: "B" });
    const c = await createDiscipline({ semesterId: semester.id, name: "C" });
    expect(new Set(["indigo", b.color, c.color]).size).toBe(3);
  });
});
