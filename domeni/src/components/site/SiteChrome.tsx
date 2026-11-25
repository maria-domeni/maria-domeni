import NextLink from "next/link";
import { Logo } from "@/components/shell/Logo";
import { SITE, companyLine } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="material sticky top-0 z-30 border-b border-sep">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-3 px-4 sm:px-6">
        <NextLink href="/" className="flex items-center gap-2" aria-label="Domeni, início">
          <Logo size={26} />
          <span className="text-[16px] font-semibold tracking-[-0.01em]">Domeni</span>
        </NextLink>
        <nav className="ml-6 hidden items-center gap-5 text-[14.5px] text-label-2 md:flex" aria-label="Seções">
          <NextLink href="/#recursos" className="hover:text-label">Recursos</NextLink>
          <NextLink href="/#ia" className="hover:text-label">IA</NextLink>
          <NextLink href="/#precos" className="hover:text-label">Preços</NextLink>
          <NextLink href="/#perguntas" className="hover:text-label">Perguntas</NextLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <NextLink href="/app#/conta" className="hidden h-9 items-center rounded-[10px] px-3 text-[14.5px] font-medium text-label-2 hover:text-label sm:inline-flex">
            Entrar
          </NextLink>
          <NextLink href="/app" className="inline-flex h-9 items-center rounded-[10px] bg-label px-3.5 text-[14.5px] font-semibold text-bg">
            Abrir o app
          </NextLink>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const company = companyLine();
  return (
    <footer className="mt-24 border-t border-sep">
      <div className="mx-auto grid max-w-[1120px] gap-8 px-4 py-10 text-[14px] sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <span className="font-semibold">Domeni</span>
          </div>
          <p className="mt-2 max-w-[340px] text-label-2">{SITE.tagline} Feito por uma estudante, para estudantes.</p>
        </div>
        <div className="space-y-2">
          <p className="font-semibold">Produto</p>
          <NextLink className="block text-label-2 hover:text-label" href="/app">Abrir o app</NextLink>
          <NextLink className="block text-label-2 hover:text-label" href="/#precos">Preços</NextLink>
          <NextLink className="block text-label-2 hover:text-label" href="/#lista">Lista de lançamento</NextLink>
        </div>
        <div className="space-y-2">
          <p className="font-semibold">Transparência</p>
          <NextLink className="block text-label-2 hover:text-label" href="/termos">Termos de uso</NextLink>
          <NextLink className="block text-label-2 hover:text-label" href="/privacidade">Privacidade</NextLink>
          <NextLink className="block text-label-2 hover:text-label" href="/cancelamento">Cancelamento e reembolso</NextLink>
          {SITE.supportEmail ? (
            <a className="block text-label-2 hover:text-label" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
          ) : null}
        </div>
      </div>
      <div className="border-t border-sep">
        <p className="mx-auto max-w-[1120px] px-4 py-5 text-[12.5px] text-label-3 sm:px-6">
          © 2026 Domeni{company ? ` · ${company}` : ""}
        </p>
      </div>
    </footer>
  );
}
