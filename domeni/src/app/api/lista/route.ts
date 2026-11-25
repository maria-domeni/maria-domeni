import { supabaseAdmin, fail, json } from "@/server/supabase";

/** Lista de espera do site: guarda no Supabase e, se configurado, no Brevo. */

const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 8;
}

const clip = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "erro", "Pedido inválido.");
  }
  if (clip(body.website)) return json(200, { ok: true }); // armadilha para robôs
  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (limited(ip)) return fail(429, "limite", "Muitas tentativas. Tente mais tarde.");

  const email = clip(body.email, 200).toLowerCase();
  if (!EMAIL.test(email)) return fail(400, "email", "Confira o e-mail.");
  if (body.consent !== true) return fail(400, "consentimento", "Marque que aceita receber os e-mails.");
  const row = {
    email,
    name: clip(body.name, 80) || null,
    semestre: clip(body.semestre, 40) || null,
    faculdade: clip(body.faculdade, 120) || null,
    ferramenta: clip(body.ferramenta, 120) || null,
    dificuldade: clip(body.dificuldade, 600) || null,
    quanto_pagaria: clip(body.quanto_pagaria, 40) || null,
    source: clip(body.source, 60) || null,
    consent_at: new Date().toISOString(),
  };

  const sb = supabaseAdmin();
  const brevoKey = process.env.BREVO_API_KEY;
  if (!sb && !brevoKey) return fail(503, "sem-lista", "A lista ainda não foi configurada.");

  let saved = false;
  if (sb) {
    const { error } = await sb.from("waitlist").upsert(row, { onConflict: "email" });
    if (!error) saved = true;
    else console.error("lista", error.message);
  }
  if (brevoKey) {
    try {
      const listId = Number(process.env.BREVO_LIST_ID);
      const response = await fetch("https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: { "api-key": brevoKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          email,
          updateEnabled: true,
          ...(Number.isFinite(listId) && listId > 0 ? { listIds: [listId] } : {}),
          attributes: {
            ...(row.name ? { FIRSTNAME: row.name } : {}),
            ...(row.semestre ? { SEMESTRE: row.semestre } : {}),
            ...(row.faculdade ? { FACULDADE: row.faculdade } : {}),
          },
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok || response.status === 204) saved = true;
      else console.error("brevo", response.status, await response.text().catch(() => ""));
    } catch (error) {
      console.error("brevo", error);
    }
  }
  if (!saved) return fail(502, "erro", "Não consegui salvar agora. Tente de novo em instantes.");
  return json(200, { ok: true });
}
