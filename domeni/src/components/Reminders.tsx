"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { useToast } from "@/components/ui/overlays";
import { db } from "@/lib/db";
import { addDays, parseISO } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { TASK_TYPE_EMOJI } from "@/lib/types";

const FIRED_KEY = "domeni-lembretes-avisados";

function fired(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(FIRED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function markFired(key: string) {
  try {
    const set = fired();
    set.add(key);
    localStorage.setItem(FIRED_KEY, JSON.stringify([...set].slice(-300)));
  } catch {
    // sem armazenamento: o aviso pode repetir
  }
}

/**
 * Avisos dos compromissos enquanto o Domeni está aberto. Para receber com o
 * app fechado, use "Adicionar ao Google Agenda" em cada compromisso.
 */
export function Reminders() {
  const toast = useToast();
  const today = useToday();
  const tasks = useLiveQuery(
    () =>
      db.tasks
        .where("dueDate")
        .between(today, addDays(today, 8), true, true)
        .filter((t) => !t.done && t.remindMinutes !== null)
        .toArray(),
    [today],
    [],
  );

  useEffect(() => {
    if (today === "2000-01-01") return;
    const timers: number[] = [];
    const now = Date.now();
    for (const task of tasks) {
      const at = parseISO(task.dueDate);
      if (task.time) {
        const [h, m] = task.time.split(":").map(Number);
        at.setHours(h, m, 0, 0);
      } else at.setHours(8, 0, 0, 0);
      const fireAt = at.getTime() - (task.remindMinutes ?? 0) * 60_000;
      const key = `${task.id}|${task.dueDate}|${task.time}|${task.remindMinutes}`;
      if (fired().has(key)) continue;
      const delay = fireAt - now;
      if (delay > 24 * 3_600_000) continue;
      const fire = () => {
        markFired(key);
        const text = `${TASK_TYPE_EMOJI[task.type]} ${task.title}${task.time ? ` às ${task.time}` : ""}`;
        toast(text);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification("Domeni", { body: text, icon: "/icons/icon-192.png", tag: key });
          } catch {
            // alguns navegadores só notificam pelo service worker
          }
        }
      };
      if (delay <= 0) {
        // passou da hora do aviso com o app fechado: avisa ao abrir, se o compromisso ainda não passou
        if (at.getTime() > now) fire();
        else markFired(key);
      } else timers.push(window.setTimeout(fire, delay));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [tasks, today, toast]);

  return null;
}
