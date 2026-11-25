"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  Award,
  CalendarDays,
  ChartColumnBig,
  Ellipsis,
  Headphones,
  HeartHandshake,
  Layers,
  Library,
  NotebookPen,
  PanelLeft,
  Repeat2,
  Search,
  Settings2,
  Smile,
  Sun,
  UserRound,
} from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";
import { Character } from "@/components/avatar/Character";
import { Link, cx, tint } from "@/components/ui/basics";
import { useAccount } from "@/lib/cloud/account";
import { Avatar } from "@/components/ui/media";
import { Sheet } from "@/components/ui/overlays";
import { db } from "@/lib/db";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { navigate, type Route } from "@/lib/router";
import { setSidebarOpen } from "@/lib/sidebar";
import { resolveCurrentSemester } from "@/lib/today";
import { setMusicOpen } from "./music";
import { Logo } from "./Logo";
import { SpotifyDock } from "./SpotifyDock";

type IconType = ComponentType<{ size?: number | string; strokeWidth?: number; className?: string }>;

interface NavItem {
  to: string;
  label: string;
  icon: IconType;
  match: Route["name"][];
}

const MAIN_NAV: NavItem[] = [
  { to: "#/", label: "Hoje", icon: Sun, match: ["hoje"] },
  { to: "#/agenda", label: "Agenda", icon: CalendarDays, match: ["agenda"] },
  { to: "#/cadernos", label: "Cadernos", icon: NotebookPen, match: ["cadernos", "semestre", "disciplina", "aula"] },
  { to: "#/estudar", label: "Estudar", icon: Layers, match: ["estudar", "revisoes"] },
  { to: "#/biblioteca", label: "Biblioteca", icon: Library, match: ["biblioteca"] },
];

const COLLEGE_NAV: NavItem[] = [
  { to: "#/desempenho", label: "Notas e faltas", icon: ChartColumnBig, match: ["desempenho"] },
  { to: "#/estagio", label: "Estágio", icon: HeartHandshake, match: ["estagio"] },
  { to: "#/horas", label: "Horas", icon: Award, match: ["horas"] },
  { to: "#/revisoes", label: "Revisões", icon: Repeat2, match: [] },
];

const MORE_NAV: NavItem[] = [
  { to: "#/biblioteca", label: "Biblioteca", icon: Library, match: ["biblioteca"] },
  ...COLLEGE_NAV,
  { to: "#/personagem", label: "Bichinho", icon: Smile, match: ["personagem"] },
  { to: "#/conta", label: "Conta e assinatura", icon: UserRound, match: ["conta"] },
  { to: "#/busca/", label: "Buscar", icon: Search, match: ["busca"] },
  { to: "#/ajustes", label: "Ajustes", icon: Settings2, match: ["ajustes"] },
];

const TAB_NAV: NavItem[] = MAIN_NAV.filter((i) => i.to !== "#/biblioteca");

function useShellData() {
  const today = useToday();
  const settings = useSettingsOrDefault();
  const dueCount = useLiveQuery(
    async () => {
      const pending = await db.reviews.where("dueDate").belowOrEqual(today).toArray();
      const cards = await db.cards.where("due").belowOrEqual(today).count();
      return pending.filter((r) => !r.doneAt).length + cards;
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
  return { dueCount, sidebar, settings };
}

export { Logo };

function SidebarLink({ item, active, badge }: { item: NavItem; active: boolean; badge?: number }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex h-8 items-center gap-2.5 rounded-[8px] px-2 text-[14.5px] transition-colors",
        active ? "bg-fill-2 font-semibold text-label" : "row-pressable font-medium text-label-2",
      )}
    >
      <Icon size={17} strokeWidth={active ? 2.2 : 1.9} className={active ? "text-label" : "text-label-2"} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge ? <span className="text-[12.5px] font-semibold text-accent">{badge}</span> : null}
    </Link>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <p className="mt-5 mb-1 px-2 text-[12px] font-semibold text-label-3">{children}</p>;
}

