/**
 * Configuração da nuvem (contas, sincronização, assinatura). Sem as variáveis
 * abaixo o app funciona como sempre: tudo local, sem conta.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Endereço do servidor. Vazio no site (mesmo endereço); no app das lojas, o site publicado. */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/+$/, "");

export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Build para as lojas (Capacitor). */
export const NATIVE_BUILD = process.env.NEXT_PUBLIC_NATIVE === "1";

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/** Arquivos binários vão para o Storage; o resto vira JSON. */
export const BLOB_TABLES = new Set(["images", "files"]);
