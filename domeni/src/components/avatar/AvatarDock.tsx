"use client";

import { ArrowUpRight, Bell, BookOpen, MessageCircle, Search, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Markdown } from "@/components/ui/Markdown";
import { Link, cx } from "@/components/ui/basics";
import { askAi, AiError } from "@/lib/ai";
import { greeting, speak, type Alert } from "@/lib/alerts";
import { useNowTime, useSettingsOrDefault } from "@/lib/hooks";
import { navigate } from "@/lib/router";
import type { SearchHit } from "@/lib/search";
import { searchEverything } from "@/lib/searchDb";
import { useBrain } from "@/lib/useBrain";
import { Character } from "./Character";

const SEEN_KEY = "domeni-avisos-vistos";

function seenToday(): Set<string> {
  try {
    const raw = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[];
    return new Set(raw);
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  try {
    const seen = seenToday();
    seen.add(id);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // sem armazenamento: o aviso pode aparecer de novo
  }
}

interface ChatTurn {
  role: "voce" | "personagem";
  text: string;
  hits?: SearchHit[];
  ai?: boolean;
}

const HIT_EMOJI: Record<SearchHit["kind"], string> = {
  aula: "📓",
  livro: "📚",
  material: "✨",
  cartao: "🃏",
  questao: "❓",
  relatorio: "🩺",
};

/**
 * O personagem que fica no canto da tela: mostra avisos, responde buscas
 * nas suas coisas e, só se você pedir, pergunta à IA.
 */
export function AvatarDock() {
  const settings = useSettingsOrDefault();
  const nowTime = useNowTime();
  const { alerts, mood, ready } = useBrain();
  const avatar = settings.avatar;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"avisos" | "perguntar">("avisos");
  const [bubble, setBubble] = useState<Alert | null>(null);
  const important = alerts.filter((a) => a.level === "urgente" || a.level === "importante");

  // Mostra o aviso mais importante uma vez por sessão
  useEffect(() => {
    if (!ready || open) return;
    const seen = seenToday();
    const next = alerts.find((a) => a.level !== "lembrete" && !seen.has(a.id));
    if (!next) return;
    const show = window.setTimeout(() => {
      setBubble(next);
      markSeen(next.id);
    }, 1400);
    return () => window.clearTimeout(show);
  }, [alerts, ready, open]);

  // fecha o painel ao trocar de tela
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);

  useEffect(() => {
    if (!bubble) return;
    const hide = window.setTimeout(() => setBubble(null), 9000);
    return () => window.clearTimeout(hide);
  }, [bubble]);

  if (!avatar.visible || !settings.onboarded) return null;
  const left = avatar.side === "esquerda";

  return (
    <div
      className={cx(
        "avatar-dock no-print fixed z-50 flex flex-col gap-2",
        "bottom-[calc(var(--tab-h)+env(safe-area-inset-bottom)+20px)] md:bottom-5",
        left ? "left-3 items-start md:left-[calc(var(--sidebar-w)+20px)]" : "right-3 items-end md:right-5",
      )}
    >
      {open ? (
        <Panel
          tab={tab}
          setTab={setTab}
          alerts={alerts}
          onClose={() => setOpen(false)}
          left={left}
          intro={greeting(avatar.tone, settings.profileName, nowTime)}
        />
      ) : bubble ? (
        <button
          type="button"
          onClick={() => {
            setBubble(null);
            if (bubble.href) navigate(bubble.href);
          }}
          className={cx(
            "bubble-in relative max-w-[min(300px,calc(100vw-110px))] rounded-[14px] bg-surface px-3.5 py-2.5 text-left text-[14px] leading-[20px] shadow-float",
          )}
        >
          <span className="mr-1">{bubble.emoji}</span>
          {speak(avatar.tone, bubble, settings.profileName)}
          {bubble.action ? (
            <span className="mt-1 flex items-center gap-1 text-[13px] font-semibold text-accent">
              {bubble.action} <ArrowUpRight size={14} strokeWidth={2.6} />
            </span>
          ) : null}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setBubble(null);
          setOpen((v) => !v);
        }}
        aria-label={open ? `Fechar ${avatar.name}` : `Abrir ${avatar.name}: avisos e perguntas`}
        className="pressable relative rounded-full"
      >
        <span className={cx("block", !open && "bob")}>
          <Character config={avatar} mood={mood} size={56} background="var(--surface)" className="rounded-full shadow-float" />
        </span>
        {!open && important.length > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-5 items-center justify-center rounded-[8px] bg-danger px-1 text-[11px] leading-5 font-semibold text-white ring-2 ring-bg">
            {important.length}
          </span>
        ) : null}
      </button>
    </div>
  );
}

