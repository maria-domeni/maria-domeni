// Cria (ou atualiza) no Stripe tudo o que o Domeni precisa: produto, preços,
// portal da assinante e o webhook. Pode rodar quantas vezes quiser.
//
//   STRIPE_SECRET_KEY=sk_live_... SITE_URL=https://seu-dominio npm run stripe:setup
//
// No fim ele mostra as variáveis para colocar na Vercel.
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Defina STRIPE_SECRET_KEY (comece com a chave de teste sk_test_...).");
  process.exit(1);
}
const site = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
const stripe = new Stripe(key);
const live = key.startsWith("sk_live_");

// Preços em centavos (iguais a src/lib/pricing.ts)
const PRICES = [
  { lookup: "domeni_plus_mensal", amount: 1990, recurring: { interval: "month" }, nickname: "Plus mensal" },
  { lookup: "domeni_plus_anual", amount: 17990, recurring: { interval: "year" }, nickname: "Plus anual" },
  { lookup: "domeni_plus_anual_fundadora", amount: 12990, recurring: { interval: "year" }, nickname: "Plus anual (fundadora)" },
  { lookup: "domeni_plus_anual_pix", amount: 17990, recurring: null, nickname: "Plus 12 meses (Pix)" },
];

const EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "charge.refunded",
];

console.log(`Stripe em modo ${live ? "PRODUÇÃO" : "teste"}.`);

const existing = await stripe.prices.list({ lookup_keys: PRICES.map((p) => p.lookup), limit: 10, expand: ["data.product"] });
let product = existing.data.find((p) => p.product && typeof p.product === "object" && !p.product.deleted)?.product;
if (!product) {
  product = await stripe.products.create({
    name: "Domeni Plus",
    description: "Sincronização entre aparelhos, backup na nuvem e mais IA no Domeni.",
    metadata: { domeni: "plus" },
  });
  console.log("Produto criado:", product.id);
} else {
  console.log("Produto:", product.id);
}

const ids = {};
for (const spec of PRICES) {
  const found = existing.data.find((p) => p.lookup_key === spec.lookup);
  const same =
    found &&
    found.unit_amount === spec.amount &&
    found.currency === "brl" &&
    (spec.recurring ? found.recurring?.interval === spec.recurring.interval : !found.recurring);
  if (same) {
    ids[spec.lookup] = found.id;
    console.log(`Preço ok: ${spec.nickname} (${found.id})`);
    continue;
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: "brl",
    unit_amount: spec.amount,
    nickname: spec.nickname,
    lookup_key: spec.lookup,
    transfer_lookup_key: true,
    ...(spec.recurring ? { recurring: spec.recurring } : {}),
    tax_behavior: "inclusive",
  });
  ids[spec.lookup] = price.id;
  console.log(`Preço criado: ${spec.nickname} (${price.id})`);
}

// Portal: trocar cartão, ver recibos, trocar mensal/anual e cancelar no fim do período.
const portalSettings = {
  business_profile: {
    headline: "Domeni Plus",
    ...(site ? { privacy_policy_url: `${site}/privacidade`, terms_of_service_url: `${site}/termos` } : {}),
  },
  ...(site ? { default_return_url: `${site}/app#/conta` } : {}),
  features: {
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    customer_update: { enabled: true, allowed_updates: ["name", "tax_id", "address"] },
    subscription_cancel: {
      enabled: true,
      mode: "at_period_end",
      cancellation_reason: {
        enabled: true,
        options: ["too_expensive", "missing_features", "switched_service", "unused", "too_complex", "other"],
      },
    },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "create_prorations",
      products: [{ product: product.id, prices: [ids.domeni_plus_mensal, ids.domeni_plus_anual] }],
    },
  },
  metadata: { domeni: "1" },
};
const configs = await stripe.billingPortal.configurations.list({ limit: 20 });
const mine = configs.data.find((c) => c.metadata?.domeni === "1");
const portal = mine
  ? await stripe.billingPortal.configurations.update(mine.id, portalSettings)
  : await stripe.billingPortal.configurations.create(portalSettings);
console.log(`Portal ${mine ? "atualizado" : "criado"}: ${portal.id}`);

let webhookSecret = null;
if (site) {
  const url = `${site}/api/stripe/webhook`;
  const hooks = await stripe.webhookEndpoints.list({ limit: 50 });
  const hook = hooks.data.find((h) => h.url === url);
  if (hook) {
    await stripe.webhookEndpoints.update(hook.id, { enabled_events: EVENTS });
    console.log(`Webhook atualizado: ${url} (o segredo é o mesmo de antes, veja no painel do Stripe)`);
  } else {
    const created = await stripe.webhookEndpoints.create({ url, enabled_events: EVENTS, description: "Domeni" });
    webhookSecret = created.secret;
    console.log(`Webhook criado: ${url}`);
  }
} else {
  console.log("Sem SITE_URL: pulei o webhook. Rode de novo com SITE_URL=https://seu-dominio.");
}

console.log("\nColoque na Vercel (Settings > Environment Variables):");
console.log(`STRIPE_PORTAL_CONFIGURATION=${portal.id}`);
if (webhookSecret) console.log(`STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
console.log("STRIPE_PIX=1   (só depois de ativar o Pix em Settings > Payment methods)");
