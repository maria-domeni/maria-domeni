"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { buildAlerts, moodFor, type Alert, type Mood } from "./alerts";
import { db } from "./db";
import { useNowTime, useSettingsOrDefault, useToday } from "./hooks";
import { resolveCurrentSemester } from "./today";

/** Dados de todo o app e os avisos do personagem, sempre atualizados. */
export function useBrain(): { alerts: Alert[]; mood: Mood; ready: boolean } {
  const today = useToday();
  const nowTime = useNowTime();
  const settings = useSettingsOrDefault();
  const data = useLiveQuery(async () => {
    const [semesters, disciplines, lessons, reviews, tasks, attendance, grades, books, cards, hours] = await Promise.all([
      db.semesters.toArray(),
      db.disciplines.toArray(),
      db.lessons.toArray(),
      db.reviews.toArray(),
      db.tasks.toArray(),
      db.attendance.toArray(),
      db.grades.toArray(),
      db.books.toArray(),
      db.cards.toArray(),
      db.hours.toArray(),
    ]);
    return { semesters, disciplines, lessons, reviews, tasks, attendance, grades, books, cards, hours };
  }, []);

  return useMemo(() => {
    if (!data || today === "2000-01-01") return { alerts: [], mood: "feliz" as Mood, ready: false };
    const currentSemester = resolveCurrentSemester(data.semesters, settings, today);
    const alerts = buildAlerts({ ...data, today, nowTime, settings, currentSemester });
    return { alerts, mood: moodFor(alerts, nowTime), ready: true };
  }, [data, today, nowTime, settings]);
}
