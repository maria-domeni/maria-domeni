"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState, useSyncExternalStore } from "react";
import { db } from "./db";
import { todayISO } from "./dates";
import { applyAppearance, normalizeSettings } from "./settings";
import { DEFAULT_SETTINGS, type Settings } from "./types";

/** Ajustes do app; `undefined` enquanto o banco ainda não respondeu. */
export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => normalizeSettings((await db.settings.get("app"))?.value), []);
}

export function useSettingsOrDefault(): Settings {
  return useSettings() ?? DEFAULT_SETTINGS;
}

/** Mantém tema e cor de destaque do documento iguais aos Ajustes. */
export function useAppearanceSync(): void {
  const settings = useSettings();
  const theme = settings?.theme;
  const accent = settings?.accent;
  const customAccent = settings?.customAccent;
  const fontBody = settings?.fontBody;
  const fontTitle = settings?.fontTitle;
  const textScale = settings?.textScale;
  const background = settings?.background;
  useEffect(() => {
    if (!theme || !accent || !customAccent || !fontBody || !fontTitle || !textScale || !background) return;
    applyAppearance({ theme, accent, customAccent, fontBody, fontTitle, textScale, background });
  }, [theme, accent, customAccent, fontBody, fontTitle, textScale, background]);
}

function subscribeToClock(onChange: () => void) {
  const timer = window.setInterval(onChange, 30_000);
  const onVisible = () => {
    if (document.visibilityState === "visible") onChange();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onChange);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onChange);
  };
}

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// A página é pré-renderizada no build, quando "hoje" ainda não existe: o
// servidor usa uma data fixa e o navegador troca pela real ao hidratar.
const serverToday = () => "2000-01-01";

/** Data de hoje, atualizada quando o dia vira ou o app volta ao primeiro plano. */
export function useToday(): string {
  return useSyncExternalStore(subscribeToClock, todayISO, serverToday);
}

/** Hora atual "HH:MM", atualizada a cada meio minuto. */
export function useNowTime(): string {
  return useSyncExternalStore(subscribeToClock, nowTime, () => "00:00");
}

/** `true` a partir da largura informada. No servidor assume `false`. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Valor que só muda depois de `delay` ms sem novas alterações. */
export function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
