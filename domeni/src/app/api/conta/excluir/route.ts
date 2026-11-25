import { stripe } from "@/server/stripe";
import { fail, json, supabaseAdmin, userFromRequest } from "@/server/supabase";

/**
 * Exclui a conta e tudo o que está na nuvem (LGPD, e exigido pela App Store).
 * Cancela a assinatura do site na hora. Recibos ficam no Stripe pelo prazo
 * que a lei fiscal exige. Os dados guardados no aparelho continuam lá.
 */
export async function POST(request: Request): Promise<Response> {
  const sb = supabaseAdmin();
  if (!sb) return fail(503, "sem-nuvem", "As contas ainda não foram configuradas.");
  const user = await userFromRequest(request);
  if (!user) return fail(401, "sem-sessao", "Entre na sua conta de novo.");
  let body: { confirm?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // sem corpo
  }
  if (body.confirm !== "EXCLUIR") return fail(400, "confirmar", "Confirme a exclusão.");

  try {
    const s = stripe();
    const { data: profile } = await sb.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
    if (s && profile?.stripe_customer_id) {
      const subs = await s.subscriptions.list({ customer: profile.stripe_customer_id as string, status: "all", limit: 20 });
      for (const sub of subs.data) {
        if (!["canceled", "incomplete_expired"].includes(sub.status)) await s.subscriptions.cancel(sub.id);
      }
    }

    const bucket = sb.storage.from("arquivos");
    for (const folder of ["images", "files"]) {
      for (;;) {
        const { data: list } = await bucket.list(`${user.id}/${folder}`, { limit: 100 });
        if (!list || list.length === 0) break;
        await bucket.remove(list.map((f) => `${user.id}/${folder}/${f.name}`));
        if (list.length < 100) break;
      }
    }

    const { error } = await sb.auth.admin.deleteUser(user.id);
    if (error) throw new Error(error.message);
    return json(200, { ok: true });
  } catch (error) {
    console.error("excluir conta", error);
    return fail(500, "erro", "Não consegui excluir agora. Tente de novo ou escreva para o suporte.");
  }
}
