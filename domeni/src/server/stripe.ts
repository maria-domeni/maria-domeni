import "server-only";
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntitlementStatus } from "@/lib/cloud/accountTypes";

/** Stripe no servidor. Os preços são achados pela "lookup key" (veja scripts/stripe-setup.mjs). */

export const LOOKUP = {
  mensal: "domeni_plus_mensal",
  anual: "domeni_plus_anual",
  anualPix: "domeni_plus_anual_pix",
  anualFundadora: "domeni_plus_anual_fundadora",
} as const;

let client: Stripe | null = null;
export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key, { appInfo: { name: "Domeni" }, maxNetworkRetries: 2 });
  return client;
}

const priceCache = new Map<string, { id: string; at: number }>();
export async function priceId(s: Stripe, lookupKey: string): Promise<string> {
  const hit = priceCache.get(lookupKey);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.id;
  const { data } = await s.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (!data[0]) throw new Error(`Preço ${lookupKey} não existe no Stripe. Rode npm run stripe:setup.`);
  priceCache.set(lookupKey, { id: data[0].id, at: Date.now() });
  return data[0].id;
}

export function siteUrl(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  return fromEnv || new URL(request.url).origin;
}

/** Garante um cliente no Stripe ligado à conta. */
export async function customerFor(s: Stripe, sb: SupabaseClient, user: { id: string; email: string }): Promise<string> {
  const { data: profile } = await sb.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  if (profile?.stripe_customer_id) return profile.stripe_customer_id as string;
  const customer = await s.customers.create(
    { email: user.email, metadata: { user_id: user.id } },
    { idempotencyKey: `customer-${user.id}` },
  );
  await sb.from("profiles").upsert({ id: user.id, email: user.email, stripe_customer_id: customer.id });
  return customer.id;
}

export function mapStatus(status: Stripe.Subscription.Status): EntitlementStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      // incomplete, incomplete_expired, unpaid, paused: sem acesso
      return "expired";
  }
}

export function periodEnd(sub: Stripe.Subscription): string | null {
  const ends = sub.items.data.map((i) => i.current_period_end).filter((n): n is number => typeof n === "number");
  if (sub.status === "canceled") return new Date((sub.ended_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
  return ends.length ? new Date(Math.max(...ends) * 1000).toISOString() : null;
}

export function intervalOf(sub: Stripe.Subscription): "mensal" | "anual" | null {
  const interval = sub.items.data[0]?.price?.recurring?.interval;
  return interval === "year" ? "anual" : interval === "month" ? "mensal" : null;
}

async function userIdForCustomer(sb: SupabaseClient, customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): Promise<string | null> {
  const id = typeof customer === "string" ? customer : customer?.id;
  if (!id) return null;
  const { data } = await sb.from("profiles").select("id").eq("stripe_customer_id", id).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Copia o estado da assinatura do Stripe para a tabela entitlements. */
export async function syncSubscription(sb: SupabaseClient, sub: Stripe.Subscription): Promise<void> {
  const userId = (sub.metadata?.user_id as string | undefined) || (await userIdForCustomer(sb, sub.customer));
  if (!userId) throw new Error(`Assinatura ${sub.id} sem conta ligada.`);
  const { error } = await sb.from("entitlements").upsert({
    user_id: userId,
    source: "stripe",
    status: mapStatus(sub.status),
    billing_interval: intervalOf(sub),
    period_end: periodEnd(sub),
    cancel_at_period_end: sub.cancel_at_period_end || !!sub.cancel_at,
    external_id: sub.id,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Pix do plano anual: 365 dias a partir de hoje (ou do fim do período atual, se ainda vale). */
export async function grantPixYear(sb: SupabaseClient, userId: string, paymentIntent: string | null): Promise<void> {
  const { data: current } = await sb
    .from("entitlements")
    .select("period_end,status,external_id")
    .eq("user_id", userId)
    .eq("source", "stripe_pix")
    .maybeSingle();
  if (current && paymentIntent && current.external_id === paymentIntent) return; // já aplicado
  const base = current?.period_end && Date.parse(current.period_end as string) > Date.now() && current.status === "active"
    ? Date.parse(current.period_end as string)
    : Date.now();
  const { error } = await sb.from("entitlements").upsert({
    user_id: userId,
    source: "stripe_pix",
    status: "active",
    billing_interval: "anual",
    period_end: new Date(base + 365 * 86_400_000).toISOString(),
    cancel_at_period_end: true,
    external_id: paymentIntent,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function revokePix(sb: SupabaseClient, paymentIntent: string): Promise<void> {
  await sb
    .from("entitlements")
    .update({ status: "canceled", period_end: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("source", "stripe_pix")
    .eq("external_id", paymentIntent);
}
