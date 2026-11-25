"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { SemesterSheet } from "@/components/forms/Sheets";
import { COVER_COLORS } from "@/components/notebook/CoverEditor";
import { Folder } from "@/components/notebook/NotebookCover";
import { Page, ScreenSkeleton } from "@/components/shell/Page";
import { Button, EmptyState, Link, cx } from "@/components/ui/basics";
import { CustomColorSwatch } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/overlays";
import { db } from "@/lib/db";
import { formatShort } from "@/lib/dates";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { updateSemester } from "@/lib/store";
import { resolveCurrentSemester } from "@/lib/today";
import type { Semester } from "@/lib/types";

/** Cadernos: uma pasta por semestre, como no iPad. */
export default function NotebooksScreen() {
  const settings = useSettingsOrDefault();
  const today = useToday();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Semester | null>(null);
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
      actions={
        <Button size="sm" variant="gray" icon={Plus} onClick={() => setCreating(true)}>
          Semestre
        </Button>
      }
    >
      {data.semesters.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Nenhum semestre ainda" action={<Button onClick={() => setCreating(true)}>Criar semestre</Button>}>
            Cada semestre é uma pasta. Dentro dela ficam os cadernos das disciplinas.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {data.semesters.map((semester) => {
            const count = data.disciplines.filter((d) => d.semesterId === semester.id).length;
            return (
              <div key={semester.id} className="text-center">
                <Link to={`#/semestre/${semester.id}`} className="lift block">
                  <Folder color={semester.cover.color} className="mx-auto w-full max-w-[150px]" label={`${semester.number}º semestre`} />
                </Link>
                <div className="mt-1.5 flex items-start justify-center gap-0.5">
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-semibold">
                      {semester.number}º semestre
                      {current?.id === semester.id ? <span className="ml-1 text-[12px] font-medium text-accent">atual</span> : null}
                    </p>
                    <p className="truncate text-[12.5px] text-label-2">
                      {count} {count === 1 ? "caderno" : "cadernos"}
                      {semester.start ? ` · ${formatShort(semester.start, today)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(semester)}
                    aria-label="Cor da pasta"
                    className="row-pressable -mt-0.5 inline-flex size-7 flex-none items-center justify-center rounded-[8px] text-label-3"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SemesterSheet open={creating} onClose={() => setCreating(false)} suggestedNumber={suggested} maxNumber={settings.totalSemesters} />
      {editing ? <FolderColorSheet semester={editing} onClose={() => setEditing(null)} /> : null}
    </Page>
  );
}

function FolderColorSheet({ semester, onClose }: { semester: Semester; onClose: () => void }) {
  const [color, setColor] = useState(semester.cover.color);
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Pasta do ${semester.number}º semestre`}
      submitLabel="Salvar"
      onSubmit={() => updateSemester(semester.id, { cover: { ...semester.cover, color } })}
    >
      <Folder color={color} className="mx-auto w-[160px]" />
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        {COVER_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Cor ${c}`}
            onClick={() => setColor(c)}
            className={cx(
              "pressable size-9 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]",
              color === c && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
            )}
            style={{ background: c }}
          />
        ))}
        <CustomColorSwatch value={color} selected={!COVER_COLORS.includes(color)} onChange={setColor} label="Outra cor" />
      </div>
    </Sheet>
  );
}
