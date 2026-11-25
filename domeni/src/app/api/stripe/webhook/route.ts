import type Stripe from "stripe";
import { grantPixYear, revokePix, stripe, syncSubscription } from "@/server/stripe";
import { supabaseAdmin } from "@/server/supabase";

/**
 * Avisos do Stripe (assinatura criada, renovada, cancelada, Pix pago,
 * reembolso). A assinatura de cada aviso é conferida com STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: Request): Promise<Response> {
  const s = stripe();
  const sb = supabaseAdmin();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !sb || !secret) return new Response("não configurado", { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("sem assinatura", { status: 400 });
  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return new Response("assinatura inválida", { status: 400 });
  }

  const { data: seen } = await sb.from("billing_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return new Response("ok (repetido)", { status: 200 });

  try {
    await handle(s, sb, event);
  } catch (error) {
    console.error("stripe webhook", event.type, error);
    // 500 faz o Stripe tentar de novo mais tarde
    return new Response("erro ao processar", { status: 500 });
  }
  await sb.from("billing_events").insert({ id: event.id, provider: "stripe", type: event.type });
  return new Response("ok", { status: 200 });
}

async function handle(s: Stripe, sb: NonNullable<ReturnType<typeof supabaseAdmin>>, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await syncSubscription(sb, await s.subscriptions.retrieve(id));
      } else if (session.mode === "payment" && session.payment_status === "paid" && session.metadata?.kind === "anual_pix") {
        const userId = session.metadata.user_id ?? session.client_reference_id;
        if (!userId) throw new Error("Pix sem conta ligada");
        const pi = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
        await grantPixYear(sb, userId, pi);
      }
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      // busca de novo para não aplicar um aviso velho fora de ordem
      await syncSubscription(sb, await s.subscriptions.retrieve(event.data.object.id));
      return;
    case "charge.refunded": {
      const charge = event.data.object;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi && charge.refunded) await revokePix(sb, pi);
      return;
    }
    default:
      return;
  }
}