function Panel({
  tab,
  setTab,
  alerts,
  onClose,
  left,
  intro,
}: {
  tab: "avisos" | "perguntar";
  setTab: (tab: "avisos" | "perguntar") => void;
  alerts: Alert[];
  onClose: () => void;
  left: boolean;
  intro: string;
}) {
  const settings = useSettingsOrDefault();
  const avatar = settings.avatar;
  return (
    <section
      role="dialog"
      aria-label={avatar.name}
      className={cx(
        "bubble-in flex max-h-[min(640px,calc(100dvh-180px))] w-[min(400px,calc(100vw-24px))] flex-col rounded-[16px] bg-surface shadow-float",
        left ? "origin-bottom-left" : "origin-bottom-right",
      )}
    >
      <header className="flex items-center gap-3 border-b border-sep px-4 pt-3 pb-2.5">
        <Character config={avatar} size={36} background="var(--fill)" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15.5px] leading-5 font-semibold">{avatar.name}</h2>
          <p className="truncate text-[13.5px] text-label-2">{intro}</p>
        </div>
        <Link to="#/personagem" onClick={onClose} className="row-pressable rounded-[8px] px-2.5 py-1.5 text-[13px] font-medium text-label-2">
          Editar
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="pressable inline-flex size-8 items-center justify-center rounded-full bg-fill text-label-2"
        >
          <X size={16} strokeWidth={2.4} />
        </button>
      </header>
      <div className="mx-4 mt-3 flex w-fit gap-0.5 rounded-[10px] bg-fill p-[3px]">
        {(
          [
            ["avisos", "Avisos", Bell],
            ["perguntar", "Perguntar", MessageCircle],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cx(
              "inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-[13.5px]",
              tab === key ? "bg-(--thumb) font-semibold text-label shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "font-medium text-label-2",
            )}
          >
            <Icon size={16} strokeWidth={2.4} />
            {label}
            {key === "avisos" && alerts.length > 0 ? <span className="opacity-70">{alerts.length}</span> : null}
          </button>
        ))}
      </div>
      {tab === "avisos" ? <AlertList alerts={alerts} onNavigate={onClose} /> : <Ask onNavigate={onClose} />}
    </section>
  );
}

