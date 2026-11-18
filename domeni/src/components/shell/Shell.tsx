"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  Award,
  CalendarDays,
  ChartColumnBig,
  Ellipsis,
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
  Headphones,
} from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";
import { Character } from "@/components/avatar/Character";
import { Link, cx, tint } from "@/components/ui/basics";
import { Avatar } from "@/components/ui/media";
import { Sheet } from "@/components/ui/overlays";
import { db } from "@/lib/db";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { navigate, type Route } from "@/lib/router";
import { setSidebarOpen } from "@/lib/sidebar";
import { resolveCurrentSemester } from "@/lib/today";
import { setMusicOpen } from "./music";
import { SpotifyDock } from "./SpotifyDock";

type IconType = ComponentType<{ size?: number | string; strokeWidth?: number; className?: string }>;

interface NavItem {
  to: string;
  label: string;
  icon: IconType;
  tile: string;
  match: Route["name"][];
}

const PLANNER_NAV: NavItem[] = [
  { to: "#/", label: "Hoje", icon: Sun, tile: "#f7b6cb", match: ["hoje"] },
  { to: "#/agenda", label: "Agenda", icon: CalendarDays, tile: "#b4d3f7", match: ["agenda"] },
  { to: "#/cadernos", label: "Cadernos", icon: NotebookPen, tile: "#cfbdf3", match: ["cadernos", "semestre", "disciplina", "aula"] },
  { to: "#/estudar", label: "Estudar", icon: Layers, tile: "#f8d29e", match: ["estudar", "revisoes"] },
  { to: "#/biblioteca", label: "Biblioteca", icon: Library, tile: "#a9dcc0", match: ["biblioteca"] },
];

const COLLEGE_NAV: NavItem[] = [
  { to: "#/desempenho", label: "Notas e faltas", icon: ChartColumnBig, tile: "#f6bfae", match: ["desempenho"] },
  { to: "#/estagio", label: "Estágio", icon: HeartHandshake, tile: "#bcdcf2", match: ["estagio"] },
  { to: "#/horas", label: "Horas", icon: Award, tile: "#f3dc8e", match: ["horas"] },
  { to: "#/revisoes", label: "Revisões", icon: Repeat2, tile: "#ecbfe9", match: [] },
];

const MORE_NAV: NavItem[] = [
  { to: "#/biblioteca", label: "Biblioteca", icon: Library, tile: "#a9dcc0", match: ["biblioteca"] },
  ...COLLEGE_NAV,
  { to: "#/personagem", label: "Personagem", icon: Smile, tile: "#f7b6cb", match: ["personagem"] },
  { to: "#/busca/", label: "Buscar", icon: Search, tile: "#cfbdf3", match: ["busca"] },
  { to: "#/ajustes", label: "Ajustes", icon: Settings2, tile: "#d9d4cf", match: ["ajustes"] },
];

const TAB_NAV: NavItem[] = PLANNER_NAV.filter((i) => i.to !== "#/biblioteca");

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

/** Marca do Domeni: um caderno com a letra D e uma fita de marcar página. */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="flex-none">
      <defs>
        <linearGradient id="dn-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6a3c2" />
          <stop offset="1" stopColor="#b43c6e" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="15" fill="url(#dn-logo)" />
      <rect x="4" y="4" width="13" height="56" rx="6" fill="#000" opacity="0.1" />
      {[16, 26, 36, 46].map((y) => (
        <circle key={y} cx="10.5" cy={y} r="2.2" fill="#fff" opacity="0.85" />
      ))}
      <path
        fillRule="evenodd"
        fill="#fff"
        d="M23 17h11.5c9.4 0 15.5 6.1 15.5 15s-6.1 15-15.5 15H23V17zm7 6.4v17.2h4.1c5.3 0 8.6-3.3 8.6-8.6s-3.3-8.6-8.6-8.6H30z"
      />
      <path d="M44 4h8v14l-4-3.2L44 18z" fill="#ffd166" />
    </svg>
  );
}

function NavTile({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <span
      aria-hidden
      className={cx(
        "inline-flex size-[30px] flex-none items-center justify-center rounded-[10px] text-[#3a2530] transition-transform",
        active && "rotate-[-6deg] shadow-sticker",
      )}
      style={{ background: item.tile }}
    >
      <Icon size={17} strokeWidth={2.3} />
    </span>
  );
}