export function Shell({ route, children }: { route: Route | null; children: ReactNode }) {
  const { dueCount, sidebar, settings } = useShellData();
  const account = useAccount();
  const planLabel = account.status === "signed-in" ? (account.info?.plan === "plus" ? "Plus" : "Grátis") : null;
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = (item: NavItem) => !!route && item.match.includes(route.name);
  const activeDisciplineId = route?.name === "disciplina" ? route.id : null;
  const name = settings.profileName.trim();

  return (
    <>
      <aside className="app-sidebar flex-col" aria-label="Navegação">
        <div className="flex h-[52px] flex-none items-center gap-2 pr-2 pl-4 pt-[env(safe-area-inset-top)]">
          <Logo />
          <span className="flex-1 text-[16px] font-semibold tracking-[-0.01em]">Domeni</span>
          <button
            type="button"
            aria-label="Ocultar barra lateral"
            title="Ocultar barra lateral"
            onClick={() => setSidebarOpen(false)}
            className="row-pressable inline-flex size-8 items-center justify-center rounded-[8px] text-label-2"
          >
            <PanelLeft size={17} strokeWidth={1.9} />
          </button>
        </div>

        <div className="px-2.5 pb-1">
          <Link
            to="#/busca/"
            className="row-pressable flex h-8 items-center gap-2.5 rounded-[8px] px-2 text-[14.5px] font-medium text-label-2"
          >
            <Search size={17} strokeWidth={1.9} />
            Buscar
          </Link>
        </div>

        <nav className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
          <div className="flex flex-col gap-px">
            {MAIN_NAV.map((item) => (
              <SidebarLink
                key={item.to}
                item={item}
                active={isActive(item) && !activeDisciplineId}
                badge={item.to === "#/estudar" ? dueCount : undefined}
              />
            ))}
          </div>

          <GroupLabel>Faculdade</GroupLabel>
          <div className="flex flex-col gap-px">
            {COLLEGE_NAV.map((item) => (
              <SidebarLink key={item.to} item={item} active={isActive(item)} />
            ))}
          </div>

          {sidebar && sidebar.disciplines.length > 0 ? (
            <>
              <GroupLabel>{sidebar.semester.number}º semestre</GroupLabel>
              <div className="flex flex-col gap-px">
                {sidebar.disciplines.map((d) => {
                  const active = activeDisciplineId === d.id;
                  return (
                    <Link
                      key={d.id}
                      to={`#/disciplina/${d.id}`}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "flex h-8 items-center gap-2.5 rounded-[8px] px-2 text-[14.5px]",
                        active ? "bg-fill-2 font-semibold text-label" : "row-pressable font-medium text-label-2",
                      )}
                    >
                      {d.emoji ? (
                        <span className="w-[17px] text-center text-[14px]">{d.emoji}</span>
                      ) : (
                        <span className="flex w-[17px] justify-center">
                          <span {...tint(d.color, "size-2 rounded-full bg-dc")} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate">{d.name}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : null}
        </nav>

        <div className="flex flex-none items-center gap-1 border-t border-sep px-2.5 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))]">
          <Link
            to="#/ajustes"
            aria-current={route?.name === "ajustes" ? "page" : undefined}
            className={cx(
              "row-pressable flex min-h-[44px] min-w-0 flex-1 items-center gap-2.5 rounded-[10px] px-2 py-1",
              route?.name === "ajustes" && "bg-fill-2",
            )}
          >
            {settings.avatarImageId ? (
              <Avatar imageId={settings.avatarImageId} name={name} size={30} />
            ) : (
              <Character config={settings.avatar} size={30} background="var(--fill-2)" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] leading-5 font-semibold">{name || "Seu perfil"}</span>
              <span className="block truncate text-[12px] leading-4 text-label-2">
                {[planLabel, settings.course.trim()].filter(Boolean).join(" · ") || "Ajustes"}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMusicOpen(true)}
            aria-label="Abrir música"
            title="Música (Spotify)"
            className="row-pressable inline-flex size-9 flex-none items-center justify-center rounded-[10px] text-label-2"
          >
            <Headphones size={18} strokeWidth={1.9} />
          </button>
        </div>
      </aside>

      <main className="app-main">{children}</main>

      <nav className="app-tabbar material" aria-label="Navegação">
        <div className="mx-auto grid h-(--tab-h) max-w-[560px] grid-cols-5">
          {TAB_NAV.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium",
                  active ? "text-accent" : "text-label-3",
                )}
              >
                <span className="relative">
                  <Icon size={23} strokeWidth={active ? 2.2 : 1.8} />
                  {item.to === "#/estudar" && dueCount ? (
                    <span className="absolute -top-1 -right-2.5 inline-flex h-4 min-w-4 items-center justify-center rounded-[8px] bg-danger px-1 text-[10px] leading-none font-semibold text-white">
                      {dueCount}
                    </span>
                  ) : null}
                </span>
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium text-label-3"
          >
            <Ellipsis size={23} strokeWidth={1.8} />
            Mais
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais">
        <div className="card divide-y divide-sep overflow-hidden">
          {[...MORE_NAV, { to: "musica", label: "Música", icon: Headphones, match: [] as Route["name"][] }].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  if (item.to === "musica") setMusicOpen(true);
                  else navigate(item.to);
                }}
                className="row-pressable flex h-12 w-full items-center gap-3 px-4 text-left text-[15.5px]"
              >
                <Icon size={19} strokeWidth={1.9} className="text-label-2" />
                {item.label}
              </button>
            );
          })}
        </div>
      </Sheet>

      <SpotifyDock />
    </>
  );
}
