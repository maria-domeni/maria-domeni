import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Cliente do Supabase com a chave secreta (só no servidor, ignora RLS). */

let admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  admin ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

export interface SessionUser {
  id: string;
  email: string;
}

/** Lê a pessoa a partir do token enviado em "Authorization: Bearer ...". */
export async function userFromRequest(request: Request): Promise<SessionUser | null> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  const sb = supabaseAdmin();
  if (!sb || !token) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: (data.user.email ?? "").toLowerCase() };
}

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
}

export function fail(status: number, code: string, message: string): Response {
  return json(status, { code, message });
}
