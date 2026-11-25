import { loadAccount } from "@/server/plans";
import { fail, json, supabaseAdmin, userFromRequest } from "@/server/supabase";

/** Plano, uso da IA no mês e cotas da pessoa logada. */
export async function GET(request: Request): Promise<Response> {
  const sb = supabaseAdmin();
  if (!sb) return fail(503, "sem-nuvem", "As contas ainda não foram configuradas no servidor.");
  const user = await userFromRequest(request);
  if (!user) return fail(401, "sem-sessao", "Entre na sua conta de novo.");
  try {
    return json(200, await loadAccount(sb, user));
  } catch {
    return fail(500, "erro", "Não consegui carregar sua conta agora.");
  }
}
