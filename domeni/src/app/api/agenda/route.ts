/**
 * Busca a agenda do Google pelo "endereço secreto no formato iCal" que a
 * pessoa colou nos Ajustes. O navegador não pode buscar direto (bloqueio de
 * origem), então o servidor busca e devolve o texto, sem guardar nada.
 */

const MAX_BYTES = 3_000_000;

function allowed(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "calendar.google.com") return null;
    if (!url.pathname.startsWith("/calendar/ical/") || !url.pathname.endsWith(".ics")) return null;
    return url;
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return Response.json({ message: "Pedido inválido." }, { status: 400 });
  }
  const url = allowed(body.url ?? "");
  if (!url) {
    return Response.json(
      { message: "Use o “endereço secreto no formato iCal” do Google Agenda (termina em .ics)." },
      { status: 400 },
    );
  }
  try {
    const response = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      return Response.json({ message: "O Google não liberou essa agenda. Confira o endereço." }, { status: 502 });
    }
    const text = await response.text();
    if (text.length > MAX_BYTES || !text.includes("BEGIN:VCALENDAR")) {
      return Response.json({ message: "O endereço não devolveu uma agenda válida." }, { status: 502 });
    }
    return new Response(text, { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "no-store" } });
  } catch {
    return Response.json({ message: "Não consegui falar com o Google Agenda agora." }, { status: 502 });
  }
}
