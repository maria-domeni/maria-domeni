import { describe, expect, it } from "vitest";
import { parseBackup, BackupError } from "./backup";
import { addDays, diffDays, formatRelative, isISODate, weekdayOf, weekProgress } from "./dates";
import { completeReview, dueQueue, lessonDifficulty, planReviews, undoReview } from "./reviews";
import { parseHash } from "./router";
import { normalizeIntervals, normalizeSettings } from "./settings";
import { buildToday, resolveCurrentSemester, type TodayInput } from "./today";
import type { Discipline, Lesson, Review, Semester, Task } from "./types";

let counter = 0;
const id = () => `id-${++counter}`;

const lesson = (over: Partial<Lesson> = {}): Lesson => ({
  id: id(),
  disciplineId: "d1",
  number: 1,
  title: "Aula",
  date: "2026-11-10",
  type: "teorica",
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
  reviewsOn: true,
  createdAt: "",
  updatedAt: "",
  ...over,
});

const discipline = (over: Partial<Discipline> = {}): Discipline => ({
  id: "d1",
  semesterId: "s1",
  name: "Avaliação Psicológica",
  professor: "",
  color: "indigo",
  status: "andamento",
  weekdays: [],
  startTime: "",
  endTime: "",
  room: "",
  ementa: "",
  notebookLmUrl: "",
  theaUrl: "",
  createdAt: "",
  updatedAt: "",
  ...over,
});

describe("datas", () => {
  it("soma dias atravessando mês, ano e horário de verão", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-11-10", 30)).toBe("2026-12-10");
  });

  it("calcula diferença em dias e dia da semana", () => {
    expect(diffDays("2026-11-10", "2026-11-17")).toBe(7);
    expect(diffDays("2026-11-17", "2026-11-10")).toBe(-7);
    expect(weekdayOf("2026-11-16")).toBe(1); // segunda-feira
  });

  it("valida datas", () => {
    expect(isISODate("2026-11-16")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("16/11/2026")).toBe(false);
    expect(isISODate(null)).toBe(false);
  });

  it("descreve datas em relação a hoje", () => {
    const today = "2026-11-16";
    expect(formatRelative("2026-11-16", today)).toBe("hoje");
    expect(formatRelative("2026-11-17", today)).toBe("amanhã");
    expect(formatRelative("2026-11-15", today)).toBe("ontem");
    expect(formatRelative("2026-11-19", today)).toBe("em 3 dias");
    expect(formatRelative("2026-11-14", today)).toBe("há 2 dias");
  });

  it("calcula a semana do semestre", () => {
    expect(weekProgress("2026-08-03", "2026-12-11", "2026-08-03")).toMatchObject({ week: 1, total: 19 });
    expect(weekProgress("2026-08-03", "2026-12-11", "2026-11-16")).toMatchObject({ week: 16, total: 19 });
    expect(weekProgress("2026-08-03", "2026-12-11", "2026-12-20")).toBeNull();
    expect(weekProgress(undefined, "2026-12-11", "2026-11-16")).toBeNull();
  });
});

