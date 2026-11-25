"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/basics";
import { Sheet, useConfirm } from "@/components/ui/overlays";
import { db } from "@/lib/db";
import { formatShort } from "@/lib/dates";
import { deleteAiOutput } from "@/lib/store";
import type { AiAction, AiOutput } from "@/lib/types";
import { MaterialView } from "./MaterialView";

export const ACTION_EMOJI: Record<AiAction, string> = {
  resumo: "📝",
  "resumo-aesthetic": "🎀",
  flashcards: "🃏",
  questoes: "❓",
  jogo: "🎮",
  aprofundar: "🔎",
  explicar: "💡",
  conversa: "💬",
  relatorio: "🩺",
  "organizar-transcricao": "🧹",
};

export function MaterialSheet({ output, onClose }: { output: AiOutput | null; onClose: () => void }) {
  return (
    <Sheet open={output !== null} onClose={onClose} title={output?.title ?? ""} wide>
      {output ? <MaterialView output={output} /> : null}
    </Sheet>
  );
}

/** Materiais gerados pela IA (resumos, jogos, pesquisas) de uma disciplina ou aula. */
export function MaterialsList({ disciplineId, lessonId }: { disciplineId?: string; lessonId?: string }) {
  const confirm = useConfirm();
  const [open, setOpen] = useState<AiOutput | null>(null);
  const outputs = useLiveQuery(async () => {
    const list = lessonId
      ? await db.aiOutputs.where("lessonId").equals(lessonId).toArray()
      : await db.aiOutputs.where("disciplineId").equals(disciplineId ?? "").toArray();
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [disciplineId, lessonId]);

  if (!outputs) return null;
  if (outputs.length === 0) {
    return <Card className="px-5 py-4 text-[15px] text-label-2">Os materiais que a IA gerar a seu pedido ficam guardados aqui, mesmo sem internet.</Card>;
  }
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {outputs.map((output) => (
          <div key={output.id} className="card lift flex items-center gap-3 px-4 py-3">
            <button type="button" onClick={() => setOpen(output)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className="text-[24px]">{ACTION_EMOJI[output.action]}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{output.title}</span>
                <span className="block text-[13px] text-label-2">{formatShort(output.createdAt.slice(0, 10))}</span>
              </span>
            </button>
            <button
              type="button"
              aria-label="Apagar material"
              onClick={async () => {
                if (await confirm({ title: "Apagar este material?", confirmLabel: "Apagar", destructive: true })) await deleteAiOutput(output.id);
              }}
              className="pressable inline-flex size-9 flex-none items-center justify-center rounded-full text-label-3"
            >
              <Trash2 size={16} strokeWidth={2.3} />
            </button>
          </div>
        ))}
      </div>
      <MaterialSheet output={open} onClose={() => setOpen(null)} />
    </>
  );
}
