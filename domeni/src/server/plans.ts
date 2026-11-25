import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountInfo, EntitlementInfo, EntitlementSource, EntitlementStatus } from "@/lib/cloud/accountTypes";
import { AI_LIMITS } from "@/lib/pricing";
import type { SessionUser } from "./supabase";

/** Plano, cotas e dona do app. */

export function isOwner(email: string): boolean {
  const owners = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && owners.includes(email.toLowerCase());
}

const ACTIVE: EntitlementStatus[] = ["trialing", "active", "past_due"];

interface EntitlementRow {
  source: EntitlementSource;
  status: EntitlementStatus;
  billing_interval: "mensal" | "anual" | null;
  period_end: string | null;
  cancel_at_period_end: boolean;
}

export function isActive(row: Pick<EntitlementRow, "status" | "period_end">, now = Date.now()): boolean {
  return ACTIVE.includes(row.status) && (!row.period_end || Date.parse(row.period_end) > now);
}

/** Escolhe a assinatura que vale (ativa e que vai mais longe). */
export function pickEntitlement(rows: EntitlementRow[], now = Date.now()): EntitlementInfo | null {
  const active = rows.filter((r) => isActive(r, now));
  const pool = active.length > 0 ? active : rows;
  if (pool.length === 0) return null;
  const best = [...pool].sort((a, b) => (Date.parse(b.period_end ?? "9999") || 0) - (Date.parse(a.period_end ?? "9999") || 0))[0];
  return {
    source: best.source,
    status: isActive(best, now) ? best.status : best.status === "canceled" ? "canceled" : "expired",
    interval: best.billing_interval,
    periodEnd: best.period_end,
    cancelAtPeriodEnd: best.cancel_at_period_end,
  };
}

/** Começo do mês no horário de Brasília (UTC-3, sem horário de verão). */
export function monthStartBR(now = new Date()): Date {
  const br = new Date(now.getTime() - 3 * 3600_000);
  return new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), 1, 3, 0, 0));
}

export function limitsFor(plan: "gratis" | "plus", owner: boolean): { acao: number; pesquisa: number } {
  if (owner) return { acao: -1, pesquisa: -1 };
  const env = (name: string, fallback: number) => {
    const v = Number(process.env[name]);
    return Number.isFinite(v) && process.env[name] !== undefined && process.env[name] !== "" ? v : fallback;
  };
  return plan === "plus"
    ? { acao: env("AI_LIMIT_PLUS", AI_LIMITS.plus.acao), pesquisa: env("AI_LIMIT_PLUS_SEARCH", AI_LIMITS.plus.pesquisa) }
    : { acao: env("AI_LIMIT_FREE", AI_LIMITS.gratis.acao), pesquisa: env("AI_LIMIT_FREE_SEARCH", AI_LIMITS.gratis.pesquisa) };
}

export async function loadAccount(sb: SupabaseClient, user: SessionUser): Promise<AccountInfo> {
  const owner = isOwner(user.email);
  const { data: rows, error } = await sb
    .from("entitlements")
    .select("source,status,billing_interval,period_end,cancel_at_period_end")
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  const entitlement = pickEntitlement((rows ?? []) as EntitlementRow[]);
  const plus = owner || (!!entitlement && ["trialing", "active", "past_due"].includes(entitlement.status));
  const since = monthStartBR().toISOString();
  const count = async (kind: "acao" | "pesquisa") => {
    const { count: n, error: e } = await sb
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("kind", kind)
      .gte("at", since);
    if (e) throw new Error(e.message);
    return n ?? 0;
  };
  const [acao, pesquisa] = await Promise.all([count("acao"), count("pesquisa")]);
  return {
    email: user.email,
    plan: plus ? "plus" : "gratis",
    owner,
    entitlement: owner && !entitlement ? { source: "cortesia", status: "active", interval: null, periodEnd: null, cancelAtPeriodEnd: false } : entitlement,
    usage: { acao, pesquisa },
    limits: limitsFor(plus ? "plus" : "gratis", owner),
    billing: { stripe: !!process.env.STRIPE_SECRET_KEY, pix: process.env.STRIPE_PIX === "1" },
  };
}
