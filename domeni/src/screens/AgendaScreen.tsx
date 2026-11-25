"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CalendarArrowUp, ChevronLeft, ChevronRight, Download, Plus, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { TaskSheet } from "@/components/forms/Sheets";
import { Page, ScreenSkeleton, Tabs } from "@/components/shell/Page";
import { Button, Card, Link, cx, tint } from "@/components/ui/basics";
import { useToast } from "@/components/ui/overlays";
import { classesOn } from "@/lib/academics";
import { deliverFile } from "@/lib/backup";
import { googleCalendarLink, isGoogleIcsUrl, monthGrid, monthTitle, parseIcs, startOfWeek, tasksToIcs, windowAround } from "@/lib/calendar";
import { db } from "@/lib/db";
import { addDays, formatLong, formatShort, parseISO } from "@/lib/dates";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { replaceCalendar, updateTask } from "@/lib/store";
import { resolveCurrentSemester } from "@/lib/today";
import { WEEKDAY_SHORT, type CalendarEvent, type Discipline, type Task } from "@/lib/types";

const SYNC_KEY = "domeni-google-sync";

interface DayItem {
  key: string;
  kind: "aula" | "tarefa" | "google";
  time: string;
  title: string;
  color: string;
  task?: Task;
  discipline?: Discipline;
  event?: CalendarEvent;
  detail?: string;
}

