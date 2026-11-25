import { TRIAL_DAYS, isLaunchWindow } from "@/lib/pricing";
import { LOOKUP, customerFor, priceId, siteUrl, stripe } from "@/server/stripe";
import { fail, json, supabaseAdmin, userFromRequest } from "@/server/supabase";

/** Cria a página de pagamento do Stripe (cartão mensal/anual ou Pix anual). */
export async function POST(request: Request): Promise<Response> {
  const s = stripe();
  const sb = supabaseAdmin();
  if (!s || !sb) return fail(503, "sem-pagamento", "Os pagamentos ainda não foram configurados.");
  const user = await userFromRequest(request);
  if (!user) return fail(401, "sem-sessao", "Entre na sua conta para assinar.");
  if (!user.email) return fail(400, "sem-email", "Sua conta precisa de um e-mail.");

  let body: { interval?: string; method?: string; offer?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "erro", "Pedido inválido.");
  }
  const interval = body.interval === "anual" ? "anual" : "mensal";
  const pix = body.method === "pix";
  // preço de fundadora: só no anual no cartão e só dentro da semana de lançamento
  const founder = body.offer === "fundadora" && interval === "anual" && !pix && isLaunchWindow();
  if (pix && (interval !== "anual" || process.env.STRIPE_PIX !== "1")) {
    return fail(400, "erro", "Pix está disponível só no plano anual.");
  }

  const { data: active } = await sb
    .from("entitlements")
    .select("source,status,period_end")
    .eq("user_id", user.id)
    .in("status", ["trialing", "active", "past_due"]);
  const stillActive = (active ?? []).filter((r) => !r.period_end || Date.parse(r.period_end as string) > Date.now());
  if (!pix && stillActive.some((r) => r.source === "stripe")) {
    return fail(409, "ja-assina", "Você já tem uma assinatura ativa. Gerencie em Conta › Gerenciar assinatura.");
  }
  if (stillActive.some((r) => r.source === "app_store" || r.source === "play_store")) {
    return fail(409, "ja-assina", "Sua assinatura é pela loja de apps. Gerencie no iPhone/Android.");
  }

  try {
    const customer = await customerFor(s, sb, user);
    const base = siteUrl(request);
    const { count: hadStripe } = await sb
      .from("entitlements")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("source", ["stripe", "stripe_pix"]);
    const trial = !pix && TRIAL_DAYS > 0 && !hadStripe;

    const session = await s.checkout.sessions.create({
      customer,
      client_reference_id: user.id,
      locale: "pt-BR",
      success_url: `${base}/app#/conta/sucesso`,
      cancel_url: `${base}/app#/conta`,
      metadata: { user_id: user.id, kind: pix ? "anual_pix" : founder ? "assinatura_anual_fundadora" : `assinatura_${interval}` },
      ...(pix
        ? {
            mode: "payment" as const,
            payment_method_types: ["pix" as const],
            payment_method_options: { pix: { expires_after_seconds: 3600 } },
            line_items: [{ price: await priceId(s, LOOKUP.anualPix), quantity: 1 }],
            payment_intent_data: { metadata: { user_id: user.id, kind: "anual_pix" } },
          }
        : {
            mode: "subscription" as const,
            line_items: [
              {
                price: await priceId(s, founder ? LOOKUP.anualFundadora : interval === "anual" ? LOOKUP.anual : LOOKUP.mensal),
                quantity: 1,
              },
            ],
            allow_promotion_codes: true,
            subscription_data: {
              metadata: { user_id: user.id },
              ...(trial ? { trial_period_days: TRIAL_DAYS } : {}),
            },
          }),
      custom_text: {
        submit: {
          message: pix
            ? "Acesso de 12 meses liberado assim que o Pix for confirmado. Sem renovação automática."
            : trial
              ? `${TRIAL_DAYS} dias grátis. Cancele antes e nada é cobrado. Depois, cancele quando quiser no app.`
              : "Cancele quando quiser no app. Você tem 7 dias para desistir com reembolso total.",
        },
      },
    });
    if (!session.url) return fail(500, "erro", "O Stripe não devolveu a página de pagamento.");
    return json(200, { url: session.url });
  } catch (error) {
    console.error("checkout", error);
    return fail(502, "erro", "Não consegui abrir o pagamento agora. Tente de novo em instantes.");
  }
}
