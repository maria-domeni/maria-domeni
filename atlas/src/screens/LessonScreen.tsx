"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Check, CircleDashed, SearchX, Trash2, Undo2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Page, ScreenSkeleton } from "@/components/shell/Page";
import {
  Card,
  Chip,
  DifficultyChip,
  EmptyState,
  IconButton,
  cx,
  tint,
} from "@/components/ui/basics";
import { Segmented, Select, Switch, TextArea, TextInput } from "@/components/ui/fields";
import { useConfirm, useToast } from "@/components/ui/overlays";
import { db } from "@/lib/db";
import { diffDays, formatRelative, formatShort, formatWeekday } from "@/lib/dates";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { reviewGuidance, reviewLabel } from "@/lib/reviews";
import { navigate, type LessonTab } from "@/lib/router";
import { deleteLesson, markReview, reopenReview, updateLesson, type LessonPatch } from "@/lib/store";
import {
  DIFFICULTY_LABEL,
  LESSON_TYPE_LABEL,
  type Difficulty,
  type Discipline,
  type Lesson,
  type LessonType,
  type Review,
} from "@/lib/types";

const RichEditor = dynamic(() => import("@/components/editor/RichEditor"), {
  ssr: false,
  loading: () => <div className="h-[46dvh] rounded-[20px] bg-surface shadow-card" aria-hidden />,
});

export default function LessonScreen({ id, tab }: { id: string; tab: LessonTab | null }) {
  const data = useLiveQuery(async () => {
    const lesson = (await db.lessons.get(id)) ?? null;
    const discipline = lesson ? ((await db.disciplines.get(lesson.disciplineId)) ?? null) : null;
    return { lesson, discipline };
  }, [id]);

  if (!data) return <ScreenSkeleton />;

  if (!data.lesson || !data.discipline) {
    return (
      <Page title="Aula" back={{ to: "#/cadernos", label: "Cadernos" }}>
        <div className="mt-6">
          <EmptyState icon={SearchX} title="Aula não encontrada">
            Ela pode ter sido apagada.
          </EmptyState>
        </div>
      </Page>
    );
  }

  return <LessonEditor key={id} initial={data.lesson} discipline={data.discipline} tab={tab} />;
}

type SaveState = "salvo" | "salvando";

/** Guarda as alterações da aula no banco, juntando as digitadas em sequência. */
function useLessonDraft(initial: Lesson) {
  const [draft, setDraft] = useState(initial);
  const [saveState, setSaveState] = useState<SaveState>("salvo");
  const pending = useRef<LessonPatch>({});
  const timer = useRef<number | undefined>(undefined);
  const id = initial.id;

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    const patch = pending.current;
    if (Object.keys(patch).length === 0) return;
    pending.current = {};
    try {
      await updateLesson(id, patch);
    } catch (error) {
      // devolve para a fila o que não foi gravado, sem sobrescrever o que veio depois
      pending.current = { ...patch, ...pending.current };
      throw error;
    } finally {
      if (Object.keys(pending.current).length === 0) setSaveState("salvo");
    }
  }, [id]);

  const change = useCallback(
    (patch: LessonPatch, options: { now?: boolean } = {}) => {
      setDraft((current) => ({ ...current, ...patch }));
      Object.assign(pending.current, patch);
      setSaveState("salvando");
      window.clearTimeout(timer.current);
      if (options.now) void flush();
      else timer.current = window.setTimeout(() => void flush(), 600);
    },
    [flush],
  );

  useEffect(() => {
    const save = () => void flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onVisibility);
      save();
    };
  }, [flush]);

  return { draft, change, saveState, flush };
}

function defaultTab(lesson: Lesson, today: string): LessonTab {
  if (!lesson.date) return "durante";
  if (lesson.date > today) return "antes";
  if (lesson.date === today) return "durante";
  return lesson.feynman.trim() === "" ? "depois" : "revisao";
}

