"use client";

import { useSyncExternalStore } from "react";
import type { AccountInfo } from "./accountTypes";
import { ApiError, apiFetch, getSupabase } from "./client";
import { cloudEnabled } from "./config";

/**
 * Estado da conta. Sem a nuvem configurada fica "off" e o app segue local.
 * Não há login social: só e-mail (código de 6 dígitos ou senha).
 */

export type AccountState =
  | { status: "off" }
  | { status: "loading" }
  | { status: "signed-out" }
  | {
      status: "signed-in";
      user: { id: string; email: string };
      info: AccountInfo | null;
      infoError: string | null;
    };

let state: AccountState = cloudEnabled ? { status: "loading" } : { status: "off" };
const listeners = new Set<() => void>();

function set(next: AccountState) {
  state = next;
  for (const fn of listeners) fn();
}

export function getAccount(): AccountState {
  return state;
}

export function subscribeAccount(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const SERVER_STATE: AccountState = { status: "off" };
export function useAccount(): AccountState {
  return useSyncExternalStore(subscribeAccount, getAccount, () => SERVER_STATE);
}

let started = false;

/** Liga a escuta da sessão. Chamado uma vez quando o app abre. */
export async function startAccount(): Promise<void> {
  if (!cloudEnabled || started) return;
  started = true;
  try {
    const sb = await getSupabase();
    const { data } = await sb.auth.getSession();
    applySession(data.session?.user ?? null);
    sb.auth.onAuthStateChange((_event, session) => {
      // fora do callback: o Supabase pede para não chamar a API aqui dentro
      window.setTimeout(() => applySession(session?.user ?? null), 0);
    });
  } catch {
    set({ status: "signed-out" });
  }
}

let currentUserId: string | null = null;

function applySession(user: { id: string; email?: string } | null) {
  if (!user) {
    currentUserId = null;
    set({ status: "signed-out" });
    return;
  }
  const changed = currentUserId !== user.id;
  currentUserId = user.id;
  const prev = state.status === "signed-in" && !changed ? state.info : null;
  set({ status: "signed-in", user: { id: user.id, email: user.email ?? "" }, info: prev, infoError: null });
  if (changed || !prev) void refreshAccount();
}

/** Busca plano e uso no servidor. */
export async function refreshAccount(): Promise<AccountInfo | null> {
  if (state.status !== "signed-in") return null;
  const user = state.user;
  try {
    const info = await apiFetch<AccountInfo>("/api/conta");
    if (state.status === "signed-in" && state.user.id === user.id) set({ ...state, info, infoError: null });
    return info;
  } catch (error) {
    if (state.status === "signed-in" && state.user.id === user.id) {
      set({ ...state, infoError: (error as Error).message });
    }
    return null;
  }
}

function friendly(error: unknown): Error {
  const message = (error as { message?: string })?.message ?? "";
  if (/rate limit|too many|seconds/i.test(message)) return new Error("Muitas tentativas. Espere um minuto e tente de novo.");
  if (/invalid login|invalid credentials/i.test(message)) return new Error("E-mail ou senha incorretos.");
  if (/expired|invalid.*(otp|token)|token.*(invalid|expired)/i.test(message)) return new Error("Código errado ou vencido. Peça um novo.");
  if (/password.*(short|weak|least)/i.test(message)) return new Error("A senha precisa ter pelo menos 8 caracteres, com letras e números.");
  if (/fetch|network/i.test(message)) return new Error("Sem conexão com a internet.");
  return new Error(message || "Não deu certo. Tente de novo.");
}

/** Manda um código de 6 dígitos para o e-mail (cria a conta se for nova). */
export async function sendEmailCode(email: string): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
  if (error) throw friendly(error);
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.replace(/\D/g, ""), type: "email" });
  if (error) throw friendly(error);
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw friendly(error);
}

export async function setPassword(password: string): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw friendly(error);
}

export async function signOut(): Promise<void> {
  const sb = await getSupabase();
  await sb.auth.signOut({ scope: "local" });
}

/** Abre o pagamento do Stripe (site). Devolve o endereço para onde ir. */
export async function startCheckout(interval: "mensal" | "anual", method: "cartao" | "pix", offer?: "fundadora"): Promise<string> {
  const { url } = await apiFetch<{ url: string }>("/api/assinatura/checkout", { body: { interval, method, offer } });
  return url;
}

export async function openBillingPortal(): Promise<string> {
  const { url } = await apiFetch<{ url: string }>("/api/assinatura/portal", { body: {} });
  return url;
}

export async function deleteAccount(): Promise<void> {
  await apiFetch("/api/conta/excluir", { body: { confirm: "EXCLUIR" } });
  const sb = await getSupabase();
  await sb.auth.signOut({ scope: "local" });
}

export { ApiError };
