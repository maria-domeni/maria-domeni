"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, PanelLeft, Repeat2, Settings2, Sun } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { ColorDot, Link, cx } from "@/components/ui/basics";
import { db } from "@/lib/db";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import type { Route } from "@/lib/router";
import { setSidebarOpen } from "@/lib/sidebar";
import { resolveCurrentSemester } from "@/lib/today";

type IconType = ComponentType<{ size?: number | string; strokeWidth?: number; className?: string }>;

interface NavItem {
  to: string;
  label: string;
  icon: IconType;
  match: Route["name"][];
}

const MAIN_NAV: NavItem[] = [
  { to: "#/", label: "Hoje", icon: Sun, match: ["hoje"] },
  { to: "#/cadernos", label: "Cadernos", icon: BookOpen, match: ["cadernos", "disciplina", "aula"] },
  { to: "#/revisoes", label: "Revisões", icon: Repeat2, match: ["revisoes"] },
];

const SETTINGS_NAV: NavItem = {
  to: "#/ajustes",
  label: "Ajustes",
  icon: Settings2,
  match: ["ajustes"],
};

function useShellData() {
  const today = useToday();
  const settings = useSettingsOrDefault();
  const dueCount = useLiveQuery(
    async () => {
      const pending = await db.reviews.where("dueDate").belowOrEqual(today).toArray();
      return pending.filter((r) => !r.doneAt).length;
    },
    [today],
    0,
  );
  const sidebar = useLiveQuery(
    async () => {
      const semesters = await db.semesters.toArray();
      const current = resolveCurrentSemester(semesters, settings, today);
      if (!current) return null;
      const disciplines = await db.disciplines.where("semesterId").equals(current.id).toArray();
      disciplines.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      return { semester: current, disciplines };
    },
    [today, settings.currentSemesterId],
    null,
  );
  return { dueCount, sidebar };
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="flex-none">
      <defs>
        <linearGradient id="atlas-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d5cf6" />
          <stop offset="0.55" stopColor="#a855f7" />
          <stop offset="1" stopColor="#f0619a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#atlas-logo)" />
      <g fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round">
        <circle cx="32" cy="32" r="18" />
        <path d="M32 14c-7 6-11 12-11 18s4 12 11 18" />
        <path d="M32 14c7 6 11 12 11 18s-4 12-11 18" />
        <path d="M15.5 36h33" />
      </g>
    </svg>
  );
}

function SidebarLink({
  item,
  active,
  badge,
  leading,
}: {
  item: { to: string; label: string; icon?: IconType };
  active: boolean;
  badge?: number;
  leading?: ReactNode;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cx(
        "row-pressable flex h-11 items-center gap-3 rounded-[12px] px-3 text-[16px]",
        active ? "bg-accent-soft font-semibold text-accent" : "font-medium text-label",
      )}
    >
      {Icon ? (
        <Icon size={20} strokeWidth={2.1} className={active ? "text-accent" : "text-accent"} />
      ) : (
        leading
      )}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge ? (
        <span
          className={cx(
            "inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[13px] font-bold",
            active ? "bg-accent-solid text-white" : "bg-fill text-label-2",
          )}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function Shell({ route, children }: { route: Route | null; children: ReactNode }) {
  const { dueCount, sidebar } = useShellData();
  const isActive = (item: NavItem) => !!route && item.match.includes(route.name);
  const activeDisciplineId = route?.name === "disciplina" ? route.id : null;

  return (
    <>
      <aside className="app-sidebar material-surface flex-col border-r border-sep" aria-label="Navegação">
        <div className="flex h-[60px] flex-none items-center gap-2.5 pr-2 pl-4 pt-[env(safe-area-inset-top)]">
          <Logo />
          <span className="flex-1 text-[20px] font-bold tracking-[-0.03em]">Atlas</span>
          <button
            type="button"
            aria-label="Ocultar barra lateral"
            title="Ocultar barra lateral"
            onClick={() => setSidebarOpen(false)}
            className="pressable inline-flex size-10 items-center justify-center rounded-full text-label-2"
          >
            <PanelLeft size={20} strokeWidth={2.1} />
          </button>
        </div>

        <nav className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 pt-2 pb-3">
          <div className="flex flex-col gap-0.5">
            {MAIN_NAV.map((item) => (
              <SidebarLink
                key={item.to}
                item={item}
                active={isActive(item) && !activeDisciplineId}
                badge={item.to === "#/revisoes" ? dueCount : undefined}
              />
            ))}
          </div>

          {sidebar && sidebar.disciplines.length > 0 ? (
            <div className="mt-6">
              <p className="mb-1 px-3 text-[13px] font-semibold tracking-[0.02em] text-label-3 uppercase">
                {sidebar.semester.number}º semestre
              </p>
              <div className="flex flex-col gap-0.5">
                {sidebar.disciplines.map((d) => (
                  <SidebarLink
                    key={d.id}
                    item={{ to: `#/disciplina/${d.id}`, label: d.name }}
                    active={activeDisciplineId === d.id}
                    leading={
                      <span className="flex w-5 justify-center">
                        <ColorDot color={d.color} />
                      </span>
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
        </nav>

        <div className="flex-none border-t border-sep px-2.5 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))]">
          <SidebarLink item={SETTINGS_NAV} active={isActive(SETTINGS_NAV)} />
        </div>
      </aside>

      <main className="app-main">{children}</main>

      <nav className="app-tabbar material border-t border-sep" aria-label="Navegação">
        <div className="mx-auto grid h-(--tab-h) max-w-[520px] grid-cols-4">
          {[...MAIN_NAV, SETTINGS_NAV].map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            const badge = item.to === "#/revisoes" ? dueCount : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "pressable relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
                  active ? "text-accent" : "text-label-3",
                )}
              >
                <span className="relative">
                  <Icon size={24} strokeWidth={active ? 2.3 : 2} />
                  {badge ? (
                    <span className="absolute -top-1 -right-2.5 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-danger px-1 text-[11px] leading-none font-bold text-white">
                      {badge}
                    </span>
                  ) : null}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
