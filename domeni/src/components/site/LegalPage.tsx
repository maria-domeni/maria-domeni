import type { ReactNode } from "react";
import { SITE } from "@/lib/site";

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-[760px] px-4 pt-14 sm:px-6">
      <p className="text-[13px] text-label-3">Atualizado em {SITE.legalUpdated}</p>
      <h1 className="mt-2 text-[34px] leading-[1.15] font-bold tracking-[-0.02em] sm:text-[42px]">{title}</h1>
      <p className="mt-4 text-[17px] leading-[1.6] text-label-2">{intro}</p>
      <div className="legal mt-10 space-y-8 text-[15.5px] leading-[1.7]">{children}</div>
    </article>
  );
}

export function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="mt-2 space-y-3 text-label-2 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-label">{children}</div>
    </section>
  );
}

export function Controller() {
  const c = SITE.company;
  return (
    <>
      <strong>{c.name || "Domeni"}</strong>
      {c.cnpj ? `, CNPJ ${c.cnpj}` : ""}
      {c.address ? `, com endereço em ${c.address}` : ""}
    </>
  );
}

export function Contact() {
  return SITE.supportEmail ? (
    <a className="text-accent underline-offset-2 hover:underline" href={`mailto:${SITE.supportEmail}`}>
      {SITE.supportEmail}
    </a>
  ) : (
    <>o canal de suporte indicado no app</>
  );
}
