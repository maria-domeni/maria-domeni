"use client";

import { Send, Sparkles, X } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { Markdown } from "@/components/ui/Markdown";
import { Button, Card, cx } from "@/components/ui/basics";
import { TextInput } from "@/components/ui/fields";
import { Sheet, useToast } from "@/components/ui/overlays";
import { AiError, askAi } from "@/lib/ai";
import { formatShort } from "@/lib/dates";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { Link } from "@/components/ui/basics";
import { keywordsOf } from "@/lib/search";
import { createCards, createQuestions, saveAiOutput } from "@/lib/store";
import type { AiAction, AiOutput, Discipline, Lesson } from "@/lib/types";
import { MaterialSheet } from "./MaterialsList";
import { disciplineContext, lessonSources, libraryExcerpts } from "./sources";

interface ActionCard {
  action: AiAction;
  emoji: string;
  title: string;
  hint: string;
  needsTopic?: boolean;
  needsTranscript?: boolean;
}

const ACTIONS: ActionCard[] = [
  { action: "resumo", emoji: "📝", title: "Resumo", hint: "Organiza as suas anotações em tópicos" },
  { action: "resumo-aesthetic", emoji: "🎀", title: "Resumo aesthetic", hint: "Folha linda para estudar e imprimir" },
  { action: "flashcards", emoji: "🃏", title: "Flashcards", hint: "Cria cartões e põe no seu baralho" },
  { action: "questoes", emoji: "❓", title: "Questões", hint: "Múltipla escolha com gabarito comentado" },
  { action: "jogo", emoji: "🎮", title: "Jogo", hint: "Quiz e verdadeiro ou falso com pontos" },
  { action: "aprofundar", emoji: "🔎", title: "Aprofundar", hint: "Pesquisa na internet e te ensina o tema inteiro", needsTopic: true },
  { action: "explicar", emoji: "💡", title: "Explicar um conceito", hint: "Explicação didática, com exemplos", needsTopic: true },
  { action: "organizar-transcricao", emoji: "🧹", title: "Organizar transcrição", hint: "Transforma a gravação em anotação", needsTranscript: true },
];

const JSON_ACTIONS: AiAction[] = ["resumo-aesthetic", "flashcards", "questoes", "jogo"];

/**
 * Botões de IA de uma disciplina ou aula. Cada um só roda quando tocado,
 * usando as anotações escolhidas como fonte.
 */
