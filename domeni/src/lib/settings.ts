import { colorVariants, isHexColor } from "./color";
import {
  ACCENT_KEYS,
  DEFAULT_AVATAR,
  DEFAULT_SETTINGS,
  FONT_KEYS,
  TITLE_FONT_KEYS,
  TONES,
  type AccentKey,
  type AiModel,
  type AvatarAccessory,
  type AvatarConfig,
  type AvatarEyes,
  type AvatarHair,
  type AvatarMouth,
  type AvatarTone,
  type BackgroundStyle,
  type FontKey,
  type PaperStyle,
  type Settings,
  type TextScale,
  type ThemeMode,
  type ThemePreset,
  type TitleFontKey,
  type Tone,
} from "./types";

const THEMES: ThemeMode[] = ["auto", "claro", "escuro"];
const BACKGROUNDS: BackgroundStyle[] = ["quadriculado", "pontilhado", "liso", "aurora"];
const SCALES: TextScale[] = ["pequeno", "padrao", "grande"];
const PAPERS: PaperStyle[] = ["liso", "quadriculado", "pontilhado", "pautado"];
export const PRESETS: ThemePreset[] = ["rose", "lavanda", "matcha", "caderno", "minimal", "noite", "cafe"];
const MODELS: AiModel[] = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"];

export const AVATAR_TONES: AvatarTone[] = ["carinhosa", "animada", "direta", "engracada", "calma"];
export const AVATAR_HAIRS: AvatarHair[] = ["longo", "curto", "coque", "cacheado", "franja", "rabo", "tranca", "careca"];
export const AVATAR_EYES: AvatarEyes[] = ["redondos", "felizes", "estrela", "sonolentos"];
export const AVATAR_MOUTHS: AvatarMouth[] = ["sorriso", "aberto", "gatinho", "tranquilo"];
export const AVATAR_ACCESSORIES: AvatarAccessory[] = ["nenhum", "laco", "oculos", "fones", "flor", "chapeu", "estrela"];

type PresetValues = Pick<Settings, "theme" | "tone" | "accent" | "fontBody" | "fontTitle" | "background" | "paper">;

export const THEME_PRESETS: Record<ThemePreset, { label: string; hint: string; values: PresetValues }> = {
  rose: {
    label: "Rosé",
    hint: "Rosa, quadriculado e letreiro",
    values: { theme: "auto", tone: "rosado", accent: "rosa", fontBody: "nunito", fontTitle: "pacifico", background: "quadriculado", paper: "quadriculado" },
  },
  lavanda: {
    label: "Lavanda",
    hint: "Lilás com letra manuscrita",
    values: { theme: "auto", tone: "lavanda", accent: "lilas", fontBody: "nunito", fontTitle: "caveat", background: "pontilhado", paper: "pontilhado" },
  },
  matcha: {
    label: "Matcha",
    hint: "Verde calmo e editorial",
    values: { theme: "auto", tone: "menta", accent: "verde", fontBody: "lexend", fontTitle: "fraunces", background: "pontilhado", paper: "pautado" },
  },
  caderno: {
    label: "Caderno",
    hint: "Papel creme e tinta azul",
    values: { theme: "auto", tone: "creme", accent: "indigo", fontBody: "lora", fontTitle: "caveat", background: "liso", paper: "pautado" },
  },
  minimal: {
    label: "Minimal",
    hint: "Branco, preto e nada mais",
    values: { theme: "auto", tone: "neutro", accent: "grafite", fontBody: "inter", fontTitle: "igual", background: "liso", paper: "liso" },
  },
  noite: {
    label: "Noite",
    hint: "Escuro com brilho rosa",
    values: { theme: "escuro", tone: "lavanda", accent: "rosa", fontBody: "nunito", fontTitle: "pacifico", background: "aurora", paper: "quadriculado" },
  },
  cafe: {
    label: "Café",
    hint: "Tons quentes de livraria",
    values: { theme: "auto", tone: "cafe", accent: "laranja", fontBody: "lora", fontTitle: "fraunces", background: "pontilhado", paper: "pautado" },
  },
};

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

/** Número opcional: vazio ou inválido vira null. */
export function optionalNumber(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 100) / 100;
}

const text = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
export const pick = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;
const idOrNull = (value: unknown) => (typeof value === "string" && value !== "" ? value : null);
const hexOr = (value: unknown, fallback: string) => (isHexColor(value) ? value.toLowerCase() : fallback);

