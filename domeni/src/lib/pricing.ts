/**
 * Planos e preços do Domeni. Fonte única para o site, o app e o script que
 * cria os preços no Stripe. Mudou aqui, rode `npm run stripe:setup` de novo.
 */

export const TRIAL_DAYS = 7;

export const PRICES = {
  mensal: { cents: 1990, label: "R$ 19,90", per: "por mês" },
  anual: { cents: 17990, label: "R$ 179,90", per: "por ano", monthly: "R$ 14,99" },
} as const;

export type BillingInterval = keyof typeof PRICES;

/**
 * Preço de fundadora: plano anual por R$ 129,90 enquanto a assinatura durar.
 * Só pode ser contratado na semana de lançamento (prazo conferido no servidor).
 */
export const FOUNDER = { cents: 12990, label: "R$ 129,90", monthly: "R$ 10,83" } as const;
export const LAUNCH_WINDOW = { start: "2027-02-01T03:00:00Z", end: "2027-02-08T03:00:00Z", label: "1º a 7 de fevereiro de 2027" } as const;

export function isLaunchWindow(now = Date.now()): boolean {
  return now >= Date.parse(LAUNCH_WINDOW.start) && now < Date.parse(LAUNCH_WINDOW.end);
}

/** Cotas de IA por mês (ações comuns e pesquisas na internet). */
export const AI_LIMITS = {
  gratis: { acao: 5, pesquisa: 0 },
  plus: { acao: 150, pesquisa: 15 },
} as const;

/** Espaço para arquivos sincronizados (PDFs, imagens, áudios) no Plus. */
export const PLUS_STORAGE_GB = 3;

export const PLAN_FEATURES = {
  gratis: [
    "Cadernos, aulas, caneta e marca-texto",
    "Agenda, notas, faltas e horas complementares",
    "Biblioteca com PDFs e leitura",
    "Flashcards e revisões",
    `${AI_LIMITS.gratis.acao} ações de IA por mês`,
    "Tudo guardado no seu aparelho",
  ],
  plus: [
    "Tudo do grátis",
    "Sincronização entre iPad, celular e computador",
    `Backup na nuvem (até ${PLUS_STORAGE_GB} GB de arquivos)`,
    `${AI_LIMITS.plus.acao} ações de IA por mês`,
    `${AI_LIMITS.plus.pesquisa} pesquisas a fundo com fontes`,
    "Relatório de estágio com IA",
  ],
} as const;

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
