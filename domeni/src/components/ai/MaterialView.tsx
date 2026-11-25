"use client";

import { modelLabel } from "./actionIcons";

import { Printer, RotateCcw, Share2 } from "lucide-react";
import { useState } from "react";
import { Markdown } from "@/components/ui/Markdown";
import { Button, cx } from "@/components/ui/basics";
import { deliverFile } from "@/lib/backup";
import type { AiOutput } from "@/lib/types";
import { AestheticSheet, isAesthetic } from "./Aesthetic";

export interface GameRound {
  kind: "vf" | "quiz";
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface GameData {
  title: string;
  rounds: GameRound[];
}

function parse(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/** Mostra um material guardado no formato certo (texto, resumo aesthetic, jogo…). */
export function MaterialView({ output }: { output: AiOutput }) {
  const json = output.action === "resumo-aesthetic" || output.action === "jogo" || output.action === "flashcards" || output.action === "questoes" ? parse(output.content) : null;

  let body: React.ReactNode;
  if (output.action === "resumo-aesthetic" && isAesthetic(json)) body = <AestheticSheet data={json} />;
  else if (output.action === "jogo" && json && Array.isArray((json as GameData).rounds)) body = <Game data={json as GameData} />;
  else if (output.action === "flashcards" && json) {
    const cards = (json as { cards?: { front: string; back: string }[] }).cards ?? [];
    body = (
      <div className="grid gap-2.5 sm:grid-cols-2">
        {cards.map((c, i) => (
          <div key={i} className="card px-4 py-3">
            <p className="font-semibold">{c.front}</p>
            <p className="mt-1 text-[14.5px] text-label-2">{c.back}</p>
          </div>
        ))}
      </div>
    );
  } else if (output.action === "questoes" && json) {
    const questions = (json as { questions?: GameRound[] & { stem: string }[] }).questions ?? [];
    body = (
      <Game
        data={{
          title: output.title,
          rounds: questions.map((q) => {
            const raw = q as unknown as { stem: string; options: string[]; answer: number; explanation: string };
            return { kind: "quiz" as const, prompt: raw.stem, options: raw.options, answer: raw.answer, explanation: raw.explanation };
          }),
        }}
      />
    );
  } else body = <Markdown text={output.content} />;

  return (
    <div>
      <div className="no-print mb-3 flex flex-wrap gap-2">
        <Button size="sm" variant="gray" icon={Printer} onClick={() => window.print()}>
          Imprimir / PDF
        </Button>
        <Button
          size="sm"
          variant="gray"
          icon={Share2}
          onClick={() =>
            void deliverFile(
              new File([output.content], `${output.title.replace(/[^\p{L}\p{N} -]/gu, "").slice(0, 60) || "material"}.${json ? "json" : "md"}`, {
                type: json ? "application/json" : "text/markdown",
              }),
            )
          }
        >
          Baixar / compartilhar
        </Button>
      </div>
      <div className="print-area">{body}</div>
      <p className="no-print mt-4 text-[12.5px] text-label-3">
        Gerado por IA a seu pedido ({modelLabel(output.model)}). Confira com o material da aula.
      </p>
    </div>
  );
}

/** Jogo de perguntas (quiz e verdadeiro ou falso) com pontos. */
export function Game({ data }: { data: GameData }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const done = index >= data.rounds.length;
  const round = data.rounds[index];

  if (data.rounds.length === 0) return <p className="text-label-2">Este jogo não tem perguntas.</p>;
  if (done) {
    const ratio = score / data.rounds.length;
    return (
      <div className="card px-6 py-8 text-center">
        <p className="text-[48px]">{ratio >= 0.8 ? "🏆" : ratio >= 0.5 ? "🌟" : "💪"}</p>
        <p className="mt-2 font-display text-[30px] font-semibold">
          {score} de {data.rounds.length}
        </p>
        <p className="mt-1 text-label-2">{ratio >= 0.8 ? "Arrasou!" : ratio >= 0.5 ? "Muito bem, quase lá!" : "Bora revisar e jogar de novo!"}</p>
        <Button
          className="mt-5"
          icon={RotateCcw}
          onClick={() => {
            setIndex(0);
            setPicked(null);
            setScore(0);
            setStreak(0);
          }}
        >
          Jogar de novo
        </Button>
      </div>
    );
  }

  const options = round.kind === "vf" && round.options.length === 0 ? ["Verdadeiro", "Falso"] : round.options;
  return (
    <div className="card px-5 py-5">
      <div className="flex items-center justify-between text-[13px] font-medium text-label-2">
        <span>
          {round.kind === "vf" ? "Verdadeiro ou falso" : "Quiz"} · {index + 1}/{data.rounds.length}
        </span>
        <span>
          ⭐ {score} {streak >= 2 ? `· 🔥 ${streak}` : ""}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(index / data.rounds.length) * 100}%` }} />
      </div>
      <p className="mt-4 text-[18px] leading-[26px] font-semibold">{round.prompt}</p>
      <div className={cx("mt-4 grid gap-2", options.length > 2 && "sm:grid-cols-2")}>
        {options.map((option, o) => {
          const show = picked !== null;
          return (
            <button
              key={o}
              type="button"
              disabled={show}
              onClick={() => {
                setPicked(o);
                if (o === round.answer) {
                  setScore((s) => s + 1);
                  setStreak((s) => s + 1);
                } else setStreak(0);
              }}
              className={cx(
                "pressable rounded-2xl px-4 py-3 text-left text-[15.5px] font-semibold transition-colors",
                show && o === round.answer
                  ? "bg-success text-white"
                  : show && o === picked
                    ? "bg-danger text-white"
                    : "bg-fill",
              )}
            >
              {options.length > 2 ? `${String.fromCharCode(65 + o)}) ` : ""}
              {option}
            </button>
          );
        })}
      </div>
      {picked !== null ? (
        <div className="mt-4">
          <p className={cx("font-semibold", picked === round.answer ? "text-success" : "text-danger")}>
            {picked === round.answer ? "Acertou! 🎉" : "Quase! A certa está em verde."}
          </p>
          {round.explanation ? <p className="mt-1 text-[15px] leading-[22px] text-label-2">{round.explanation}</p> : null}
          <Button
            className="mt-4"
            onClick={() => {
              setIndex((i) => i + 1);
              setPicked(null);
            }}
          >
            {index + 1 < data.rounds.length ? "Próxima" : "Ver resultado"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
