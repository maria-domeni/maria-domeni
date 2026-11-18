"use client";

import { useState } from "react";
import { inline } from "@/components/ui/Markdown";
import { cx } from "@/components/ui/basics";

/** Formato do resumo aesthetic (a IA devolve este JSON). */
export interface AestheticData {
  title: string;
  subtitle: string;
  definition: string;
  keyPoints: string[];
  sections: { heading: string; emoji: string; items: string[] }[];
  flow: { title: string; steps: string[] };
  mnemonic: { trick: string; explanation: string };
  whyImportant: string;
  keywords: string[];
  practice: { question: string; options: string[]; answer: number }[];
  complement: string[];
}

export function isAesthetic(value: unknown): value is AestheticData {
  const v = value as AestheticData | null;
  return !!v && typeof v.title === "string" && Array.isArray(v.keyPoints) && Array.isArray(v.sections);
}

const PASTELS = ["#ffd1e1", "#fff0a0", "#d4f5d0", "#d6e7ff", "#eadcff", "#ffe0c7"];
const INKS = ["#c2457a", "#a07800", "#2e8b57", "#2a78c2", "#8a5cd1", "#c25a16"];

function Label({ children, color }: { children: React.ReactNode; color: number }) {
  return (
    <span
      className="inline-block -rotate-1 rounded-[4px] px-2.5 py-0.5 text-[12px] font-extrabold tracking-[0.08em] uppercase"
      style={{ background: PASTELS[color % PASTELS.length], color: "#3a2530" }}
    >
      {children}
    </span>
  );
}

function Doodle({ kind, className }: { kind: "heart" | "star" | "sparkle"; className?: string }) {
  if (kind === "heart") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path d="M12 21s-7-4.5-9.5-9C.7 8.6 2.6 4.5 6.4 4.5c2.2 0 3.8 1.3 4.6 2.7.8-1.4 2.4-2.7 4.6-2.7 3.8 0 5.7 4.1 3.9 7.5C19 16.5 12 21 12 21z" fill="none" stroke="#e86a98" strokeWidth={1.8} />
      </svg>
    );
  }
  if (kind === "star") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" fill="none" stroke="#d9a400" strokeWidth={1.8} strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="#8a5cd1" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

/**
 * Resumo aesthetic: folha decorada (papel quadriculado, títulos em letreiro,
 * marca-texto em tons pastel, fitas e rabiscos) pronta para estudar e imprimir.
 */