export function normalizeAvatar(value: unknown): AvatarConfig {
  const r = (typeof value === "object" && value !== null ? value : {}) as Partial<AvatarConfig>;
  return {
    name: text(r.name, DEFAULT_AVATAR.name).slice(0, 24) || DEFAULT_AVATAR.name,
    tone: pick(r.tone, AVATAR_TONES, DEFAULT_AVATAR.tone),
    skin: hexOr(r.skin, DEFAULT_AVATAR.skin),
    hair: pick(r.hair, AVATAR_HAIRS, DEFAULT_AVATAR.hair),
    hairColor: hexOr(r.hairColor, DEFAULT_AVATAR.hairColor),
    eyes: pick(r.eyes, AVATAR_EYES, DEFAULT_AVATAR.eyes),
    mouth: pick(r.mouth, AVATAR_MOUTHS, DEFAULT_AVATAR.mouth),
    accessory: pick(r.accessory, AVATAR_ACCESSORIES, DEFAULT_AVATAR.accessory),
    outfit: hexOr(r.outfit, DEFAULT_AVATAR.outfit),
    blush: r.blush !== false,
    visible: r.visible !== false,
    side: r.side === "esquerda" ? "esquerda" : "direita",
  };
}

/** Só aceita endereços https (link do Spotify, agenda do Google). */
export function cleanUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed === "") return "";
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function normalizeSettings(raw: Partial<Settings> | undefined | null): Settings {
  const r = raw ?? {};
  const d = DEFAULT_SETTINGS;
  const accent =
    r.accent === "personalizada" ? "personalizada" : pick<AccentKey>(r.accent, ACCENT_KEYS, d.accent as AccentKey);
  return {
    onboarded: r.onboarded === true,
    profileName: text(r.profileName, d.profileName),
    course: text(r.course, d.course),
    institution: text(r.institution, d.institution),
    totalSemesters: clampInt(r.totalSemesters, 1, 20, d.totalSemesters),
    currentSemesterId: idOrNull(r.currentSemesterId),
    avatarImageId: idOrNull(r.avatarImageId),
    reviewIntervals: normalizeIntervals(r.reviewIntervals),
    hardReinforceDays: clampInt(r.hardReinforceDays, 0, 60, d.hardReinforceDays),
    defaultAbsenceLimit: optionalNumber(r.defaultAbsenceLimit, 0, 1000),
    classesPerDay: clampInt(r.classesPerDay, 1, 12, d.classesPerDay),
    passingGrade: optionalNumber(r.passingGrade, 0, 1000),
    gradeMax: optionalNumber(r.gradeMax, 1, 1000) ?? d.gradeMax,
    requiredComplementary: optionalNumber(r.requiredComplementary, 0, 10000),
    requiredExtension: optionalNumber(r.requiredExtension, 0, 10000),
    preset: r.preset === "personalizado" ? "personalizado" : pick(r.preset, PRESETS, d.preset as ThemePreset),
    theme: pick(r.theme, THEMES, d.theme),
    tone: pick<Tone>(r.tone, TONES, d.tone),
    accent,
    customAccent: hexOr(r.customAccent, d.customAccent),
    fontBody: pick<FontKey>(r.fontBody, FONT_KEYS, d.fontBody),
    fontTitle: pick<TitleFontKey>(r.fontTitle, TITLE_FONT_KEYS, d.fontTitle),
    textScale: pick(r.textScale, SCALES, d.textScale),
    background: pick(r.background, BACKGROUNDS, d.background),
    paper: pick(r.paper, PAPERS, d.paper),
    pencilOnly: r.pencilOnly !== false,
    avatar: normalizeAvatar(r.avatar),
    googleIcsUrl: cleanUrl(r.googleIcsUrl),
    spotifyUrl: cleanUrl(r.spotifyUrl),
    aiEnabled: r.aiEnabled !== false,
    aiModel: pick(r.aiModel, MODELS, d.aiModel),
    aiAccessCode: text(r.aiAccessCode, "").slice(0, 200),
  };
}

export const APPEARANCE_STORAGE_KEY = "domeni-aparencia";
export const SIDEBAR_STORAGE_KEY = "domeni-barra";

type Appearance = Pick<
  Settings,
  "theme" | "tone" | "accent" | "customAccent" | "fontBody" | "fontTitle" | "textScale" | "background"
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
      "data-tone": settings.tone,
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
)})||"null");if(s){var a=s.attrs||{},v=s.vars||{},k;for(k in a){if(/^data-[a-z-]+$/.test(k)&&typeof a[k]==="string"&&/^[a-z-]+$/.test(a[k]))d.setAttribute(k,a[k])}for(k in v){if(/^--accent-[ld]$/.test(k)&&typeof v[k]==="string"&&/^#[0-9a-f]{6}$/.test(v[k]))d.style.setProperty(k,v[k])}}if(localStorage.getItem(${JSON.stringify(
  SIDEBAR_STORAGE_KEY,
)})==="fechada")d.setAttribute("data-sidebar","closed")}catch(e){}})()`;
