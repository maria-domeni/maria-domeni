"use client";

import { ChevronLeft, PanelLeft } from "lucide-react";
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
          compact ? "material shadow-[0_1px_0_var(--edge)]" : "bg-bg",
        )}
      >
        <div className={cx("relative mx-auto flex h-(--nav-h) items-center gap-2 px-3 md:px-6", width)}>
          <button
            type="button"
            aria-label="Mostrar barra lateral"
            title="Mostrar barra lateral"
            onClick={() => setSidebarOpen(true)}
            className="sidebar-open-button row-pressable size-9 flex-none items-center justify-center rounded-[10px] text-label-2"
          >
            <PanelLeft size={19} strokeWidth={2} />
          </button>
          {back ? (
            <Link
              to={back.to}
              className="row-pressable flex h-9 min-w-0 items-center gap-0.5 rounded-[10px] pr-2.5 pl-1 text-[14.5px] font-medium text-label-2"
            >
              <ChevronLeft size={20} strokeWidth={2.2} className="flex-none" />
              <span className="max-w-[40vw] truncate">{back.label}</span>
            </Link>
          ) : null}
          <div
            aria-hidden={!compact}
            className={cx(
              "min-w-0 flex-1 truncate text-[15px] font-semibold transition-opacity duration-200",
              compact ? "opacity-100" : "opacity-0",
            )}
          >
            {title}
          </div>
          <div className="flex flex-none items-center justify-end gap-1">{actions}</div>
        </div>
      </header>

      <div className={cx("screen-enter mx-auto w-full px-4 md:px-8", width)}>
        <div ref={titleRef} className="pt-2 pb-2">
          {eyebrow ? <p className="mb-1 text-[13px] leading-[18px] font-medium text-label-2">{eyebrow}</p> : null}
          {titleSlot ?? <h1 className="font-display text-[32px] leading-[40px] font-semibold break-words">{title}</h1>}
          {subtitle ? <div className="mt-1 text-[15px] leading-[22px] text-label-2">{subtitle}</div> : null}
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
      <div className="h-10 w-52 rounded-[10px] bg-fill" />
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
    <div role="tablist" className={cx("no-scrollbar flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-[10px] bg-fill p-[3px]", className)}>
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
              "inline-flex h-8 flex-none items-center gap-1.5 rounded-[8px] px-3 text-[14px] whitespace-nowrap transition-colors",
              active
                ? "bg-(--thumb) font-semibold text-label shadow-[0_1px_3px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.04)]"
                : "font-medium text-label-2 hover:text-label",
            )}
          >
            {tab.label}
            {tab.badge ? <span className="text-[12.5px] text-label-3">{tab.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
