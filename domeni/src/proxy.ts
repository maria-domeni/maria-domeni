import { NextResponse, type NextRequest } from "next/server";

/**
 * Libera as rotas /api para o app das lojas (Capacitor), que roda em outra
 * origem. A proteção de verdade é a sessão (token) em cada pedido.
 */

const NATIVE_ORIGINS = ["capacitor://localhost", "https://localhost", "http://localhost"];
const extra = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const allowed = new Set([...NATIVE_ORIGINS, ...extra]);

const CORS = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Domeni-Code",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const ok = allowed.has(origin);
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: { ...(ok ? { "Access-Control-Allow-Origin": origin } : {}), ...CORS } });
  }
  const response = NextResponse.next();
  if (ok) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    for (const [k, v] of Object.entries(CORS)) response.headers.set(k, v);
  }
  return response;
}

export const config = {
  matcher: ["/api/ia", "/api/conta/:path*", "/api/agenda"],
};
