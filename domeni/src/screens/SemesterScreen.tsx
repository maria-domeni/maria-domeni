"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Palette, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { DisciplineSheet, SemesterSheet } from "@/components/forms/Sheets";
import { CoverEditor } from "@/components/notebook/CoverEditor";
import { NotebookCover } from "@/components/notebook/NotebookCover";
import { Page, ScreenSkeleton } from "@/components/shell/Page";
import { Button, EmptyState, IconButton, Link, ProgressBar } from "@/components/ui/basics";
import { scheduleText, summarizeAbsences } from "@/lib/academics";
import { db } from "@/lib/db";
import { formatShort, weekProgress } from "@/lib/dates";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { saveSettings, updateDiscipline } from "@/lib/store";
import { WEEKDAY_SHORT, type Discipline } from "@/lib/types";

export default function SemesterScreen({ id }: { id: string }) {
  const settings = useSettingsOrDefault();
  const today = useToday();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cover, setCover] = useState<Discipline | null>(null);
  const data = useLiveQuery(async () => {
    const semester = await db.semesters.get(id);
    if (!semester) return { semester: null, disciplines: [], attendance: [], lessons: [] as { disciplineId: string }[] };
    const disciplines = await db.disciplines.where("semesterId").equals(id).toArray();
    disciplines.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const ids = disciplines.map((d) => d.id);
    const [attendance, lessons] = await Promise.all([
      db.attendance.where("disciplineId").anyOf(ids).toArray(),
      db.lessons.where("disciplineId").anyOf(ids).toArray(),
    ]);
    return { semester, disciplines, attendance, lessons };
  }, [id]);

  if (!data) return <ScreenSkeleton />;
  if (!data.semester) {
    return (
      <Page title="Semestre" back={{ to: "#/cadernos", label: "Cadernos" }}>
        <div className="mt-6">
          <EmptyState emoji="🫥" title="Esse semestre não existe mais" />
        </div>
      </Page>
    );
  }
  const semester = data.semester;
  const progress = weekProgress(semester.start, semester.end, today);
  const isCurrent = settings.currentSemesterId === semester.id;

  return (
    <Page
      title={`${semester.number}º semestre`}
      back={{ to: "#/cadernos", label: "Cadernos" }}
      subtitle={
        semester.start && semester.end
          ? `${formatShort(semester.start, today)} a ${formatShort(semester.end, today)}${progress ? ` · semana ${progress.week} de ${progress.total}` : ""}`
          : "Sem datas definidas"
      }
      actions={
        <>
          <IconButton icon={Pencil} label="Editar semestre" onClick={() => setEditing(true)} filled />
          <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
            Disciplina
          </Button>
        </>
      }
    >
      {progress ? <ProgressBar ratio={progress.ratio} className="mt-1 max-w-[420px]" /> : null}
      {!isCurrent ? (
        <button
          type="button"
          onClick={() => void saveSettings({ currentSemesterId: semester.id })}
          className="mt-3 rounded-full bg-accent-soft px-3.5 py-1.5 text-[14px] font-bold text-accent"
        >
          Usar como semestre atual
        </button>
      ) : null}

      {data.disciplines.length === 0 ? (
        <div className="mt-6">
          <EmptyState emoji="🎒" title="Cadastre suas disciplinas" action={<Button onClick={() => setAdding(true)}>Nova disciplina</Button>}>
            Com professores e horários, o Domeni monta a sua agenda, conta faltas e te avisa das aulas.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {data.disciplines.map((discipline) => {
            const absences = summarizeAbsences(discipline, data.attendance, settings);
            const lessonCount = data.lessons.filter((l) => l.disciplineId === discipline.id).length;
            return (
              <div key={discipline.id}>
                <Link to={`#/disciplina/${discipline.id}`} className="lift block">
                  <NotebookCover
                    cover={discipline.cover}
                    title={`${discipline.emoji ? `${discipline.emoji} ` : ""}${discipline.name}`}
                    subtitle={discipline.professors.join(" & ") || undefined}
                  />
                </Link>
                <div className="mt-2.5 flex items-start gap-1.5 px-0.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15.5px] font-bold">{discipline.name}</p>
                    <p className="truncate text-[12.5px] text-label-2">
                      {scheduleText(discipline, WEEKDAY_SHORT) || "Sem horário"} · {lessonCount} {lessonCount === 1 ? "aula" : "aulas"}
                    </p>
                    {absences.limit !== null ? (
                      <p
                        className={
                          absences.level === "risco" || absences.level === "estourou"
                            ? "text-[12.5px] font-bold text-danger"
                            : "text-[12.5px] text-label-3"
                        }
                      >
                        Faltas: {absences.used}/{absences.limit}
                      </p>
                    ) : discipline.kind === "estagio" ? (
                      <p className="text-[12.5px] text-label-3">Estágio</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCover(discipline)}
                    aria-label="Personalizar capa"
                    className="pressable inline-flex size-9 flex-none items-center justify-center rounded-full bg-surface text-label-2 shadow-card"
                  >
                    <Palette size={16} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="pressable flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-[6px_16px_16px_6px] border-2 border-dashed border-sep text-[15px] font-bold text-label-2"
          >
            <Plus size={26} strokeWidth={2.4} />
            Nova disciplina
          </button>
        </div>
      )}

      <DisciplineSheet open={adding} onClose={() => setAdding(false)} semesterId={semester.id} />
      <SemesterSheet
        open={editing}
        onClose={() => setEditing(false)}
        semester={semester}
        suggestedNumber={semester.number}
        maxNumber={settings.totalSemesters}
      />
      {cover ? (
        <CoverEditor
          open
          onClose={() => setCover(null)}
          value={cover.cover}
          title={`${cover.emoji ? `${cover.emoji} ` : ""}${cover.name}`}
          subtitle={cover.professors.join(" & ") || undefined}
          onSave={(next) => updateDiscipline(cover.id, { cover: next })}
        />
      ) : null}
    </Page>
  );
}
