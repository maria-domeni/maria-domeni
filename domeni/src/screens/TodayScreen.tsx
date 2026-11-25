"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CalendarPlus, ChartColumnBig, Check, ChevronRight, Headphones, Layers, Library, MapPin, NotebookPen, Plus, Repeat2, UserRound } from "lucide-react";
import { useState } from "react";
import { Character } from "@/components/avatar/Character";
import { OnboardingSheet } from "@/components/forms/Onboarding";
import { TaskSheet } from "@/components/forms/Sheets";
import { setMusicOpen } from "@/components/shell/music";
import { Page, ScreenSkeleton } from "@/components/shell/Page";
import { Button, Card, Link, Section, cx, tint } from "@/components/ui/basics";
import { useToast } from "@/components/ui/overlays";
import { classesOn, summarizeAbsences, type ClassOccurrence } from "@/lib/academics";
import { greeting, speak } from "@/lib/alerts";
import { countdownTo } from "@/lib/calendar";
import { db } from "@/lib/db";
import { addDays, diffDays, formatLong, formatRelative, formatShort, formatWeekday, weekProgress } from "@/lib/dates";
import { useNowMs, useNowTime, useSettingsOrDefault, useToday } from "@/lib/hooks";
import { navigate } from "@/lib/router";
import { createLesson, saveAttendance, updateTask } from "@/lib/store";
import { resolveCurrentSemester } from "@/lib/today";
import { TASK_TYPE_LABEL, type Discipline, type Task } from "@/lib/types";
import { useBrain } from "@/lib/useBrain";

/** Abre (ou cria) a página da aula de uma disciplina numa data. */
export async function openLessonOn(discipline: Discipline, date: string): Promise<void> {
  const existing = await db.lessons
    .where("disciplineId")
    .equals(discipline.id)
    .filter((l) => l.date === date)
    .first();
  const lesson = existing ?? (await createLesson({ disciplineId: discipline.id, date }));
  navigate(`#/aula/${lesson.id}`);
}

