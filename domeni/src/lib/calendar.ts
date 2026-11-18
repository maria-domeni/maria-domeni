import { addDays, diffDays, isISODate, parseISO, toISO, weekdayOf } from "./dates";
import type { CalendarEvent, ISODate, Task } from "./types";

/* ------------------------------------------------------------------ */
/* Grade do mês                                                         */
/* ------------------------------------------------------------------ */

/** Dias para desenhar o mês: semanas completas de segunda a domingo. */
export function monthGrid(year: number, month: number): ISODate[] {
  const first = toISO(new Date(year, month, 1, 12));
  const offset = (weekdayOf(first) + 6) % 7; // segunda = 0
  const start = addDays(first, -offset);
  const last = toISO(new Date(year, month + 1, 0, 12));
  const total = offset + diffDays(first, last) + 1;
  const weeks = Math.ceil(total / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
}

/** Segunda-feira da semana da data. */
export function startOfWeek(date: ISODate): ISODate {
  return addDays(date, -((weekdayOf(date) + 6) % 7));
}

const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
export function monthTitle(year: number, month: number): string {
  const text = monthFmt.format(new Date(year, month, 1, 12)).replace(" de ", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ------------------------------------------------------------------ */
/* Contagem regressiva                                                  */
/* ------------------------------------------------------------------ */

export interface Countdown {
  days: number;
  hours: number;
  label: string;
}

/** Tempo até o compromisso. `now` em milissegundos. */
export function countdownTo(date: ISODate, time: string, now: number): Countdown {
  const [h, m] = /^\d{2}:\d{2}$/.test(time) ? time.split(":").map(Number) : [23, 59];
  const target = parseISO(date);
  target.setHours(h, m, 0, 0);
  const ms = target.getTime() - now;
  if (ms <= 0) return { days: 0, hours: 0, label: "agora" };
  const totalHours = Math.floor(ms / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  let label: string;
  if (days === 0) label = hours <= 1 ? "em menos de 2 h" : `em ${hours} h`;
  else if (days === 1) label = "amanhã";
  else label = `faltam ${days} dias`;
  return { days, hours, label };
}

/* ------------------------------------------------------------------ */
/* Google Agenda: link para adicionar e arquivo .ics                    */
/* ------------------------------------------------------------------ */

function compactDate(date: ISODate): string {
  return date.replace(/-/g, "");
}

function compactDateTime(date: ISODate, time: string): string {
  return `${compactDate(date)}T${time.replace(":", "")}00`;
}

function plusMinutes(date: ISODate, time: string, minutes: number): { date: ISODate; time: string } {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const dayShift = Math.floor(total / 1440);
  const rest = ((total % 1440) + 1440) % 1440;
  return {
    date: addDays(date, dayShift),
    time: `${String(Math.floor(rest / 60)).padStart(2, "0")}:${String(rest % 60).padStart(2, "0")}`,
  };
}

/** Link que abre o Google Agenda já com o compromisso preenchido. */
export function googleCalendarLink(input: {
  title: string;
  date: ISODate;
  time?: string;
  durationMinutes?: number;
  details?: string;
}): string {
  const params = new URLSearchParams({ action: "TEMPLATE", text: input.title });
  if (input.time && /^\d{2}:\d{2}$/.test(input.time)) {
    const end = plusMinutes(input.date, input.time, input.durationMinutes ?? 60);
    params.set("dates", `${compactDateTime(input.date, input.time)}/${compactDateTime(end.date, end.time)}`);
    params.set("ctz", "America/Sao_Paulo");
  } else {
    params.set("dates", `${compactDate(input.date)}/${compactDate(addDays(input.date, 1))}`);
  }
  if (input.details) params.set("details", input.details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** Arquivo .ics com os compromissos (importa no Google Agenda, Apple e Outlook). */
export function tasksToIcs(tasks: Task[], disciplineName: (id: string | null) => string, stamp: string): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Domeni//Agenda//PT-BR", "CALSCALE:GREGORIAN"];
  const dtstamp = stamp.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  for (const task of tasks) {
    const discipline = disciplineName(task.disciplineId);
    lines.push("BEGIN:VEVENT", `UID:${task.id}@domeni`, `DTSTAMP:${dtstamp}`);
    if (task.time) {
      const end = plusMinutes(task.dueDate, task.time, 60);
      lines.push(
        `DTSTART;TZID=America/Sao_Paulo:${compactDateTime(task.dueDate, task.time)}`,
        `DTEND;TZID=America/Sao_Paulo:${compactDateTime(end.date, end.time)}`,
      );
    } else {
      lines.push(
        `DTSTART;VALUE=DATE:${compactDate(task.dueDate)}`,
        `DTEND;VALUE=DATE:${compactDate(addDays(task.dueDate, 1))}`,
      );
    }
    lines.push(`SUMMARY:${icsEscape(discipline ? `${task.title} · ${discipline}` : task.title)}`);
    if (task.notes) lines.push(`DESCRIPTION:${icsEscape(task.notes)}`);
    if (task.remindMinutes !== null) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${icsEscape(task.title)}`,
        `TRIGGER:-PT${Math.max(0, task.remindMinutes)}M`,
        "END:VALARM",
      );
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/* ------------------------------------------------------------------ */
/* Leitura de agenda iCal (endereço secreto do Google Agenda)           */
/* ------------------------------------------------------------------ */

interface RawEvent {
  uid: string;
  summary: string;
  location: string;
  start: { date: ISODate; time: string } | null;
  end: { date: ISODate; time: string } | null;
  allDay: boolean;
  rrule: string;
  exdates: Set<ISODate>;
  recurrenceId: ISODate | null;
}

function unfold(text: string): string[] {
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
}

function unescapeIcs(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

const SP_OFFSET_MIN = -180; // horário de Brasília (sem horário de verão desde 2019)

/** Converte um valor DTSTART/DTEND para data e hora locais de Brasília. */
export function parseIcsDate(value: string, params: string): { date: ISODate; time: string; allDay: boolean } | null {
  if (/VALUE=DATE(?!-)/.test(params) || /^\d{8}$/.test(value)) {
    const m = /^(\d{4})(\d{2})(\d{2})/.exec(value);
    if (!m) return null;
    const date = `${m[1]}-${m[2]}-${m[3]}`;
    return isISODate(date) ? { date, time: "", allDay: true } : null;
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(value);
  if (!m) return null;
  if (m[7] === "Z") {
    const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    const local = new Date(utc + SP_OFFSET_MIN * 60_000);
    const date = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
    const time = `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
    return { date, time, allDay: false };
  }
  // Hora "flutuante" ou com TZID: usa como está (a agenda costuma estar no fuso de Brasília)
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}`, allDay: false };
}

const BYDAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/**
 * Lê eventos de um arquivo iCal e devolve as ocorrências entre `from` e `to`.
 * Entende repetição diária, semanal e mensal simples (o que agendas de aula usam).
 */
export function parseIcs(text: string, from: ISODate, to: ISODate): CalendarEvent[] {
  const raw: RawEvent[] = [];
  let current: RawEvent | null = null;
  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") {
      current = {
        uid: "",
        summary: "",
        location: "",
        start: null,
        end: null,
        allDay: false,
        rrule: "",
        exdates: new Set(),
        recurrenceId: null,
      };
      continue;
    }
    if (line === "END:VEVENT") {
      if (current?.start) raw.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const [name, ...paramParts] = head.split(";");
    const params = paramParts.join(";");
    switch (name) {
      case "UID":
        current.uid = value;
        break;
      case "SUMMARY":
        current.summary = unescapeIcs(value).slice(0, 200);
        break;
      case "LOCATION":
        current.location = unescapeIcs(value).slice(0, 200);
        break;
      case "DTSTART": {
        const parsed = parseIcsDate(value, params);
        if (parsed) {
          current.start = { date: parsed.date, time: parsed.time };
          current.allDay = parsed.allDay;
        }
        break;
      }
      case "DTEND": {
        const parsed = parseIcsDate(value, params);
        if (parsed) current.end = { date: parsed.date, time: parsed.time };
        break;
      }
      case "RRULE":
        current.rrule = value;
        break;
      case "EXDATE":
        for (const part of value.split(",")) {
          const parsed = parseIcsDate(part, params);
          if (parsed) current.exdates.add(parsed.date);
        }
        break;
      case "RECURRENCE-ID": {
        const parsed = parseIcsDate(value, params);
        if (parsed) current.recurrenceId = parsed.date;
        break;
      }
    }
  }

  // Ocorrências alteradas individualmente substituem a da regra
  const overridden = new Map<string, Set<ISODate>>();
  for (const event of raw) {
    if (!event.recurrenceId) continue;
    const set = overridden.get(event.uid) ?? new Set<ISODate>();
    set.add(event.recurrenceId);
    overridden.set(event.uid, set);
  }

  const result: CalendarEvent[] = [];
  const push = (event: RawEvent, date: ISODate) => {
    if (date < from || date > to) return;
    result.push({
      id: `${event.uid || event.summary}|${date}|${event.start?.time ?? ""}`,
      title: event.summary || "(sem título)",
      date,
      time: event.allDay ? "" : (event.start?.time ?? ""),
      endTime: event.allDay ? "" : (event.end?.time ?? ""),
      allDay: event.allDay,
      location: event.location,
    });
  };

  for (const event of raw) {
    const start = event.start as { date: ISODate; time: string };
    if (!event.rrule || event.recurrenceId) {
      push(event, start.date);
      continue;
    }
    const rule = Object.fromEntries(
      event.rrule.split(";").map((part) => {
        const [k, v] = part.split("=");
        return [k, v ?? ""];
      }),
    ) as Record<string, string>;
    const interval = Math.max(1, Number(rule.INTERVAL) || 1);
    const count = rule.COUNT ? Number(rule.COUNT) : Infinity;
    const until = rule.UNTIL ? (parseIcsDate(rule.UNTIL, "")?.date ?? to) : to;
    const last = until < to ? until : to;
    const skip = overridden.get(event.uid);
    const days = rule.BYDAY
      ? rule.BYDAY.split(",")
          .map((d) => BYDAY[d.replace(/^[-+]?\d+/, "")])
          .filter((d) => d !== undefined)
      : [weekdayOf(start.date)];
    let made = 0;
    const emit = (date: ISODate) => {
      made++;
      if (made > count) return false;
      if (!event.exdates.has(date) && !skip?.has(date)) push(event, date);
      return true;
    };
    if (rule.FREQ === "DAILY") {
      for (let date = start.date; date <= last; date = addDays(date, interval)) if (!emit(date)) break;
    } else if (rule.FREQ === "WEEKLY") {
      const weekStart = startOfWeek(start.date);
      outer: for (let week = weekStart; week <= last; week = addDays(week, 7 * interval)) {
        for (let i = 0; i < 7; i++) {
          const date = addDays(week, i);
          if (date < start.date || date > last) continue;
          if (!days.includes(weekdayOf(date))) continue;
          if (!emit(date)) break outer;
        }
      }
    } else if (rule.FREQ === "MONTHLY") {
      const day = Number(start.date.slice(8, 10));
      const [y, m] = start.date.split("-").map(Number);
      for (let i = 0; i < 240; i += interval) {
        const date = toISO(new Date(y, m - 1 + i, day, 12));
        if (date > last) break;
        if (Number(date.slice(8, 10)) !== day) continue;
        if (!emit(date)) break;
      }
    } else if (rule.FREQ === "YEARLY") {
      for (let i = 0; i < 30; i += interval) {
        const date = `${Number(start.date.slice(0, 4)) + i}${start.date.slice(4)}`;
        if (date > last) break;
        if (!isISODate(date)) continue;
        if (!emit(date)) break;
      }
    } else {
      push(event, start.date);
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

/** Aceita só o endereço iCal do Google Agenda (https://calendar.google.com/…ics). */
export function isGoogleIcsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "calendar.google.com" &&
      url.pathname.startsWith("/calendar/ical/") &&
      url.pathname.endsWith(".ics")
    );
  } catch {
    return false;
  }
}

/** Data de hoje mais N meses, para limitar a janela da agenda importada. */
export function windowAround(today: ISODate): { from: ISODate; to: ISODate } {
  return { from: addDays(today, -62), to: addDays(today, 190) };
}
