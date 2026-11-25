"use client";

import { useEffect } from "react";

/**
 * Quem instalou o Domeni antes (quando o app ficava em "/") ou abre um link
 * antigo como "/#/agenda" vai direto para o app.
 */
export function InstalledRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (hash.startsWith("#/") || standalone) window.location.replace(`/app${hash}`);
  }, []);
  return null;
}
