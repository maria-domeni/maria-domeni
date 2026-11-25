import { describe, expect, it } from "vitest";
import { classesOn, nextClassOf, parseDecimal, scheduleText, summarizeAbsences, summarizeGrades } from "./academics";
import { buildAlerts, moodFor, speak, type AlertInput } from "./alerts";
import { countdownTo, googleCalendarLink, isGoogleIcsUrl, monthGrid, parseIcs, tasksToIcs } from "./calendar";
import { colorVariants, contrast, isHexColor } from "./color";
import { addDays, diffDays, formatRelative, isISODate, weekdayOf, weekProgress } from "./dates";
import { base64ToBytes, bytesToBase64, imageIdsInHtml } from "./images";
import { completeReview, dueQueue, lessonDifficulty, planReviews, undoReview } from "./reviews";
import { parseHash } from "./router";
import { fold, htmlToText, keywordsOf, scoreText, snippetAround } from "./search";
import { appearanceAttributes, cleanUrl, normalizeAvatar, normalizeIntervals, normalizeSettings, THEME_PRESETS } from "./settings";
import { dueCards, scheduleCard } from "./srs";
import {
  DEFAULT_SETTINGS,
  defaultCover,
  type Attendance,
  type ClassSlot,
  type Discipline,
  type Flashcard,
  type Grade,
  type Lesson,
  type Review,
  type Semester,
  type Task,
} from "./types";

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
  transcript: "",
  paper: null,
  paperColor: null,
  reviewsOn: true,
  createdAt: "",
  updatedAt: "",
  ...over,
});

const slot = (over: Partial<ClassSlot> = {}): ClassSlot => ({
  id: id(),
  weekday: 1,
  start: "19:00",
  end: "22:30",
  professor: "Profa. Ana",
  room: "",
  classes: 4,
  ...over,
});

const discipline = (over: Partial<Discipline> = {}): Discipline => ({
  id: "d1",
  semesterId: "s1",
  name: "Psicodinâmica",
  kind: "regular",
  professors: ["Profa. Ana", "Prof. Bruno"],
  color: "rosa",
  emoji: "",
  cover: defaultCover("#f4b6c8"),
  status: "andamento",
  slots: [slot({ weekday: 1, professor: "Profa. Ana" }), slot({ weekday: 3, professor: "Prof. Bruno" })],
  absenceLimit: null,
  passingGrade: null,
  ementa: "",
  notebookLmUrl: "",
  theaUrl: "",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "",
  ...over,
});

const semester = (over: Partial<Semester> = {}): Semester => ({
  id: "s1",
  number: 5,
  start: "2026-08-03",
  end: "2026-12-12",
  cover: defaultCover("#f4b6c8"),
  createdAt: "",
  updatedAt: "",
  ...over,
});

const absence = (date: string, absences: number, disciplineId = "d1"): Attendance => ({
  id: id(),
  disciplineId,
  date,
  absences,
  classes: 4,
  professor: "",
  note: "",
  createdAt: "",
});

const grade = (name: string, weight: number, value: number | null): Grade => ({
  id: id(),
  disciplineId: "d1",
  name,
  weight,
  value,
  date: null,
  professor: "",
  createdAt: "",
  updatedAt: "",
});

const rules = { ...DEFAULT_SETTINGS, defaultAbsenceLimit: 40, classesPerDay: 4, passingGrade: 6, gradeMax: 10 };

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

describe("cores livres", () => {
  it("reconhece cores no formato #rrggbb", () => {
    expect(isHexColor("#a1B2c3")).toBe(true);
    expect(isHexColor("#abc")).toBe(false);
    expect(isHexColor("rosa")).toBe(false);
    expect(isHexColor(null)).toBe(false);
  });

  it("deriva versões legíveis no claro e no escuro para qualquer cor", () => {
    for (const hex of ["#ffe066", "#000000", "#ffffff", "#7c3aed", "#00e5ff", "#ff0055", "#808080"]) {
      const { light, dark } = colorVariants(hex);
      expect(contrast(light, "#ffffff"), `${hex} no claro`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(dark, "#1b1b1f"), `${hex} no escuro`).toBeGreaterThanOrEqual(5.5);
    }
  });

  it("não mexe em cores que já têm contraste suficiente", () => {
    expect(colorVariants("#4f46e5").light).toBe("#4f46e5");
  });
});