export default function TodayScreen() {
  const today = useToday();
  const nowTime = useNowTime();
  const nowMs = useNowMs();
  const settings = useSettingsOrDefault();
  const brain = useBrain();
  const toast = useToast();
  const [onboarding, setOnboarding] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  const data = useLiveQuery(async () => {
    const [semesters, disciplines, tasks, attendance, reviews, cards, calendar] = await Promise.all([
      db.semesters.toArray(),
      db.disciplines.toArray(),
      db.tasks.toArray(),
      db.attendance.toArray(),
      db.reviews.where("dueDate").belowOrEqual(today).toArray(),
      db.cards.where("due").belowOrEqual(today).count(),
      db.calendar.where("date").equals(today).toArray(),
    ]);
    return { semesters, disciplines, tasks, attendance, reviews: reviews.filter((r) => !r.doneAt), cards, calendar };
  }, [today]);

  if (!data || today === "2000-01-01") return <ScreenSkeleton />;

  const semester = resolveCurrentSemester(data.semesters, settings, today);
  const disciplines = data.disciplines.filter((d) => !semester || d.semesterId === semester.id);
  const classes = classesOn(today, disciplines, data.semesters);
  const progress = semester ? weekProgress(semester.start, semester.end, today) : null;
  const firstName = settings.profileName.trim().split(/\s+/)[0];
  const isNew = data.semesters.length === 0 && !settings.onboarded;

  const countdowns = data.tasks
    .filter((t) => !t.done && t.countdown && diffDays(today, t.dueDate) >= 0 && diffDays(today, t.dueDate) <= 90)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.time.localeCompare(b.time))
    .slice(0, 8);
  const week = data.tasks
    .filter((t) => !t.done && t.dueDate >= addDays(today, -7) && t.dueDate <= addDays(today, 14))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const disciplineById = new Map(data.disciplines.map((d) => [d.id, d]));
  const topAlert = brain.alerts[0];

  async function markAbsent(occ: ClassOccurrence, absent: boolean) {
    await saveAttendance({
      disciplineId: occ.discipline.id,
      date: today,
      absences: absent ? occ.slot.classes : 0,
      classes: occ.slot.classes,
      professor: occ.slot.professor,
    });
    if (absent) {
      const summary = summarizeAbsences(occ.discipline, await db.attendance.toArray(), settings);
      toast(
        summary.remaining !== null
          ? `Falta marcada. Restam ${Math.max(0, summary.remaining)} aulas de falta em ${occ.discipline.name}.`
          : "Falta marcada.",
      );
    }
  }

  return (
    <Page
      title={`${nowTime < "12:00" ? "Bom dia" : nowTime < "18:00" ? "Boa tarde" : "Boa noite"}${firstName ? `, ${firstName}` : ""}`}
      eyebrow={formatLong(today)}
      subtitle={
        semester ? (
          <span>
            {semester.number}º semestre{progress ? ` · semana ${progress.week} de ${progress.total}` : ""}
          </span>
        ) : null
      }
      actions={
        <Button size="sm" icon={Plus} onClick={() => setTaskOpen(true)}>
          Compromisso
        </Button>
      }
    >
      {isNew ? (
        <Card className="mt-6 px-6 pt-8 pb-7 text-center">
          <Character config={settings.avatar} size={96} className="mx-auto" mood="feliz" />
          <h2 className="mt-3 font-display text-[24px] leading-8 font-semibold">Bem-vinda ao Domeni</h2>
          <p className="mx-auto mt-2 max-w-[46ch] text-[15.5px] leading-6 text-label-2">
            Cadernos, agenda, notas, faltas e biblioteca num lugar só, com {settings.avatar.name} te acompanhando.
            Vamos montar o seu semestre? Leva um minuto.
          </p>
          <Button className="mt-5" size="lg" onClick={() => setOnboarding(true)}>
            Começar
          </Button>
        </Card>
      ) : null}

      {!isNew ? (
        <Card className="mt-5 flex items-center gap-4 p-4 pr-5">
          <Character config={settings.avatar} mood={brain.mood} size={64} className="flex-none" background="var(--fill)" />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium text-label-2">{settings.avatar.name}</p>
            <p className="mt-0.5 text-[15.5px] leading-[22px] font-medium">
              {topAlert
                ? speak(settings.avatar.tone, topAlert, settings.profileName)
                : greeting(settings.avatar.tone, settings.profileName, nowTime)}
            </p>
            {topAlert?.href ? (
              <Link to={topAlert.href} className="mt-1 inline-block text-[14px] font-semibold text-accent">
                {topAlert.action ?? "Ver"} →
              </Link>
            ) : null}
          </div>
        </Card>
      ) : null}

      {countdowns.length > 0 ? (
        <Section title="Contagem regressiva">
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:-mx-8 md:px-8">
            {countdowns.map((task) => (
              <CountdownCard key={task.id} task={task} discipline={disciplineById.get(task.disciplineId ?? "")} nowMs={nowMs} today={today} />
            ))}
          </div>
        </Section>
      ) : null}

      {disciplines.length > 0 || data.calendar.length > 0 ? (
        <Section title="Aulas de hoje">
          {classes.length === 0 && data.calendar.length === 0 ? (
            <Card className="px-5 py-4 text-[15px] text-label-2">Sem aula hoje pela sua grade.</Card>
          ) : (
            <Card className="divide-y divide-sep overflow-hidden">
              {classes.map((occ) => {
                const record = data.attendance.find((a) => a.disciplineId === occ.discipline.id && a.date === today);
                const absent = (record?.absences ?? 0) > 0;
                const over = occ.slot.end !== "" && nowTime > occ.slot.end;
                const live = occ.slot.start !== "" && nowTime >= occ.slot.start && !over;
                return (
                  <div key={`${occ.discipline.id}-${occ.slot.id}`} className={cx("flex items-stretch", over && "opacity-60")}>
                    <div {...tint(occ.discipline.color, "my-3 ml-4 w-[3px] flex-none rounded-full bg-dc")} />
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                      <div className="w-[56px] flex-none">
                        <p className="text-[15.5px] leading-5 font-semibold tabular-nums">{occ.slot.start || "—"}</p>
                        <p className="text-[12.5px] text-label-3 tabular-nums">{occ.slot.end}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15.5px] leading-6 font-semibold">
                          {occ.discipline.name}
                          {live ? <span className="ml-2 align-middle text-[12px] font-semibold text-success">agora</span> : null}
                        </p>
                        <p className="flex flex-wrap gap-x-3 text-[13px] text-label-2">
                          {occ.slot.professor ? (
                            <span className="inline-flex items-center gap-1">
                              <UserRound size={13} strokeWidth={2.4} /> {occ.slot.professor}
                            </span>
                          ) : null}
                          {occ.slot.room ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={13} strokeWidth={2.4} /> {occ.slot.room}
                            </span>
                          ) : null}
                          <span>{occ.slot.classes} aulas</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void markAbsent(occ, !absent)}
                          aria-pressed={absent}
                          className={cx(
                            "pressable inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-[13.5px] font-semibold",
                            absent ? "bg-danger-soft text-danger" : "bg-fill text-label-2",
                          )}
                        >
                          {absent ? <Check size={14} strokeWidth={2.6} /> : null}
                          {absent ? "Faltei" : "Faltei?"}
                        </button>
                        <Button size="sm" icon={NotebookPen} onClick={() => void openLessonOn(occ.discipline, today)}>
                          Anotar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {data.calendar.map((event) => (
                <div key={event.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="my-0.5 w-[3px] self-stretch rounded-full bg-[#6b93c7]" />
                  <div className="w-[56px] flex-none text-[15.5px] font-semibold tabular-nums">{event.allDay ? "dia" : event.time}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{event.title}</p>
                    <p className="text-[13px] text-label-2">Google Agenda</p>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </Section>
      ) : null}

      <Section
        title="Para fazer"
       
        action={
          <Link to="#/agenda" className="text-[14px] font-medium text-accent">
            Ver agenda
          </Link>
        }
      >
        <Card className="divide-y divide-sep overflow-hidden">
          {data.reviews.length > 0 ? (
            <Link to="#/revisoes" className="row-pressable flex items-center gap-3 px-4 py-3">
              <Repeat2 size={18} strokeWidth={1.9} className="text-label-2" />
              <span className="flex-1 font-medium">
                {data.reviews.length} {data.reviews.length === 1 ? "revisão de aula" : "revisões de aula"} para hoje
              </span>
              <ChevronRight size={17} className="text-label-3" />
            </Link>
          ) : null}
          {data.cards > 0 ? (
            <Link to="#/estudar" className="row-pressable flex items-center gap-3 px-4 py-3">
              <Layers size={18} strokeWidth={1.9} className="text-label-2" />
              <span className="flex-1 font-medium">{data.cards} flashcards para revisar</span>
              <ChevronRight size={17} className="text-label-3" />
            </Link>
          ) : null}
          {week.map((task) => (
            <TaskLine key={task.id} task={task} today={today} discipline={disciplineById.get(task.disciplineId ?? "")} />
          ))}
          {data.reviews.length === 0 && data.cards === 0 && week.length === 0 ? (
            <div className="px-4 py-4 text-[15px] text-label-2">
              Nada pendente nos próximos dias.{" "}
              <button type="button" onClick={() => setTaskOpen(true)} className="font-medium text-accent">
                Adicionar prova ou entrega
              </button>
            </div>
          ) : null}
        </Card>
      </Section>

      <Section title="Atalhos" className="mb-4">
        <Card className="grid grid-cols-2 divide-sep overflow-hidden sm:grid-cols-4 sm:divide-x">
          {[
            { label: "Música", icon: Headphones, onClick: () => setMusicOpen(true) },
            { label: "Flashcards", icon: Layers, onClick: () => navigate("#/estudar") },
            { label: "Biblioteca", icon: Library, onClick: () => navigate("#/biblioteca") },
            { label: "Notas e faltas", icon: ChartColumnBig, onClick: () => navigate("#/desempenho") },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="row-pressable flex items-center gap-2.5 px-4 py-3 text-left text-[14.5px] font-medium"
            >
              <item.icon size={18} strokeWidth={1.9} className="text-label-2" />
              {item.label}
            </button>
          ))}
        </Card>
        {!settings.spotifyUrl ? (
          <p className="mt-2 text-[13px] text-label-3">
            Para ouvir música aqui, cole o link de uma playlist do Spotify em{" "}
            <Link to="#/ajustes/integracoes" className="font-medium text-accent">
              Ajustes
            </Link>
            .
          </p>
        ) : null}
      </Section>

      <OnboardingSheet open={onboarding} onClose={() => setOnboarding(false)} />
      <TaskSheet open={taskOpen} onClose={() => setTaskOpen(false)} disciplines={disciplines} />
    </Page>
  );
}

function CountdownCard({
  task,
  discipline,
  nowMs,
  today,
}: {
  task: Task;
  discipline: Discipline | undefined;
  nowMs: number;
  today: string;
}) {
  const left = countdownTo(task.dueDate, task.time, nowMs);
  const days = diffDays(today, task.dueDate);
  const t = tint(discipline?.color ?? "rosa", "card w-[180px] flex-none snap-start px-4 py-3.5");
  return (
    <div className={t.className} style={t.style}>
      <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-label-2">
        <span className="size-2 rounded-full bg-dc" />
        {TASK_TYPE_LABEL[task.type]}
      </p>
      <p className="mt-1 line-clamp-2 min-h-[42px] text-[15px] leading-[21px] font-semibold">{task.title}</p>
      <p className="mt-2 text-[32px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
        {days === 0 ? "Hoje" : days}
        {days > 0 ? <span className="ml-1 text-[14px] font-medium tracking-normal text-label-2">{days === 1 ? "dia" : "dias"}</span> : null}
      </p>
      <p className="mt-1.5 text-[12.5px] text-label-2">
        {formatWeekday(task.dueDate)}, {formatShort(task.dueDate, today)}
        {task.time ? ` · ${task.time}` : ""}
        {days === 0 ? ` · ${left.label}` : ""}
      </p>
      {discipline ? <p className="truncate text-[12.5px] text-label-3">{discipline.name}</p> : null}
    </div>
  );
}

export function TaskLine({ task, today, discipline }: { task: Task; today: string; discipline?: Discipline }) {
  const delta = diffDays(today, task.dueDate);
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button
        type="button"
        aria-label={task.done ? "Marcar como não feito" : "Marcar como feito"}
        onClick={() => void updateTask(task.id, { done: !task.done })}
        className={cx(
          "pressable inline-flex size-[22px] flex-none items-center justify-center rounded-full border-[1.5px]",
          task.done ? "border-accent bg-accent-solid text-on-accent" : "border-label-3",
        )}
      >
        {task.done ? <Check size={13} strokeWidth={3} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cx("truncate font-medium", task.done && "text-label-3 line-through")}>
          {task.title}
          <span className="ml-1.5 text-[12.5px] font-normal text-label-3">{TASK_TYPE_LABEL[task.type]}</span>
        </p>
        <p className={cx("text-[13px]", delta < 0 ? "font-semibold text-danger" : "text-label-2")}>
          {formatShort(task.dueDate, today)} · {formatRelative(task.dueDate, today)}
          {task.time ? ` · ${task.time}` : ""}
          {discipline ? ` · ${discipline.name}` : ""}
        </p>
      </div>
      <a
        href={`#/agenda`}
        aria-label="Ver na agenda"
        className="row-pressable inline-flex size-8 flex-none items-center justify-center rounded-[8px] text-label-3"
      >
        <CalendarPlus size={16} strokeWidth={1.9} />
      </a>
    </div>
  );
}
