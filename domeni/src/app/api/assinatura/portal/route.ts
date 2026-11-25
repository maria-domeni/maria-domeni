import { siteUrl, stripe } from "@/server/stripe";
import { fail, json, supabaseAdmin, userFromRequest } from "@/server/supabase";

/** Abre o portal do Stripe: trocar cartão, ver recibos, mudar de plano ou cancelar. */
export async function POST(request: Request): Promise<Response> {
  const s = stripe();
  const sb = supabaseAdmin();
  if (!s || !sb) return fail(503, "sem-pagamento", "Os pagamentos ainda não foram configurados.");
  const user = await userFromRequest(request);
  if (!user) return fail(401, "sem-sessao", "Entre na sua conta de novo.");
  const { data: profile } = await sb.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  if (!profile?.stripe_customer_id) return fail(404, "sem-assinatura", "Não há assinatura pelo site nesta conta.");
  try {
    const session = await s.billingPortal.sessions.create({
      customer: profile.stripe_customer_id as string,
      return_url: `${siteUrl(request)}/app#/conta`,
      locale: "pt-BR",
      ...(process.env.STRIPE_PORTAL_CONFIGURATION ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION } : {}),
    });
    return json(200, { url: session.url });
  } catch (error) {
    console.error("portal", error);
    return fail(502, "erro", "Não consegui abrir o portal agora.");
  }
}