function LessonEditor({
  initial,
  discipline,
  tab,
}: {
  initial: Lesson;
  discipline: Discipline;
  tab: LessonTab | null;
}) {
  const today = useToday();
  const confirm = useConfirm();
  const toast = useToast();
  const { draft, change, saveState, flush } = useLessonDraft(initial);
  const [initialTab] = useState(() => defaultTab(initial, today));
  const activeTab = tab ?? initialTab;

  const reviews = useLiveQuery(
    () => db.reviews.where("lessonId").equals(initial.id).toArray(),
    [initial.id],
    [] as Review[],
  );
  const hasDueReview = reviews.some((r) => !r.doneAt && diffDays(r.dueDate, today) >= 0);

  async function remove() {
    const ok = await confirm({
      title: "Apagar esta aula?",
      message: "As anotações e as revisões desta aula serão apagadas.",
      confirmLabel: "Apagar aula",
      destructive: true,
    });
    if (!ok) return;
    await flush();
    await deleteLesson(initial.id);
    toast("Aula apagada");
    navigate(`#/disciplina/${discipline.id}`, { replace: true });
  }

  return (
    <Page
      title={draft.title || "Aula sem tema"}
      back={{ to: `#/disciplina/${discipline.id}`, label: discipline.name }}
      eyebrow={
        <span {...tint(discipline.color, "text-dc")}>
          {discipline.emoji ? `${discipline.emoji} ` : ""}
          {discipline.name}
          {draft.number ? ` · Aula ${draft.number}` : ""}
        </span>
      }
      actions={
        <>
          <span
            role="status"
            className="mr-1 flex items-center gap-1 text-[13px] font-medium whitespace-nowrap text-label-3"
          >
            {saveState === "salvo" ? (
              <>
                <Check size={14} strokeWidth={2.6} /> Salvo
              </>
            ) : (
              "Salvando…"
            )}
          </span>
          <IconButton icon={Trash2} label="Apagar aula" tone="neutral" onClick={() => void remove()} />
        </>
      }
      titleSlot={
        <TextArea
          bare
          minRows={1}
          value={draft.title}
          onChange={(e) => change({ title: e.target.value.replace(/\n/g, " ") })}
          placeholder="Tema da aula"
          aria-label="Tema da aula"
          autoFocus={initial.title === ""}
          className="font-display !text-[34px] !leading-[41px] font-bold tracking-[-0.028em]"
        />
      }
    >
      <Card className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 px-4 py-3.5 lg:grid-cols-4">
        <Property label="Data">
          <TextInput
            type="date"
            value={draft.date ?? ""}
            onChange={(e) => change({ date: e.target.value || null }, { now: true })}
            className="!text-[16px]"
          />
        </Property>
        <Property label="Aula nº">
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            value={draft.number ?? ""}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value));
              change({ number: e.target.value === "" || !Number.isFinite(n) || n < 1 ? null : n });
            }}
            className="!text-[16px]"
          />
        </Property>
        <Property label="Tipo">
          <Select
            value={draft.type}
            onChange={(e) => {
              const type = e.target.value as LessonType;
              change({ type, reviewsOn: type !== "prova" }, { now: true });
            }}
            className="!text-[16px]"
          >
            {(Object.keys(LESSON_TYPE_LABEL) as LessonType[]).map((key) => (
              <option key={key} value={key}>
                {LESSON_TYPE_LABEL[key]}
              </option>
            ))}
          </Select>
        </Property>
        <Property label="Presença">
          <Select
            value={draft.attended === null ? "" : draft.attended ? "sim" : "nao"}
            onChange={(e) =>
              change(
                { attended: e.target.value === "" ? null : e.target.value === "sim" },
                { now: true },
              )
            }
            className="!text-[16px]"
          >
            <option value="">Não marcada</option>
            <option value="sim">Presente</option>
            <option value="nao">Falta</option>
          </Select>
        </Property>
      </Card>

      <Segmented
        label="Etapa do estudo"
        className="mt-4"
        value={activeTab}
        onChange={(value) => navigate(`#/aula/${initial.id}/${value}`, { replace: true })}
        options={[
          { value: "antes", label: "Antes" },
          { value: "durante", label: "Durante" },
          { value: "depois", label: "Depois" },
          { value: "revisao", label: "Revisão", badge: hasDueReview },
        ]}
      />

      <div key={activeTab} className="fade-in mt-4 flex flex-col gap-4">
        {activeTab === "antes" ? (
          <>
            <Block title="Leitura prévia" hint="Capítulo, páginas ou artigo para ler antes desta aula.">
              <TextArea
                bare
                minRows={2}
                value={draft.reading}
                onChange={(e) => change({ reading: e.target.value })}
                placeholder="Ex.: Cunha, Psicodiagnóstico-V, cap. 3 (p. 45–60)"
                aria-label="Leitura prévia"
              />
              <div className="-mx-4 mt-3 flex items-center justify-between gap-4 border-t border-sep px-4 pt-3">
                <span className="text-[16px]">Leitura feita</span>
                <Switch
                  label="Leitura feita"
                  checked={draft.readingDone}
                  onChange={(value) => change({ readingDone: value }, { now: true })}
                />
              </div>
            </Block>
            <Block title="Perguntas para levar" hint="Duas perguntas que você quer responder nesta aula.">
              <TextArea
                bare
                minRows={3}
                value={draft.questions}
                onChange={(e) => change({ questions: e.target.value })}
                placeholder={"1. \n2. "}
                aria-label="Perguntas para levar"
              />
            </Block>
          </>
        ) : null}

        {activeTab === "durante" ? (
          <>
            <RichEditor
              initialHtml={draft.notes}
              onChange={(html) => change({ notes: html })}
              placeholder="Anote a aula aqui…"
              label="Anotações da aula"
            />
            <Block title="Dúvidas" hint="O que perguntar ao professor ou pesquisar depois.">
              <TextArea
                bare
                minRows={2}
                value={draft.doubts}
                onChange={(e) => change({ doubts: e.target.value })}
                placeholder="Escreva as dúvidas que surgirem."
                aria-label="Dúvidas"
              />
            </Block>
          </>
        ) : null}

        {activeTab === "depois" ? (
          <>
            <Block
              title="Explique com as suas palavras"
              hint="Técnica Feynman: explique como se estivesse dando a aula, sem olhar o material."
            >
              <TextArea
                bare
                minRows={6}
                value={draft.feynman}
                onChange={(e) => change({ feynman: e.target.value })}
                placeholder="Comece pelo que você lembra…"
                aria-label="Explicação com as suas palavras"
              />
            </Block>
            <Block title="Lacunas" hint="O que você não conseguiu explicar. Volte ao material só para isso.">
              <TextArea
                bare
                minRows={2}
                value={draft.gaps}
                onChange={(e) => change({ gaps: e.target.value })}
                placeholder="Liste as lacunas."
                aria-label="Lacunas"
              />
            </Block>
            <Block title="Resumo em uma frase">
              <TextArea
                bare
                minRows={1}
                value={draft.summary}
                onChange={(e) => change({ summary: e.target.value })}
                placeholder="A ideia central desta aula é…"
                aria-label="Resumo em uma frase"
              />
            </Block>
            <Block
              title="Mapa mental"
              hint="Palavras-chave do mapa. Na revisão de 7 dias, refaça de memória e compare."
            >
              <TextArea
                bare
                minRows={2}
                value={draft.mindmap}
                onChange={(e) => change({ mindmap: e.target.value })}
                placeholder="Conceito central → ramos → exemplos"
                aria-label="Mapa mental"
              />
            </Block>
            <Block title="Perguntas de prova" hint="Perguntas que podem cair, para responder nas revisões.">
              <TextArea
                bare
                minRows={3}
                value={draft.examQuestions}
                onChange={(e) => change({ examQuestions: e.target.value })}
                placeholder={"1. \n2. "}
                aria-label="Perguntas de prova"
              />
            </Block>
          </>
        ) : null}

        {activeTab === "revisao" ? (
          <ReviewTab
            lesson={draft}
            reviews={reviews}
            today={today}
            onToggle={(value) => change({ reviewsOn: value }, { now: true })}
          />
        ) : null}
      </div>
    </Page>
  );
}

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[12.5px] font-semibold tracking-[0.02em] text-label-3 uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card as="section" className="px-4 pt-3.5 pb-4">
      <h3 className="text-[17px] leading-[22px] font-semibold tracking-[-0.01em]">{title}</h3>
      {hint ? <p className="mt-0.5 text-[14px] leading-[19px] text-label-2">{hint}</p> : null}
      <div className="mt-2.5">{children}</div>
    </Card>
  );
}