describe("revisão espaçada", () => {
  it("cria R1, R2 e R3 a partir da data da aula", () => {
    const l = lesson({ date: "2026-11-10" });
    const ops = planReviews(l, [], [1, 7, 30], id);
    expect(ops.put.map((r) => r.dueDate)).toEqual(["2026-11-11", "2026-11-17", "2026-12-10"]);
    expect(ops.put.map((r) => r.step)).toEqual([0, 1, 2]);
    expect(ops.removeIds).toEqual([]);
  });

  it("não faz nada quando já está tudo certo", () => {
    const l = lesson();
    const first = planReviews(l, [], [1, 7, 30], id);
    const second = planReviews(l, first.put, [1, 7, 30], id);
    expect(second.put).toEqual([]);
    expect(second.removeIds).toEqual([]);
  });

  it("move só as revisões pendentes quando a data da aula muda", () => {
    const l = lesson({ date: "2026-11-10" });
    const reviews = planReviews(l, [], [1, 7, 30], id).put;
    reviews[0] = { ...reviews[0], doneAt: "2026-11-11", difficulty: "medio" };
    const ops = planReviews({ ...l, date: "2026-11-12" }, reviews, [1, 7, 30], id);
    expect(ops.put.map((r) => [r.step, r.dueDate])).toEqual([
      [1, "2026-11-19"],
      [2, "2026-12-12"],
    ]);
  });

  it("remove pendentes quando a aula fica sem data ou com revisão desligada", () => {
    const l = lesson();
    const reviews = planReviews(l, [], [1, 7, 30], id).put;
    reviews[0] = { ...reviews[0], doneAt: "2026-11-11", difficulty: "facil" };
    const off = planReviews({ ...l, reviewsOn: false }, reviews, [1, 7, 30], id);
    expect(off.removeIds).toEqual([reviews[1].id, reviews[2].id]);
    const noDate = planReviews({ ...l, date: null }, reviews, [1, 7, 30], id);
    expect(noDate.removeIds).toEqual([reviews[1].id, reviews[2].id]);
  });

  it("acompanha a mudança dos intervalos nos Ajustes", () => {
    const l = lesson({ date: "2026-11-10" });
    const reviews = planReviews(l, [], [1, 7, 30], id).put;
    const ops = planReviews(l, reviews, [2, 10], id);
    expect(ops.put.map((r) => [r.step, r.dueDate])).toEqual([
      [0, "2026-11-12"],
      [1, "2026-11-20"],
    ]);
    expect(ops.removeIds).toEqual([reviews[2].id]);
  });

  it("agenda reforço quando marcada como Difícil", () => {
    const l = lesson({ date: "2026-11-10" });
    const reviews = planReviews(l, [], [1, 7, 30], id).put;
    reviews[0] = { ...reviews[0], doneAt: "2026-11-11", difficulty: "medio" };
    const ops = completeReview(reviews[1], "dificil", "2026-11-17", reviews, 3, id);
    expect(ops.put).toHaveLength(2);
    expect(ops.put[0]).toMatchObject({ doneAt: "2026-11-17", difficulty: "dificil" });
    expect(ops.put[1]).toMatchObject({ kind: "reforco", dueDate: "2026-11-20", parentId: reviews[1].id });
  });

  it("não agenda reforço se outra revisão já chega nesse prazo, se desligado ou se não foi Difícil", () => {
    const l = lesson({ date: "2026-11-10" });
    const reviews = planReviews(l, [], [1, 3, 30], id).put;
    // R2 vence em 13/11; reforço seria 14/11
    expect(completeReview(reviews[0], "dificil", "2026-11-11", reviews, 3, id).put).toHaveLength(1);
    const spaced = planReviews(l, [], [1, 7, 30], id).put;
    expect(completeReview(spaced[0], "dificil", "2026-11-11", spaced, 0, id).put).toHaveLength(1);
    expect(completeReview(spaced[0], "medio", "2026-11-11", spaced, 3, id).put).toHaveLength(1);
    // R1 ainda pendente e atrasada: ela mesma já cobra a aula antes do reforço
    expect(completeReview(spaced[1], "dificil", "2026-11-17", spaced, 3, id).put).toHaveLength(1);
  });

  it("desfaz a revisão e remove o reforço pendente", () => {
    const l = lesson({ date: "2026-11-10" });
    const reviews = planReviews(l, [], [1, 7, 30], id).put;
    reviews[0] = { ...reviews[0], doneAt: "2026-11-11", difficulty: "medio" };
    const done = completeReview(reviews[1], "dificil", "2026-11-17", reviews, 3, id);
    const all = [reviews[0], done.put[0], reviews[2], done.put[1]];
    const ops = undoReview(done.put[0], all);
    expect(ops.put[0].doneAt).toBeUndefined();
    expect(ops.put[0].difficulty).toBeUndefined();
    expect(ops.removeIds).toEqual([done.put[1].id]);
  });

  it("usa a revisão mais recente como dificuldade da aula", () => {
    const base: Review = { id: "a", lessonId: "l", step: 0, kind: "regular", dueDate: "2026-11-11" };
    expect(lessonDifficulty([base])).toBeNull();
    expect(
      lessonDifficulty([
        { ...base, doneAt: "2026-11-11", difficulty: "dificil" },
        { ...base, id: "b", step: 1, doneAt: "2026-11-17", difficulty: "facil" },
      ]),
    ).toBe("facil");
  });

  it("ordena a fila: Difícil, nunca revisada, Médio, Fácil — a mais atrasada antes", () => {
    const mk = (lessonId: string, step: number, dueDate: string, over: Partial<Review> = {}): Review => ({
      id: `${lessonId}-${step}`,
      lessonId,
      step,
      kind: "regular",
      dueDate,
      ...over,
    });
    const reviews = [
      mk("facil", 0, "2026-11-01", { doneAt: "2026-11-01", difficulty: "facil" }),
      mk("facil", 1, "2026-11-08"),
      mk("nova", 0, "2026-11-15"),
      mk("nova-antiga", 0, "2026-11-12"),
      mk("dificil", 0, "2026-11-05", { doneAt: "2026-11-05", difficulty: "dificil" }),
      mk("dificil", 1, "2026-11-16"),
      mk("medio", 0, "2026-11-05", { doneAt: "2026-11-05", difficulty: "medio" }),
      mk("medio", 1, "2026-11-12"),
      mk("futura", 0, "2026-11-20"),
    ];
    expect(dueQueue(reviews, "2026-11-16").map((r) => r.lessonId)).toEqual([
      "dificil",
      "nova-antiga",
      "nova",
      "medio",
      "facil",
    ]);
  });
});

