"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ExternalLink, Minus, Palette, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AiStudio } from "@/components/ai/AiStudio";
import { MaterialsList } from "@/components/ai/MaterialsList";
import { DisciplineSheet, LessonSheet, TaskSheet } from "@/components/forms/Sheets";
import { CoverEditor } from "@/components/notebook/CoverEditor";
import { NotebookCover } from "@/components/notebook/NotebookCover";
import { Page, ScreenSkeleton, Tabs } from "@/components/shell/Page";
import { Button, Card, EmptyState, IconButton, Link, ProgressBar, Section, cx, safeUrl, tint } from "@/components/ui/basics";
import { TextInput } from "@/components/ui/fields";
import { useToast } from "@/components/ui/overlays";
import {
  absenceLimitOf,
  formatGrade,
  parseDecimal,
  scheduleText,
  slotsOn,
  summarizeAbsences,
  summarizeGrades,
} from "@/lib/academics";
import { db } from "@/lib/db";
import { addDays, diffDays, formatShort, formatWeekday, todayISO, weekdayOf } from "@/lib/dates";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { reviewLabel } from "@/lib/reviews";
import { navigate, type DisciplineTab } from "@/lib/router";
import { createGrade, deleteGrade, saveAttendance, updateDiscipline, updateGrade } from "@/lib/store";
import {
  DIFFICULTY_LABEL,
  LESSON_TYPE_LABEL,
  WEEKDAY_SHORT,
  type Attendance,
  type Discipline,
  type Grade,
  type Review,
  type Semester,
  type Settings,
  type Task,
} from "@/lib/types";
import { TaskLine } from "./TodayScreen";