function AlertList({ alerts, onNavigate }: { alerts: Alert[]; onNavigate: () => void }) {
  const settings = useSettingsOrDefault();
  if (alerts.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-[15px] text-label-2">
        Nada para avisar agora. Cadastre suas disciplinas, horários e provas e eu cuido dos lembretes. 🌷
      </p>
    );
  }
  return (
    <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pt-3 pb-4">
      {alerts.map((alert) => (
        <li key={alert.id}>
          <button
            type="button"
            disabled={!alert.href}
            onClick={() => {
              if (!alert.href) return;
              onNavigate();
              navigate(alert.href);
            }}
            className={cx(
              "row-pressable flex w-full items-start gap-3 rounded-[10px] px-3 py-2.5 text-left",
              alert.level === "urgente" ? "bg-danger-soft" : "bg-fill",
            )}
          >
            <span className="text-[20px] leading-6">{alert.emoji}</span>
            <span className="min-w-0 flex-1 text-[14.5px] leading-[20px]">
              {speak(settings.avatar.tone, alert, settings.profileName)}
              {alert.action ? (
                <span className="mt-1 block text-[13px] font-semibold text-accent">{alert.action} →</span>
              ) : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Ask({ onNavigate }: { onNavigate: () => void }) {
  const settings = useSettingsOrDefault();
  const avatar = settings.avatar;
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function search(event: FormEvent) {
    event.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setQuestion("");
    const { hits } = await searchEverything(q, 8);
    const text =
      hits.length > 0
        ? `Encontrei ${hits.length === 1 ? "isto" : "estas coisas"} nas suas anotações e na sua biblioteca:`
        : "Não achei nada sobre isso nas suas anotações nem na biblioteca.";
    setTurns((t) => [...t, { role: "voce", text: q }, { role: "personagem", text, hits }]);
  }

  async function askWithAi(q: string, hits: SearchHit[]) {
    setBusy(true);
    const index = turns.length;
    setTurns((t) => [...t, { role: "personagem", text: "", ai: true }]);
    try {
      await askAi(
        "conversa",
        {
          question: q,
          avatarName: avatar.name,
          tone: avatar.tone,
          userName: settings.profileName,
          course: settings.course,
          context: hits.map((h) => ({ kind: h.kind, title: h.title, where: h.subtitle, excerpt: h.snippet })),
        },
        {
          onText: (full) =>
            setTurns((t) => t.map((turn, i) => (i === index ? { ...turn, text: full } : turn))),
        },
      );
    } catch (error) {
      const message = error instanceof AiError ? error.message : "Não consegui falar com a IA agora.";
      setTurns((t) => t.map((turn, i) => (i === index ? { ...turn, text: message } : turn)));
    } finally {
      setBusy(false);
    }
  }

  const lastQuestion = [...turns].reverse().find((t) => t.role === "voce")?.text ?? "";
  const lastHits = [...turns].reverse().find((t) => t.hits)?.hits ?? [];

  return (
    <>
      <ul ref={listRef} className="min-h-[160px] flex-1 space-y-2.5 overflow-y-auto px-4 pt-3 pb-2">
        {turns.length === 0 ? (
          <li className="rounded-[10px] bg-fill px-3.5 py-3 text-[14px] leading-[20px] text-label-2">
            Pergunte qualquer coisa, sem sair desta tela. Ex.: <em>“tenho algum livro que fala de posição esquizoparanoide?”</em>{" "}
            Eu procuro nas suas anotações de todos os semestres e na biblioteca — de graça e sem internet.
          </li>
        ) : null}
        {turns.map((turn, i) => (
          <li key={i} className={cx("flex", turn.role === "voce" ? "justify-end" : "justify-start")}>
            <div
              className={cx(
                "max-w-[88%] rounded-[14px] px-3.5 py-2.5 text-[14px] leading-[20px]",
                turn.role === "voce" ? "bg-accent-solid text-on-accent" : "bg-fill",
              )}
            >
              {turn.ai ? (
                turn.text ? (
                  <Markdown text={turn.text} compact />
                ) : (
                  <span className="text-label-2">Pensando…</span>
                )
              ) : (
                turn.text
              )}
              {turn.hits && turn.hits.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {turn.hits.map((hit) => (
                    <li key={`${hit.kind}-${hit.id}`}>
                      <Link
                        to={hit.href}
                        onClick={onNavigate}
                        className="row-pressable block rounded-[10px] bg-surface px-2.5 py-2 shadow-card"
                      >
                        <span className="block truncate text-[13.5px] font-semibold">
                          {HIT_EMOJI[hit.kind]} {hit.title}
                        </span>
                        <span className="block truncate text-[12.5px] text-label-2">{hit.subtitle}</span>
                        {hit.snippet ? (
                          <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-label-2">{hit.snippet}</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {lastQuestion && !busy && settings.aiEnabled ? (
        <div className="px-4 pb-1">
          <button
            type="button"
            onClick={() => void askWithAi(lastQuestion, lastHits)}
            className="pressable inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-accent-soft px-3 text-[13px] font-semibold text-accent"
          >
            <Sparkles size={15} strokeWidth={2.4} />
            Perguntar com IA (usa créditos)
          </button>
        </div>
      ) : null}
      <form onSubmit={search} className="flex items-center gap-2 border-t border-sep px-3 py-3">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-fill px-3">
          <Search size={17} strokeWidth={2.4} className="flex-none text-label-3" />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Pergunte para ${avatar.name}…`}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            enterKeyHint="search"
          />
        </label>
        <button
          type="submit"
          aria-label="Procurar"
          className="pressable inline-flex size-10 flex-none items-center justify-center rounded-[10px] bg-accent-solid text-on-accent"
        >
          <BookOpen size={19} strokeWidth={2.4} />
        </button>
      </form>
    </>
  );
}
