"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CalendarPlus, Check, Clock, Headphones, MapPin, NotebookPen, Plus, UserRound } from "lucide-react";
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
import { TASK_TYPE_EMOJI, TASK_TYPE_LABEL, type Discipline, type Task } from "@/lib/types";
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
      titleSlot={
        <h1 className="font-display text-[38px] leading-[48px] font-bold">
          <span className="marker">
            {nowTime < "12:00" ? "Bom dia" : nowTime < "18:00" ? "Boa tarde" : "Boa noite"}
            {firstName ? `, ${firstName}` : ""}
          </span>
        </h1>
      }
      subtitle={
        semester ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-bold text-label">{semester.number}º semestre</span>
            {progress ? <span>· semana {progress.week} de {progress.total}</span> : null}
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
        <Card className="washi mt-6 overflow-visible px-6 pt-8 pb-6 text-center">
          <Character config={settings.avatar} size={110} className="mx-auto" mood="animada" />
          <h2 className="mt-2 font-display text-[28px] leading-9 font-bold">Bem-vinda ao Domeni</h2>
          <p className="mx-auto mt-2 max-w-[46ch] text-[16px] leading-6 text-label-2">
            Seus cadernos, agenda, notas, faltas e biblioteca num lugar só — com {settings.avatar.name} te
            acompanhando. Vamos montar o seu semestre em 1 minuto?
          </p>
          <Button className="mt-5" size="lg" onClick={() => setOnboarding(true)}>
            Começar
          </Button>
        </Card>
      ) : null}

      {!isNew ? (
        <Card className="mt-5 flex items-center gap-4 overflow-visible p-4 pr-5">
          <Character config={settings.avatar} mood={brain.mood} size={84} className="flex-none" background="color-mix(in srgb, var(--accent) 16%, var(--surface))" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold tracking-[0.04em] text-accent uppercase">{settings.avatar.name} diz</p>
            <p className="mt-0.5 text-[16px] leading-[22px] font-semibold">
              {topAlert
                ? `${topAlert.emoji} ${speak(settings.avatar.tone, topAlert, settings.profileName)}`
                : greeting(settings.avatar.tone, settings.profileName, nowTime)}
            </p>
            {topAlert?.href ? (
              <Link to={topAlert.href} className="mt-1.5 inline-block text-[14px] font-bold text-accent">
                {topAlert.action ?? "Ver"} →
              </Link>
            ) : null}
          </div>
        </Card>
      ) : null}

      {countdowns.length > 0 ? (
        <Section title="Contagem regressiva" emoji="⏳">
          <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pt-3 pb-2 md:-mx-8 md:px-8">
            {countdowns.map((task) => (
              <CountdownCard key={task.id} task={task} discipline={disciplineById.get(task.disciplineId ?? "")} nowMs={nowMs} today={today} />
            ))}
          </div>
        </Section>
      ) : null}

      {disciplines.length > 0 || data.calendar.length > 0 ? (
        <Section title="Aulas de hoje" emoji="🎒">
          {classes.length === 0 && data.calendar.length === 0 ? (
            <Card className="px-5 py-5 text-[15.5px] text-label-2">Sem aula hoje pela sua grade. Aproveite para revisar! 🌷</Card>
          ) : (
            <div className="space-y-3">
              {classes.map((occ) => {
                const record = data.attendance.find((a) => a.disciplineId === occ.discipline.id && a.date === today);
                const absent = (record?.absences ?? 0) > 0;
                const over = occ.slot.end !== "" && nowTime > occ.slot.end;
                const live = occ.slot.start !== "" && nowTime >= occ.slot.start && !over;
                return (
                  <Card key={`${occ.discipline.id}-${occ.slot.id}`} className={cx("flex items-stretch", over && "opacity-75")}>
                    <div {...tint(occ.discipline.color, "w-2 flex-none bg-dc")} />
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                      <div className="w-[64px] flex-none">
                        <p className="text-[19px] leading-6 font-extrabold">{occ.slot.start || "—"}</p>
                        <p className="text-[13px] text-label-3">{occ.slot.end ? `até ${occ.slot.end}` : ""}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] leading-6 font-bold">
                          {occ.discipline.emoji ? `${occ.discipline.emoji} ` : ""}
                          {occ.discipline.name}
                          {live ? <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 align-middle text-[12px] font-bold text-success">agora</span> : null}
                        </p>
                        <p className="flex flex-wrap gap-x-3 text-[13.5px] text-label-2">
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
                            "pressable inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-bold",
                            absent ? "bg-danger text-white" : "bg-fill text-label-2",
                          )}
                        >
                          {absent ? <Check size={15} strokeWidth={3} /> : null}
                          {absent ? "Faltei" : "Faltei?"}
                        </button>
                        <Button size="sm" icon={NotebookPen} onClick={() => void openLessonOn(occ.discipline, today)}>
                          Anotar
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {data.calendar.map((event) => (
                <Card key={event.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-[20px]">📅</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{event.title}</p>
                    <p className="text-[13px] text-label-2">
                      {event.allDay ? "Dia todo" : `${event.time}${event.endTime ? `–${event.endTime}` : ""}`} · Google Agenda
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      ) : null}

      <Section
        title="Para fazer"
        emoji="✅"
        action={
          <Link to="#/agenda" className="text-[15px] font-bold text-accent">
            Agenda →
          </Link>
        }
      >
        <Card className="divide-y divide-dashed divide-sep">
          {data.reviews.length > 0 ? (
            <Link to="#/revisoes" className="row-pressable flex items-center gap-3 px-4 py-3.5">
              <span className="text-[20px]">🔁</span>
              <span className="flex-1 font-semibold">
                {data.reviews.length} {data.reviews.length === 1 ? "revisão de aula" : "revisões de aula"} para hoje
              </span>
              <span className="text-[14px] font-bold text-accent">Revisar →</span>
            </Link>
          ) : null}
          {data.cards > 0 ? (
            <Link to="#/estudar" className="row-pressable flex items-center gap-3 px-4 py-3.5">
              <span className="text-[20px]">🃏</span>
              <span className="flex-1 font-semibold">{data.cards} flashcards esperando</span>
              <span className="text-[14px] font-bold text-accent">Estudar →</span>
            </Link>
          ) : null}
          {week.map((task) => (
            <TaskLine key={task.id} task={task} today={today} discipline={disciplineById.get(task.disciplineId ?? "")} />
          ))}
          {data.reviews.length === 0 && data.cards === 0 && week.length === 0 ? (
            <div className="px-4 py-5 text-[15px] text-label-2">
              Nada pendente nos próximos dias.{" "}
              <button type="button" onClick={() => setTaskOpen(true)} className="font-bold text-accent">
                Adicionar prova ou entrega
              </button>
            </div>
          ) : null}
        </Card>
      </Section>

      <Section title="Atalhos" emoji="🎧" className="mb-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Tocar música", emoji: "🎧", onClick: () => setMusicOpen(true) },
            { label: "Estudar flashcards", emoji: "🃏", onClick: () => navigate("#/estudar") },
            { label: "Biblioteca", emoji: "📚", onClick: () => navigate("#/biblioteca") },
            { label: "Notas e faltas", emoji: "📊", onClick: () => navigate("#/desempenho") },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="pressable lift card flex items-center gap-2.5 px-4 py-3.5 text-left text-[14.5px] font-bold"
            >
              <span className="text-[22px]">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </div>
        {!settings.spotifyUrl ? (
          <p className="mt-2 flex items-center gap-1.5 px-1 text-[13px] text-label-3">
            <Headphones size={14} /> Para a música, cole sua playlist do Spotify em{" "}
            <Link to="#/ajustes/integracoes" className="font-bold text-accent">
              Ajustes
            </Link>
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
  const t = tint(discipline?.color ?? "rosa", "washi card w-[190px] flex-none snap-start overflow-visible px-4 pt-5 pb-4");
  return (
    <div className={t.className} style={{ ...t.style, ["--tape" as string]: "var(--dc)" }}>
      <p className="text-[12.5px] font-extrabold tracking-[0.04em] text-dc uppercase">
        {TASK_TYPE_EMOJI[task.type]} {TASK_TYPE_LABEL[task.type]}
      </p>
      <p className="mt-1 line-clamp-2 min-h-[44px] text-[16px] leading-[22px] font-bold">{task.title}</p>
      <p className="mt-2 font-display text-[44px] leading-none font-bold text-dc">
        {days === 0 ? "hoje" : days}
        {days > 0 ? <span className="ml-1 font-sans text-[15px] font-bold text-label-2">{days === 1 ? "dia" : "dias"}</span> : null}
      </p>
      <p className="mt-1.5 flex items-center gap-1 text-[12.5px] text-label-2">
        <Clock size={12} strokeWidth={2.5} />
        {formatWeekday(task.dueDate)}, {formatShort(task.dueDate, today)}
        {task.time ? ` · ${task.time}` : ""}
        {days === 0 ? ` · ${left.label}` : ""}
      </p>
      {discipline ? <p className="mt-0.5 truncate text-[12.5px] font-semibold text-label-3">{discipline.name}</p> : null}
    </div>
  );
}

export function TaskLine({ task, today, discipline }: { task: Task; today: string; discipline?: Discipline }) {
  const delta = diffDays(today, task.dueDate);
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        aria-label={task.done ? "Marcar como não feito" : "Marcar como feito"}
        onClick={() => void updateTask(task.id, { done: !task.done })}
        className={cx(
          "pressable inline-flex size-7 flex-none items-center justify-center rounded-[9px] border-2",
          task.done ? "border-success bg-success text-white" : "border-sep",
        )}
      >
        {task.done ? <Check size={16} strokeWidth={3} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cx("truncate font-semibold", task.done && "text-label-3 line-through")}>
          {TASK_TYPE_EMOJI[task.type]} {task.title}
        </p>
        <p className={cx("text-[13px]", delta < 0 ? "font-bold text-danger" : "text-label-2")}>
          {formatShort(task.dueDate, today)} · {formatRelative(task.dueDate, today)}
          {task.time ? ` · ${task.time}` : ""}
          {discipline ? ` · ${discipline.name}` : ""}
        </p>
      </div>
      <a
        href={`#/agenda`}
        aria-label="Ver na agenda"
        className="pressable inline-flex size-9 flex-none items-center justify-center rounded-full bg-fill text-label-2"
      >
        <CalendarPlus size={16} strokeWidth={2.4} />
      </a>
    </div>
  );
}