function SidebarLink({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex h-11 items-center gap-3 rounded-[14px] px-2 text-[15.5px] transition-colors",
        active ? "bg-surface font-bold shadow-card" : "row-pressable font-semibold text-label-2",
      )}
    >
      <NavTile item={item} active={active} />
      <span className={cx("min-w-0 flex-1 truncate", active && "text-label")}>
        {active ? <span className="marker">{item.label}</span> : item.label}
      </span>
      {badge ? (
        <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-accent-solid px-1.5 text-[12.5px] font-bold text-on-accent">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function Shell({ route, children }: { route: Route | null; children: ReactNode }) {
  const { dueCount, sidebar, settings } = useShellData();
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = (item: NavItem) => !!route && item.match.includes(route.name);
  const activeDisciplineId = route?.name === "disciplina" ? route.id : null;
  const name = settings.profileName.trim();

  return (
    <>
      <aside className="app-sidebar flex-col" aria-label="Navegação">
        <div className="flex h-[66px] flex-none items-center gap-2.5 pr-2 pl-4 pt-[env(safe-area-inset-top)]">
          <Logo />
          <span className="flex-1 font-display text-[25px] leading-none font-bold">Domeni</span>
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

        <div className="px-3 pb-1">
          <Link
            to="#/busca/"
            className="pressable flex h-10 items-center gap-2 rounded-full bg-surface px-3.5 text-[14.5px] font-semibold text-label-3 shadow-card"
          >
            <Search size={16} strokeWidth={2.5} />
            Buscar em tudo…
          </Link>
        </div>

        <nav className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-3">
          <p className="hand mb-0.5 px-2 text-[19px] text-label-2">planner</p>
          <div className="flex flex-col gap-0.5">
            {PLANNER_NAV.map((item) => (
              <SidebarLink
                key={item.to}
                item={item}
                active={isActive(item) && !activeDisciplineId}
                badge={item.to === "#/estudar" ? dueCount : undefined}
              />
            ))}
          </div>

          <p className="hand mt-4 mb-0.5 px-2 text-[19px] text-label-2">faculdade</p>
          <div className="flex flex-col gap-0.5">
            {COLLEGE_NAV.map((item) => (
              <SidebarLink key={item.to} item={item} active={isActive(item)} />
            ))}
          </div>

          {sidebar && sidebar.disciplines.length > 0 ? (
            <div className="mt-4">
              <p className="hand mb-1 px-2 text-[19px] text-label-2">{sidebar.semester.number}º semestre</p>
              <div className="flex flex-col gap-1">
                {sidebar.disciplines.map((d) => {
                  const active = activeDisciplineId === d.id;
                  return (
                    <Link
                      key={d.id}
                      to={`#/disciplina/${d.id}`}
                      aria-current={active ? "page" : undefined}
                      {...tint(
                        d.color,
                        cx(
                          "flex h-10 items-center gap-2.5 rounded-r-[14px] rounded-l-[6px] border-l-[5px] border-dc pr-2 pl-2.5 text-[15px] font-semibold transition-colors",
                          active ? "bg-dc-soft text-label" : "row-pressable text-label-2",
                        ),
                      )}
                    >
                      <span className="w-5 text-center text-[16px]">{d.emoji || "📒"}</span>
                      <span className="min-w-0 flex-1 truncate">{d.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </nav>

        <div className="flex flex-none items-center gap-1 px-3 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <Link
            to="#/ajustes"
            aria-current={route?.name === "ajustes" ? "page" : undefined}
            className={cx(
              "row-pressable flex min-h-[52px] min-w-0 flex-1 items-center gap-2.5 rounded-[14px] px-2 py-1.5",
              route?.name === "ajustes" && "bg-surface shadow-card",
            )}
          >
            {settings.avatarImageId ? (
              <Avatar imageId={settings.avatarImageId} name={name} size={38} />
            ) : (
              <Character config={settings.avatar} size={38} background="color-mix(in srgb, var(--accent) 22%, var(--surface))" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] leading-5 font-bold">{name || "Seu perfil"}</span>
              <span className="block truncate text-[12.5px] leading-[17px] text-label-2">
                {settings.course.trim() || "Ajustes"}
              </span>
            </span>
            <Settings2 size={18} strokeWidth={2.2} className="flex-none text-label-3" />
          </Link>
          <button
            type="button"
            onClick={() => setMusicOpen(true)}
            aria-label="Abrir música"
            title="Música (Spotify)"
            className="pressable inline-flex size-11 flex-none items-center justify-center rounded-full bg-surface text-[#1db954] shadow-card"
          >
            <Headphones size={20} strokeWidth={2.3} />
          </button>
        </div>
      </aside>

      <main className="app-main">{children}</main>

      <nav className="app-tabbar" aria-label="Navegação">
        <div className="material-surface mx-auto grid h-(--tab-h) max-w-[520px] grid-cols-5 rounded-[24px] px-1 shadow-float">
          {TAB_NAV.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "pressable relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold",
                  active ? "text-label" : "text-label-3",
                )}
              >
                <span className="relative">
                  {active ? <NavTile item={item} active /> : <item.icon size={23} strokeWidth={2.1} />}
                  {item.to === "#/estudar" && dueCount ? (
                    <span className="absolute -top-1 -right-2.5 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-danger px-1 text-[11px] leading-none font-bold text-white">
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
            className="pressable flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-label-3"
          >
            <Ellipsis size={23} strokeWidth={2.4} />
            Mais
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais">
        <div className="grid grid-cols-3 gap-3">
          {MORE_NAV.map((item) => (
            <button
              key={item.to}
              type="button"
              onClick={() => {
                setMoreOpen(false);
                navigate(item.to);
              }}
              className="pressable card flex flex-col items-center gap-2 px-2 py-4 text-[13.5px] font-bold"
            >
              <NavTile item={item} active={false} />
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setMusicOpen(true);
            }}
            className="pressable card flex flex-col items-center gap-2 px-2 py-4 text-[13.5px] font-bold"
          >
            <span className="inline-flex size-[30px] items-center justify-center rounded-[10px] bg-[#bfe8cd] text-[#14532d]">
              <Headphones size={17} strokeWidth={2.3} />
            </span>
            Música
          </button>
        </div>
      </Sheet>

      <SpotifyDock />
    </>
  );
}
