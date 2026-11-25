/** Formato que o servidor devolve em GET /api/conta. */

export type PlanName = "gratis" | "plus";
export type EntitlementSource = "stripe" | "stripe_pix" | "app_store" | "play_store" | "cortesia";
export type EntitlementStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";

export interface EntitlementInfo {
  source: EntitlementSource;
  status: EntitlementStatus;
  interval: "mensal" | "anual" | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface AccountInfo {
  email: string;
  plan: PlanName;
  /** Conta da dona do app: IA sem limite e escolha de modelo. */
  owner: boolean;
  entitlement: EntitlementInfo | null;
  usage: { acao: number; pesquisa: number };
  /** -1 = sem limite */
  limits: { acao: number; pesquisa: number };
  billing: { stripe: boolean; pix: boolean };
}
