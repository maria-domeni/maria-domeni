"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  BookMarked,
  CalendarClock,
  Check,
  CircleCheck,
  Compass,
  GraduationCap,
  Palette,
  Plus,
  Repeat2,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { OnboardingSheet } from "@/components/forms/Onboarding";
import { TaskSheet } from "@/components/forms/Sheets";
import { Page, ScreenSkeleton } from "@/components/shell/Page";
import {
  Button,
  Card,
  Chip,
  ColorBar,
  DifficultyChip,
  Link,
  ListGroup,
  ProgressBar,
  Row,
  Section,
  cx,
} from "@/components/ui/basics";
import { Avatar, CoverBox } from "@/components/ui/media";
import { useToast } from "@/components/ui/overlays";
import { lastBackupDate } from "@/lib/backup";
import { db } from "@/lib/db";
import { addDays, diffDays, formatLong, formatRelative, formatShort, weekProgress } from "@/lib/dates";
import { useNowTime, useSettingsOrDefault, useToday } from "@/lib/hooks";
import { lessonDifficulty, reviewLabel } from "@/lib/reviews";
import { navigate } from "@/lib/router";
import { createLesson, updateTask } from "@/lib/store";
import { buildToday, resolveCurrentSemester, type NextStep } from "@/lib/today";
import {
  LESSON_TYPE_LABEL,
  TASK_TYPE_LABEL,
  type Discipline,
  type Lesson,
  type Semester,
  type Settings,
  type Task,
  type TodaySectionKey,
} from "@/lib/types";

const BACKUP_REMINDER_DAYS = 14;

type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

export function greetingFor(nowTime: string, name: string): string {
  const hour = Number(nowTime.slice(0, 2));
  const base = hour < 5 ? "Boa noite" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const first = name.trim().split(/\s+/)[0];
  return first ? `${base}, ${first}` : base;
}

