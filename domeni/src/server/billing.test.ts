import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* ---------- Supabase falso: guarda as linhas gravadas ---------- */
type RowT = Record<string, unknown>;
const tables: Record<string, RowT[]> = {};
function table(name: string) {
  tables[name] ??= [];
  return tables[name];
}
function query(name: string) {
  const filters: [string, unknown][] = [];
  let pendingUpdate: RowT | null = null;
  const match = (r: RowT) => filters.every(([k, v]) => r[k] === v);
  const q = {
    select: () => q,
    eq: (k: string, v: unknown) => (filters.push([k, v]), q),
    maybeSingle: async () => ({ data: table(name).find(match) ?? null, error: null }),
    insert: async (row: RowT) => (table(name).push(row), { error: null }),
    upsert: async (row: RowT) => {
      const keys = name === "entitlements" ? ["user_id", "source"] : ["id"];
      const i = table(name).findIndex((r) => keys.every((k) => r[k] === row[k]));
      if (i >= 0) table(name)[i] = { ...table(name)[i], ...row };
      else table(name).push(row);
      return { error: null };
    },
    update: (row: RowT) => ((pendingUpdate = row), q),
    then: (resolve: (v: unknown) => void) => {
      if (pendingUpdate) for (const r of table(name)) if (match(r)) Object.assign(r, pendingUpdate);
      resolve({ error: null });
    },
  };
  return q;
}
const fakeSb = { from: (name: string) => query(name) };
vi.mock("@/server/supabase", async (orig) => ({
  ...(await orig<typeof import("@/server/supabase")>()),
  supabaseAdmin: () => fakeSb,
}));

process.env.STRIPE_SECRET_KEY = "sk_test_fake";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_segredo";
process.env.REVENUECAT_WEBHOOK_AUTH = "Bearer rc-segredo";

const { stripe } = await import("@/server/stripe");
const { POST: stripeWebhook } = await import("@/app/api/stripe/webhook/route");
const { POST: rcWebhook } = await import("@/app/api/revenuecat/webhook/route");
const { pickEntitlement, monthStartBR, isActive } = await import("@/server/plans");

const USER = "0b7f7a8e-1111-4222-8333-944444444444";
const s = stripe()!;

function signed(event: object): Request {
  const payload = JSON.stringify(event);
  const header = s.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
  return new Request("http://x/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": header }, body: payload });
}

