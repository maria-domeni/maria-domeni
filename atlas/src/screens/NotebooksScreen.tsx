"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, ChevronDown, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { DisciplineSheet, SemesterSheet } from "@/components/forms/Sheets";
import { Page, ScreenSkeleton } from "@/components/shell/Page";
import { Button, Chip, EmptyState, IconButton, Link, cx } from "@/components/ui/basics";
import { db } from "@/lib/db";
import { formatShort } from "@/lib/dates";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { resolveCurrentSemester } from "@/lib/today";
import { STATUS_LABEL, WEEKDAY_SHORT, type Discipline, type Semester } from "@/lib/types";

interface DisciplineStats {
  lessons: number;
  due: number;
}

export default function NotebooksScreen() {
  const today = useToday();
  const settings = useSettingsOrDefault();
  const [semesterSheet, setSemesterSheet] = useState<{ open: boolean; semester?: Semester }>({
    open: false,
  });
  const [disciplineSheet, setDisciplineSheet] = useState<{ open: boolean; semesterId: string }>({
    open: false,
    semesterId: "",
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const data = useLiveQuery(async () => {
    const [semesters, disciplines] = await Promise.all([
      db.semesters.toArray(),
      db.disciplines.toArray(),
    ]);
    const stats = new Map<string, DisciplineStats>();
    await Promise.all(
      disciplines.map(async (d) => {
        stats.set(d.id, {
          lessons: await db.lessons.where("disciplineId").equals(d.id).count(),
          due: 0,
        });
      }),
    );
    const due = (await db.reviews.where("dueDate").belowOrEqual(today).toArray()).filter(
      (r) => !r.doneAt,
    );
    const dueLessons = await db.lessons.bulkGet([...new Set(due.map((r) => r.lessonId))]);
    const disciplineOfLesson = new Map(dueLessons.filter((l) => !!l).map((l) => [l.id, l.disciplineId]));
    for (const review of due) {
      const entry = stats.get(disciplineOfLesson.get(review.lessonId) ?? "");
      if (entry) entry.due += 1;
    }
    return { semesters, disciplines, stats };
  }, [today]);

  if (!data) return <ScreenSkeleton />;

  const current = resolveCurrentSemester(data.semesters, settings, today);
  const semesters = [...data.semesters].sort((a, b) => {
    if (a.id === current?.id) return -1;
    if (b.id === current?.id) return 1;
    return b.number - a.number;
  });
  const usedNumbers = new Set(data.semesters.map((s) => s.number));
  let suggestedNumber = 1;
  if (data.semesters.length > 0) {
    suggestedNumber = Math.max(...usedNumbers) + 1;
    if (suggestedNumber > settings.totalSemesters) suggestedNumber = settings.totalSemesters;
  }

  return (
    <Page
      title="Cadernos"
      subtitle={`${settings.course} · ${settings.institution}`}
      actions={
        <Button variant="plain" icon={Plus} onClick={() => setSemesterSheet({ open: true })}>
          Semestre
        </Button>
      }
    >
      {semesters.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={BookOpen}
            title="Nenhum semestre ainda"
            action={
              <Button icon={Plus} onClick={() => setSemesterSheet({ open: true })}>
                Criar semestre
              </Button>
            }
          >
            Comece pelo semestre que você está cursando. Depois é só adicionar as disciplinas.
          </EmptyState>
        </div>
      ) : null}

      {semesters.map((semester) => {
        const isCurrent = semester.id === current?.id;
        const isOpen = expanded[semester.id] ?? isCurrent;
        const disciplines = data.disciplines
          .filter((d) => d.semesterId === semester.id)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        return (
          <section key={semester.id} className="mt-8">
            <div className="mb-2.5 flex min-h-11 items-center gap-1 px-1">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setExpanded((prev) => ({ ...prev, [semester.id]: !isOpen }))}
                className="pressable flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <ChevronDown
                  size={20}
                  strokeWidth={2.4}
                  className={cx(
                    "flex-none text-label-3 transition-transform duration-300",
                    !isOpen && "-rotate-90",
                  )}
                />
                <h2 className="truncate text-[22px] leading-7 font-bold tracking-[-0.02em]">
                  {semester.number}º semestre
                </h2>
                {isCurrent ? <Chip tone="accent">Atual</Chip> : null}
                <span className="truncate text-[14px] text-label-3">
                  {semester.start && semester.end
                    ? `${formatShort(semester.start, today)} – ${formatShort(semester.end, today)}`
                    : `${disciplines.length} ${disciplines.length === 1 ? "disciplina" : "disciplinas"}`}
                </span>
              </button>
              <IconButton
                icon={Pencil}
                label={`Editar ${semester.number}º semestre`}
                tone="neutral"
                onClick={() => setSemesterSheet({ open: true, semester })}
              />
            </div>

            {isOpen ? (
              <div className="fade-in grid gap-3 sm:grid-cols-2">
                {disciplines.map((discipline) => (
                  <DisciplineCard
                    key={discipline.id}
                    discipline={discipline}
                    stats={data.stats.get(discipline.id)}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setDisciplineSheet({ open: true, semesterId: semester.id })}
                  className="pressable flex min-h-[112px] items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-fill-2 text-[16px] font-semibold text-accent"
                >
                  <Plus size={19} strokeWidth={2.5} />
                  Nova disciplina
                </button>
              </div>
            ) : null}
          </section>
        );
      })}

      <SemesterSheet
        open={semesterSheet.open}
        semester={semesterSheet.semester}
        suggestedNumber={suggestedNumber}
        maxNumber={settings.totalSemesters}
        onClose={() => setSemesterSheet({ open: false })}
      />
      <DisciplineSheet
        open={disciplineSheet.open}
        semesterId={disciplineSheet.semesterId}
        onClose={() => setDisciplineSheet((prev) => ({ ...prev, open: false }))}
      />
    </Page>
  );
}

export function scheduleText(discipline: Discipline): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const days = order.filter((d) => discipline.weekdays.includes(d)).map((d) => WEEKDAY_SHORT[d]);
  const time = discipline.startTime
    ? discipline.endTime
      ? `${discipline.startTime}–${discipline.endTime}`
      : discipline.startTime
    : "";
  return [days.join(" e "), time].filter(Boolean).join(" · ");
}

function DisciplineCard({
  discipline,
  stats,
}: {
  discipline: Discipline;
  stats: DisciplineStats | undefined;
}) {
  const schedule = scheduleText(discipline);
  return (
    <Link
      to={`#/disciplina/${discipline.id}`}
      className={`dc dc-${discipline.color} pressable relative flex min-h-[112px] flex-col overflow-hidden rounded-[20px] bg-surface py-3.5 pr-4 pl-5 shadow-card`}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-[5px] bg-dc" />
      <div className="flex items-start gap-2">
        <h3 className="line-clamp-2 min-w-0 flex-1 text-[18px] leading-[23px] font-semibold tracking-[-0.015em]">
          {discipline.name}
        </h3>
        {stats && stats.due > 0 ? (
          <Chip tone="red">
            {stats.due} {stats.due === 1 ? "revisão" : "revisões"}
          </Chip>
        ) : null}
      </div>
      {discipline.professor ? (
        <p className="mt-0.5 truncate text-[14.5px] text-label-2">{discipline.professor}</p>
      ) : null}
      <p className="mt-auto truncate pt-3 text-[13.5px] text-label-2">
        <span className="font-semibold text-dc">
          {stats?.lessons ?? 0} {stats?.lessons === 1 ? "aula" : "aulas"}
        </span>
        {schedule ? ` · ${schedule}` : ""}
        {discipline.status !== "andamento" ? ` · ${STATUS_LABEL[discipline.status]}` : ""}
      </p>
    </Link>
  );
}