export default function AgendaScreen() {
  const today = useToday();
  const settings = useSettingsOrDefault();
  const toast = useToast();
  const [view, setView] = useState<"mes" | "semana">("mes");
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ open: boolean; task?: Task; date?: string }>({ open: false });
  const [syncing, setSyncing] = useState(false);

  const data = useLiveQuery(async () => {
    const [semesters, disciplines, tasks, calendar] = await Promise.all([
      db.semesters.toArray(),
      db.disciplines.toArray(),
      db.tasks.toArray(),
      db.calendar.toArray(),
    ]);
    return { semesters, disciplines, tasks, calendar };
  }, []);

  const base = cursor ?? today;
  const day = selected ?? today;
  const [year, month] = base.split("-").map(Number);
  const days = useMemo(
    () => (view === "mes" ? monthGrid(year, month - 1) : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(base), i))),
    [view, year, month, base],
  );

  if (!data || today === "2000-01-01") return <ScreenSkeleton />;
  const current = resolveCurrentSemester(data.semesters, settings, today);
  const disciplines = data.disciplines.filter((d) => !current || d.semesterId === current.id);
  const byId = new Map(data.disciplines.map((d) => [d.id, d]));

  function itemsOn(date: string): DayItem[] {
    const items: DayItem[] = [];
    for (const occ of classesOn(date, disciplines, data!.semesters)) {
      items.push({
        key: `aula-${occ.discipline.id}-${occ.slot.id}`,
        kind: "aula",
        time: occ.slot.start,
        title: occ.discipline.name,
        color: occ.discipline.color,
        discipline: occ.discipline,
        detail: [occ.slot.professor, occ.slot.room].filter(Boolean).join(" · "),
      });
    }
    for (const task of data!.tasks.filter((t) => t.dueDate === date)) {
      const discipline = byId.get(task.disciplineId ?? "");
      items.push({
        key: `t-${task.id}`,
        kind: "tarefa",
        time: task.time,
        title: task.title,
        color: discipline?.color ?? "rosa",
        task,
        discipline,
      });
    }
    for (const event of data!.calendar.filter((e) => e.date === date)) {
      items.push({ key: `g-${event.id}`, kind: "google", time: event.time, title: event.title, color: "azul", event, detail: event.location });
    }
    return items.sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));
  }

  async function syncGoogle() {
    if (!isGoogleIcsUrl(settings.googleIcsUrl)) {
      toast("Cole o endereço iCal do Google Agenda em Ajustes › Integrações.");
      return;
    }
    setSyncing(true);
    try {
      const response = await fetch("/api/agenda", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: settings.googleIcsUrl }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Não deu para atualizar.");
      }
      const text = await response.text();
      const { from, to } = windowAround(today);
      const events = parseIcs(text, from, to);
      await replaceCalendar(events);
      try {
        localStorage.setItem(SYNC_KEY, new Date().toISOString());
      } catch {
        // sem armazenamento local
      }
      toast(`${events.length} eventos do Google Agenda`);
    } catch (error) {
      toast((error as Error).message || "Não deu para atualizar o Google Agenda.");
    } finally {
      setSyncing(false);
    }
  }

  async function exportIcs() {
    const pending = data!.tasks.filter((t) => !t.done);
    const ics = tasksToIcs(pending, (id) => byId.get(id ?? "")?.name ?? "", new Date().toISOString());
    await deliverFile(new File([ics], "domeni-agenda.ics", { type: "text/calendar" }));
  }

  const dayItems = itemsOn(day);
  const lastSync = (() => {
    try {
      return localStorage.getItem(SYNC_KEY);
    } catch {
      return null;
    }
  })();

  const move = (dir: number) => {
    if (view === "mes") {
      const d = parseISO(`${base.slice(0, 7)}-01`);
      d.setMonth(d.getMonth() + dir);
      setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
    } else setCursor(addDays(base, 7 * dir));
  };

  return (
    <Page
      title="Agenda"
      wide
      actions={
        <>
          {settings.googleIcsUrl ? (
            <Button size="sm" variant="gray" icon={RefreshCw} onClick={() => void syncGoogle()} disabled={syncing}>
              {syncing ? "Atualizando…" : "Google"}
            </Button>
          ) : null}
          <Button size="sm" icon={Plus} onClick={() => setSheet({ open: true, date: day })}>
            Compromisso
          </Button>
        </>
      }
    >
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => move(-1)} aria-label="Anterior" className="row-pressable inline-flex size-9 items-center justify-center rounded-[10px]">
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <button type="button" onClick={() => move(1)} aria-label="Próximo" className="row-pressable inline-flex size-9 items-center justify-center rounded-[10px]">
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </div>
        <h2 className="text-[22px] leading-8 font-semibold tracking-[-0.02em]">{monthTitle(year, month - 1)}</h2>
        <button
          type="button"
          onClick={() => {
            setCursor(null);
            setSelected(today);
          }}
          className="pressable rounded-[8px] bg-fill px-3 py-1.5 text-[14px] font-medium"
        >
          Hoje
        </button>
        <div className="ml-auto">
          <Tabs
            value={view}
            onChange={setView}
            tabs={[
              { value: "mes", label: "Mês" },
              { value: "semana", label: "Semana" },
            ]}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden p-2 sm:p-3">
          <div className="grid grid-cols-7 pb-1 text-center text-[12px] font-medium text-label-3">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <span key={d}>{WEEKDAY_SHORT[d]}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date) => {
              const items = itemsOn(date);
              const inMonth = date.slice(0, 7) === base.slice(0, 7) || view === "semana";
              const isToday = date === today;
              const isSelected = date === day;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelected(date)}
                  className={cx(
                    "flex flex-col items-stretch gap-0.5 rounded-[12px] p-1 text-left transition-colors",
                    view === "mes" ? "min-h-[74px] sm:min-h-[92px]" : "min-h-[220px]",
                    isSelected ? "bg-fill" : "row-pressable",
                    !inMonth && "opacity-40",
                  )}
                >
                  <span
                    className={cx(
                      "inline-flex size-7 items-center justify-center self-start rounded-full text-[13.5px] font-semibold",
                      isToday && "bg-accent-solid text-on-accent",
                      !isToday && isSelected && "text-accent",
                    )}
                  >
                    {Number(date.slice(8, 10))}
                  </span>
                  {items.slice(0, view === "mes" ? 3 : 8).map((item) => {
                    const t = tint(item.color, cx(
                      "truncate rounded-[4px] px-1 text-[10.5px] leading-[16px] sm:text-[11.5px]",
                      item.kind === "tarefa" ? "bg-dc-soft font-semibold text-dc" : item.kind === "aula" ? "font-medium text-label-2" : "font-medium text-[#3a6fae]",
                    ));
                    return (
                      <span key={item.key} className={t.className} style={t.style}>
                        
                        {view === "semana" && item.time ? `${item.time} ` : ""}
                        {item.title}
                      </span>
                    );
                  })}
                  {items.length > (view === "mes" ? 3 : 8) ? (
                    <span className="px-1 text-[10.5px] font-semibold text-label-3">+{items.length - (view === "mes" ? 3 : 8)}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Card>

        <div>
          <Card className="px-4 py-4">
            <p className="text-[12.5px] font-medium text-accent">dia selecionado</p>
            <h3 className="font-display text-[22px] leading-7 font-semibold">{formatLong(day).replace(/^./, (c) => c.toUpperCase())}</h3>
            <div className="mt-3 space-y-2">
              {dayItems.length === 0 ? <p className="text-[15px] text-label-2">Nada marcado. Que tal um dia de estudo? 🌷</p> : null}
              {dayItems.map((item) => {
                const t = tint(item.color, "flex gap-3 rounded-[10px] bg-fill px-3 py-2.5");
                return (
                  <div key={item.key} className={t.className} style={t.style}>
                    <div className="flex w-14 flex-none items-start gap-1.5 text-[13.5px] font-semibold tabular-nums"><span className="mt-1.5 size-2 flex-none rounded-full bg-dc" />{item.time || "dia"}</div>
                    <div className="min-w-0 flex-1">
                      <p className={cx("font-semibold", item.task?.done && "line-through opacity-60")}>
                        
                        {item.title}
                      </p>
                      {item.detail || item.discipline ? (
                        <p className="text-[12.5px] text-label-2">
                          {item.kind === "tarefa" ? item.discipline?.name : item.detail}
                          {item.kind === "aula" ? "" : ""}
                        </p>
                      ) : null}
                      {item.task ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => void updateTask(item.task!.id, { done: !item.task!.done })}
                            className="pressable rounded-[8px] bg-surface px-2.5 py-1 text-[12.5px] font-semibold"
                          >
                            {item.task.done ? "Desmarcar" : "Feito ✓"}
                          </button>
                          <button type="button" onClick={() => setSheet({ open: true, task: item.task })} className="pressable rounded-[8px] bg-surface px-2.5 py-1 text-[12.5px] font-semibold">
                            Editar
                          </button>
                          <a
                            href={googleCalendarLink({
                              title: item.discipline ? `${item.task.title} · ${item.discipline.name}` : item.task.title,
                              date: item.task.dueDate,
                              time: item.task.time,
                              details: item.task.notes,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pressable inline-flex items-center gap-1 rounded-[8px] bg-surface px-2.5 py-1 text-[12.5px] font-semibold"
                          >
                            <CalendarArrowUp size={13} /> Google Agenda
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <Button className="mt-4" block variant="tinted" icon={Plus} onClick={() => setSheet({ open: true, date: day })}>
              Adicionar neste dia
            </Button>
          </Card>

          <Card className="mt-4 space-y-2 px-4 py-4 text-[14px] leading-5 text-label-2">
            <p className="font-semibold text-label">Google Agenda</p>
            {settings.googleIcsUrl ? (
              <p>
                Seus eventos do Google aparecem em azul.{" "}
                {lastSync ? `Atualizado em ${formatShort(lastSync.slice(0, 10), today)}.` : "Toque em “Google” para buscar."}
              </p>
            ) : (
              <p>
                Para ver os eventos do Google aqui, cole o endereço iCal em{" "}
                <Link to="#/ajustes/integracoes" className="font-semibold text-accent">
                  Ajustes › Integrações
                </Link>
                .
              </p>
            )}
            <p>Para receber avisos com o app fechado, use “Google Agenda” em cada compromisso, ou exporte tudo:</p>
            <Button size="sm" variant="gray" icon={Download} onClick={() => void exportIcs()}>
              Exportar compromissos (.ics)
            </Button>
          </Card>
        </div>
      </div>

      <TaskSheet
        open={sheet.open}
        task={sheet.task}
        defaultDate={sheet.date}
        onClose={() => setSheet({ open: false })}
        disciplines={disciplines}
      />
    </Page>
  );
}