export function AestheticSheet({ data }: { data: AestheticData }) {
  const [revealed, setRevealed] = useState<Record<number, number | null>>({});
  return (
    <article
      className="print-page relative overflow-hidden rounded-[22px] px-5 pt-8 pb-8 text-[#2f2630] sm:px-9"
      style={{
        background: "#fffafc",
        backgroundImage:
          "linear-gradient(rgba(230,140,175,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(230,140,175,0.16) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        boxShadow: "0 1px 0 rgba(0,0,0,.05), 0 18px 40px -26px rgba(80,20,50,.5)",
      }}
    >
      <Doodle kind="heart" className="absolute top-5 right-6 size-7 rotate-12" />
      <Doodle kind="star" className="absolute top-16 left-5 size-6 -rotate-12" />
      <header className="text-center">
        <h2 className="inline font-[family-name:var(--font-pacifico)] text-[34px] leading-[1.35] sm:text-[44px]">
          <span
            style={{
              backgroundImage: "linear-gradient(transparent 62%, #ffc8dc 62%, #ffc8dc 92%, transparent 92%)",
              padding: "0 .2em",
            }}
          >
            {data.title}
          </span>
        </h2>
        {data.subtitle ? (
          <p className="mt-1 text-[13px] font-extrabold tracking-[0.12em] text-[#b0587f] uppercase">{data.subtitle}</p>
        ) : null}
      </header>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {data.definition ? (
          <section className="rounded-2xl border-2 border-dashed border-[#f3b6cc] bg-white/80 p-4 md:col-span-2">
            <Label color={0}>📖 Definição</Label>
            <p className="mt-2 text-[15.5px] leading-[1.6]">{inline(data.definition, "def")}</p>
          </section>
        ) : null}

        {data.keyPoints.length > 0 ? (
          <section className="rounded-2xl bg-white/85 p-4 shadow-[0_1px_0_rgba(0,0,0,.05)]">
            <Label color={4}>⭐ Pontos-chave</Label>
            <ol className="mt-3 space-y-2.5">
              {data.keyPoints.map((point, i) => (
                <li key={i} className="flex gap-2.5 text-[15px] leading-[1.5]">
                  <span
                    className="inline-flex size-7 flex-none items-center justify-center rounded-full text-[12px] font-extrabold"
                    style={{ background: PASTELS[i % PASTELS.length], color: INKS[i % INKS.length] }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{inline(point, `kp${i}`)}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {data.sections.map((section, s) => (
          <section key={s} className="rounded-2xl bg-white/85 p-4 shadow-[0_1px_0_rgba(0,0,0,.05)]">
            <Label color={s + 1}>
              {section.emoji} {section.heading}
            </Label>
            <ul className="mt-3 space-y-1.5">
              {section.items.map((item, i) => (
                <li key={i} className="flex gap-2 text-[15px] leading-[1.5]">
                  <span style={{ color: INKS[(s + 1) % INKS.length] }}>•</span>
                  <span>{inline(item, `s${s}-${i}`)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {data.flow.steps.length > 0 ? (
          <section className="rounded-2xl p-4 md:col-span-2" style={{ background: "#fff7d6" }}>
            <Label color={1}>🔁 {data.flow.title || "Caminho"}</Label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {data.flow.steps.map((step, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="rounded-full px-3 py-1.5 text-[14px] font-bold" style={{ background: PASTELS[(i + 2) % PASTELS.length] }}>
                    {step}
                  </span>
                  {i < data.flow.steps.length - 1 ? <span className="text-[18px] text-[#b0587f]">→</span> : null}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {data.mnemonic.trick ? (
          <section className="rounded-2xl p-4" style={{ background: "#eadcff55", border: "2px solid #d9c6ff" }}>
            <Label color={4}>🧠 Truque para lembrar</Label>
            <p className="mt-2 font-[family-name:var(--font-caveat)] text-[26px] leading-tight font-bold text-[#6b46c1]">
              “{data.mnemonic.trick}”
            </p>
            <p className="mt-1 text-[14.5px] leading-[1.5]">{inline(data.mnemonic.explanation, "mn")}</p>
          </section>
        ) : null}

        {data.whyImportant ? (
          <section className="rounded-2xl bg-white/85 p-4">
            <Label color={2}>💡 Por que importa?</Label>
            <p className="mt-2 text-[15px] leading-[1.55]">{inline(data.whyImportant, "why")}</p>
          </section>
        ) : null}

        {data.keywords.length > 0 ? (
          <section className="rounded-2xl bg-white/85 p-4 md:col-span-2">
            <Label color={3}>🏷️ Palavras-chave</Label>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.keywords.map((keyword, i) => (
                <span key={i} className="rounded-full px-3 py-1 text-[14px] font-bold" style={{ background: PASTELS[i % PASTELS.length] }}>
                  {keyword}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {data.practice.length > 0 ? (
          <section className="rounded-2xl bg-white/85 p-4 md:col-span-2">
            <Label color={5}>✍️ Pratique</Label>
            <div className="mt-3 space-y-4">
              {data.practice.map((q, i) => (
                <div key={i}>
                  <p className="text-[15px] font-bold">
                    {i + 1}. {q.question}
                  </p>
                  <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                    {q.options.map((option, o) => {
                      const chosen = revealed[i];
                      const show = chosen !== undefined && chosen !== null;
                      return (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setRevealed((r) => ({ ...r, [i]: o }))}
                          className={cx(
                            "rounded-xl px-3 py-2 text-left text-[14px]",
                            show && o === q.answer ? "bg-[#c8f0c8] font-bold" : show && o === chosen ? "bg-[#ffd0d0]" : "bg-[#f7f1f4]",
                          )}
                        >
                          {String.fromCharCode(65 + o)}) {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {data.complement.length > 0 ? (
          <section className="rounded-2xl border-2 border-[#f2c94c] bg-[#fffbea] p-4 md:col-span-2">
            <Label color={1}>⚠️ Complemento — confirmar com o professor</Label>
            <ul className="mt-2 space-y-1 text-[14.5px] leading-[1.5]">
              {data.complement.map((item, i) => (
                <li key={i}>• {inline(item, `c${i}`)}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <Doodle kind="sparkle" className="absolute right-6 bottom-5 size-6" />
      <p className="mt-6 text-center font-[family-name:var(--font-caveat)] text-[20px] text-[#b0587f]">feito no Domeni ♡</p>
    </article>
  );
}