export default function DisciplineScreen({ id, tab }: { id: string; tab: DisciplineTab | null }) {
  const today = useToday();
  const settings = useSettingsOrDefault();
  const [editOpen, setEditOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [taskSheet, setTaskSheet] = useState<{ open: boolean; task?: Task }>({ open: false });
  const current: DisciplineTab = tab ?? "aulas";

  const data = useLiveQuery(async () => {
    const discipline = (await db.disciplines.get(id)) ?? null;
    if (!discipline) return { discipline: null };
    const [semester, lessons, tasks, attendance, grades, outputs] = await Promise.all([
      db.semesters.get(discipline.semesterId),
      db.lessons.where("disciplineId").equals(id).toArray(),
      db.tasks.where("disciplineId").equals(id).toArray(),
      db.attendance.where("disciplineId").equals(id).toArray(),
      db.grades.where("disciplineId").equals(id).toArray(),
      db.aiOutputs.where("disciplineId").equals(id).count(),
    ]);
    const reviews = await db.reviews.where("lessonId").anyOf(lessons.map((l) => l.id)).toArray();
    return { discipline, semester, lessons, tasks, attendance, grades, reviews, outputs };
  }, [id]);

  if (!data) return <ScreenSkeleton />;
  if (!data.discipline) {
    return (
      <Page title="Disciplina" back={{ to: "#/cadernos", label: "Cadernos" }}>
        <div className="mt-6">
          <EmptyState title="Essa disciplina não existe mais" />
        </div>
      </Page>
    );
  }
  const { discipline, semester, lessons, tasks, attendance, grades, reviews } = data;
  const absences = summarizeAbsences(discipline, attendance, settings);
  const gradeSummary = summarizeGrades(discipline, grades, settings);
  const go = (t: DisciplineTab) => navigate(`#/disciplina/${id}/${t}`, { replace: true });

  return (
    <Page
      title={discipline.name}
      back={{ to: `#/semestre/${discipline.semesterId}`, label: semester ? `${semester.number}º semestre` : "Semestre" }}
      wide
      titleSlot={
        <div className="flex items-end gap-4 pt-1">
          <button type="button" onClick={() => setCoverOpen(true)} className="lift w-[64px] flex-none sm:w-[76px]" aria-label="Personalizar capa">
            <NotebookCover cover={discipline.cover} title={discipline.name} />
          </button>
          <div className="min-w-0 flex-1 pb-0.5">
            <p className="text-[13px] font-medium text-label-2">
              {discipline.kind === "estagio" ? "Estágio" : "Disciplina"}
              {discipline.professors.length > 0 ? ` · ${discipline.professors.join(" e ")}` : ""}
            </p>
            <h1 className="font-display text-[30px] leading-[38px] font-semibold break-words">
              {discipline.emoji ? <span className="mr-2 font-sans">{discipline.emoji}</span> : null}
              {discipline.name}
            </h1>
            <p className="mt-0.5 text-[14px] text-label-2">{scheduleText(discipline, WEEKDAY_SHORT) || "Sem horário cadastrado"}</p>
          </div>
        </div>
      }
      actions={
        <>
          <IconButton icon={Palette} label="Personalizar capa" onClick={() => setCoverOpen(true)} filled />
          <IconButton icon={Pencil} label="Editar disciplina" onClick={() => setEditOpen(true)} filled />
        </>
      }
    >
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Aulas" value={String(lessons.length)} />
        <Stat
          label="Faltas"
          value={absences.limit !== null ? `${absences.used}/${absences.limit}` : discipline.kind === "estagio" ? "-" : String(absences.used)}
          tone={absences.level === "risco" || absences.level === "estourou" ? "red" : absences.level === "atencao" ? "yellow" : undefined}
          onClick={() => go("faltas")}
        />
        <Stat label="Média" value={formatGrade(gradeSummary.current)} onClick={() => go("notas")} />
        <Stat label="Materiais" value={String(data.outputs)} onClick={() => go("materiais")} />
      </div>

      <Tabs
        className="mt-5"
        value={current}
        onChange={go}
        tabs={[
          { value: "aulas", label: "Aulas", badge: lessons.length || undefined },
          { value: "faltas", label: "Faltas" },
          { value: "notas", label: "Notas" },
          { value: "materiais", label: "Estudar com IA" },
        ]}
      />

      {current === "aulas" ? (
        <>
          <Section
            title="Aulas"
            action={
              <Button size="sm" icon={Plus} onClick={() => setLessonOpen(true)}>
                Nova aula
              </Button>
            }
            className="mt-5"
          >
            {lessons.length === 0 ? (
              <Card className="px-5 py-5 text-[15px] text-label-2">
                Cada aula é uma página infinita: escreva no teclado, com a Apple Pencil, cole fotos e adesivos.
              </Card>
            ) : (
              <LessonList lessons={lessons} reviews={reviews} today={today} discipline={discipline} />
            )}
          </Section>
          <Section
            title="Provas e entregas"
            action={
              <Button size="sm" variant="tinted" icon={Plus} onClick={() => setTaskSheet({ open: true })}>
                Adicionar
              </Button>
            }
          >
            {tasks.length === 0 ? (
              <Card className="px-5 py-4 text-[15px] text-label-2">Provas e entregas desta disciplina aparecem aqui, na agenda e na contagem regressiva.</Card>
            ) : (
              <Card className="divide-y divide-sep">
                {[...tasks]
                  .sort((a, b) => Number(a.done) - Number(b.done) || a.dueDate.localeCompare(b.dueDate))
                  .map((task) => (
                    <button key={task.id} type="button" className="block w-full text-left" onClick={() => setTaskSheet({ open: true, task })}>
                      <TaskLine task={task} today={today} />
                    </button>
                  ))}
              </Card>
            )}
          </Section>
          {discipline.notebookLmUrl || discipline.theaUrl || discipline.ementa ? (
            <Section title="Links e ementa">
              <Card className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  {safeUrl(discipline.notebookLmUrl) ? (
                    <a href={safeUrl(discipline.notebookLmUrl) as string} target="_blank" rel="noopener noreferrer" className="pressable inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-accent-soft px-3.5 text-[14px] font-semibold text-accent">
                      NotebookLM <ExternalLink size={14} />
                    </a>
                  ) : null}
                  {safeUrl(discipline.theaUrl) ? (
                    <a href={safeUrl(discipline.theaUrl) as string} target="_blank" rel="noopener noreferrer" className="pressable inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-accent-soft px-3.5 text-[14px] font-semibold text-accent">
                      Thea <ExternalLink size={14} />
                    </a>
                  ) : null}
                </div>
                {discipline.ementa ? <p className="text-[15px] leading-[22px] whitespace-pre-wrap text-label-2">{discipline.ementa}</p> : null}
              </Card>
            </Section>
          ) : null}
        </>
      ) : null}

      {current === "faltas" ? (
        <AttendanceTab discipline={discipline} semester={semester} attendance={attendance} settings={settings} today={today} />
      ) : null}

      {current === "notas" ? <GradesTab discipline={discipline} grades={grades} settings={settings} /> : null}

      {current === "materiais" ? (
        <>
          <Section title="Estudar com IA" className="mt-5">
            <AiStudio discipline={discipline} lessons={lessons} />
          </Section>
          <Section title="Materiais guardados">
            <MaterialsList disciplineId={discipline.id} />
          </Section>
        </>
      ) : null}

      <DisciplineSheet open={editOpen} onClose={() => setEditOpen(false)} semesterId={discipline.semesterId} discipline={discipline} />
      <LessonSheet open={lessonOpen} onClose={() => setLessonOpen(false)} discipline={discipline} />
      <TaskSheet
        open={taskSheet.open}
        task={taskSheet.task}
        onClose={() => setTaskSheet({ open: false })}
        disciplines={[discipline]}
        defaultDisciplineId={discipline.id}
      />
      {coverOpen ? (
        <CoverEditor
          open
          onClose={() => setCoverOpen(false)}
          value={discipline.cover}
          title={`${discipline.emoji ? `${discipline.emoji} ` : ""}${discipline.name}`}
          onSave={(cover) => updateDiscipline(discipline.id, { cover })}
        />
      ) : null}
    </Page>
  );
}

function Stat({ label, value, tone, onClick }: { label: string; value: string; tone?: "red" | "yellow"; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="card pressable px-4 py-3 text-left"
    >
      <p className="text-[12.5px] font-medium text-label-2">{label}</p>
      <p className={cx("text-[22px] leading-7 font-semibold tracking-[-0.02em] tabular-nums", tone === "red" && "text-danger", tone === "yellow" && "text-warning")}>{value}</p>
    </button>
  );
}

const DOT_BY_DIFFICULTY = { facil: "bg-success", medio: "bg-yellow", dificil: "bg-danger" } as const;

export function ReviewDots({ reviews, today }: { reviews: Review[]; today: string }) {
  const regular = reviews.filter((r) => r.kind === "regular").sort((a, b) => a.step - b.step);
  if (regular.length === 0) return null;
  const description = regular
    .map((r) => {
      const state = r.doneAt
        ? `feita (${DIFFICULTY_LABEL[r.difficulty ?? "medio"]})`
        : diffDays(r.dueDate, today) >= 0
          ? "vencida"
          : "agendada";
      return `${reviewLabel(r)} ${state}`;
    })
    .join(", ");
  return (
    <span className="flex items-center gap-1" role="img" aria-label={description} title={description}>
      {regular.map((r) => (
        <span
          key={r.id}
          className={cx(
            "size-2.5 rounded-full",
            r.doneAt ? DOT_BY_DIFFICULTY[r.difficulty ?? "medio"] : diffDays(r.dueDate, today) >= 0 ? "border-2 border-danger" : "bg-fill-2",
          )}
        />
      ))}
    </span>
  );
}

function LessonList({
  lessons,
  reviews,
  today,
  discipline,
}: {
  lessons: { id: string; number: number | null; title: string; date: string | null; type: keyof typeof LESSON_TYPE_LABEL; notes: string }[];
  reviews: Review[];
  today: string;
  discipline: Discipline;
}) {
  const sorted = [...lessons].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || (b.number ?? 0) - (a.number ?? 0));
  const byLesson = new Map<string, Review[]>();
  for (const r of reviews) byLesson.set(r.lessonId, [...(byLesson.get(r.lessonId) ?? []), r]);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sorted.map((lesson) => (
        <Link key={lesson.id} to={`#/aula/${lesson.id}`} className="card row-pressable flex items-center gap-3 px-3.5 py-3">
          <span {...tint(discipline.color, "inline-flex size-10 flex-none items-center justify-center rounded-[10px] bg-dc-soft text-[15px] font-semibold text-dc tabular-nums")}>
            {lesson.number ?? "•"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{lesson.title || "Aula sem título"}</span>
            <span className="block truncate text-[13px] text-label-2">
              {lesson.date ? `${formatWeekday(lesson.date)}, ${formatShort(lesson.date, today)}` : "Sem data"} · {LESSON_TYPE_LABEL[lesson.type]}
              {lesson.notes ? " · com anotações" : ""}
            </span>
          </span>
          <ReviewDots reviews={byLesson.get(lesson.id) ?? []} today={today} />
        </Link>
      ))}
    </div>
  );
}

