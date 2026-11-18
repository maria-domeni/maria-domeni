"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Game } from "@/components/ai/MaterialView";
import { Page, ScreenSkeleton, Tabs } from "@/components/shell/Page";
import { Button, Card, EmptyState, Section, cx } from "@/components/ui/basics";
import { Field, Select, TextArea } from "@/components/ui/fields";
import { Sheet, useToast } from "@/components/ui/overlays";
import { db } from "@/lib/db";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { navigate } from "@/lib/router";
import { CARD_ANSWER_LABEL, dueCards, scheduleCard, shuffle, type CardAnswer } from "@/lib/srs";
import { createCards, createQuestions, deleteCard, deleteQuestion, updateCard } from "@/lib/store";
import { resolveCurrentSemester } from "@/lib/today";
import type { Discipline, Flashcard, Question } from "@/lib/types";

type Mode = "cartoes" | "questoes" | "memoria" | "revisoes";

/** Estudo ativo: flashcards com repetição espaçada, questões e jogos (tudo sem IA). */
export default function StudyScreen({ disciplineId }: { disciplineId: string | null }) {
  const today = useToday();
  const settings = useSettingsOrDefault();
  const [mode, setMode] = useState<Mode>("cartoes");
  const [adding, setAdding] = useState<"cartao" | "questao" | null>(null);
  const data = useLiveQuery(async () => {
    const [semesters, disciplines, cards, questions, reviews] = await Promise.all([
      db.semesters.toArray(),
      db.disciplines.toArray(),
      db.cards.toArray(),
      db.questions.toArray(),
      db.reviews.where("dueDate").belowOrEqual(today).toArray(),
    ]);
    return { semesters, disciplines, cards, questions, reviews: reviews.filter((r) => !r.doneAt) };
  }, [today]);
  if (!data || today === "2000-01-01") return <ScreenSkeleton />;

  const semester = resolveCurrentSemester(data.semesters, settings, today);
  const disciplines = data.disciplines.filter((d) => !semester || d.semesterId === semester.id);
  const filter = (x: { disciplineId: string | null }) => !disciplineId || x.disciplineId === disciplineId;
  const cards = data.cards.filter(filter);
  const questions = data.questions.filter(filter);
  const due = dueCards(cards, today);
  const discipline = data.disciplines.find((d) => d.id === disciplineId);

  return (
    <Page
      title={discipline ? `Estudar ${discipline.name}` : "Estudar"}
      subtitle="Flashcards com repetição espaçada, questões e jogos. Funciona sem internet e sem gastar créditos."
      wide
      actions={
        <Button size="sm" icon={Plus} onClick={() => setAdding(mode === "questoes" ? "questao" : "cartao")}>
          {mode === "questoes" ? "Questão" : "Flashcard"}
        </Button>
      }
    >
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Select
          value={disciplineId ?? ""}
          onChange={(e) => navigate(e.target.value ? `#/estudar/${e.target.value}` : "#/estudar", { replace: true })}
          className="max-w-[260px] bg-surface shadow-card"
          aria-label="Disciplina"
        >
          <option value="">Todas as disciplinas</option>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.emoji} {d.name}
            </option>
          ))}
        </Select>
        <Tabs
          value={mode}
          onChange={setMode}
          tabs={[
            { value: "cartoes", label: "🃏 Flashcards", badge: due.length || undefined },
            { value: "questoes", label: "❓ Questões", badge: questions.length || undefined },
            { value: "memoria", label: "🧩 Jogo da memória" },
            { value: "revisoes", label: "🔁 Revisões de aula", badge: data.reviews.length || undefined },
          ]}
        />
      </div>

      {mode === "cartoes" ? <CardsMode cards={cards} due={due} today={today} disciplines={data.disciplines} /> : null}
      {mode === "questoes" ? <QuestionsMode questions={questions} /> : null}
      {mode === "memoria" ? <MemoryGame cards={cards} /> : null}
      {mode === "revisoes" ? (
        <Card className="mt-5 px-5 py-5">
          <p className="text-[16px]">
            {data.reviews.length > 0
              ? `Você tem ${data.reviews.length} revisões de aula para hoje (1, 7 e 30 dias depois de cada aula).`
              : "Nenhuma revisão de aula para hoje. 🎉"}
          </p>
          <Button className="mt-3" onClick={() => navigate("#/revisoes")}>
            Abrir revisões
          </Button>
        </Card>
      ) : null}

      <AddCardSheet open={adding === "cartao"} onClose={() => setAdding(null)} disciplines={disciplines} defaultDisciplineId={disciplineId} />
      <AddQuestionSheet open={adding === "questao"} onClose={() => setAdding(null)} disciplines={disciplines} defaultDisciplineId={disciplineId} />
    </Page>
  );
}

