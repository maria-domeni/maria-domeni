"use client";

import { useEffect, useState } from "react";
import { db } from "./db";

interface Entry {
  url: string;
  refs: number;
  timer?: number;
}

const cache = new Map<string, Entry>();
const loading = new Map<string, Promise<Entry | null>>();

async function load(id: string): Promise<Entry | null> {
  const cached = cache.get(id);
  if (cached) return cached;
  let pending = loading.get(id);
  if (!pending) {
    pending = db.images.get(id).then((record) => {
      loading.delete(id);
      if (!record) return null;
      const entry: Entry = {
        url: URL.createObjectURL(new Blob([record.data], { type: record.type })),
        refs: 0,
      };
      cache.set(id, entry);
      return entry;
    });
    loading.set(id, pending);
  }
  return pending;
}

function release(id: string) {
  const entry = cache.get(id);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs > 0) return;
  // espera um pouco antes de liberar: trocar de tela costuma pedir a mesma imagem de novo
  entry.timer = window.setTimeout(() => {
    if (entry.refs > 0) return;
    URL.revokeObjectURL(entry.url);
    cache.delete(id);
  }, 30_000);
}

export type ImageState =
  | { status: "vazio" }
  | { status: "carregando" }
  | { status: "pronto"; url: string }
  | { status: "ausente" };

/** Endereço temporário para mostrar uma imagem guardada no aparelho. */
export function useImageUrl(id: string | null | undefined): ImageState {
  const [state, setState] = useState<{ id: string; result: ImageState } | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    let held = false;
    void load(id).then((entry) => {
      if (!alive) return;
      if (!entry) {
        setState({ id, result: { status: "ausente" } });
        return;
      }
      window.clearTimeout(entry.timer);
      entry.refs += 1;
      held = true;
      setState({ id, result: { status: "pronto", url: entry.url } });
    });
    return () => {
      alive = false;
      if (held) release(id);
    };
  }, [id]);

  if (!id) return { status: "vazio" };
  return state?.id === id ? state.result : { status: "carregando" };
}
