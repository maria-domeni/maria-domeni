"use client";

import { ChevronLeft, PanelLeft } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, cx } from "@/components/ui/basics";
import { setSidebarOpen } from "@/lib/sidebar";

interface PageProps {
  /** Título usado na barra superior (e no título grande, se não houver `titleSlot`). */
  title: string;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  back?: { to: string; label: string };
  actions?: ReactNode;
  /** Substitui o título grande (ex.: campo editável). */
  titleSlot?: ReactNode;
  children: ReactNode;
}

/**
 * Estrutura de uma tela: barra superior translúcida que mostra o título
 * compacto quando o título grande rola para fora da vista.
 */
export function Page({ title, eyebrow, subtitle, back, actions, titleSlot, children }: PageProps) {
  const titleRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = titleRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setCompact(!entry.isIntersecting),
      { rootMargin: "-56px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header
        className={cx(
          "sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)] transition-[border-color,background-color] duration-200",
          compact ? "material border-sep" : "border-transparent",
        )}
      >
        <div className="relative mx-auto flex h-(--nav-h) max-w-[900px] items-center justify-between gap-2 px-2 md:px-5">
          <div
            className={cx(
              "flex min-w-0 items-center transition-[max-width] duration-300",
              compact ? "max-w-[30%]" : "max-w-[62%]",
            )}
          >
            <button
              type="button"
              aria-label="Mostrar barra lateral"
              title="Mostrar barra lateral"
              onClick={() => setSidebarOpen(true)}
              className="sidebar-open-button pressable size-11 flex-none items-center justify-center rounded-full text-accent"
            >
              <PanelLeft size={21} strokeWidth={2.1} />
            </button>
            {back ? (
              <Link
                to={back.to}
                className="pressable flex h-11 min-w-0 items-center gap-0.5 rounded-full pr-3 pl-1 text-[17px] text-accent"
              >
                <ChevronLeft size={26} strokeWidth={2.2} className="flex-none" />
                <span className="truncate">{back.label}</span>
              </Link>
            ) : null}
          </div>
          <div
            aria-hidden={!compact}
            className={cx(
              "pointer-events-none absolute left-1/2 max-w-[36%] -translate-x-1/2 truncate text-center text-[17px] font-semibold transition-opacity duration-200",
              compact ? "opacity-100" : "opacity-0",
            )}
          >
            {title}
          </div>
          <div className="flex flex-none items-center justify-end gap-1">{actions}</div>
        </div>
      </header>

      <div className="screen-enter mx-auto w-full max-w-[900px] px-4 md:px-8">
        <div ref={titleRef} className="pt-1 pb-1">
          {eyebrow ? (
            <p className="mb-0.5 text-[13px] leading-[18px] font-semibold tracking-[0.03em] text-label-2 uppercase">
              {eyebrow}
            </p>
          ) : null}
          {titleSlot ?? (
            <h1 className="text-[34px] leading-[41px] font-bold tracking-[-0.028em] break-words">
              {title}
            </h1>
          )}
          {subtitle ? (
            <div className="mt-1 text-[16px] leading-[22px] text-label-2">{subtitle}</div>
          ) : null}
        </div>
        {children}
      </div>
    </>
  );
}

/** Marcador de carregamento com o mesmo esqueleto de uma tela. */
export function ScreenSkeleton() {
  return (
    <div className="fade-in mx-auto w-full max-w-[900px] px-4 pt-[calc(var(--nav-h)+4px)] md:px-8" aria-hidden>
      <div className="h-10 w-44 rounded-xl bg-fill" />
      <div className="mt-8 h-32 rounded-[20px] bg-surface shadow-card" />
      <div className="mt-4 h-52 rounded-[20px] bg-surface shadow-card" />
    </div>
  );
}
