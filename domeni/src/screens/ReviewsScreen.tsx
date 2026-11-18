"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CircleCheck, Repeat2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Page, ScreenSkeleton } from "@/components/shell/Page";
import {
  Chip,
  ColorBar,
  DifficultyChip,
  EmptyState,
  ListGroup,
  Row,
} from "@/components/ui/basics";
import { Segmented } from "@/components/ui/fields";
import { db } from "@/lib/db";
import { diffDays, formatLong, formatRelative, formatShort } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { dueQueue, lessonDifficulty, reviewLabel } from "@/lib/reviews";
import type { Discipline, Lesson, Review } from "@/lib/types";

type View = "pendentes" | "proximas" | "feitas";

const DONE_LIMIT = 40;

export default function ReviewsScreen() {
  const today = useToday();
  const [view, setView] = useState<View>("pendentes");

  const data = useLiveQuery(async () => {
    const [reviews, disciplines] = await Promise.all([db.reviews.toArray(), db.disciplines.toArray()]);
    const lessons = await db.lessons.bulkGet([...new Set(reviews.map((r) => r.lessonId))]);
    return {
      reviews,
      disciplines,
      lessons: lessons.filter((l): l is Lesson => !!l),
    };
  }, []);

  const model = useMemo(() => {
    if (!data) return null;
    const lessonById = new Map(data.lessons.map((l) => [l.id, l]));
    const disciplineById = new Map(data.disciplines.map((d) => [d.id, d]));
    const byLesson = new Map<string, Review[]>();
    for (const review of data.reviews) {
      const list = byLesson.get(review.lessonId);
      if (list) list.push(review);
      else byLesson.set(review.lessonId, [review]);
    }
    const valid = data.reviews.filter((r) => lessonById.has(r.lessonId));
    const due = dueQueue(valid, today);
    const upcoming = valid
      .filter((r) => !r.doneAt && diffDays(today, r.dueDate) > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const done = valid
      .filter((r) => r.doneAt)
      .sort((a, b) => (b.doneAt as string).localeCompare(a.doneAt as string))
      .slice(0, DONE_LIMIT);
    return { lessonById, disciplineById, byLesson, due, upcoming, done };
  }, [data, today]);

  if (!data || !model) return <ScreenSkeleton />;

  const upcomingByDate = new Map<string, Review[]>();
  for (const review of model.upcoming) {
    const list = upcomingByDate.get(review.dueDate);
    if (list) list.push(review);
    else upcomingByDate.set(review.dueDate, [review]);
  }

  const row = (review: Review, mode: View) => {
    const lesson = model.lessonById.get(review.lessonId) as Lesson;
    const discipline: Discipline | undefined = model.disciplineById.get(lesson.disciplineId);
    const overdueDays = diffDays(review.dueDate, today);
    const difficulty =
      mode === "feitas" ? (review.difficulty ?? null) : lessonDifficulty(model.byLesson.get(lesson.id) ?? []);
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
            {mode === "pendentes" ? (
              <span className={overdueDays > 0 ? "font-medium text-danger" : undefined}>
                {overdueDays > 0 ? `venceu ${formatRelative(review.dueDate, today)}` : "vence hoje"}
              </span>
            ) : mode === "feitas" ? (
              `feita em ${formatShort(review.doneAt as string, today)}`
            ) : (
              formatRelative(review.dueDate, today)
            )}
            {discipline ? ` · ${discipline.name}` : ""}
          </>
        }
        trailing={difficulty ? <DifficultyChip value={difficulty} /> : null}
        chevron
      />
    );
  };

  return (
    <Page
      title="Revisões"
      subtitle={
        model.due.length > 0
          ? `${model.due.length} ${model.due.length === 1 ? "revisão pendente" : "revisões pendentes"}. As aulas marcadas como Difícil vêm primeiro.`
          : "Revisão espaçada de todas as aulas."
      }
    >
      <Segmented
        label="Filtro"
        className="mt-4 max-w-[460px]"
        value={view}
        onChange={setView}
        options={[
          { value: "pendentes", label: "Pendentes", badge: model.due.length > 0 },
          { value: "proximas", label: "Próximas" },
          { value: "feitas", label: "Feitas" },
        ]}
      />

      <div key={view} className="fade-in mt-5">
        {view === "pendentes" ? (
          model.due.length === 0 ? (
            <EmptyState icon={CircleCheck} title="Tudo revisado">
              {model.upcoming.length > 0
                ? `A próxima revisão é ${formatRelative(model.upcoming[0].dueDate, today)}.`
                : "Quando você criar aulas com data, as revisões aparecem aqui."}
            </EmptyState>
          ) : (
            <ListGroup>{model.due.map((review) => row(review, "pendentes"))}</ListGroup>
          )
        ) : null}

        {view === "proximas" ? (
          model.upcoming.length === 0 ? (
            <EmptyState icon={Repeat2} title="Nada agendado">
              As revisões são agendadas sozinhas a partir da data de cada aula.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-6">
              {[...upcomingByDate.entries()].map(([date, reviews]) => (
                <section key={date}>
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <h2 className="text-[15px] font-semibold first-letter:uppercase">{formatLong(date)}</h2>
                    <Chip>{formatRelative(date, today)}</Chip>
                  </div>
                  <ListGroup>{reviews.map((review) => row(review, "proximas"))}</ListGroup>
                </section>
              ))}
            </div>
          )
        ) : null}

        {view === "feitas" ? (
          model.done.length === 0 ? (
            <EmptyState icon={CircleCheck} title="Nenhuma revisão feita ainda">
              Ao marcar uma revisão como Fácil, Médio ou Difícil, ela aparece aqui.
            </EmptyState>
          ) : (
            <ListGroup>{model.done.map((review) => row(review, "feitas"))}</ListGroup>
          )
        ) : null}
      </div>
    </Page>
  );
}