export function AiStudio({
  discipline,
  lessons,
  currentLesson,
}: {
  discipline: Discipline;
  lessons: Lesson[];
  currentLesson?: Lesson;
}) {
  const settings = useSettingsOrDefault();
  const today = useToday();
  const toast = useToast();
  const withContent = useMemo(
    () =>
      [...lessons]
        .filter((l) => l.notes || l.transcript || l.summary || l.feynman)
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [lessons],
  );
  const [selected, setSelected] = useState<string[]>(() =>
    currentLesson ? [currentLesson.id] : withContent.slice(0, 3).map((l) => l.id),
  );
  const [topic, setTopic] = useState(currentLesson?.title ?? "");
  const [running, setRunning] = useState<AiAction | null>(null);
  const [stream, setStream] = useState("");
  const [result, setResult] = useState<AiOutput | null>(null);
  const [chat, setChat] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const chosen = withContent.filter((l) => selected.includes(l.id));
  const hasTranscript = chosen.some((l) => l.transcript.trim());

  async function run(card: ActionCard) {
    if (card.needsTopic && !topic.trim()) {
      toast("Escreva o tema no campo acima.");
      return;
    }
    if (!card.needsTopic && card.action !== "organizar-transcricao" && chosen.length === 0) {
      toast("Escolha pelo menos uma aula com anotações.");
      return;
    }
    setRunning(card.action);
    setStream("");
    const controller = new AbortController();
    abort.current = controller;
    try {
      const sources = lessonSources(chosen, card.action !== "organizar-transcricao");
      const library = card.needsTopic ? await libraryExcerpts(keywordsOf(topic), 5) : [];
      const input: Record<string, unknown> = {
        course: settings.course,
        discipline: disciplineContext(discipline),
        sources: card.action === "organizar-transcricao" ? [] : sources,
        library,
        topic: topic.trim(),
      };
      if (card.action === "organizar-transcricao") {
        input.transcript = chosen.map((l) => l.transcript).filter(Boolean).join("\n\n").slice(0, 60_000);
      }
      if (card.action === "flashcards") input.count = 15;
      if (card.action === "questoes") input.count = 8;
      const res = await askAi(card.action, input, { onText: (t) => setStream(t), signal: controller.signal });
      const isJson = JSON_ACTIONS.includes(card.action);
      const content = isJson ? JSON.stringify(res.json) : res.text;
      const titleBase =
        card.needsTopic
          ? topic.trim()
          : chosen.length === 1
            ? chosen[0].title || `Aula ${chosen[0].number ?? ""}`
            : `${chosen.length} aulas de ${discipline.name}`;
      const jsonTitle = isJson ? ((res.json as { title?: string } | null)?.title ?? "") : "";
      const output = await saveAiOutput({
        action: card.action,
        disciplineId: discipline.id,
        lessonId: currentLesson?.id ?? (chosen.length === 1 ? chosen[0].id : null),
        title: `${card.title}: ${jsonTitle || titleBase}`.slice(0, 120),
        content,
        model: res.model,
      });
      if (card.action === "flashcards") {
        const cards = (res.json as { cards?: { front: string; back: string }[] } | null)?.cards ?? [];
        const n = await createCards(cards, { disciplineId: discipline.id, lessonId: output.lessonId, source: "ia", today });
        toast(`${n} flashcards adicionados ao seu baralho`);
      }
      if (card.action === "questoes") {
        const qs = (res.json as { questions?: { stem: string; options: string[]; answer: number; explanation: string }[] } | null)?.questions ?? [];
        const n = await createQuestions(qs, { disciplineId: discipline.id, lessonId: output.lessonId, source: "ia" });
        toast(`${n} questões guardadas em Estudar`);
      }
      setResult(output);
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") toast("Cancelado");
      else toast(error instanceof AiError ? error.message : "A IA não conseguiu terminar. Tente de novo.");
    } finally {
      setRunning(null);
      abort.current = null;
    }
  }

  if (!settings.aiEnabled) {
    return (
      <Card className="px-5 py-4 text-[15px] text-label-2">
        A IA está desligada. Ligue em <Link to="#/ajustes/ia" className="font-bold text-accent">Ajustes › IA</Link>.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="px-4 py-4">
        <p className="text-[14px] font-bold text-label-2">Usar como fonte</p>
        {withContent.length === 0 ? (
          <p className="mt-1 text-[14.5px] text-label-2">Ainda não há aulas com anotações nesta disciplina. Os botões de tema (Aprofundar e Explicar) funcionam mesmo assim.</p>
        ) : (
          <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {withContent.map((lesson) => {
              const on = selected.includes(lesson.id);
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => setSelected((s) => (on ? s.filter((id) => id !== lesson.id) : [...s, lesson.id]))}
                  aria-pressed={on}
                  className={cx(
                    "pressable h-9 flex-none rounded-full px-3 text-[13.5px] font-bold whitespace-nowrap",
                    on ? "bg-accent-solid text-on-accent" : "bg-fill text-label-2",
                  )}
                >
                  {lesson.title || `Aula ${lesson.number ?? ""}`}
                  {lesson.date ? ` · ${formatShort(lesson.date, today)}` : ""}
                  {lesson.transcript ? " 🎙️" : ""}
                </button>
              );
            })}
          </div>
        )}
        <label className="mt-3 block">
          <span className="text-[14px] font-bold text-label-2">Tema (para Aprofundar e Explicar)</span>
          <TextInput value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: posição esquizoparanoide em Melanie Klein" className="mt-1" />
        </label>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ACTIONS.filter((a) => !a.needsTranscript || hasTranscript).map((card) => (
          <button
            key={card.action}
            type="button"
            disabled={running !== null}
            onClick={() => void run(card)}
            className="pressable lift card flex flex-col items-start gap-1 px-4 py-3.5 text-left disabled:opacity-50"
          >
            <span className="text-[26px] leading-none">{card.emoji}</span>
            <span className="mt-1 text-[15.5px] font-bold">{card.title}</span>
            <span className="text-[12.5px] leading-[17px] text-label-2">{card.hint}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setChat(true)}
          className="pressable lift card flex flex-col items-start gap-1 px-4 py-3.5 text-left"
        >
          <span className="text-[26px] leading-none">{discipline.emoji || "🧑‍🏫"}</span>
          <span className="mt-1 text-[15.5px] font-bold">Agente de {discipline.name}</span>
          <span className="text-[12.5px] leading-[17px] text-label-2">Converse e tire dúvidas da matéria</span>
        </button>
      </div>
      <p className="flex items-center gap-1.5 text-[12.5px] text-label-3">
        <Sparkles size={13} /> Cada botão usa créditos da IA só quando você toca. Nada roda sozinho.
      </p>

      <Sheet open={running !== null} onClose={() => abort.current?.abort()} title="Gerando…" wide>
        <div className="flex items-center gap-3 rounded-2xl bg-accent-faint px-4 py-3">
          <span className="wiggle text-[26px]">{ACTIONS.find((a) => a.action === running)?.emoji ?? "✨"}</span>
          <p className="flex-1 text-[15px] font-semibold">
            {running === "aprofundar" ? "Pesquisando e escrevendo (pode levar alguns minutos)…" : "A IA está preparando o material…"}
          </p>
          <Button size="sm" variant="gray" icon={X} onClick={() => abort.current?.abort()}>
            Cancelar
          </Button>
        </div>
        {stream ? (
          <div className="mt-4">
            <Markdown text={stream} />
          </div>
        ) : null}
      </Sheet>
      <MaterialSheet output={result} onClose={() => setResult(null)} />
      <AgentChat open={chat} onClose={() => setChat(false)} discipline={discipline} lessons={withContent} />
    </div>
  );
}

