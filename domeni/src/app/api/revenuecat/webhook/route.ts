import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/server/supabase";

/**
 * Avisos do RevenueCat (compras na App Store e no Google Play). O RevenueCat
 * manda o cabeçalho Authorization com o valor configurado no painel; ele
 * precisa bater com REVENUECAT_WEBHOOK_AUTH. O app chama Purchases.logIn com o
 * id da conta, então app_user_id é o id da pessoa no Supabase.
 */

interface RcEvent {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  expiration_at_ms?: number | null;
  period_type?: string;
  store?: string;
  product_id?: string;
  environment?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  const sb = supabaseAdmin();
  if (!expected || !sb) return new Response("não configurado", { status: 503 });
  if (!sameSecret(request.headers.get("authorization") ?? "", expected)) return new Response("não autorizado", { status: 401 });

  let event: RcEvent;
  try {
    event = ((await request.json()) as { event: RcEvent }).event;
  } catch {
    return new Response("inválido", { status: 400 });
  }
  if (!event?.id || !event.type) return new Response("inválido", { status: 400 });
  if (event.type === "TEST") return new Response("ok", { status: 200 });

  const { data: seen } = await sb.from("billing_events").select("id").eq("id", `rc_${event.id}`).maybeSingle();
  if (seen) return new Response("ok (repetido)", { status: 200 });

  const userId = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])].find((id) => id && UUID.test(id));
  if (!userId) return new Response("ok (sem conta)", { status: 200 });
  const source = event.store === "PLAY_STORE" ? "play_store" : event.store === "APP_STORE" ? "app_store" : null;
  if (!source) return new Response("ok (loja ignorada)", { status: 200 });

  const periodEnd = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const interval = /anual|annual|year/i.test(event.product_id ?? "") ? "anual" : /mensal|month/i.test(event.product_id ?? "") ? "mensal" : null;
  const base = { user_id: userId, source, billing_interval: interval, external_id: event.product_id ?? null, updated_at: new Date().toISOString() };

  let row: Record<string, unknown> | null = null;
  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
    case "NON_RENEWING_PURCHASE":
    case "SUBSCRIPTION_EXTENDED":
    case "TEMPORARY_ENTITLEMENT_GRANT":
      row = { ...base, status: event.period_type === "TRIAL" ? "trialing" : "active", period_end: periodEnd, cancel_at_period_end: false };
      break;
    case "CANCELLATION":
      row = { ...base, status: event.period_type === "TRIAL" ? "trialing" : "active", period_end: periodEnd, cancel_at_period_end: true };
      break;
    case "BILLING_ISSUE":
      row = { ...base, status: "past_due", period_end: periodEnd, cancel_at_period_end: false };
      break;
    case "EXPIRATION":
      row = { ...base, status: "expired", period_end: periodEnd ?? new Date().toISOString(), cancel_at_period_end: false };
      break;
    default:
      break;
  }
  if (row) {
    const { error } = await sb.from("entitlements").upsert(row);
    if (error) return new Response("erro", { status: 500 });
  }
  await sb.from("billing_events").insert({ id: `rc_${event.id}`, provider: "revenuecat", type: event.type });
  return new Response("ok", { status: 200 });
}