describe("imagens", () => {
  it("converte bytes para base64 e de volta", () => {
    const bytes = new Uint8Array(70_000).map((_, i) => (i * 31) % 256);
    const back = new Uint8Array(base64ToBytes(bytesToBase64(bytes.buffer)));
    expect(back.length).toBe(bytes.length);
    expect(back.every((b, i) => b === bytes[i])).toBe(true);
  });

  it("encontra as imagens citadas em uma anotação", () => {
    const html = '<p>oi</p><img data-image-id="a1" data-size="m" alt=""><img data-image-id="b2" alt="">';
    expect(imageIdsInHtml(html)).toEqual(["a1", "b2"]);
    expect(imageIdsInHtml("<p>sem imagem</p>")).toEqual([]);
  });
});


describe("grade horária", () => {
  it("mostra as aulas do dia com professor e hora", () => {
    // 2026-11-16 é segunda-feira
    const list = classesOn("2026-11-16", [discipline()], [semester()]);
    expect(list).toHaveLength(1);
    expect(list[0].slot.professor).toBe("Profa. Ana");
    expect(classesOn("2026-11-18", [discipline()], [semester()])[0].slot.professor).toBe("Prof. Bruno");
    expect(classesOn("2026-11-17", [discipline()], [semester()])).toHaveLength(0);
  });

  it("não conta aula fora do período do semestre nem de disciplina concluída", () => {
    expect(classesOn("2026-12-14", [discipline()], [semester()])).toHaveLength(0);
    expect(classesOn("2026-11-16", [discipline({ status: "concluida" })], [semester()])).toHaveLength(0);
  });

  it("acha a próxima aula e descreve a grade", () => {
    expect(nextClassOf(discipline(), "2026-11-17", semester())?.date).toBe("2026-11-18");
    expect(scheduleText(discipline(), ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"])).toBe("Seg e Qua · 19:00–22:30");
  });
});

describe("faltas", () => {
  it("soma as faltas e calcula quanto ainda pode faltar, em aulas e em dias", () => {
    const records = [absence("2026-11-16", 4), absence("2026-11-18", 2)];
    const s = summarizeAbsences(discipline(), records, rules);
    expect(s.used).toBe(6);
    expect(s.limit).toBe(40);
    expect(s.remaining).toBe(34);
    expect(s.remainingDays).toBe(8);
    expect(s.level).toBe("ok");
  });

  it("avisa quando falta menos de um dia de aula e quando estoura", () => {
    const many = Array.from({ length: 9 }, (_, i) => absence(addDays("2026-08-03", i * 7), 4));
    expect(summarizeAbsences(discipline(), many, rules).level).toBe("atencao");
    const risk = [...many, absence("2026-11-30", 2)];
    expect(summarizeAbsences(discipline(), risk, rules).level).toBe("risco");
    const over = [...many, absence("2026-11-30", 4), absence("2026-12-02", 4)];
    expect(summarizeAbsences(discipline(), over, rules).level).toBe("estourou");
  });

  it("estágio não entra no limite e a disciplina pode ter a própria regra", () => {
    const records = [absence("2026-11-16", 4)];
    expect(summarizeAbsences(discipline({ kind: "estagio" }), records, rules).level).toBe("estagio");
    expect(summarizeAbsences(discipline({ absenceLimit: 20 }), records, rules).limit).toBe(20);
    expect(summarizeAbsences(discipline(), records, { ...rules, defaultAbsenceLimit: null }).level).toBe("sem-limite");
  });
});

describe("notas", () => {
  it("calcula a média ponderada e a nota necessária no que falta", () => {
    const s = summarizeGrades(discipline(), [grade("P1", 4, 5), grade("P2", 4, null), grade("Trabalho", 2, 8)], rules);
    expect(s.current).toBeCloseTo(6);
    // 6*10 = 60; já tem 5*4 + 8*2 = 36; faltam 24 em peso 4 → 6
    expect(s.needed).toBe(6);
    expect(s.status).toBe("no-caminho");
  });

  it("diz quando já passou, quando não fecha e quando falta a regra", () => {
    expect(summarizeGrades(discipline(), [grade("P1", 3, 9), grade("P2", 1, null)], rules).status).toBe("aprovada");
    expect(summarizeGrades(discipline(), [grade("P1", 1, 9), grade("P2", 1, null)], rules).status).toBe("no-caminho");
    expect(summarizeGrades(discipline(), [grade("P1", 3, 0), grade("P2", 1, null)], rules).status).toBe("impossivel");
    expect(summarizeGrades(discipline(), [grade("P1", 1, 7)], { ...rules, passingGrade: null }).status).toBe("sem-regra");
    expect(summarizeGrades(discipline(), [], rules).status).toBe("sem-notas");
  });

  it("lê notas com vírgula", () => {
    expect(parseDecimal("7,5")).toBe(7.5);
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
  });
});

describe("agenda", () => {
  it("monta o mês em semanas de segunda a domingo", () => {
    const grid = monthGrid(2026, 10); // novembro de 2026
    expect(grid[0]).toBe("2026-10-26");
    expect(grid.length % 7).toBe(0);
    expect(grid).toContain("2026-11-30");
  });

  it("conta os dias até a prova", () => {
    const now = new Date(2026, 10, 18, 10, 0).getTime();
    expect(countdownTo("2026-11-25", "19:00", now).days).toBe(7);
    expect(countdownTo("2026-11-18", "13:00", now).label).toBe("em 3 h");
  });

  it("gera link do Google Agenda e arquivo .ics com aviso", () => {
    const link = googleCalendarLink({ title: "Prova P1", date: "2026-11-25", time: "19:00" });
    expect(link).toContain("calendar.google.com");
    expect(link).toContain("20261125T190000%2F20261125T200000");
    const task: Task = {
      id: "t1",
      disciplineId: null,
      title: "Prova, P1",
      type: "prova",
      dueDate: "2026-11-25",
      time: "",
      remindMinutes: 1440,
      countdown: true,
      done: false,
      notes: "",
      createdAt: "",
      updatedAt: "",
    };
    const ics = tasksToIcs([task], () => "", "2026-11-18T10:00:00.000Z");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261125");
    expect(ics).toContain("SUMMARY:Prova\\, P1");
    expect(ics).toContain("TRIGGER:-PT1440M");
  });

  it("lê a agenda iCal do Google, com repetição semanal e exceções", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:aula",
      "DTSTART:20261102T220000Z",
      "DTEND:20261103T013000Z",
      "RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=4",
      "EXDATE:20261109T220000Z",
      "SUMMARY:Supervisão",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:feriado",
      "DTSTART;VALUE=DATE:20261120",
      "DTEND;VALUE=DATE:20261121",
      "SUMMARY:Feriado da Consciência\\, Negra",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const events = parseIcs(ics, "2026-11-01", "2026-12-31");
    const aulas = events.filter((e) => e.title === "Supervisão");
    expect(aulas.map((e) => e.date)).toEqual(["2026-11-02", "2026-11-16", "2026-11-23"]);
    expect(aulas[0].time).toBe("19:00");
    const feriado = events.find((e) => e.date === "2026-11-20");
    expect(feriado?.allDay).toBe(true);
    expect(feriado?.title).toBe("Feriado da Consciência, Negra");
  });

  it("só aceita o endereço iCal do Google", () => {
    expect(isGoogleIcsUrl("https://calendar.google.com/calendar/ical/abc%40group/private-123/basic.ics")).toBe(true);
    expect(isGoogleIcsUrl("https://exemplo.com/calendar/ical/x.ics")).toBe(false);
    expect(isGoogleIcsUrl("http://calendar.google.com/calendar/ical/x.ics")).toBe(false);
  });
});

describe("personagem", () => {
  const base = (over: Partial<AlertInput> = {}): AlertInput => ({
    today: "2026-11-15",
    nowTime: "10:00",
    settings: rules,
    semesters: [semester()],
    disciplines: [discipline()],
    lessons: [],
    reviews: [],
    tasks: [],
    attendance: [],
    grades: [],
    books: [],
    cards: [],
    hours: [],
    currentSemester: semester(),
    ...over,
  });

  it("avisa que não pode faltar amanhã quando restam menos aulas que um dia", () => {
    const many = Array.from({ length: 9 }, (_, i) => absence(addDays("2026-08-03", i * 7), 4));
    const alerts = buildAlerts(base({ attendance: [...many, absence("2026-11-11", 2)] }));
    const risk = alerts.find((a) => a.id.startsWith("faltas-risco"));
    expect(risk?.level).toBe("urgente");
    expect(risk?.text).toContain("Amanhã tem Psicodinâmica");
    expect(moodFor(alerts, "10:00")).toBe("preocupada");
  });

  it("cobra a nota mínima, as provas próximas e as horas complementares", () => {
    const task: Task = {
      id: "p1",
      disciplineId: "d1",
      title: "P2",
      type: "prova",
      dueDate: "2026-11-18",
      time: "19:00",
      remindMinutes: null,
      countdown: true,
      done: false,
      notes: "",
      createdAt: "",
      updatedAt: "",
    };
    const alerts = buildAlerts(
      base({
        grades: [grade("P1", 1, 4), grade("P2", 1, null)],
        tasks: [task],
        settings: { ...rules, requiredComplementary: 200, totalSemesters: 10 },
        hours: [{ id: "h", kind: "complementar", title: "Congresso", date: "2026-10-01", hours: 20, notes: "", createdAt: "" }],
      }),
    );
    expect(alerts.find((a) => a.id === "nota-d1")?.text).toContain("média 8");
    expect(alerts.find((a) => a.id === "prova-p1")?.level).toBe("urgente");
    expect(alerts.find((a) => a.id === "horas-complementar")?.text).toContain("Faltam 180");
  });

  it("pede para configurar as regras em vez de inventar", () => {
    const alerts = buildAlerts(base({ settings: { ...rules, defaultAbsenceLimit: null } }));
    expect(alerts.some((a) => a.id === "regra-faltas")).toBe(true);
  });

  it("fala do jeito escolhido", () => {
    const alert = { text: "Revise a aula.", level: "urgente" as const };
    expect(speak("carinhosa", alert, "Maria Eduarda")).toBe("Ei, Maria, com carinho: Revise a aula.");
    expect(speak("direta", alert, "Maria")).toBe("Revise a aula.");
  });
});

describe("flashcards", () => {
  const card = (over: Partial<Flashcard> = {}): Flashcard => ({
    id: id(),
    disciplineId: null,
    lessonId: null,
    front: "O que é a posição esquizoparanoide?",
    back: "…",
    due: "2026-11-18",
    interval: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    source: "manual",
    createdAt: "",
    ...over,
  });

  it("aumenta o intervalo quando acerta e volta para amanhã quando erra", () => {
    const first = scheduleCard(card(), "bom", "2026-11-18");
    expect(first.due).toBe("2026-11-19");
    const second = scheduleCard(first, "bom", "2026-11-19");
    expect(second.interval).toBe(5);
    const wrong = scheduleCard(second, "errei", "2026-11-24");
    expect(wrong.due).toBe("2026-11-25");
    expect(wrong.lapses).toBe(1);
  });

  it("lista só os cartões vencidos", () => {
    expect(dueCards([card({ due: "2026-11-20" }), card({ due: "2026-11-18" })], "2026-11-18")).toHaveLength(1);
  });
});

describe("busca local", () => {
  it("ignora acentos e palavras comuns da pergunta", () => {
    expect(fold("Esquizoparanóide")).toBe("esquizoparanoide");
    expect(keywordsOf("Tenho algum livro que fala sobre a posição esquizoparanóide?")).toEqual(["posicao", "esquizoparanoide"]);
  });

  it("encontra trechos e pontua o texto", () => {
    const text = htmlToText("<h2>Klein</h2><p>A posição esquizoparanoide aparece nos primeiros meses.</p>");
    expect(text).toContain("Klein\nA posição");
    expect(scoreText(text, ["esquizoparanoide"])).toBeGreaterThan(0);
    expect(snippetAround(text, ["esquizoparanoide"], 10)).toContain("esquizoparanoide");
  });
});

describe("ajustes", () => {
  it("limpa os intervalos de revisão", () => {
    expect(normalizeIntervals([30, "7", 1, 1, -2, 999])).toEqual([1, 7, 30]);
    expect(normalizeIntervals("x")).toEqual([1, 7, 30]);
  });

  it("completa ajustes incompletos e não inventa regras da faculdade", () => {
    const s = normalizeSettings({ profileName: "Maria" });
    expect(s.profileName).toBe("Maria");
    expect(s.defaultAbsenceLimit).toBeNull();
    expect(s.passingGrade).toBeNull();
    expect(s.classesPerDay).toBe(4);
    expect(normalizeSettings({ defaultAbsenceLimit: 40 }).defaultAbsenceLimit).toBe(40);
  });

  it("aplica estilos prontos e valida o tema", () => {
    const attrs = appearanceAttributes({ ...DEFAULT_SETTINGS, ...THEME_PRESETS.noite.values }).attrs;
    expect(attrs["data-theme"]).toBe("dark");
    expect(attrs["data-tone"]).toBe("neutro");
    expect(attrs["data-font"]).toBe("sistema");
    const custom = appearanceAttributes({ ...DEFAULT_SETTINGS, accent: "personalizada", customAccent: "#ffcc00" });
    expect(custom.vars["--accent-l"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(normalizeSettings({ theme: "roxo" as never }).theme).toBe("auto");
  });

  it("valida personagem e links", () => {
    const avatar = normalizeAvatar({ name: "", species: "dragao" as never, color: "red" });
    expect(avatar.name).toBe("Mimi");
    expect(avatar.species).toBe("gato");
    expect(avatar.color).toBe("#efe4d8");
    expect(cleanUrl("javascript:alert(1)")).toBe("");
    expect(cleanUrl("http://open.spotify.com/x")).toBe("");
    expect(cleanUrl(" https://open.spotify.com/playlist/abc ")).toBe("https://open.spotify.com/playlist/abc");
  });
});

describe("rotas", () => {
  it("interpreta os endereços do app", () => {
    expect(parseHash("")).toEqual({ name: "hoje" });
    expect(parseHash("#/disciplina/abc/faltas")).toEqual({ name: "disciplina", id: "abc", tab: "faltas" });
    expect(parseHash("#/aula/x/folha")).toEqual({ name: "aula", id: "x", tab: "folha" });
    expect(parseHash("#/biblioteca/b1/34")).toEqual({ name: "biblioteca", id: "b1", page: 34 });
    expect(parseHash("#/ajustes/regras")).toEqual({ name: "ajustes", section: "regras" });
    expect(parseHash("#/busca/klein")).toEqual({ name: "busca", q: "klein" });
    expect(parseHash("#/nada")).toEqual({ name: "desconhecida" });
  });
});
