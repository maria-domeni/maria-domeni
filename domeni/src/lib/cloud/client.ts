"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, apiUrl, cloudEnabled } from "./config";

let clientPromise: Promise<SupabaseClient> | null = null;

/** Cliente do Supabase, carregado só quando a nuvem está configurada. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!cloudEnabled) return Promise.reject(new Error("A nuvem não está configurada."));
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "domeni-auth",
      },
    }),
  );
  return clientPromise;
}

export async function accessToken(): Promise<string | null> {
  if (!cloudEnabled) return null;
  try {
    const sb = await getSupabase();
    const { data } = await sb.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** Chama o servidor do Domeni com a sessão da pessoa. */
export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await accessToken();
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: {
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Sem conexão com a internet.", 0, "rede");
  }
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // corpo vazio
  }
  if (!response.ok) {
    const body = (payload ?? {}) as { message?: string; code?: string };
    throw new ApiError(body.message ?? "Algo deu errado. Tente de novo.", response.status, body.code);
  }
  return payload as T;
}
