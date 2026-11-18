"use client";

import { useSyncExternalStore } from "react";

import { SIDEBAR_STORAGE_KEY } from "./settings";

const listeners = new Set<() => void>();

const isOpen = () => document.documentElement.getAttribute("data-sidebar") !== "closed";

export function setSidebarOpen(open: boolean): void {
  const root = document.documentElement;
  if (open) root.removeAttribute("data-sidebar");
  else root.setAttribute("data-sidebar", "closed");
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, open ? "aberta" : "fechada");
  } catch {
    // sem armazenamento local: vale só nesta sessão
  }
  listeners.forEach((listener) => listener());
}

export function useSidebarOpen(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    isOpen,
    () => true,
  );
}
