"use client";

import { useSyncExternalStore } from "react";

/** Abre a folha "Conheça o Plus" de qualquer lugar (ex.: quando a cota da IA acaba). */

let reason: string | null = null;
let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function openPlus(why: string | null = null): void {
  reason = why;
  open = true;
  emit();
}

export function closePlus(): void {
  open = false;
  emit();
}

let snapshot: { open: boolean; reason: string | null } = { open, reason };
export function usePaywall(): { open: boolean; reason: string | null } {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => {
      if (snapshot.open !== open || snapshot.reason !== reason) snapshot = { open, reason };
      return snapshot;
    },
    () => snapshot,
  );
}