const now = Math.floor(Date.now() / 1000);
function sub(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_1",
    object: "subscription",
    status: "trialing",
    customer: "cus_1",
    metadata: { user_id: USER },
    cancel_at_period_end: false,
    cancel_at: null,
    ended_at: null,
    items: { data: [{ current_period_end: now + 7 * 86400, price: { recurring: { interval: "year" } } }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  vi.restoreAllMocks();
});

describe("webhook do Stripe", () => {
  it("recusa assinatura inválida", async () => {
    const res = await stripeWebhook(new Request("http://x", { method: "POST", headers: { "stripe-signature": "t=1,v1=abc" }, body: "{}" }));
    expect(res.status).toBe(400);
  });

  it("assinatura com teste grátis libera o Plus e é idempotente", async () => {
    vi.spyOn(s.subscriptions, "retrieve").mockResolvedValue(sub() as never);
    const event = { id: "evt_1", type: "customer.subscription.created", data: { object: { id: "sub_1" } } };
    expect((await stripeWebhook(signed(event))).status).toBe(200);
    const row = table("entitlements")[0];
    expect(row).toMatchObject({ user_id: USER, source: "stripe", status: "trialing", billing_interval: "anual" });
    expect(Date.parse(row.period_end as string)).toBeGreaterThan(Date.now());
    const again = await stripeWebhook(signed(event));
    expect(await again.text()).toContain("repetido");
  });

  it("cancelamento e fim do período", async () => {
    vi.spyOn(s.subscriptions, "retrieve").mockResolvedValue(sub({ status: "active", cancel_at_period_end: true }) as never);
    await stripeWebhook(signed({ id: "evt_2", type: "customer.subscription.updated", data: { object: { id: "sub_1" } } }));
    expect(table("entitlements")[0]).toMatchObject({ status: "active", cancel_at_period_end: true });
    vi.spyOn(s.subscriptions, "retrieve").mockResolvedValue(sub({ status: "canceled", ended_at: now }) as never);
    await stripeWebhook(signed({ id: "evt_3", type: "customer.subscription.deleted", data: { object: { id: "sub_1" } } }));
    expect(table("entitlements")[0]).toMatchObject({ status: "canceled" });
  });

  it("Pix anual: libera 12 meses e o reembolso tira o acesso", async () => {
    const session = {
      id: "cs_1",
      mode: "payment",
      payment_status: "paid",
      payment_intent: "pi_1",
      client_reference_id: USER,
      metadata: { kind: "anual_pix", user_id: USER },
    };
    await stripeWebhook(signed({ id: "evt_4", type: "checkout.session.async_payment_succeeded", data: { object: session } }));
    const row = table("entitlements").find((r) => r.source === "stripe_pix")!;
    expect(row.status).toBe("active");
    const days = (Date.parse(row.period_end as string) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(364);
    await stripeWebhook(signed({ id: "evt_5", type: "charge.refunded", data: { object: { payment_intent: "pi_1", refunded: true } } }));
    expect(table("entitlements").find((r) => r.source === "stripe_pix")!.status).toBe("canceled");
  });

  it("Pix pendente não libera nada", async () => {
    const session = { id: "cs_2", mode: "payment", payment_status: "unpaid", metadata: { kind: "anual_pix", user_id: USER } };
    await stripeWebhook(signed({ id: "evt_6", type: "checkout.session.completed", data: { object: session } }));
    expect(table("entitlements")).toHaveLength(0);
  });
});

describe("webhook das lojas (RevenueCat)", () => {
  const rc = (event: object, auth = "Bearer rc-segredo") =>
    rcWebhook(new Request("http://x", { method: "POST", headers: { authorization: auth }, body: JSON.stringify({ event }) }));

  it("exige o segredo", async () => {
    expect((await rc({ id: "1", type: "TEST" }, "Bearer errado")).status).toBe(401);
  });

  it("compra, cancelamento e expiração", async () => {
    const exp = Date.now() + 30 * 86_400_000;
    await rc({ id: "a", type: "INITIAL_PURCHASE", app_user_id: USER, store: "APP_STORE", product_id: "domeni_plus_mensal", period_type: "NORMAL", expiration_at_ms: exp });
    expect(table("entitlements")[0]).toMatchObject({ source: "app_store", status: "active", billing_interval: "mensal" });
    await rc({ id: "b", type: "CANCELLATION", app_user_id: USER, store: "APP_STORE", product_id: "domeni_plus_mensal", expiration_at_ms: exp });
    expect(table("entitlements")[0]).toMatchObject({ status: "active", cancel_at_period_end: true });
    await rc({ id: "c", type: "EXPIRATION", app_user_id: USER, store: "APP_STORE", product_id: "domeni_plus_mensal", expiration_at_ms: Date.now() - 1000 });
    expect(table("entitlements")[0]).toMatchObject({ status: "expired" });
  });

  it("ignora ids anônimos", async () => {
    const res = await rc({ id: "d", type: "INITIAL_PURCHASE", app_user_id: "$RCAnonymousID:abc", store: "PLAY_STORE" });
    expect(await res.text()).toContain("sem conta");
    expect(table("entitlements")).toHaveLength(0);
  });
});

describe("plano", () => {
  it("escolhe a assinatura ativa que vai mais longe", () => {
    const later = new Date(Date.now() + 90 * 86_400_000).toISOString();
    const sooner = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const picked = pickEntitlement([
      { source: "stripe", status: "canceled", billing_interval: "mensal", period_end: past, cancel_at_period_end: false },
      { source: "stripe_pix", status: "active", billing_interval: "anual", period_end: later, cancel_at_period_end: true },
      { source: "app_store", status: "active", billing_interval: "mensal", period_end: sooner, cancel_at_period_end: false },
    ]);
    expect(picked?.source).toBe("stripe_pix");
    expect(isActive({ status: "active", period_end: past })).toBe(false);
    expect(pickEntitlement([{ source: "stripe", status: "active", billing_interval: "mensal", period_end: past, cancel_at_period_end: false }])?.status).toBe("expired");
  });

  it("o mês começa à meia-noite de Brasília", () => {
    expect(monthStartBR(new Date("2026-12-01T02:59:00Z")).toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(monthStartBR(new Date("2026-12-01T03:00:00Z")).toISOString()).toBe("2026-12-01T03:00:00.000Z");
  });
});