function CardsMode({ cards, due, today, disciplines }: { cards: Flashcard[]; due: Flashcard[]; today: string; disciplines: Discipline[] }) {
  const [session, setSession] = useState<Flashcard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [list, setList] = useState(false);
  const byId = new Map(disciplines.map((d) => [d.id, d]));

  if (cards.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState emoji="🃏" title="Nenhum flashcard ainda">
          Crie os seus no botão “Flashcard” ou peça para a IA criar a partir das suas anotações (na disciplina ou na aula, em “Estudar com IA”).
        </EmptyState>
      </div>
    );
  }

  if (session) {
    const card = session[index];
    if (!card) {
      return (
        <Card className="mt-6 px-6 py-8 text-center">
          <p className="text-[48px]">🌟</p>
          <p className="mt-2 font-display text-[28px] font-bold">Sessão concluída!</p>
          <p className="mt-1 text-label-2">{session.length} cartões revisados. Os próximos voltam no dia certo.</p>
          <Button className="mt-5" onClick={() => setSession(null)}>
            Voltar
          </Button>
        </Card>
      );
    }
    const answer = async (a: CardAnswer) => {
      await updateCard(card.id, scheduleCard(card, a, today));
      if (a === "errei") setSession((s) => (s ? [...s, card] : s));
      setIndex((i) => i + 1);
      setFlipped(false);
    };
    return (
      <div className="mx-auto mt-6 max-w-[620px]">
        <p className="mb-2 text-center text-[13px] font-bold text-label-2">
          {index + 1} de {session.length} · {byId.get(card.disciplineId ?? "")?.name ?? "geral"}
        </p>
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className={cx("washi card flex min-h-[280px] w-full flex-col items-center justify-center overflow-visible px-8 py-10 text-center", flipped && "flip-in")}
          key={`${card.id}-${flipped}`}
        >
          <p className="text-[12.5px] font-extrabold tracking-[0.06em] text-accent uppercase">{flipped ? "resposta" : "pergunta"}</p>
          <p className={cx("mt-3 leading-snug font-bold", flipped ? "text-[19px]" : "font-display text-[26px]")}>{flipped ? card.back : card.front}</p>
          {!flipped ? <p className="mt-5 text-[13px] text-label-3">toque para virar</p> : null}
        </button>
        {flipped ? (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {(["errei", "dificil", "bom", "facil"] as CardAnswer[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => void answer(a)}
                className={cx(
                  "pressable h-12 rounded-2xl text-[15px] font-bold",
                  a === "errei" ? "bg-danger-soft text-danger" : a === "dificil" ? "bg-yellow-soft text-yellow" : a === "bom" ? "bg-accent-soft text-accent" : "bg-success-soft text-success",
                )}
              >
                {CARD_ANSWER_LABEL[a]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <Card className="mt-5 flex flex-wrap items-center gap-4 px-5 py-5">
        <div className="flex-1">
          <p className="font-display text-[28px] font-bold">{due.length > 0 ? `${due.length} para hoje` : "Tudo em dia ✨"}</p>
          <p className="text-[14.5px] text-label-2">{cards.length} flashcards no total</p>
        </div>
        <Button
          size="lg"
          disabled={due.length === 0}
          onClick={() => {
            setSession(due.slice(0, 40));
            setIndex(0);
            setFlipped(false);
          }}
        >
          Estudar agora
        </Button>
        <Button
          variant="gray"
          onClick={() => {
            setSession(shuffle(cards).slice(0, 20));
            setIndex(0);
            setFlipped(false);
          }}
        >
          Treino livre
        </Button>
      </Card>
      <Section title="Todos os flashcards" action={<button type="button" onClick={() => setList((v) => !v)} className="text-[15px] font-bold text-accent">{list ? "Esconder" : "Mostrar"}</button>}>
        {list ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {cards.map((card) => (
              <div key={card.id} className="card flex gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{card.front}</p>
                  <p className="text-[14px] text-label-2">{card.back}</p>
                  <p className="mt-1 text-[12px] text-label-3">
                    {card.source === "ia" ? "✨ IA · " : ""}próxima: {card.due}
                  </p>
                </div>
                <button type="button" aria-label="Apagar" onClick={() => void deleteCard(card.id)} className="pressable inline-flex size-9 items-center justify-center rounded-full text-label-3">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </Section>
    </>
  );
}

function QuestionsMode({ questions }: { questions: Question[] }) {
  const [playing, setPlaying] = useState<Question[] | null>(null);
  if (questions.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState emoji="❓" title="Nenhuma questão ainda">
          Crie questões suas ou peça para a IA gerar a partir das anotações (em “Estudar com IA”).
        </EmptyState>
      </div>
    );
  }
  if (playing) {
    return (
      <div className="mx-auto mt-6 max-w-[720px]">
        <Game
          data={{
            title: "Questões",
            rounds: playing.map((q) => ({
              kind: "quiz" as const,
              prompt: q.stem,
              options: q.options,
              answer: q.answer ?? 0,
              explanation: q.explanation,
            })),
          }}
        />
        <Button variant="gray" className="mt-3" icon={RotateCcw} onClick={() => setPlaying(null)}>
          Voltar à lista
        </Button>
      </div>
    );
  }
  const objective = questions.filter((q) => q.options.length >= 2 && q.answer !== null);
  return (
    <>
      <Card className="mt-5 flex flex-wrap items-center gap-4 px-5 py-5">
        <div className="flex-1">
          <p className="font-display text-[26px] font-bold">{questions.length} questões</p>
          <p className="text-[14.5px] text-label-2">Faça um simulado com 10 sorteadas.</p>
        </div>
        <Button size="lg" disabled={objective.length === 0} onClick={() => setPlaying(shuffle(objective).slice(0, 10))}>
          Fazer simulado
        </Button>
      </Card>
      <div className="mt-5 space-y-2.5">
        {questions.map((q) => (
          <div key={q.id} className="card flex gap-2 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{q.stem}</p>
              {q.options.length > 0 ? (
                <ol className="mt-1 list-[upper-alpha] pl-5 text-[14px] text-label-2">
                  {q.options.map((o, i) => (
                    <li key={i} className={i === q.answer ? "font-bold text-success" : undefined}>
                      {o}
                    </li>
                  ))}
                </ol>
              ) : null}
              <p className="mt-1 text-[12px] text-label-3">
                {q.source === "ia" ? "✨ IA · " : ""}acertos {q.right} · erros {q.wrong}
              </p>
            </div>
            <button type="button" aria-label="Apagar" onClick={() => void deleteQuestion(q.id)} className="pressable inline-flex size-9 items-center justify-center rounded-full text-label-3">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/** Jogo da memória: encontre os pares termo ↔ resposta dos seus flashcards. */
function MemoryGame({ cards }: { cards: Flashcard[] }) {
  const [seed, setSeed] = useState(0);
  const tiles = useMemo(() => {
    void seed;
    const chosen = shuffle(cards).slice(0, 6);
    return shuffle(
      chosen.flatMap((c) => [
        { key: `${c.id}-f`, pair: c.id, text: c.front, side: "f" as const },
        { key: `${c.id}-b`, pair: c.id, text: c.back, side: "b" as const },
      ]),
    );
  }, [cards, seed]);
  const [open, setOpen] = useState<string[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);

  if (cards.length < 3) {
    return (
      <div className="mt-6">
        <EmptyState emoji="🧩" title="Precisa de pelo menos 3 flashcards">
          O jogo usa os seus flashcards: junte cada pergunta com a resposta.
        </EmptyState>
      </div>
    );
  }
  const won = found.length === tiles.length / 2;

  function flip(key: string, pair: string) {
    if (open.length === 2 || open.includes(key) || found.includes(pair)) return;
    const next = [...open, key];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((k) => tiles.find((t) => t.key === k)!);
      if (a.pair === b.pair) {
        setFound((f) => [...f, a.pair]);
        setOpen([]);
      } else window.setTimeout(() => setOpen([]), 1100);
    }
  }

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-bold text-label-2">
          {won ? `🎉 Você completou em ${moves} jogadas!` : `Pares: ${found.length}/${tiles.length / 2} · jogadas: ${moves}`}
        </p>
        <Button
          size="sm"
          variant="gray"
          icon={RotateCcw}
          onClick={() => {
            setSeed((s) => s + 1);
            setOpen([]);
            setFound([]);
            setMoves(0);
          }}
        >
          Novo jogo
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => {
          const shown = open.includes(tile.key) || found.includes(tile.pair);
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => flip(tile.key, tile.pair)}
              className={cx(
                "pressable flex min-h-[110px] items-center justify-center rounded-2xl p-3 text-center text-[14px] leading-[19px] font-bold transition-colors",
                found.includes(tile.pair) ? "bg-success-soft text-success" : shown ? "card" : "bg-accent-solid text-on-accent",
              )}
            >
              {shown ? <span className="line-clamp-5">{tile.text}</span> : <span className="text-[26px]">{tile.side === "f" ? "❔" : "💡"}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AddCardSheet({ open, onClose, disciplines, defaultDisciplineId }: { open: boolean; onClose: () => void; disciplines: Discipline[]; defaultDisciplineId: string | null }) {
  const today = useToday();
  const toast = useToast();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [disciplineId, setDisciplineId] = useState(defaultDisciplineId ?? "");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Novo flashcard"
      submitLabel="Criar"
      canSubmit={!!front.trim() && !!back.trim()}
      onSubmit={async () => {
        await createCards([{ front, back }], { disciplineId: disciplineId || null, lessonId: null, source: "manual", today });
        setFront("");
        setBack("");
        toast("Flashcard criado");
        return false as const;
      }}
    >
      <div className="space-y-4">
        <Field label="Disciplina">
          <Select value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)}>
            <option value="">Geral</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Frente (pergunta)">
          <TextArea value={front} onChange={(e) => setFront(e.target.value)} minRows={2} autoFocus />
        </Field>
        <Field label="Verso (resposta)">
          <TextArea value={back} onChange={(e) => setBack(e.target.value)} minRows={3} />
        </Field>
        <p className="text-[13px] text-label-3">“Criar” guarda e deixa a folha aberta para o próximo.</p>
      </div>
    </Sheet>
  );
}

function AddQuestionSheet({ open, onClose, disciplines, defaultDisciplineId }: { open: boolean; onClose: () => void; disciplines: Discipline[]; defaultDisciplineId: string | null }) {
  const toast = useToast();
  const [stem, setStem] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [answer, setAnswer] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [disciplineId, setDisciplineId] = useState(defaultDisciplineId ?? "");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nova questão"
      submitLabel="Criar"
      canSubmit={!!stem.trim()}
      onSubmit={async () => {
        const filled = options.map((o) => o.trim());
        const valid = filled.filter(Boolean);
        await createQuestions(
          [{ stem, options: valid, answer: valid.length >= 2 ? Math.min(answer, valid.length - 1) : null, explanation }],
          { disciplineId: disciplineId || null, lessonId: null, source: "manual" },
        );
        toast("Questão criada");
      }}
    >
      <div className="space-y-4">
        <Field label="Disciplina">
          <Select value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)}>
            <option value="">Geral</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Enunciado">
          <TextArea value={stem} onChange={(e) => setStem(e.target.value)} minRows={2} />
        </Field>
        <div className="space-y-2">
          <p className="text-[14px] font-semibold text-label-2">Alternativas (toque na letra da correta)</p>
          {options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAnswer(i)}
                className={cx("pressable inline-flex size-10 flex-none items-center justify-center rounded-full font-bold", answer === i ? "bg-success text-white" : "bg-fill")}
              >
                {String.fromCharCode(65 + i)}
              </button>
              <input
                value={option}
                onChange={(e) => setOptions((list) => list.map((o, j) => (j === i ? e.target.value : o)))}
                className="h-11 min-w-0 flex-1 rounded-[14px] bg-fill px-3.5"
              />
            </div>
          ))}
        </div>
        <Field label="Explicação">
          <TextArea value={explanation} onChange={(e) => setExplanation(e.target.value)} minRows={2} />
        </Field>
      </div>
    </Sheet>
  );
}
