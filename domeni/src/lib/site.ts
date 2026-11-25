/**
 * Dados públicos do site. Os dados da empresa são obrigatórios em quem vende
 * pela internet (Decreto 7.962/2013): preencha as variáveis antes de vender.
 */

export const SITE = {
  name: "Domeni",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://domeni.app").replace(/\/+$/, ""),
  tagline: "Sua faculdade inteira num caderno só.",
  description:
    "Cadernos com caneta, PDFs, agenda, notas, faltas e revisões no mesmo lugar. E uma IA que só trabalha quando você pede, usando as suas anotações.",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM ?? "",
  company: {
    name: process.env.NEXT_PUBLIC_COMPANY_NAME ?? "",
    cnpj: process.env.NEXT_PUBLIC_COMPANY_CNPJ ?? "",
    address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? "",
  },
  legalUpdated: "25 de novembro de 2026",
} as const;

export { LAUNCH_WINDOW } from "./pricing";

export function companyLine(): string {
  const c = SITE.company;
  return [c.name, c.cnpj ? `CNPJ ${c.cnpj}` : "", c.address].filter(Boolean).join(" · ");
}
