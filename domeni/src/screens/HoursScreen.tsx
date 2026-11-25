"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Page, ScreenSkeleton } from "@/components/shell/Page";
import { Button, Card, Link, ProgressBar, Section } from "@/components/ui/basics";
import { Field, Segmented, TextInput } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/overlays";
import { db } from "@/lib/db";
import { formatShort, todayISO } from "@/lib/dates";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { createHour, deleteHour } from "@/lib/store";
import { HOUR_KIND_LABEL, type HourKind } from "@/lib/types";

/** Horas complementares e de extensão, com a meta que você configurou. */
export default function HoursScreen() {
  const settings = useSettingsOrDefault();
  const today = useToday();
  const [adding, setAdding] = useState<HourKind | null>(null);
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(todayISO());
  const [kind, setKind] = useState<HourKind>("complementar");
  const entries = useLiveQuery(() => db.hours.toArray(), []);
  if (!entries) return <ScreenSkeleton />;

  const groups: { kind: HourKind; required: number | null; emoji: string }[] = [
    { kind: "complementar", required: settings.requiredComplementary, emoji: "🏅" },
    { kind: "extensao", required: settings.requiredExtension, emoji: "🤝" },
  ];

  return (
    <Page
      title="Horas"
      subtitle="Atividades complementares e extensão. O personagem te cobra quando ficar para trás."
      actions={
        <Button
          size="sm"
          icon={Plus}
          onClick={() => {
            setKind("complementar");
            setAdding("complementar");
          }}
        >
          Registrar
        </Button>
      }
    >
      {settings.requiredComplementary === null || settings.requiredExtension === null ? (
        <Card className="mt-4 bg-yellow-soft px-5 py-4 text-[15px]">
          Informe quantas horas a sua faculdade exige em{" "}
          <Link to="#/ajustes/regras" className="font-semibold text-accent">
            Ajustes › Regras da faculdade
          </Link>
          .
        </Card>
      ) : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {groups.map((group) => {
          const done = entries.filter((e) => e.kind === group.kind).reduce((s, e) => s + e.hours, 0);
          return (
            <Card key={group.kind} className="px-5 py-5">
              <p className="text-[13px] font-medium text-label-2">
                {group.emoji} {HOUR_KIND_LABEL[group.kind]}
              </p>
              <p className="mt-1 font-display text-[36px] leading-none font-semibold">
                {done.toLocaleString("pt-BR")}
                <span className="text-[18px] text-label-3"> {group.required ? `/ ${group.required} h` : "h"}</span>
              </p>
              {group.required ? (
                <>
                  <ProgressBar ratio={done / group.required} className="mt-3" />
                  <p className="mt-1.5 text-[13.5px] text-label-2">
                    {done >= group.required ? "Meta cumprida! 🎉" : `Faltam ${(group.required - done).toLocaleString("pt-BR")} horas`}
                  </p>
                </>
              ) : null}
              <Button
                size="sm"
                variant="tinted"
                className="mt-3"
                icon={Plus}
                onClick={() => {
                  setKind(group.kind);
                  setAdding(group.kind);
                }}
              >
                Adicionar
              </Button>
            </Card>
          );
        })}
      </div>

      <Section title="Registros">
        {entries.length === 0 ? (
          <Card className="px-5 py-4 text-[15px] text-label-2">Palestras, cursos, eventos, projetos de extensão… registre aqui com as horas do certificado.</Card>
        ) : (
          <Card className="divide-y divide-sep">
            {[...entries]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-[20px]">{entry.kind === "complementar" ? "🏅" : "🤝"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{entry.title}</p>
                    <p className="text-[13px] text-label-2">
                      {formatShort(entry.date, today)} · {HOUR_KIND_LABEL[entry.kind]}
                    </p>
                  </div>
                  <span className="font-semibold">{entry.hours.toLocaleString("pt-BR")} h</span>
                  <button type="button" aria-label="Apagar" onClick={() => void deleteHour(entry.id)} className="pressable inline-flex size-9 items-center justify-center rounded-full text-label-3">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
          </Card>
        )}
      </Section>

      <Sheet
        open={adding !== null}
        onClose={() => setAdding(null)}
        title="Registrar horas"
        submitLabel="Salvar"
        canSubmit={title.trim().length > 0 && Number(hours.replace(",", ".")) > 0}
        onSubmit={async () => {
          await createHour({ kind, title, hours: Number(hours.replace(",", ".")), date: date || todayISO(), notes: "" });
          setTitle("");
          setHours("");
        }}
      >
        <div className="space-y-4">
          <Segmented
            label="Tipo"
            value={kind}
            onChange={setKind}
            options={[
              { value: "complementar", label: "Complementar" },
              { value: "extensao", label: "Extensão" },
            ]}
          />
          <Field label="Atividade">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Congresso de Psicologia" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Horas">
              <TextInput inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^\d,.]/g, ""))} />
            </Field>
            <Field label="Data">
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
        </div>
      </Sheet>
    </Page>
  );
}