export default function TodayScreen() {
  const today = useToday();
  const nowTime = useNowTime();
  const settings = useSettingsOrDefault();
  const toast = useToast();
  const [taskSheet, setTaskSheet] = useState<{ open: boolean; task?: Task }>({ open: false });
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const data = useLiveQuery(async () => {
    const [semesters, disciplines, reviews, tasks, lessonCount] = await Promise.all([
      db.semesters.toArray(),
      db.disciplines.toArray(),
      db.reviews.toArray(),
      db.tasks.toArray(),
      db.lessons.count(),
    ]);
    const upcoming = await db.lessons
      .where("date")
      .between(today, addDays(today, 7), true, true)
      .toArray();
    const dueIds = [
      ...new Set(reviews.filter((r) => !r.doneAt && r.dueDate <= today).map((r) => r.lessonId)),
    ];
    const dueLessons = (await db.lessons.bulkGet(dueIds)).filter((l): l is Lesson => !!l);
    const lessons = [...new Map([...upcoming, ...dueLessons].map((l) => [l.id, l])).values()];
    return { semesters, disciplines, reviews, tasks, lessons, lessonCount };
  }, [today]);

  const model = useMemo(
    () => (data ? buildToday({ today, nowTime, ...data }) : null),
    [data, today, nowTime],
  );

  if (!data || !model) return <ScreenSkeleton />;

  const disciplineById = new Map(data.disciplines.map((d) => [d.id, d]));
  const semester = resolveCurrentSemester(data.semesters, settings, today);
  const isEmpty = data.disciplines.length === 0;
  const isNew = data.semesters.length === 0 && !settings.onboarded;
  const overdueCount = model.dueReviews.filter((r) => r.overdueDays > 0).length;
  const hasCover = settings.todayCover.kind !== "nenhuma";
  const classesToday = model.todayLessons.length + model.scheduledWithoutLesson.length;

  async function createTodayLesson(discipline: Discipline) {
    const lesson = await createLesson({ disciplineId: discipline.id, date: today });
    navigate(`#/aula/${lesson.id}`);
  }

  async function toggleTask(task: Task) {
    await updateTask(task.id, { done: !task.done });
    toast(task.done ? "Prazo reaberto" : "Prazo concluído", {
      actionLabel: "Desfazer",
      onAction: () => updateTask(task.id, { done: task.done }),
    });
  }

  const backup = lastBackupDate();
  const needsBackup =
    data.lessonCount > 0 && (!backup || diffDays(backup, today) >= BACKUP_REMINDER_DAYS);

  const sections: Record<TodaySectionKey, ReactNode> = {
    resumo: (
      <div key="resumo" className="mt-4 grid grid-cols-3 gap-3">
        <StatTile
          to="#/cadernos"
          icon={GraduationCap}
          value={classesToday}
          label={classesToday === 1 ? "aula hoje" : "aulas hoje"}
        />
        <StatTile
          to="#/revisoes"
          icon={Repeat2}
          value={model.dueReviews.length}
          label={model.dueReviews.length === 1 ? "revisão" : "revisões"}
          alert={overdueCount > 0 ? `${overdueCount} atrasada${overdueCount > 1 ? "s" : ""}` : undefined}
        />
        <StatTile
          icon={CalendarClock}
          value={model.deadlines.length}
          label={model.deadlines.length === 1 ? "prazo em 14 dias" : "prazos em 14 dias"}
        />
      </div>
    ),
    aulas: (
      <Section key="aulas" title="Aulas de hoje">
        {classesToday === 0 ? (
          <QuietCard>Sem aulas hoje.</QuietCard>
        ) : (
          <ListGroup>
            {model.todayLessons.map((lesson) => {
              const discipline = disciplineById.get(lesson.disciplineId);
              return (
                <Row
                  key={lesson.id}
                  to={`#/aula/${lesson.id}`}
                  leading={<ColorBar color={discipline?.color ?? "indigo"} />}
                  title={lesson.title || "Aula sem tema"}
                  subtitle={[timeRange(discipline), discipline?.name, LESSON_TYPE_LABEL[lesson.type]]
                    .filter(Boolean)
                    .join(" · ")}
                  trailing={
                    lesson.reading.trim() && !lesson.readingDone ? (
                      <Chip tone="yellow">Leitura</Chip>
                    ) : lesson.attended === true ? (
                      <Chip tone="green">Presente</Chip>
                    ) : lesson.attended === false ? (
                      <Chip tone="red">Falta</Chip>
                    ) : null
                  }
                  chevron
                />
              );
            })}
            {model.scheduledWithoutLesson.map((discipline) => (
              <Row
                key={discipline.id}
                onClick={() => void createTodayLesson(discipline)}
                leading={<ColorBar color={discipline.color} className="opacity-45" />}
                title={discipline.name}
                subtitle={[timeRange(discipline), "Aula ainda não criada"].filter(Boolean).join(" · ")}
                trailing={
                  <span className="inline-flex h-8 items-center gap-1 rounded-full bg-accent-soft px-3 text-[14px] font-semibold text-accent">
                    <Plus size={15} strokeWidth={2.6} />
                    Criar
                  </span>
                }
              />
            ))}
          </ListGroup>
        )}
      </Section>
    ),
    revisoes: (
      <Section
        key="revisoes"
        title="Revisões"
        count={model.dueReviews.length}
        action={
          <Link to="#/revisoes" className="pressable px-1 text-[15px] font-semibold text-accent">
            Ver todas
          </Link>
        }
      >
        {model.dueReviews.length === 0 ? (
          <QuietCard>Nenhuma revisão vence hoje.</QuietCard>
        ) : (
          <ListGroup>
            {model.dueReviews.slice(0, 6).map(({ review, lesson, discipline, overdueDays }) => {
              const difficulty = lessonDifficulty(data.reviews.filter((r) => r.lessonId === lesson.id));
              return (
                <Row
                  key={review.id}
                  to={`#/aula/${lesson.id}/revisao`}
                  leading={<ColorBar color={discipline?.color ?? "indigo"} />}
                  title={lesson.title || "Aula sem tema"}
                  subtitle={
                    <>
                      <span className="font-semibold text-label">{reviewLabel(review)}</span>
                      {" · "}
                      <span className={overdueDays > 0 ? "font-medium text-danger" : undefined}>
                        {overdueDays > 0 ? `venceu ${formatRelative(review.dueDate, today)}` : "vence hoje"}
                      </span>
                      {discipline ? ` · ${discipline.name}` : ""}
                    </>
                  }
                  trailing={difficulty ? <DifficultyChip value={difficulty} /> : null}
                  chevron
                />
              );
            })}
          </ListGroup>
        )}
        {model.dueReviews.length > 6 ? (
          <p className="mt-2 px-1 text-[14px] text-label-2">
            E mais {model.dueReviews.length - 6} na fila de revisões.
          </p>
        ) : null}
      </Section>
    ),
    prazos: (
      <Section key="prazos" title="Prazos" count={model.deadlines.length}>
        {model.deadlines.length === 0 ? (
          <QuietCard>Nenhum prazo nos próximos 14 dias.</QuietCard>
        ) : (
          <ListGroup>
            {model.deadlines.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                discipline={task.disciplineId ? disciplineById.get(task.disciplineId) : undefined}
                onToggle={() => void toggleTask(task)}
                onOpen={() => setTaskSheet({ open: true, task })}
              />
            ))}
          </ListGroup>
        )}
      </Section>
    ),
    leituras:
      model.preReading.length > 0 ? (
        <Section key="leituras" title="Leitura prévia" count={model.preReading.length}>
          <ListGroup>
            {model.preReading.map((lesson) => {
              const discipline = disciplineById.get(lesson.disciplineId);
              return (
                <Row
                  key={lesson.id}
                  to={`#/aula/${lesson.id}/antes`}
                  leading={<ColorBar color={discipline?.color ?? "indigo"} />}
                  title={lesson.reading.trim().split("\n")[0]}
                  subtitle={`${lesson.title || "Aula"} · ${formatShort(lesson.date as string, today)} · ${formatRelative(lesson.date as string, today)}`}
                  chevron
                />
              );
            })}
          </ListGroup>
        </Section>
      ) : null,
  };

  return (
    <Page
      title="Hoje"
      eyebrow={hasCover ? undefined : formatLong(today)}
      titleSlot={
        hasCover ? (
          <Hero settings={settings} today={today} nowTime={nowTime} semester={semester} />
        ) : undefined
      }
      actions={
        isEmpty ? null : (
          <Button variant="plain" icon={Plus} onClick={() => setTaskSheet({ open: true })}>
            Prazo
          </Button>
        )
      }
    >
      {!hasCover ? <PlainProgress semester={semester} today={today} /> : null}

      {isNew ? (
        <Welcome onStart={() => setOnboardingOpen(true)} />
      ) : (
        <>
          <NextStepCard
            step={model.nextStep}
            tone={hasCover ? "surface" : "solid"}
            onCreateLesson={(disciplineId) => {
              const discipline = disciplineById.get(disciplineId);
              if (discipline) void createTodayLesson(discipline);
            }}
          />

          {isEmpty ? (
            <FirstSteps hasSemester={data.semesters.length > 0} />
          ) : (
            <>
              {settings.todaySections.map((section) => (section.visible ? sections[section.key] : null))}

              {needsBackup ? (
                <Card className="mt-9 flex items-center gap-3.5 px-4 py-3.5">
                  <span className="inline-flex size-10 flex-none items-center justify-center rounded-[12px] bg-accent-soft text-accent">
                    <ShieldCheck size={21} strokeWidth={2.1} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] leading-[21px] font-semibold">Proteja as suas anotações</p>
                    <p className="text-[14px] leading-[19px] text-label-2">
                      {backup
                        ? `Último backup ${formatRelative(backup, today)}.`
                        : "Os dados ficam só neste aparelho. Ainda não há backup."}
                    </p>
                  </div>
                  <Link
                    to="#/ajustes"
                    className="pressable inline-flex h-9 flex-none items-center rounded-full bg-accent-soft px-3.5 text-[15px] font-semibold text-accent"
                  >
                    Fazer backup
                  </Link>
                </Card>
              ) : null}
            </>
          )}
        </>
      )}

      <TaskSheet
        open={taskSheet.open}
        task={taskSheet.task}
        disciplines={data.disciplines.filter((d) => d.status === "andamento")}
        onClose={() => setTaskSheet({ open: false })}
      />
      <OnboardingSheet open={onboardingOpen} settings={settings} onClose={() => setOnboardingOpen(false)} />
    </Page>
  );
}