describe("tela Hoje", () => {
  const semesters: Semester[] = [
    { id: "s1", number: 5, start: "2026-08-03", end: "2026-12-11", createdAt: "", updatedAt: "" },
  ];
  const base = (over: Partial<TodayInput> = {}): TodayInput => ({
    today: "2026-11-16",
    nowTime: "10:00",
    semesters,
    disciplines: [discipline({ weekdays: [1], startTime: "19:00", endTime: "22:30" })],
    lessons: [],
    reviews: [],
    tasks: [],
    ...over,
  });
  const task = (over: Partial<Task> = {}): Task => ({
    id: id(),
    disciplineId: "d1",
    title: "Prova P2",
    type: "prova",
    dueDate: "2026-11-25",
    done: false,
    notes: "",
    createdAt: "",
    updatedAt: "",
    ...over,
  });

  it("pede para montar o semestre quando não há disciplinas", () => {
    const model = buildToday(base({ disciplines: [] }));
    expect(model.nextStep.kind).toBe("comecar");
  });

  it("mostra a disciplina de hoje pela grade quando a aula ainda não foi criada", () => {
    const model = buildToday(base());
    expect(model.scheduledWithoutLesson.map((d) => d.id)).toEqual(["d1"]);
    expect(model.nextStep).toMatchObject({ kind: "criar-aula", disciplineId: "d1" });
  });

  it("não sugere aula fora do período do semestre nem de disciplina concluída", () => {
    expect(buildToday(base({ today: "2026-12-14" })).scheduledWithoutLesson).toEqual([]);
    const done = base({ disciplines: [discipline({ weekdays: [1], status: "concluida" })] });
    expect(buildToday(done).scheduledWithoutLesson).toEqual([]);
  });

  it("prioriza a leitura prévia da aula de hoje, depois a revisão vencida", () => {
    const today = lesson({ id: "hoje", date: "2026-11-16", reading: "Cap. 3, p. 45–60" });
    const old = lesson({ id: "antiga", date: "2026-11-09", title: "Entrevista" });
    const reviews = planReviews(old, [], [1, 7, 30], id).put;
    const model = buildToday(base({ lessons: [today, old], reviews }));
    expect(model.nextStep).toMatchObject({ kind: "leitura", href: "#/aula/hoje/antes" });
    expect(model.dueReviews.map((r) => r.overdueDays)).toEqual([6, 0]);

    const afterReading = buildToday(
      base({ lessons: [{ ...today, readingDone: true }, old], reviews }),
    );
    expect(afterReading.nextStep).toMatchObject({ kind: "revisao", href: "#/aula/antiga/revisao" });
    expect(afterReading.nextStep.detail).toContain("mais 1 na fila");
  });

  it("sugere o Feynman só depois que a aula de hoje terminou", () => {
    const today = lesson({ id: "hoje", date: "2026-11-16" });
    expect(buildToday(base({ lessons: [today], nowTime: "20:00" })).nextStep.kind).toBe("livre");
    expect(buildToday(base({ lessons: [today], nowTime: "22:45" })).nextStep).toMatchObject({
      kind: "feynman",
      href: "#/aula/hoje/depois",
    });
  });

  it("lista prazos dos próximos 14 dias e destaca os urgentes", () => {
    const tasks = [
      task({ title: "Longe", dueDate: "2026-12-05" }),
      task({ title: "Perto", dueDate: "2026-11-18" }),
      task({ title: "Feito", dueDate: "2026-11-17", done: true }),
      task({ title: "Vencido", dueDate: "2026-11-14" }),
    ];
    const model = buildToday(base({ tasks, lessons: [lesson({ date: "2026-11-16" })] }));
    expect(model.deadlines.map((t) => t.title)).toEqual(["Vencido", "Perto"]);
    expect(model.nextStep).toMatchObject({ kind: "prazo", title: "Vencido", eyebrow: "Prazo vencido" });
  });

  it("escolhe o semestre atual", () => {
    const list: Semester[] = [
      { id: "s4", number: 4, start: "2026-02-09", end: "2026-06-30", createdAt: "", updatedAt: "" },
      ...semesters,
    ];
    expect(resolveCurrentSemester(list, { currentSemesterId: null }, "2026-11-16")?.id).toBe("s1");
    expect(resolveCurrentSemester(list, { currentSemesterId: "s4" }, "2026-11-16")?.id).toBe("s4");
    expect(resolveCurrentSemester(list, { currentSemesterId: null }, "2027-01-10")?.id).toBe("s1");
    expect(resolveCurrentSemester([], { currentSemesterId: null }, "2026-11-16")).toBeNull();
  });
});

