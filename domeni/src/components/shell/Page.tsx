"use client";

import { ArrowLeft, PanelLeft } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, cx } from "@/components/ui/basics";
import { setSidebarOpen } from "@/lib/sidebar";

interface PageProps {
  title: string;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  back?: { to: string; label: string };
  actions?: ReactNode;
  /** Substitui o título grande (ex.: campo editável). */
  titleSlot?: ReactNode;
  /** Largura máxima do conteúdo */
  wide?: boolean;
  children: ReactNode;
}

/**
 * Estrutura de uma tela: barra superior com voltar e ações, e o título
 * grande com marca-texto. A barra ganha fundo quando a página rola.
 */
export function Page({ title, eyebrow, subtitle, back, actions, titleSlot, wide, children }: PageProps) {
  const titleRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = titleRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), {
      rootMargin: "-60px 0px 0px 0px",
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const width = wide ? "max-w-[1180px]" : "max-w-[940px]";

  return (
    <>
      <header
        className={cx(
          "no-print sticky top-0 z-30 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow] duration-200",
          compact ? "material shadow-[0_1px_0_var(--edge)]" : "",
        )}
      >
        <div className={cx("relative mx-auto flex h-(--nav-h) items-center gap-2 px-3 md:px-6", width)}>
          <button
            type="button"
            aria-label="Mostrar barra lateral"
            title="Mostrar barra lateral"
            onClick={() => setSidebarOpen(true)}
            className="sidebar-open-button pressable size-10 flex-none items-center justify-center rounded-full bg-surface text-label-2 shadow-card"
          >
            <PanelLeft size={19} strokeWidth={2.2} />
          </button>
          {back ? (
            <Link
              to={back.to}
              className="pressable flex h-10 min-w-0 items-center gap-1.5 rounded-full bg-surface pr-3.5 pl-2.5 text-[14.5px] font-bold text-label-2 shadow-card"
            >
              <ArrowLeft size={18} strokeWidth={2.5} className="flex-none" />
              <span className="max-w-[40vw] truncate">{back.label}</span>
            </Link>
          ) : null}
          <div
            aria-hidden={!compact}
            className={cx(
              "min-w-0 flex-1 truncate font-display text-[18px] font-bold transition-opacity duration-200",
              compact ? "opacity-100" : "opacity-0",
            )}
          >
            {title}
          </div>
          <div className="flex flex-none items-center justify-end gap-1.5">{actions}</div>
        </div>
      </header>

      <div className={cx("screen-enter mx-auto w-full px-4 md:px-8", width)}>
        <div ref={titleRef} className="pt-1 pb-2">
          {eyebrow ? (
            <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-[12.5px] leading-[18px] font-extrabold tracking-[0.04em] text-accent uppercase">
              {eyebrow}
            </p>
          ) : null}
          {titleSlot ?? (
            <h1 className="font-display text-[36px] leading-[46px] font-bold break-words">
              <span className="marker">{title}</span>
            </h1>
          )}
          {subtitle ? <div className="mt-1 text-[15.5px] leading-[22px] text-label-2">{subtitle}</div> : null}
        </div>
        {children}
      </div>
    </>
  );
}

/** Marcador de carregamento com o mesmo esqueleto de uma tela. */
export function ScreenSkeleton() {
  return (
    <div className="fade-in mx-auto w-full max-w-[940px] px-4 pt-[calc(var(--nav-h)+8px)] md:px-8" aria-hidden>
      <div className="h-11 w-52 rounded-xl bg-fill" />
      <div className="card mt-8 h-32" />
      <div className="card mt-4 h-52" />
    </div>
  );
}

/** Abas em formato de pílula (usadas dentro das telas). */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string; badge?: number | string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cx("no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1", className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cx(
              "pressable inline-flex h-10 flex-none items-center gap-1.5 rounded-full px-4 text-[15px] font-bold whitespace-nowrap",
              active ? "bg-accent-solid text-on-accent shadow-sticker" : "bg-surface text-label-2 shadow-card",
            )}
          >
            {tab.label}
            {tab.badge ? <span className={cx("text-[13px]", active ? "opacity-80" : "text-accent")}>{tab.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
