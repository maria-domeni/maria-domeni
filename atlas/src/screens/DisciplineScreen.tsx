"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ExternalLink, GraduationCap, Pencil, Plus, SearchX } from "lucide-react";
import { useState } from "react";
import { DisciplineSheet, LessonSheet, TaskSheet } from "@/components/forms/Sheets";
import { Page, ScreenSkeleton } from "@/components/shell/Page";
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  ListGroup,
  Row,
  Section,
  cx,
  safeUrl,
  tint,
} from "@/components/ui/basics";
import { DisciplineCover } from "@/components/ui/media";
import { useToast } from "@/components/ui/overlays";
import { db } from "@/lib/db";
import { diffDays, formatShort, formatWeekday } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { reviewLabel } from "@/lib/reviews";
import { updateTask } from "@/lib/store";
import {
  DIFFICULTY_LABEL,
  LESSON_TYPE_LABEL,
  STATUS_LABEL,
  type Lesson,
  type Review,
  type Task,
} from "@/lib/types";
import { scheduleText } from "./NotebooksScreen";
import { TaskRow } from "./TodayScreen";

export default function DisciplineScreen({ id }: { id: string }) {
  const today = useToday();
  const toast = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [taskSheet, setTaskSheet] = useState<{ open: boolean; task?: Task }>({ open: false });

  const data = useLiveQuery(async () => {
    const discipline = (await db.disciplines.get(id)) ?? null;
    if (!discipline) return { discipline: null };
    const [semester, lessons, tasks] = await Promise.all([
      db.semesters.get(discipline.semesterId),
      db.lessons.where("disciplineId").equals(id).toArray(),
      db.tasks.where("disciplineId").equals(id).toArray(),
    ]);
    const reviews = await db.reviews
      .where("lessonId")
      .anyOf(lessons.map((l) => l.id))
      .toArray();
    return { discipline, semester, lessons, tasks, reviews };
  }, [id]);

  if (!data) return <ScreenSkeleton />;

  if (!data.discipline) {
    return (
      <Page title="Disciplina" back={{ to: "#/cadernos", label: "Cadernos" }}>
        <div className="mt-6">
          <EmptyState icon={SearchX} title="Disciplina não encontrada">
            Ela pode ter sido apagada.
          </EmptyState>
        </div>
      </Page>
    );
  }

  const { discipline, semester } = data;
  const lessons = [...data.lessons].sort(compareLessons);
  const tasks = [...data.tasks].sort(
    (a, b) => Number(a.done) - Number(b.done) || a.dueDate.localeCompare(b.dueDate),
  );
  const reviewsByLesson = new Map<string, Review[]>();
  for (const review of data.reviews) {
    const list = reviewsByLesson.get(review.lessonId);
    if (list) list.push(review);
    else reviewsByLesson.set(review.lessonId, [review]);
  }

  const notebookLm = safeUrl(discipline.notebookLmUrl);
  const thea = safeUrl(discipline.theaUrl);
  const meta = [discipline.professor, scheduleText(discipline), discipline.room && `Sala ${discipline.room}`]
    .filter(Boolean)
    .join(" · ");

  async function toggleTask(task: Task) {
    await updateTask(task.id, { done: !task.done });
    toast(task.done ? "Prazo reaberto" : "Prazo concluído", {
      actionLabel: "Desfazer",
      onAction: () => updateTask(task.id, { done: task.done }),
    });
  }

  return (
    <Page
      title={discipline.name}
      titleSlot={
        <>
          <DisciplineCover
            color={discipline.color}
            imageId={discipline.coverImageId}
            className="h-[132px] rounded-[26px] shadow-card md:h-[150px]"
          />
          <div className="relative -mt-8 flex items-end gap-3.5 px-4 md:px-5">
            <span
              aria-hidden
              {...tint(
                discipline.color,
                "inline-flex size-[68px] flex-none items-center justify-center rounded-[20px] bg-surface text-[34px] leading-none font-bold text-dc shadow-[0_4px_16px_rgba(0,0,0,0.14),0_0_0_0.5px_rgba(0,0,0,0.06)]",
              )}
            >
              {discipline.emoji || discipline.name.trim().charAt(0).toUpperCase()}
            </span>
          </div>
          <p
            {...tint(
              discipline.color,
              "mt-3 text-[13px] leading-[18px] font-semibold tracking-[0.03em] text-dc uppercase",
            )}
          >
            {semester ? `${semester.number}º semestre` : "Disciplina"}
            {discipline.status !== "andamento" ? ` · ${STATUS_LABEL[discipline.status]}` : ""}
          </p>
          <h1 className="font-display text-[34px] leading-[41px] font-bold tracking-[-0.028em] break-words">
            {discipline.name}
          </h1>
        </>
      }
      subtitle={meta || undefined}
      back={{ to: "#/cadernos", label: "Cadernos" }}
      actions={
        <IconButton icon={Pencil} label="Editar disciplina" onClick={() => setEditOpen(true)} />
      }
    >
      {notebookLm || thea ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {notebookLm ? <ExternalButton href={notebookLm} label="Abrir no NotebookLM" /> : null}
          {thea ? <ExternalButton href={thea} label="Abrir no Thea" /> : null}
        </div>
      ) : null}

      <Section
        title="Aulas"
        count={lessons.length}
        action={
          <Button size="sm" variant="tinted" icon={Plus} onClick={() => setLessonOpen(true)}>
            Nova aula
          </Button>
        }
      >
        {lessons.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Nenhuma aula ainda"
            action={
              <Button icon={Plus} onClick={() => setLessonOpen(true)}>
                Criar primeira aula
              </Button>
            }
          >
            Cada aula tem o guia de estudo (antes, durante e depois) e as revisões agendadas sozinhas.
          </EmptyState>
        ) : (
          <ListGroup>
            {lessons.map((lesson) => (
              <Row
                key={lesson.id}
                to={`#/aula/${lesson.id}`}
                leading={
                  <span
                    {...tint(
                      discipline.color,
                      "inline-flex size-10 items-center justify-center rounded-[12px] bg-dc-soft text-[15px] font-bold text-dc tabular-nums",
                    )}
                  >
                    {lesson.number ?? "–"}
                  </span>
                }
                title={lesson.title || "Aula sem tema"}
                subtitle={[
                  lesson.date
                    ? `${formatWeekday(lesson.date)}, ${formatShort(lesson.date, today)}`
                    : "Sem data",
                  LESSON_TYPE_LABEL[lesson.type],
                  lesson.attended === false ? "Falta" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                trailing={<ReviewDots reviews={reviewsByLesson.get(lesson.id) ?? []} today={today} />}
                chevron
              />
            ))}
          </ListGroup>
        )}
      </Section>

      <Section
        title="Prazos"
        count={tasks.filter((t) => !t.done).length}
        action={
          <Button size="sm" variant="tinted" icon={Plus} onClick={() => setTaskSheet({ open: true })}>
            Novo prazo
          </Button>
        }
      >
        {tasks.length === 0 ? (
          <Card className="px-4 py-4 text-[15px] text-label-2">
            Provas, trabalhos e seminários desta disciplina aparecem aqui e na tela Hoje.
          </Card>
        ) : (
          <ListGroup>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                onToggle={() => void toggleTask(task)}
                onOpen={() => setTaskSheet({ open: true, task })}
              />
            ))}
          </ListGroup>
        )}
      </Section>

      {discipline.ementa.trim() ? (
        <Section title="Ementa">
          <Card className="px-4 py-4 text-[16px] leading-[1.5] whitespace-pre-wrap text-label">
            {discipline.ementa}
          </Card>
        </Section>
      ) : null}

      <DisciplineSheet
        open={editOpen}
        discipline={discipline}
        semesterId={discipline.semesterId}
        onClose={() => setEditOpen(false)}
      />
      <LessonSheet open={lessonOpen} discipline={discipline} onClose={() => setLessonOpen(false)} />
      <TaskSheet
        open={taskSheet.open}
        task={taskSheet.task}
        disciplineId={discipline.id}
        onClose={() => setTaskSheet({ open: false })}
      />
    </Page>
  );
}

/** Mais recente primeiro; aulas sem data ficam no topo. */
function compareLessons(a: Lesson, b: Lesson): number {
  if (a.date !== b.date) {
    if (!a.date) return -1;
    if (!b.date) return 1;
    return b.date.localeCompare(a.date);
  }
  return (b.number ?? 0) - (a.number ?? 0);
}

function ExternalButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="pressable inline-flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-[15px] font-semibold text-accent shadow-card"
    >
      {label}
      <ExternalLink size={15} strokeWidth={2.4} />
    </a>
  );
}

const DOT_BY_DIFFICULTY = {
  facil: "bg-success",
  medio: "bg-yellow",
  dificil: "bg-danger",
} as const;

/** Uma bolinha por revisão: cor da dificuldade se feita, contorno vermelho se vencida. */
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
            r.doneAt
              ? DOT_BY_DIFFICULTY[r.difficulty ?? "medio"]
              : diffDays(r.dueDate, today) >= 0
                ? "border-2 border-danger"
                : "bg-fill-2",
          )}
        />
      ))}
    </span>
  );
}

