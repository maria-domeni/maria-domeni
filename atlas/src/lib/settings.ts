import { colorVariants, isHexColor } from "./color";
import {
  ACCENT_KEYS,
  COVER_PRESETS,
  DEFAULT_SETTINGS,
  FONT_KEYS,
  TITLE_FONT_KEYS,
  TODAY_SECTION_KEYS,
  type AccentKey,
  type BackgroundStyle,
  type Cover,
  type CoverPreset,
  type FontKey,
  type Settings,
  type TextScale,
  type ThemeMode,
  type TitleFontKey,
  type TodaySection,
  type TodaySectionKey,
} from "./types";

const THEMES: ThemeMode[] = ["auto", "claro", "escuro"];
const BACKGROUNDS: BackgroundStyle[] = ["liso", "suave", "aurora"];
const SCALES: TextScale[] = ["pequeno", "padrao", "grande"];

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
const pick = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;
const idOrNull = (value: unknown) => (typeof value === "string" && value !== "" ? value : null);

export function normalizeCover(value: unknown, fallback: Cover = DEFAULT_SETTINGS.todayCover): Cover {
  if (typeof value !== "object" || value === null) return { ...fallback };
  const raw = value as Partial<Cover>;
  const imageId = idOrNull(raw.imageId);
  const kind = pick(raw.kind, ["nenhuma", "predefinida", "imagem"] as const, fallback.kind);
  return {
    kind: kind === "imagem" && !imageId ? "predefinida" : kind,
    preset: pick<CoverPreset>(raw.preset, COVER_PRESETS, fallback.preset),
    imageId,
  };
}

/** Garante que todas as seções da tela Hoje aparecem uma vez, na ordem escolhida. */
export function normalizeTodaySections(value: unknown): TodaySection[] {
  const result: TodaySection[] = [];
  const seen = new Set<TodaySectionKey>();
  if (Array.isArray(value)) {
    for (const item of value) {
      const key = (item as Partial<TodaySection> | null)?.key;
      if (!TODAY_SECTION_KEYS.includes(key as TodaySectionKey) || seen.has(key as TodaySectionKey)) continue;
      seen.add(key as TodaySectionKey);
      result.push({ key: key as TodaySectionKey, visible: (item as TodaySection).visible !== false });
    }
  }
  for (const key of TODAY_SECTION_KEYS) if (!seen.has(key)) result.push({ key, visible: true });
  return result;
}

export function normalizeSettings(raw: Partial<Settings> | undefined | null): Settings {
  const r = raw ?? {};
  const accent =
    r.accent === "personalizada"
      ? "personalizada"
      : pick<AccentKey>(r.accent, ACCENT_KEYS, DEFAULT_SETTINGS.accent as AccentKey);
  return {
    onboarded: r.onboarded === true,
    profileName: text(r.profileName, DEFAULT_SETTINGS.profileName),
    course: text(r.course, DEFAULT_SETTINGS.course),
    institution: text(r.institution, DEFAULT_SETTINGS.institution),
    totalSemesters: clampInt(r.totalSemesters, 1, 20, DEFAULT_SETTINGS.totalSemesters),
    currentSemesterId: idOrNull(r.currentSemesterId),
    avatarImageId: idOrNull(r.avatarImageId),
    reviewIntervals: normalizeIntervals(r.reviewIntervals),
    hardReinforceDays: clampInt(r.hardReinforceDays, 0, 60, DEFAULT_SETTINGS.hardReinforceDays),
    theme: pick(r.theme, THEMES, DEFAULT_SETTINGS.theme),
    accent,
    customAccent: isHexColor(r.customAccent) ? r.customAccent.toLowerCase() : DEFAULT_SETTINGS.customAccent,
    fontBody: pick<FontKey>(r.fontBody, FONT_KEYS, DEFAULT_SETTINGS.fontBody),
    fontTitle: pick<TitleFontKey>(r.fontTitle, TITLE_FONT_KEYS, DEFAULT_SETTINGS.fontTitle),
    textScale: pick(r.textScale, SCALES, DEFAULT_SETTINGS.textScale),
    background: pick(r.background, BACKGROUNDS, DEFAULT_SETTINGS.background),
    todayCover: normalizeCover(r.todayCover),
    todaySections: normalizeTodaySections(r.todaySections),
  };
}

export const APPEARANCE_STORAGE_KEY = "atlas-aparencia";

type Appearance = Pick<
  Settings,
  "theme" | "accent" | "customAccent" | "fontBody" | "fontTitle" | "textScale" | "background"
>;

/** Atributos e variáveis que o tema põe no elemento <html>. */
export function appearanceAttributes(settings: Appearance): {
  attrs: Record<string, string | null>;
  vars: Record<string, string | null>;
} {
  const custom = settings.accent === "personalizada" ? colorVariants(settings.customAccent) : null;
  return {
    attrs: {
      "data-theme": settings.theme === "auto" ? null : settings.theme === "escuro" ? "dark" : "light",
      "data-accent": settings.accent,
      "data-font": settings.fontBody,
      "data-font-title": settings.fontTitle,
      "data-bg": settings.background,
      "data-scale": settings.textScale,
    },
    vars: {
      "--accent-l": custom?.light ?? null,
      "--accent-d": custom?.dark ?? null,
    },
  };
}

/** Aplica a aparência no documento e guarda para o próximo carregamento. */
export function applyAppearance(settings: Appearance): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const { attrs, vars } = appearanceAttributes(settings);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null) root.removeAttribute(name);
    else root.setAttribute(name, value);
  }
  for (const [name, value] of Object.entries(vars)) {
    if (value === null) root.style.removeProperty(name);
    else root.style.setProperty(name, value);
  }
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ attrs, vars }));
  } catch {
    // armazenamento indisponível (modo privado): a aparência vale só nesta sessão
  }
}

/**
 * Script que roda antes da primeira pintura, para não piscar o tema errado
 * nem a barra lateral na posição errada. Só aplica nomes conhecidos, com
 * valores em formato seguro.
 */
export const APPEARANCE_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,s=JSON.parse(localStorage.getItem(${JSON.stringify(
  APPEARANCE_STORAGE_KEY,
)})||"null");if(s){var a=s.attrs||{},v=s.vars||{},k;for(k in a){if(/^data-[a-z-]+$/.test(k)&&typeof a[k]==="string"&&/^[a-z-]+$/.test(a[k]))d.setAttribute(k,a[k])}for(k in v){if(/^--accent-[ld]$/.test(k)&&typeof v[k]==="string"&&/^#[0-9a-f]{6}$/.test(v[k]))d.style.setProperty(k,v[k])}}if(localStorage.getItem("atlas-barra")==="fechada")d.setAttribute("data-sidebar","closed")}catch(e){}})()`;