describe("ajustes", () => {
  it("limpa os intervalos de revisão", () => {
    expect(normalizeIntervals([30, 1, 7, 7, 0, -2, "x"])).toEqual([1, 7, 30]);
    expect(normalizeIntervals([])).toEqual([1, 7, 30]);
    expect(normalizeIntervals("1,7")).toEqual([1, 7, 30]);
  });

  it("completa ajustes incompletos com os padrões", () => {
    const s = normalizeSettings({ theme: "roxo" as never, totalSemesters: 99, hardReinforceDays: -1 });
    expect(s.theme).toBe("auto");
    expect(s.totalSemesters).toBe(20);
    expect(s.hardReinforceDays).toBe(0);
    expect(s.reviewIntervals).toEqual([1, 7, 30]);
  });
});

describe("rotas", () => {
  it("interpreta os endereços do app", () => {
    expect(parseHash("")).toEqual({ name: "hoje" });
    expect(parseHash("#/")).toEqual({ name: "hoje" });
    expect(parseHash("#/cadernos")).toEqual({ name: "cadernos" });
    expect(parseHash("#/disciplina/abc")).toEqual({ name: "disciplina", id: "abc" });
    expect(parseHash("#/aula/abc")).toEqual({ name: "aula", id: "abc", tab: null });
    expect(parseHash("#/aula/abc/revisao")).toEqual({ name: "aula", id: "abc", tab: "revisao" });
    expect(parseHash("#/aula/abc/xyz")).toEqual({ name: "aula", id: "abc", tab: null });
    expect(parseHash("#/nada")).toEqual({ name: "desconhecida" });
  });
});

describe("backup", () => {
  const valid = {
    app: "atlas",
    formatVersion: 1,
    exportedAt: "2026-11-16T12:00:00.000Z",
    data: {
      semesters: [{ id: "s1", number: 5, start: "2026-08-03", end: "2026-12-11" }],
      disciplines: [
        { id: "d1", semesterId: "s1", name: "Psicodinâmica", color: "rosa", weekdays: [2, 2, 9] },
        { id: "d-orfa", semesterId: "nao-existe", name: "Órfã" },
      ],
      lessons: [
        { id: "l1", disciplineId: "d1", title: "Transferência", date: "2026-11-10", notes: "<p>oi</p>" },
        { id: "l-orfa", disciplineId: "d-orfa", title: "Some" },
      ],
      reviews: [
        { id: "r1", lessonId: "l1", step: 0, kind: "regular", dueDate: "2026-11-11", doneAt: "2026-11-11", difficulty: "dificil" },
        { id: "r-ruim", lessonId: "l1", step: 1, kind: "regular", dueDate: "amanhã" },
      ],
      tasks: [{ id: "t1", disciplineId: "d-orfa", title: "Seminário", type: "seminario", dueDate: "2026-11-30" }],
      settings: { reviewIntervals: [2, 14], currentSemesterId: "sumiu" },
    },
  };

  it("lê um backup válido, completa campos e descarta registros órfãos", () => {
    const file = parseBackup(JSON.stringify(valid));
    expect(file.data.disciplines).toHaveLength(1);
    expect(file.data.disciplines[0]).toMatchObject({ color: "rosa", weekdays: [2], status: "andamento" });
    expect(file.data.lessons).toHaveLength(1);
    expect(file.data.lessons[0]).toMatchObject({ reviewsOn: true, attended: null, feynman: "" });
    expect(file.data.reviews.map((r) => r.id)).toEqual(["r1"]);
    expect(file.data.tasks[0].disciplineId).toBeNull();
    expect(file.data.settings.reviewIntervals).toEqual([2, 14]);
    expect(file.data.settings.currentSemesterId).toBeNull();
  });

  it("recusa arquivos que não são backup do Atlas", () => {
    expect(() => parseBackup("não é json")).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ app: "outro", data: {} }))).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ ...valid, formatVersion: 99 }))).toThrow(/versão mais nova/);
    expect(() =>
      parseBackup(JSON.stringify({ ...valid, data: { ...valid.data, lessons: [{ title: "sem id" }] } })),
    ).toThrow(BackupError);
  });
});