/* ---------- Faltas ---------- */

function AttendanceTab({
  discipline,
  semester,
  attendance,
  settings,
  today,
}: {
  discipline: Discipline;
  semester: Semester | undefined;
  attendance: Attendance[];
  settings: Settings;
  today: string;
}) {
  const toast = useToast();
  const [extraDate, setExtraDate] = useState(today);
  const summary = summarizeAbsences(discipline, attendance, settings);
  const limit = absenceLimitOf(discipline, settings);

  // Dias de aula pela grade, do começo do semestre até hoje
  const startFrom = semester?.start ?? discipline.createdAt.slice(0, 10);
  const days: { date: string; classes: number; professor: string }[] = [];
  for (let date = today; date >= startFrom && days.length < 160; date = addDays(date, -1)) {
    if (semester?.end && date > semester.end) continue;
    const slots = slotsOn(discipline, weekdayOf(date));
    if (slots.length === 0) continue;
    days.push({ date, classes: slots.reduce((s, x) => s + x.classes, 0), professor: slots.map((s) => s.professor).filter(Boolean).join(" & ") });
  }
  const recordByDate = new Map(attendance.map((a) => [a.date, a]));
  for (const record of attendance) {
    if (!days.some((d) => d.date === record.date)) days.push({ date: record.date, classes: record.classes, professor: record.professor });
  }
  days.sort((a, b) => b.date.localeCompare(a.date));

  async function setAbsences(day: { date: string; classes: number; professor: string }, absences: number) {
    await saveAttendance({ disciplineId: discipline.id, date: day.date, absences, classes: day.classes, professor: day.professor });
    if (absences > 0 && summary.remaining !== null) {
      const remaining = summary.remaining - (absences - (recordByDate.get(day.date)?.absences ?? 0));
      toast(remaining >= 0 ? `Restam ${remaining} aulas de falta` : "Passou do limite de faltas");
    }
  }

  if (discipline.kind === "estagio") {
    return (
      <Card className="mt-5 px-5 py-5 text-[15px] leading-[22px] text-label-2">
        Estágios não entram na conta de faltas. Registre suas horas de estágio na tela <Link to="#/estagio" className="font-semibold text-accent">Estágio</Link>.
      </Card>
    );
  }

  return (
    <>
      <Card className="mt-5 px-5 py-5">
        {limit === null ? (
          <p className="text-[15px] leading-[22px]">
            Você já faltou <b>{summary.used}</b> aulas. Para eu calcular quanto ainda pode faltar, defina o limite em{" "}
            <Link to="#/ajustes/regras" className="font-semibold text-accent">Ajustes › Regras da faculdade</Link>.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-5">
            <Ring ratio={summary.ratio} danger={summary.level === "risco" || summary.level === "estourou"} label={`${summary.used}/${limit}`} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[22px] leading-7 font-semibold">
                {summary.level === "estourou"
                  ? "Passou do limite 😟"
                  : `Ainda pode faltar ${summary.remaining} ${summary.remaining === 1 ? "aula" : "aulas"}`}
              </p>
              <p className="mt-0.5 text-[15px] text-label-2">
                {summary.level === "estourou"
                  ? "Converse com a coordenação sobre a situação."
                  : `Isso dá ${summary.remainingDays} ${summary.remainingDays === 1 ? "dia" : "dias"} de aula (${summary.classesPerDay} aulas por dia).`}
              </p>
              <ProgressBar ratio={summary.ratio} className="mt-3" />
            </div>
          </div>
        )}
      </Card>

      <Section title="Dias de aula">
        {days.length === 0 ? (
          <Card className="px-5 py-4 text-[15px] text-label-2">Cadastre os horários da disciplina para os dias aparecerem aqui.</Card>
        ) : (
          <Card className="divide-y divide-sep">
            {days.map((day) => {
              const record = recordByDate.get(day.date);
              const value = record?.absences ?? 0;
              return (
                <div key={day.date} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-[92px] flex-none">
                    <p className="font-semibold">{formatShort(day.date, today)}</p>
                    <p className="text-[12.5px] text-label-3 capitalize">{formatWeekday(day.date)}</p>
                  </div>
                  <p className="min-w-0 flex-1 truncate text-[13.5px] text-label-2">{day.professor || `${day.classes} aulas`}</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Menos uma falta"
                      disabled={value === 0}
                      onClick={() => void setAbsences(day, value - 1)}
                      className="pressable inline-flex size-9 items-center justify-center rounded-full bg-fill disabled:opacity-30"
                    >
                      <Minus size={16} strokeWidth={2.6} />
                    </button>
                    <span className={cx("w-[74px] text-center text-[14px] font-semibold", value > 0 ? "text-danger" : "text-success")}>
                      {value === 0 ? "presente" : value === day.classes ? `faltei ${value}` : `${value} falta${value > 1 ? "s" : ""}`}
                    </span>
                    <button
                      type="button"
                      aria-label="Mais uma falta"
                      disabled={value >= day.classes}
                      onClick={() => void setAbsences(day, value + 1)}
                      className="pressable inline-flex size-9 items-center justify-center rounded-full bg-fill disabled:opacity-30"
                    >
                      <Plus size={16} strokeWidth={2.6} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void setAbsences(day, value === day.classes ? 0 : day.classes)}
                      className={cx("pressable ml-1 h-9 rounded-[8px] px-3 text-[13px] font-semibold", value === day.classes ? "bg-danger text-white" : "bg-danger-soft text-danger")}
                    >
                      Dia todo
                    </button>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TextInput type="date" value={extraDate} onChange={(e) => setExtraDate(e.target.value)} className="max-w-[180px]" />
          <Button
            variant="tinted"
            size="sm"
            icon={Plus}
            onClick={() =>
              void setAbsences(
                { date: extraDate || todayISO(), classes: settings.classesPerDay, professor: "" },
                (recordByDate.get(extraDate)?.absences ?? 0) + 1,
              )
            }
          >
            Falta em outro dia
          </Button>
        </div>
      </Section>
    </>
  );
}

function Ring({ ratio, danger, label }: { ratio: number; danger: boolean; label: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg width={88} height={88} viewBox="0 0 88 88" className="flex-none" aria-hidden>
      <circle cx={44} cy={44} r={r} fill="none" stroke="var(--fill-2)" strokeWidth={10} />
      <circle
        cx={44}
        cy={44}
        r={r}
        fill="none"
        stroke={danger ? "var(--danger)" : "var(--accent)"}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${c * Math.min(1, ratio)} ${c}`}
        transform="rotate(-90 44 44)"
      />
      <text x={44} y={49} textAnchor="middle" fontSize={16} fontWeight={800} fill="var(--label)">
        {label}
      </text>
    </svg>
  );
}

/* ---------- Notas ---------- */

function GradesTab({ discipline, grades, settings }: { discipline: Discipline; grades: Grade[]; settings: Settings }) {
  const summary = summarizeGrades(discipline, grades, settings);
  const sorted = [...grades].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const message: Record<typeof summary.status, string> = {
    "sem-notas": "Cadastre as avaliações (com peso) para eu calcular a média e quanto falta para passar.",
    "sem-regra": "Defina a média para passar em Ajustes › Regras da faculdade (ou nesta disciplina) para eu calcular quanto você precisa.",
    aprovada: "Pelas notas lançadas, você já passou! 🎉",
    "no-caminho": `Você está acima da média. Precisa de ${formatGrade(summary.needed)} no que falta para fechar.`,
    precisa: `Você precisa de média ${formatGrade(summary.needed)} nas avaliações que faltam.`,
    impossivel: "Pelas notas lançadas, não dá mais para fechar a média. Vale conversar com o professor sobre recuperação.",
  };
  return (
    <>
      <Card className="mt-5 flex flex-wrap items-center gap-5 px-5 py-5">
        <div>
          <p className="text-[12.5px] font-medium text-label-2">Média atual</p>
          <p className="font-display text-[44px] leading-none font-semibold">{formatGrade(summary.current)}</p>
          {summary.passing !== null ? <p className="mt-1 text-[13.5px] text-label-2">para passar: {formatGrade(summary.passing)}</p> : null}
        </div>
        <p
          className={cx(
            "min-w-[220px] flex-1 rounded-2xl px-4 py-3 text-[15px] leading-[21px] font-semibold",
            summary.status === "impossivel" ? "bg-danger-soft" : summary.status === "aprovada" ? "bg-success-soft" : "bg-accent-faint",
          )}
        >
          {message[summary.status]}
        </p>
      </Card>

      <Section
        title="Avaliações"
       
        action={
          <Button
            size="sm"
            icon={Plus}
            onClick={() => void createGrade({ disciplineId: discipline.id, name: `Avaliação ${grades.length + 1}`, weight: 1 })}
          >
            Avaliação
          </Button>
        }
      >
        {sorted.length === 0 ? (
          <Card className="px-5 py-4 text-[15px] text-label-2">Ex.: P1 (peso 4), P2 (peso 4), Trabalho (peso 2). Use os pesos da sua faculdade.</Card>
        ) : (
          <Card className="divide-y divide-sep">
            <div className="hidden grid-cols-[1fr_80px_90px_130px_40px] gap-2 px-4 py-2 text-[12px] font-medium text-label-3 sm:grid">
              <span>Avaliação</span>
              <span>Peso</span>
              <span>Nota</span>
              <span>Professor</span>
              <span />
            </div>
            {sorted.map((grade) => (
              <GradeRow key={grade.id} grade={grade} professors={discipline.professors} max={settings.gradeMax} />
            ))}
          </Card>
        )}
      </Section>
    </>
  );
}

function GradeRow({ grade, professors, max }: { grade: Grade; professors: string[]; max: number }) {
  const [name, setName] = useState(grade.name);
  const [weight, setWeight] = useState(String(grade.weight).replace(".", ","));
  const [value, setValue] = useState(grade.value === null ? "" : String(grade.value).replace(".", ","));
  const invalid = value !== "" && (parseDecimal(value) === null || (parseDecimal(value) as number) > max);
  return (
    <div className="grid grid-cols-[1fr_70px_80px_40px] items-center gap-2 px-3 py-2.5 sm:grid-cols-[1fr_80px_90px_130px_40px] sm:px-4">
      <TextInput value={name} onChange={(e) => setName(e.target.value)} onBlur={() => void updateGrade(grade.id, { name: name.trim() || grade.name })} aria-label="Nome da avaliação" />
      <TextInput
        inputMode="decimal"
        value={weight}
        onChange={(e) => setWeight(e.target.value.replace(/[^\d,.]/g, ""))}
        onBlur={() => void updateGrade(grade.id, { weight: Math.max(0, parseDecimal(weight) ?? 1) })}
        aria-label="Peso"
      />
      <TextInput
        inputMode="decimal"
        value={value}
        placeholder="-"
        onChange={(e) => setValue(e.target.value.replace(/[^\d,.]/g, ""))}
        onBlur={() => {
          if (!invalid) void updateGrade(grade.id, { value: parseDecimal(value) });
        }}
        aria-label="Nota"
        className={invalid ? "shadow-[0_0_0_2px_var(--danger)]" : undefined}
      />
      <select
        value={grade.professor}
        onChange={(e) => void updateGrade(grade.id, { professor: e.target.value })}
        aria-label="Professor"
        className="hidden h-11 rounded-[14px] bg-fill px-2 text-[14px] sm:block"
      >
        <option value="">-</option>
        {professors.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label="Apagar avaliação"
        onClick={() => void deleteGrade(grade.id)}
        className="pressable inline-flex size-10 items-center justify-center rounded-full text-label-3"
      >
        <Trash2 size={17} strokeWidth={2.3} />
      </button>
    </div>
  );
}
