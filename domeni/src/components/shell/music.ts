"use client";

import { useSyncExternalStore } from "react";

/** Estado do tocador do Spotify, compartilhado entre telas (a música não para ao navegar). */
let state = { open: false, started: false };
const listeners = new Set<() => void>();

export function setMusicOpen(open: boolean): void {
  state = { open, started: state.started || open };
  listeners.forEach((listener) => listener());
}

/** Fecha o tocador de vez (a música para). */
export function stopMusic(): void {
  state = { open: false, started: false };
  listeners.forEach((listener) => listener());
}

export function useMusic(): { open: boolean; started: boolean } {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => state,
    () => state,
  );
}

/** Converte um link do Spotify no endereço do tocador incorporado. */
export function spotifyEmbedUrl(link: string): string | null {
  try {
    const url = new URL(link);
    if (url.hostname !== "open.spotify.com") return null;
    const parts = url.pathname.split("/").filter(Boolean).filter((p) => !p.startsWith("intl-"));
    const typeIndex = parts.findIndex((p) => ["playlist", "album", "track", "episode", "show", "artist"].includes(p));
    if (typeIndex < 0 || !parts[typeIndex + 1]) return null;
    const id = parts[typeIndex + 1];
    if (!/^[A-Za-z0-9]+$/.test(id)) return null;
    return `https://open.spotify.com/embed/${parts[typeIndex]}/${id}?utm_source=generator`;
  } catch {
    return null;
  }
}