const DIFFICULTIES: Difficulty[] = ["facil", "medio", "dificil"];

const DIFFICULTY_BUTTON: Record<Difficulty, string> = {
  facil: "bg-success-soft text-success",
  medio: "bg-yellow-soft text-yellow",
  dificil: "bg-danger-soft text-danger",
};

function ReviewTab({
  lesson,
  reviews,
  today,
  onToggle,
}: {
  lesson: Lesson;
  reviews: Review[];
  today: string;
  onToggle: (value: boolean) => void;
}) {
  const toast = useToast();
  const settings = useSettingsOrDefault();
  const sorted = [...reviews].sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || a.step - b.step,
  );
  const current = sorted.find((r) => !r.doneAt);

  async function mark(review: Review, difficulty: Difficulty) {
    const { reinforcedOn } = await markReview(review.id, difficulty, today);
    toast(
      reinforcedOn
        ? `${reviewLabel(review)} feita · reforço ${formatRelative(reinforcedOn, today)}`
        : `${reviewLabel(review)} feita · ${DIFFICULTY_LABEL[difficulty]}`,
      { actionLabel: "Desfazer", onAction: () => void reopenReview(review.id) },
    );
  }

  return (
    <>
      <Card className="flex items-center justify-between gap-4 px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-[17px] leading-[22px] font-semibold">Revisão espaçada</p>
          <p className="mt-0.5 text-[14px] leading-[19px] text-label-2">
            {settings.reviewIntervals.map((days, i) => `R${i + 1} em ${days} ${days === 1 ? "dia" : "dias"}`).join(" · ")}
          </p>
        </div>
        <Switch label="Revisão espaçada" checked={lesson.reviewsOn} onChange={onToggle} />
      </Card>

      {!lesson.reviewsOn ? (
        <Card className="px-4 py-4 text-[15px] leading-[21px] text-label-2">
          {lesson.type === "prova"
            ? "Aulas do tipo Prova não entram na revisão espaçada. Ligue a chave acima se quiser revisar mesmo assim."
            : "A revisão espaçada está desligada para esta aula."}
        </Card>
      ) : !lesson.date ? (
        <Card className="px-4 py-4 text-[15px] leading-[21px] text-label-2">
          Defina a data da aula para o Atlas agendar as revisões.
        </Card>
      ) : (
        <Card className="divide-y divide-sep">
          {sorted.map((review) => {
            const delta = diffDays(today, review.dueDate);
            const isCurrent = review.id === current?.id;
            const overdue = !review.doneAt && delta < 0;
            const dueToday = !review.doneAt && delta === 0;
            return (
              <div key={review.id} className="px-4 py-3.5">
                <div className="flex items-start gap-3.5">
                  <span
                    className={cx(
                      "mt-0.5 inline-flex size-10 flex-none items-center justify-center rounded-full text-[14px] font-bold",
                      review.doneAt
                        ? "bg-success-soft text-success"
                        : overdue || dueToday
                          ? "bg-danger-soft text-danger"
                          : "bg-fill text-label-2",
                    )}
                  >
                    {review.doneAt ? (
                      <Check size={19} strokeWidth={3} />
                    ) : review.kind === "reforco" ? (
                      <CircleDashed size={18} strokeWidth={2.4} />
                    ) : (
                      `R${review.step + 1}`
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[17px] leading-[22px] font-semibold">{reviewLabel(review)}</span>
                      {review.doneAt && review.difficulty ? (
                        <DifficultyChip value={review.difficulty} />
                      ) : overdue ? (
                        <Chip tone="red">venceu {formatRelative(review.dueDate, today)}</Chip>
                      ) : dueToday ? (
                        <Chip tone="red">vence hoje</Chip>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[14.5px] leading-[20px] text-label-2">
                      {review.doneAt
                        ? `Feita em ${formatShort(review.doneAt, today)}`
                        : `${formatWeekday(review.dueDate)}, ${formatShort(review.dueDate, today)} · ${formatRelative(review.dueDate, today)}`}
                    </p>
                    {isCurrent ? (
                      <p className="mt-1.5 text-[15px] leading-[21px]">{reviewGuidance(review)}</p>
                    ) : null}
                  </div>
                  {review.doneAt ? (
                    <IconButton
                      icon={Undo2}
                      label={`Desfazer ${reviewLabel(review)}`}
                      tone="neutral"
                      onClick={() => void reopenReview(review.id)}
                    />
                  ) : null}
                </div>

                {isCurrent ? (
                  <div className="mt-3 sm:pl-[54px]">
                    <p className="mb-2 text-[13.5px] leading-[18px] text-label-2">
                      {delta > 0
                        ? "Ainda não venceu. Marque só se já revisou — como foi?"
                        : "Revisou? Como foi?"}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {DIFFICULTIES.map((difficulty) => (
                        <button
                          key={difficulty}
                          type="button"
                          onClick={() => void mark(review, difficulty)}
                          className={cx(
                            "pressable h-11 rounded-[13px] text-[16px] font-semibold",
                            DIFFICULTY_BUTTON[difficulty],
                          )}
                        >
                          {DIFFICULTY_LABEL[difficulty]}
                        </button>
                      ))}
                    </div>
                    {settings.hardReinforceDays > 0 ? (
                      <p className="mt-2 text-[13px] leading-[17px] text-label-3">
                        Difícil agenda um reforço em {settings.hardReinforceDays}{" "}
                        {settings.hardReinforceDays === 1 ? "dia" : "dias"}.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </Card>
      )}

      {lesson.reviewsOn && lesson.date && sorted.length > 0 && !current ? (
        <p className="px-1 text-[15px] text-label-2">Todas as revisões desta aula estão feitas.</p>
      ) : null}

      {lesson.examQuestions.trim() || lesson.mindmap.trim() || lesson.gaps.trim() ? (
        <Card as="section" className="px-4 pt-3.5 pb-4">
          <h3 className="text-[17px] font-semibold">Material para revisar</h3>
          {lesson.gaps.trim() ? <ReviewMaterial title="Lacunas" text={lesson.gaps} /> : null}
          {lesson.examQuestions.trim() ? (
            <ReviewMaterial title="Perguntas de prova" text={lesson.examQuestions} />
          ) : null}
          {lesson.mindmap.trim() ? (
            <details className="mt-3">
              <summary className="pressable inline-flex h-9 cursor-pointer list-none items-center rounded-full bg-fill px-3.5 text-[15px] font-semibold text-label [&::-webkit-details-marker]:hidden">
                Mostrar o mapa mental original
              </summary>
              <p className="mt-1.5 text-[13.5px] leading-[18px] text-label-3">
                Refaça de memória antes de abrir, depois compare.
              </p>
              <p className="mt-1 text-[16px] leading-[1.5] whitespace-pre-wrap">{lesson.mindmap}</p>
            </details>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}

function ReviewMaterial({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-3">
      <p className="text-[12.5px] font-semibold tracking-[0.02em] text-label-3 uppercase">{title}</p>
      <p className="mt-0.5 text-[16px] leading-[1.5] whitespace-pre-wrap">{text}</p>
    </div>
  );
}