function timeRange(discipline: Discipline | undefined): string {
  if (!discipline?.startTime) return "";
  return discipline.endTime ? `${discipline.startTime}–${discipline.endTime}` : discipline.startTime;
}

function QuietCard({ children }: { children: ReactNode }) {
  return <Card className="px-4 py-4 text-[15px] text-label-2">{children}</Card>;
}

/** Cabeçalho com capa: saudação, data e andamento do semestre. */
function Hero({
  settings,
  today,
  nowTime,
  semester,
}: {
  settings: Settings;
  today: string;
  nowTime: string;
  semester: Semester | null;
}) {
  const progress = semester ? weekProgress(semester.start, semester.end, today) : null;
  const showAvatar = settings.avatarImageId !== null || settings.profileName.trim() !== "";
  return (
    <CoverBox
      cover={settings.todayCover}
      className="flex min-h-[196px] flex-col justify-end rounded-[28px] px-5 pt-16 pb-5 shadow-card md:px-7 md:pb-6"
    >
      {showAvatar ? (
        <Link
          to="#/ajustes"
          aria-label="Abrir Ajustes"
          className="pressable absolute top-4 right-4 rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.7)]"
        >
          <Avatar
            imageId={settings.avatarImageId}
            name={settings.profileName}
            size={44}
            className="!bg-white/25 !text-white"
          />
        </Link>
      ) : null}
      <p className="text-[13px] leading-[18px] font-semibold tracking-[0.04em] text-white/85 uppercase">
        {formatLong(today)}
      </p>
      <h1 className="font-display text-[34px] leading-[41px] font-bold tracking-[-0.028em] break-words">
        {greetingFor(nowTime, settings.profileName)}
      </h1>
      {semester ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="glass inline-flex h-7 items-center rounded-full px-3 text-[13.5px] font-semibold whitespace-nowrap">
            {semester.number}º semestre
            {progress ? ` · semana ${progress.week} de ${progress.total}` : ""}
          </span>
          {progress ? (
            <div
              role="progressbar"
              aria-label="Andamento do semestre"
              aria-valuenow={Math.round(progress.ratio * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 max-w-[200px] min-w-[90px] flex-1 overflow-hidden rounded-full bg-white/25"
            >
              <div
                className="h-full rounded-full bg-white transition-[width] duration-700 ease-out"
                style={{ width: `${Math.round(progress.ratio * 100)}%` }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </CoverBox>
  );
}

function PlainProgress({ semester, today }: { semester: Semester | null; today: string }) {
  const progress = semester ? weekProgress(semester.start, semester.end, today) : null;
  if (!semester || !progress) return null;
  return (
    <div className="mt-3 flex items-center gap-3 text-[14px] text-label-2">
      <span className="font-semibold whitespace-nowrap">
        {semester.number}º semestre · semana {progress.week} de {progress.total}
      </span>
      <ProgressBar ratio={progress.ratio} className="max-w-[220px] flex-1" />
    </div>
  );
}

function NextStepCard({
  step,
  tone,
  onCreateLesson,
}: {
  step: NextStep;
  tone: "solid" | "surface";
  onCreateLesson: (disciplineId: string) => void;
}) {
  if (step.kind === "livre") {
    return (
      <Card className="mt-4 flex items-center gap-4 px-5 py-5">
        <span className="inline-flex size-12 flex-none items-center justify-center rounded-full bg-success-soft text-success">
          <CircleCheck size={26} strokeWidth={2.1} />
        </span>
        <div>
          <p className="text-[13px] font-semibold tracking-[0.03em] text-success uppercase">{step.eyebrow}</p>
          <p className="font-display text-[20px] leading-[25px] font-bold tracking-[-0.02em]">{step.title}</p>
          <p className="mt-0.5 text-[15px] leading-[20px] text-label-2">{step.detail}</p>
        </div>
      </Card>
    );
  }

  const solid = tone === "solid";
  const actionClass = cx(
    "pressable mt-4 inline-flex h-11 items-center gap-2 rounded-full px-5 text-[16px] font-semibold",
    solid ? "bg-white text-[#1b1b1f]" : "bg-accent-solid text-white",
  );
  const action =
    step.href && step.action ? (
      <Link to={step.href} className={actionClass}>
        {step.action}
        <ArrowRight size={17} strokeWidth={2.5} />
      </Link>
    ) : step.kind === "criar-aula" && step.disciplineId ? (
      <button type="button" className={actionClass} onClick={() => onCreateLesson(step.disciplineId as string)}>
        <Plus size={17} strokeWidth={2.6} />
        {step.action}
      </button>
    ) : null;

  if (!solid) {
    return (
      <section
        aria-label="Próximo passo"
        className="mt-4 flex items-start gap-4 rounded-[24px] bg-surface px-5 py-5 shadow-card md:px-6"
      >
        <span className="inline-flex size-12 flex-none items-center justify-center rounded-[15px] bg-accent-soft text-accent">
          <Compass size={24} strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-[18px] font-semibold tracking-[0.04em] text-accent uppercase">
            Próximo passo · {step.eyebrow}
          </p>
          <h2 className="font-display mt-1 text-[22px] leading-[27px] font-bold tracking-[-0.022em]">
            {step.title}
          </h2>
          <p className="mt-1 text-[15.5px] leading-[21px] text-label-2">{step.detail}</p>
          {action}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Próximo passo"
      className="cover cover-destaque mt-5 rounded-[24px] px-5 py-5 shadow-card md:px-6 md:py-6"
    >
      <p className="flex items-center gap-1.5 text-[13px] font-semibold tracking-[0.04em] text-white/85 uppercase">
        <Compass size={14} strokeWidth={2.4} />
        Próximo passo · {step.eyebrow}
      </p>
      <h2 className="font-display mt-1.5 max-w-[28ch] text-[24px] leading-[29px] font-bold tracking-[-0.022em]">
        {step.title}
      </h2>
      <p className="mt-1 max-w-[52ch] text-[15.5px] leading-[21px] text-white/85">{step.detail}</p>
      {action}
    </section>
  );
}

function StatTile({
  to,
  icon: Icon,
  value,
  label,
  alert,
}: {
  to?: string;
  icon: IconType;
  value: number;
  label: string;
  alert?: string;
}) {
  const body = (
    <>
      <span className="inline-flex size-9 items-center justify-center rounded-[11px] bg-accent-soft text-accent">
        <Icon size={19} strokeWidth={2.2} />
      </span>
      <p className="font-display mt-2.5 text-[30px] leading-[32px] font-bold tracking-[-0.03em] tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[13.5px] leading-[17px] text-label-2">{label}</p>
      {alert ? <p className="mt-1 text-[12.5px] leading-4 font-semibold text-danger">{alert}</p> : null}
    </>
  );
  const className = "block rounded-[22px] bg-surface px-4 py-3.5 shadow-card";
  return to ? (
    <Link to={to} className={cx(className, "pressable")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function TaskRow({
  task,
  today,
  discipline,
  onToggle,
  onOpen,
}: {
  task: Task;
  today: string;
  discipline?: Discipline;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const delta = diffDays(today, task.dueDate);
  const overdue = !task.done && delta < 0;
  const soon = !task.done && delta >= 0 && delta <= 2;
  return (
    <div className="flex min-h-[60px] items-center gap-1 pr-4 pl-1.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
        onClick={onToggle}
        className="pressable inline-flex size-11 flex-none items-center justify-center"
      >
        <span
          className={cx(
            "inline-flex size-[24px] items-center justify-center rounded-full border-2 transition-colors",
            task.done ? "border-transparent bg-accent-solid text-white" : "border-label-3",
          )}
        >
          {task.done ? <Check size={15} strokeWidth={3.2} /> : null}
        </span>
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="row-pressable -my-px flex min-w-0 flex-1 items-center gap-3 self-stretch rounded-lg py-3 pr-1 pl-1.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <div
            className={cx(
              "truncate text-[17px] leading-[22px] font-medium",
              task.done && "text-label-3 line-through",
            )}
          >
            {task.title}
          </div>
          <div className="mt-0.5 truncate text-[14px] leading-[19px] text-label-2">
            {[formatShort(task.dueDate, today), TASK_TYPE_LABEL[task.type], discipline?.name]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        {task.done ? null : (
          <Chip tone={overdue ? "red" : soon ? "yellow" : "neutral"}>
            {overdue ? `venceu ${formatRelative(task.dueDate, today)}` : formatRelative(task.dueDate, today)}
          </Chip>
        )}
      </button>
    </div>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  const points: { icon: IconType; title: string; text: string }[] = [
    {
      icon: GraduationCap,
      title: "Um caderno para cada aula",
      text: "Antes, durante e depois: leitura prévia, anotações e explicação com as suas palavras.",
    },
    {
      icon: Repeat2,
      title: "Revisão na hora certa",
      text: "O Atlas agenda as revisões sozinho e avisa o que vence hoje.",
    },
    {
      icon: Palette,
      title: "Do seu jeito",
      text: "Cores, fontes, capas e fotos. Funciona sem internet.",
    },
  ];
  return (
    <>
      <Card className="mt-4 px-5 py-6 md:px-7">
        <h2 className="font-display text-[24px] leading-[30px] font-bold tracking-[-0.022em]">
          Vamos montar o seu Atlas
        </h2>
        <p className="mt-1 max-w-[52ch] text-[16px] leading-[22px] text-label-2">
          Conte quem você é e em que semestre está. Leva um minuto.
        </p>
        <Button size="lg" className="mt-5" onClick={onStart}>
          Começar
          <ArrowRight size={18} strokeWidth={2.5} />
        </Button>
      </Card>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {points.map((point) => (
          <Card key={point.title} className="px-4 py-4">
            <span className="inline-flex size-10 items-center justify-center rounded-[12px] bg-accent-soft text-accent">
              <point.icon size={20} strokeWidth={2.2} />
            </span>
            <p className="mt-3 text-[16px] leading-[21px] font-semibold">{point.title}</p>
            <p className="mt-1 text-[14px] leading-[19px] text-label-2">{point.text}</p>
          </Card>
        ))}
      </div>
    </>
  );
}

function FirstSteps({ hasSemester }: { hasSemester: boolean }) {
  const steps: { icon: IconType; title: string; text: string; done: boolean }[] = [
    {
      icon: CalendarClock,
      title: "Crie o semestre atual",
      text: "Número e, se quiser, as datas de início e fim das aulas.",
      done: hasSemester,
    },
    {
      icon: BookMarked,
      title: "Cadastre as disciplinas",
      text: "Nome, professor(a), dias e horário de aula, cor e capa.",
      done: false,
    },
    {
      icon: GraduationCap,
      title: "Abra a primeira aula",
      text: "Anote, explique com as suas palavras e deixe as revisões por conta do Atlas.",
      done: false,
    },
  ];
  return (
    <Section title="Como começar">
      <ListGroup>
        {steps.map((step, index) => (
          <Row
            key={step.title}
            leading={
              <span
                className={cx(
                  "inline-flex size-9 items-center justify-center rounded-full text-[15px] font-bold",
                  step.done ? "bg-success-soft text-success" : "bg-accent-soft text-accent",
                )}
              >
                {step.done ? <Check size={18} strokeWidth={3} /> : index + 1}
              </span>
            }
            title={step.title}
            subtitle={<span className="whitespace-normal">{step.text}</span>}
          />
        ))}
      </ListGroup>
    </Section>
  );
}