interface Turn {
  role: "user" | "assistant";
  text: string;
}

/** Conversa com o agente da disciplina (só gasta quando você envia). */
export function AgentChat({
  open,
  onClose,
  discipline,
  lessons,
}: {
  open: boolean;
  onClose: () => void;
  discipline: Discipline;
  lessons: Lesson[];
}) {
  const settings = useSettingsOrDefault();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(event: FormEvent) {
    event.preventDefault();
    const question = text.trim();
    if (!question || busy) return;
    setText("");
    const history = [...turns, { role: "user" as const, text: question }];
    setTurns([...history, { role: "assistant", text: "" }]);
    setBusy(true);
    try {
      const terms = keywordsOf(question);
      const related = lessons.filter((l) => terms.some((t) => `${l.title} ${l.notes} ${l.transcript}`.toLowerCase().includes(t))).slice(0, 4);
      await askAi(
        "conversa",
        {
          agent: "disciplina",
          question,
          history: turns.slice(-10),
          course: settings.course,
          userName: settings.profileName,
          discipline: disciplineContext(discipline),
          sources: lessonSources(related.length > 0 ? related : lessons.slice(0, 2)),
          library: await libraryExcerpts(terms, 4),
        },
        { onText: (full) => setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, text: full } : turn))) },
      );
    } catch (error) {
      const message = error instanceof AiError ? error.message : "Não consegui responder agora.";
      setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, text: message } : turn)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Agente de ${discipline.name}`} wide>
      <div className="flex min-h-[50dvh] flex-col">
        <div className="flex-1 space-y-3">
          {turns.length === 0 ? (
            <p className="rounded-2xl bg-accent-faint px-4 py-3 text-[15px] leading-[22px]">
              Sou especialista em {discipline.name}. Uso as suas anotações e a sua biblioteca como base; o que vier de
              conhecimento geral eu marco como <b>complemento — confirmar com o professor</b>.
            </p>
          ) : null}
          {turns.map((turn, i) => (
            <div key={i} className={cx("flex", turn.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cx(
                  "max-w-[88%] rounded-2xl px-4 py-2.5 text-[15px] leading-[22px]",
                  turn.role === "user" ? "rounded-br-md bg-accent-solid text-on-accent" : "rounded-bl-md bg-fill",
                )}
              >
                {turn.role === "assistant" ? turn.text ? <Markdown text={turn.text} compact /> : <span className="text-label-2">Pensando…</span> : turn.text}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="sticky bottom-0 mt-4 flex gap-2 bg-surface pt-2">
          <TextInput value={text} onChange={(e) => setText(e.target.value)} placeholder="Pergunte sobre a matéria…" />
          <Button type="submit" icon={Send} disabled={busy || !text.trim()}>
            Enviar
          </Button>
        </form>
      </div>
    </Sheet>
  );
}
