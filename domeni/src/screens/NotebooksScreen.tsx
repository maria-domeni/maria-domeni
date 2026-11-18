"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Palette, Plus } from "lucide-react";
import { useState } from "react";
import { SemesterSheet } from "@/components/forms/Sheets";
import { CoverEditor } from "@/components/notebook/CoverEditor";
import { NotebookCover } from "@/components/notebook/NotebookCover";
import { Page, ScreenSkeleton } from "@/components/shell/Page";
import { Button, EmptyState, Link } from "@/components/ui/basics";
import { db } from "@/lib/db";
import { formatShort } from "@/lib/dates";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { updateSemester } from "@/lib/store";
import { resolveCurrentSemester } from "@/lib/today";
import type { Semester } from "@/lib/types";

export default function NotebooksScreen() {
  const settings = useSettingsOrDefault();
  const today = useToday();
  const [creating, setCreating] = useState(false);
  const [editingCover, setEditingCover] = useState<Semester | null>(null);
  const data = useLiveQuery(async () => {
    const [semesters, disciplines] = await Promise.all([db.semesters.toArray(), db.disciplines.toArray()]);
    semesters.sort((a, b) => b.number - a.number);
    return { semesters, disciplines };
  }, []);

  if (!data) return <ScreenSkeleton />;
  const current = resolveCurrentSemester(data.semesters, settings, today);
  const used = new Set(data.semesters.map((s) => s.number));
  let suggested = 1;
  while (used.has(suggested)) suggested++;

  return (
    <Page
      title="Cadernos"
      subtitle="Um caderno para cada semestre. Toque para abrir; personalize a capa como quiser."
      actions={
        <Button size="sm" icon={Plus} onClick={() => setCreating(true)}>
          Semestre
        </Button>
      }
    >
      {data.semesters.length === 0 ? (
        <div className="mt-6">
          <EmptyState emoji="📓" title="Nenhum caderno ainda" action={<Button onClick={() => setCreating(true)}>Criar semestre</Button>}>
            Crie o caderno do seu semestre atual. Dentro dele ficam as disciplinas, cada uma com o seu caderno.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {data.semesters.map((semester) => {
            const count = data.disciplines.filter((d) => d.semesterId === semester.id).length;
            const isCurrent = current?.id === semester.id;
            return (
              <div key={semester.id} className="group">
                <Link to={`#/semestre/${semester.id}`} className="lift block" aria-label={`${semester.number}º semestre`}>
                  <NotebookCover
                    cover={semester.cover}
                    title={`${semester.number}º semestre`}
                    subtitle={settings.course || undefined}
                  />
                </Link>
                <div className="mt-2.5 flex items-start gap-1.5 px-0.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15.5px] font-bold">
                      {semester.number}º semestre
                      {isCurrent ? (
                        <span className="ml-1.5 rounded-full bg-accent-soft px-2 py-0.5 align-middle text-[11.5px] font-extrabold text-accent">
                          atual
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[13px] text-label-2">
                      {count} {count === 1 ? "disciplina" : "disciplinas"}
                      {semester.start ? ` · ${formatShort(semester.start, today)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingCover(semester)}
                    aria-label="Personalizar capa"
                    title="Personalizar capa"
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
            onClick={() => setCreating(true)}
            className="pressable flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-[6px_16px_16px_6px] border-2 border-dashed border-sep text-[15px] font-bold text-label-2"
          >
            <Plus size={26} strokeWidth={2.4} />
            Novo semestre
          </button>
        </div>
      )}

      <SemesterSheet
        open={creating}
        onClose={() => setCreating(false)}
        suggestedNumber={suggested}
        maxNumber={settings.totalSemesters}
      />
      {editingCover ? (
        <CoverEditor
          open
          onClose={() => setEditingCover(null)}
          value={editingCover.cover}
          title={`${editingCover.number}º semestre`}
          subtitle={settings.course || undefined}
          onSave={(cover) => updateSemester(editingCover.id, { cover })}
        />
      ) : null}
    </Page>
  );
}
