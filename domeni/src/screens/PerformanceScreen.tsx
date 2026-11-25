"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Page, ScreenSkeleton } from "@/components/shell/Page";
import { Card, EmptyState, Link, ProgressBar, Section, cx, tint } from "@/components/ui/basics";
import { formatGrade, summarizeAbsences, summarizeGrades } from "@/lib/academics";
import { db } from "@/lib/db";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { resolveCurrentSemester } from "@/lib/today";

/** Notas e faltas de todas as disciplinas do semestre, num lugar só. */
export default function PerformanceScreen() {
  const settings = useSettingsOrDefault();
  const today = useToday();
  const data = useLiveQuery(async () => {
    const [semesters, disciplines, attendance, grades] = await Promise.all([
      db.semesters.toArray(),
      db.disciplines.toArray(),
      db.attendance.toArray(),
      db.grades.toArray(),
    ]);
    return { semesters, disciplines, attendance, grades };
  }, []);
  if (!data) return <ScreenSkeleton />;
  const semester = resolveCurrentSemester(data.semesters, settings, today);
  const disciplines = data.disciplines
    .filter((d) => !semester || d.semesterId === semester.id)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <Page
      title="Notas e faltas"
      subtitle={semester ? `${semester.number}º semestre · calculado com as regras que você configurou` : undefined}
    >
      {settings.defaultAbsenceLimit === null || settings.passingGrade === null ? (
        <Card className="mt-4 bg-yellow-soft px-5 py-4 text-[15px] leading-[22px]">
          Falta configurar {settings.defaultAbsenceLimit === null ? "o limite de faltas" : ""}
          {settings.defaultAbsenceLimit === null && settings.passingGrade === null ? " e " : ""}
          {settings.passingGrade === null ? "a média para passar" : ""} da sua faculdade.{" "}
          <Link to="#/ajustes/regras" className="font-semibold text-accent">
            Configurar agora →
          </Link>
        </Card>
      ) : null}

      {disciplines.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Sem disciplinas no semestre">
            Cadastre as disciplinas em Cadernos para acompanhar notas e faltas aqui.
          </EmptyState>
        </div>
      ) : (
        <Section title="Disciplinas" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {disciplines.map((discipline) => {
              const absences = summarizeAbsences(discipline, data.attendance, settings);
              const grades = summarizeGrades(discipline, data.grades, settings);
              const danger = absences.level === "risco" || absences.level === "estourou";
              return (
                <Link key={discipline.id} to={`#/disciplina/${discipline.id}/faltas`} className="lift card block overflow-hidden">
                  <div {...tint(discipline.color, "h-2 bg-dc")} />
                  <div className="px-5 py-4">
                    <p className="text-[17px] font-semibold">
                      {discipline.emoji ? `${discipline.emoji} ` : ""}
                      {discipline.name}
                    </p>
                    {discipline.professors.length > 0 ? <p className="text-[13px] text-label-2">{discipline.professors.join(" & ")}</p> : null}
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[12px] font-medium text-label-3">Faltas</p>
                        {discipline.kind === "estagio" ? (
                          <p className="font-semibold text-label-2">Estágio (não conta)</p>
                        ) : absences.limit !== null ? (
                          <>
                            <p className={cx("font-display text-[24px] font-semibold", danger && "text-danger")}>
                              {absences.used}
                              <span className="text-[15px] text-label-3">/{absences.limit}</span>
                            </p>
                            <ProgressBar ratio={absences.ratio} className={cx("mt-1", danger && "[--bar:var(--danger)]")} />
                            <p className="mt-1 text-[12.5px] text-label-2">
                              {absences.level === "estourou" ? "passou do limite" : `pode faltar mais ${absences.remaining} (${absences.remainingDays} dias)`}
                            </p>
                          </>
                        ) : (
                          <p className="font-display text-[24px] font-semibold">{absences.used}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-label-3">Média</p>
                        <p className="font-display text-[24px] font-semibold">{formatGrade(grades.current)}</p>
                        <p
                          className={cx(
                            "mt-1 text-[12.5px]",
                            grades.status === "impossivel" ? "font-semibold text-danger" : grades.status === "aprovada" ? "font-semibold text-success" : "text-label-2",
                          )}
                        >
                          {grades.status === "sem-notas"
                            ? "sem avaliações"
                            : grades.status === "sem-regra"
                              ? "configure a média"
                              : grades.status === "aprovada"
                                ? "aprovada 🎉"
                                : grades.status === "impossivel"
                                  ? "não fecha a média"
                                  : `precisa de ${formatGrade(grades.needed)} no que falta`}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>
      )}
    </Page>
  );
}
