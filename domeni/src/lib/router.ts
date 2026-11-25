"use client";

import { useSyncExternalStore } from "react";

/**
 * Roteador por hash (#/aula/123). A navegação nunca passa pela rede: o app
 * inteiro é uma página só, guardada em cache, e funciona igual sem internet.
 */

export const LESSON_TABS = ["folha", "antes", "depois", "revisao"] as const;
export type LessonTab = (typeof LESSON_TABS)[number];

export const DISCIPLINE_TABS = ["aulas", "faltas", "notas", "materiais"] as const;
export type DisciplineTab = (typeof DISCIPLINE_TABS)[number];

export type Route =
  | { name: "hoje" }
  | { name: "cadernos" }
  | { name: "semestre"; id: string }
  | { name: "disciplina"; id: string; tab: DisciplineTab | null }
  | { name: "aula"; id: string; tab: LessonTab | null }
  | { name: "agenda" }
  | { name: "desempenho" }
  | { name: "biblioteca"; id: string | null; page: number | null }
  | { name: "estudar"; id: string | null }
  | { name: "estagio"; id: string | null }
  | { name: "horas" }
  | { name: "revisoes" }
  | { name: "personagem" }
  | { name: "busca"; q: string }
  | { name: "ajustes"; section: string | null }
  | { name: "conta"; section: string | null }
  | { name: "desconhecida" };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, "").replace(/^\/+|\/+$/g, "");
  if (path === "") return { name: "hoje" };
  const [head, id, extra] = path.split("/").map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  switch (head) {
    case "cadernos":
      return { name: "cadernos" };
    case "semestre":
      return id ? { name: "semestre", id } : { name: "cadernos" };
    case "agenda":
      return { name: "agenda" };
    case "desempenho":
      return { name: "desempenho" };
    case "biblioteca":
      return { name: "biblioteca", id: id || null, page: Number(extra) > 0 ? Math.floor(Number(extra)) : null };
    case "estudar":
      return { name: "estudar", id: id || null };
    case "estagio":
      return { name: "estagio", id: id || null };
    case "horas":
      return { name: "horas" };
    case "revisoes":
      return { name: "revisoes" };
    case "personagem":
      return { name: "personagem" };
    case "busca":
      return { name: "busca", q: id ?? "" };
    case "ajustes":
      return { name: "ajustes", section: id || null };
    case "conta":
      return { name: "conta", section: id || null };
    case "disciplina": {
      if (!id) return { name: "cadernos" };
      const tab = DISCIPLINE_TABS.includes(extra as DisciplineTab) ? (extra as DisciplineTab) : null;
      return { name: "disciplina", id, tab };
    }
    case "aula": {
      if (!id) return { name: "cadernos" };
      const tab = LESSON_TABS.includes(extra as LessonTab) ? (extra as LessonTab) : null;
      return { name: "aula", id, tab };
    }
    default:
      return { name: "desconhecida" };
  }
}

/** Chave que identifica a tela (trocar de aba dentro da aula não muda a tela). */
export function screenKey(route: Route): string {
  switch (route.name) {
    case "disciplina":
    case "aula":
    case "semestre":
      return `${route.name}/${route.id}`;
    case "biblioteca":
    case "estudar":
    case "estagio":
      return `${route.name}/${route.id ?? ""}`;
    default:
      return route.name;
  }
}

const listeners = new Set<() => void>();
const scrollByHash = new Map<string, number>();
let currentHash = "";
let pendingKind: "push" | "replace" | null = null;
let scrollTarget: number | null = 0;
let started = false;

function start() {
  if (started) return;
  started = true;
  currentHash = window.location.hash;
  try {
    window.history.scrollRestoration = "manual";
  } catch {
    // navegador sem suporte: mantém o comportamento padrão
  }
  window.addEventListener("hashchange", () => {
    const nextHash = window.location.hash;
    if (nextHash === currentHash) return;
    const sameScreen = screenKey(parseHash(nextHash)) === screenKey(parseHash(currentHash));
    scrollByHash.set(currentHash, window.scrollY);
    if (sameScreen) scrollTarget = null;
    else if (pendingKind) scrollTarget = 0;
    else scrollTarget = scrollByHash.get(nextHash) ?? 0;
    pendingKind = null;
    currentHash = nextHash;
    listeners.forEach((listener) => listener());
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => window.location.hash;
const getServerSnapshot = () => null;

/** Rota atual. É `null` no servidor e durante a hidratação. */
export function useRoute(): Route | null {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return hash === null ? null : parseHash(hash);
}

/** Vai para outra tela. `to` no formato "#/cadernos". */
export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const target = to.startsWith("#") ? to : `#${to}`;
  if (target === window.location.hash || (target === "#/" && window.location.hash === "")) return;
  pendingKind = options.replace ? "replace" : "push";
  if (options.replace) window.location.replace(target);
  else window.location.hash = target;
}

/** Avisa o roteador de que o próximo hashchange vem de um clique (rolar para o topo). */
export function markLinkNavigation(): void {
  pendingKind = "push";
}

/** Posição de rolagem a aplicar depois de trocar de tela (null = não mexer). */
export function takeScrollTarget(): number | null {
  const target = scrollTarget;
  scrollTarget = null;
  return target;
}

export function goBack(fallback: string): void {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback, { replace: true });
}
