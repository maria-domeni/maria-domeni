import type { ISODate } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): ISODate {
  return toISO(new Date());
}

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Converte para Date ao meio-dia local, para formatação sem escorregar de dia. */
export function parseISO(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

function utcDays(iso: ISODate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const date = new Date((utcDays(iso) + days) * 86_400_000);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Quantos dias de `from` até `to` (positivo se `to` é depois). */
export function diffDays(from: ISODate, to: ISODate): number {
  return utcDays(to) - utcDays(from);
}

/** 0 = domingo … 6 = sábado */
export function weekdayOf(iso: ISODate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const longFmt = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const shortFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
const shortYearFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const weekdayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

const clean = (s: string) => s.replace(/\./g, "");

/** "segunda-feira, 16 de novembro" */
export function formatLong(iso: ISODate): string {
  return longFmt.format(parseISO(iso));
}

/** "16 de nov" → "16 nov"; inclui o ano quando é diferente do ano de referência. */
export function formatShort(iso: ISODate, reference: ISODate = todayISO()): string {
  const sameYear = iso.slice(0, 4) === reference.slice(0, 4);
  const text = (sameYear ? shortFmt : shortYearFmt).format(parseISO(iso));
  return clean(text).replace(/ de /g, " ");
}

/** "seg" */
export function formatWeekday(iso: ISODate): string {
  return clean(weekdayFmt.format(parseISO(iso)));
}

/** "hoje", "amanhã", "ontem", "em 3 dias", "há 2 dias" */
export function formatRelative(iso: ISODate, today: ISODate = todayISO()): string {
  const delta = diffDays(today, iso);
  if (delta === 0) return "hoje";
  if (delta === 1) return "amanhã";
  if (delta === -1) return "ontem";
  if (delta > 1) return `em ${delta} dias`;
  return `há ${-delta} dias`;
}

/** "16 nov · amanhã" */
export function formatShortRelative(iso: ISODate, today: ISODate = todayISO()): string {
  return `${formatShort(iso, today)} · ${formatRelative(iso, today)}`;
}

/** Semana atual do período (1 = primeira) e total de semanas, ou null fora do período. */
export function weekProgress(
  start: ISODate | undefined,
  end: ISODate | undefined,
  today: ISODate,
): { week: number; total: number; ratio: number } | null {
  if (!start || !end || diffDays(start, end) <= 0) return null;
  const totalDays = diffDays(start, end) + 1;
  const elapsed = diffDays(start, today);
  if (elapsed < 0 || elapsed >= totalDays) return null;
  const total = Math.ceil(totalDays / 7);
  const week = Math.min(total, Math.floor(elapsed / 7) + 1);
  return { week, total, ratio: Math.min(1, (elapsed + 1) / totalDays) };
}
