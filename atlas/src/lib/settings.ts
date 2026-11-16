import {
  ACCENT_KEYS,
  DEFAULT_SETTINGS,
  type AccentKey,
  type Settings,
  type ThemeMode,
} from "./types";

const THEMES: ThemeMode[] = ["auto", "claro", "escuro"];

/** Limpa uma lista de intervalos: inteiros positivos, sem repetição, em ordem crescente. */
export function normalizeIntervals(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_SETTINGS.reviewIntervals];
  const clean = [...new Set(value.map((n) => Math.round(Number(n))))]
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 365)
    .sort((a, b) => a - b);
  return clean.length > 0 ? clean : [...DEFAULT_SETTINGS.reviewIntervals];
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const text = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);

export function normalizeSettings(raw: Partial<Settings> | undefined | null): Settings {
  const r = raw ?? {};
  return {
    profileName: text(r.profileName, DEFAULT_SETTINGS.profileName),
    course: text(r.course, DEFAULT_SETTINGS.course),
    institution: text(r.institution, DEFAULT_SETTINGS.institution),
    totalSemesters: clampInt(r.totalSemesters, 1, 20, DEFAULT_SETTINGS.totalSemesters),
    currentSemesterId: typeof r.currentSemesterId === "string" ? r.currentSemesterId : null,
    reviewIntervals: normalizeIntervals(r.reviewIntervals),
    hardReinforceDays: clampInt(r.hardReinforceDays, 0, 60, DEFAULT_SETTINGS.hardReinforceDays),
    theme: THEMES.includes(r.theme as ThemeMode) ? (r.theme as ThemeMode) : DEFAULT_SETTINGS.theme,
    accent: ACCENT_KEYS.includes(r.accent as AccentKey)
      ? (r.accent as AccentKey)
      : DEFAULT_SETTINGS.accent,
  };
}

export const THEME_STORAGE_KEY = "atlas-tema";
export const ACCENT_STORAGE_KEY = "atlas-destaque";

/** Aplica tema e cor de destaque no documento e guarda para o próximo carregamento. */
export function applyAppearance(settings: Pick<Settings, "theme" | "accent">): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (settings.theme === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", settings.theme === "escuro" ? "dark" : "light");
  root.setAttribute("data-accent", settings.accent);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, settings.theme);
    localStorage.setItem(ACCENT_STORAGE_KEY, settings.accent);
  } catch {
    // armazenamento indisponível (modo privado): a aparência vale só nesta sessão
  }
}

/**
 * Script que roda antes da primeira pintura, para não piscar o tema errado
 * nem a barra lateral na posição errada.
 */
export const APPEARANCE_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)}),a=localStorage.getItem(${JSON.stringify(
  ACCENT_STORAGE_KEY,
)});if(t==="escuro")d.setAttribute("data-theme","dark");else if(t==="claro")d.setAttribute("data-theme","light");if(a)d.setAttribute("data-accent",a);if(localStorage.getItem("atlas-barra")==="fechada")d.setAttribute("data-sidebar","closed")}catch(e){}})()`;
