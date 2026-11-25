import NextLink from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import {
  BookOpenText,
  CalendarDays,
  ChartColumnBig,
  Check,
  CloudOff,
  HeartHandshake,
  Layers,
  Lock,
  NotebookPen,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { InstalledRedirect } from "@/components/site/InstalledRedirect";
import { Waitlist } from "@/components/site/Waitlist";
import { AI_LIMITS, FOUNDER, LAUNCH_WINDOW, PLAN_FEATURES, PRICES, TRIAL_DAYS } from "@/lib/pricing";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `Domeni · ${SITE.tagline}` },
  description: SITE.description,
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: NotebookPen,
    title: "Cadernos de verdade",
    text: "Um caderno por disciplina, separado por semestre. Cada aula vira uma folha: digite, escreva com a Apple Pencil, grife e cole imagens.",
  },
  {
    icon: BookOpenText,
    title: "Biblioteca com seus PDFs",
    text: "Textos e livros da disciplina num lugar só, com leitura, marcação de página e busca dentro do que você guardou.",
  },
  {
    icon: CalendarDays,
    title: "Agenda e provas",
    text: "Horário das aulas, trabalhos e provas com contagem regressiva. Dá para trazer o Google Agenda junto.",
  },
  {
    icon: ChartColumnBig,
    title: "Notas e faltas",
    text: "Você coloca as regras da sua faculdade (média, pesos, limite de faltas) e o Domeni avisa antes de virar problema.",
  },
  {
    icon: Layers,
    title: "Revisões e flashcards",
    text: "Revisões espaçadas das aulas e flashcards para estudar ativamente, sem depender de outro app.",
  },
  {
    icon: HeartHandshake,
    title: "Estágio e horas",
    text: "Diário de campo, relatório e horas complementares organizados. Com aviso para nunca guardar dados de quem foi atendido.",
  },
];

const AI_POINTS = [
  { title: "Só quando você pede", text: "Nada roda sozinho. A IA só trabalha quando você toca num botão." },
  { title: "A partir das suas anotações", text: "Resumos, flashcards e questões saem das suas aulas e dos seus PDFs." },
  { title: "Separa o que é complemento", text: "O que vem de fora das suas fontes aparece marcado para você confirmar com o professor." },
  { title: "Não inventa referência", text: "Na pesquisa a fundo, cada fonte vem com link. Sem citação inventada." },
];

const FAQ = [
  {
    q: "Funciona no iPad com Apple Pencil?",
    a: "Sim. O Domeni foi desenhado primeiro para o iPad: você escreve à mão por cima da folha da aula, grifa e apaga com a caneta. Também funciona no celular e no computador, pelo navegador, e pode ser instalado na tela inicial.",
  },
  {
    q: "Funciona sem internet?",
    a: "Sim. Seus cadernos ficam no seu aparelho e abrem sem internet. A internet só é usada para a IA e, no Plus, para sincronizar entre aparelhos.",
  },
  {
    q: "Preciso pagar para usar?",
    a: `Não. O plano grátis tem cadernos, caneta, biblioteca, agenda, notas, faltas, revisões e ${AI_LIMITS.gratis.acao} ações de IA por mês. O Plus é para quem quer sincronizar aparelhos, ter backup na nuvem e mais IA.`,
  },
  {
    q: "A IA vai fazer meus trabalhos?",
    a: "Não é essa a ideia. Ela organiza, resume, cria perguntas para você treinar e explica o que ficou confuso. O estudo continua sendo seu, e tudo que ela acrescenta de fora das suas anotações vem marcado para conferir.",
  },
  {
    q: "Serve para o meu curso e a minha faculdade?",
    a: "Sim. Nada vem pronto com regra de faculdade: você define média, pesos, limite de faltas e horas complementares do seu curso. Ele nasceu entre estudantes de Psicologia, mas funciona para qualquer graduação.",
  },
  {
    q: "Como cancelo? Tem multa?",
    a: "Sem multa e sem fidelidade. Cancele quando quiser em Conta › Gerenciar assinatura (ou nos ajustes da loja, se assinou pelo app). Você continua com o Plus até o fim do período pago. E pode desistir em até 7 dias depois de pagar, com reembolso total.",
  },
  {
    q: "Tem Pix?",
    a: "Sim, no plano anual: você paga o ano com Pix, sem renovação automática. O mensal é no cartão de crédito.",
  },
  {
    q: "E os meus dados?",
    a: "Seus cadernos são seus. Ficam no aparelho e só vão para a nuvem se você ativar a sincronização do Plus. Não vendemos dados, não usamos suas anotações para treinar IA e você pode exportar tudo ou excluir a conta quando quiser.",
  },
];

function Shot({ src, alt, w, h, className }: { src: string; alt: string; w: number; h: number; className?: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={w}
      height={h}
      sizes="(max-width: 768px) 100vw, 1100px"
      className={`h-auto w-full rounded-[18px] shadow-[0_0_0_1px_var(--edge),0_30px_60px_-30px_rgba(0,0,0,0.35)] ${className ?? ""}`}
    />
  );
}

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Domeni",
    applicationCategory: "EducationalApplication",
    operatingSystem: "iPadOS, iOS, Android, Web",
    description: SITE.description,
    offers: [
      { "@type": "Offer", price: "0", priceCurrency: "BRL", name: "Grátis" },
      { "@type": "Offer", price: (PRICES.mensal.cents / 100).toFixed(2), priceCurrency: "BRL", name: "Plus mensal" },
      { "@type": "Offer", price: (PRICES.anual.cents / 100).toFixed(2), priceCurrency: "BRL", name: "Plus anual" },
    ],
  };

  return (
    <>
      <InstalledRedirect />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ------------------------------------------------------------ topo */}
      <section className="mx-auto max-w-[1120px] px-4 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-fill px-3 py-1 text-[13px] font-medium text-label-2">
          <PenLine size={14} /> Para iPad, celular e computador
        </p>
        <h1 className="mx-auto mt-5 max-w-[820px] text-[40px] leading-[1.08] font-bold tracking-[-0.03em] sm:text-[60px]">
          Sua faculdade inteira num caderno só.
        </h1>
        <p className="mx-auto mt-5 max-w-[640px] text-[18px] leading-[1.55] text-label-2 sm:text-[20px]">
          Aulas com caneta, PDFs, agenda, notas e faltas no mesmo lugar. E uma IA que só trabalha quando você pede,
          a partir das suas anotações.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <NextLink href="/app" className="inline-flex h-12 items-center rounded-[12px] bg-label px-6 text-[16px] font-semibold text-bg">
            Começar grátis
          </NextLink>
          <a href="#precos" className="inline-flex h-12 items-center rounded-[12px] bg-fill px-6 text-[16px] font-semibold">
            Ver o Plus
          </a>
        </div>
        <p className="mt-3 text-[13px] text-label-3">Sem cartão para começar. Seus cadernos ficam no seu aparelho.</p>
        <div className="mx-auto mt-14 max-w-[1040px]">
          <Shot src="/site/hoje.png" alt="Tela Hoje do Domeni no iPad: aulas do dia, provas chegando e tarefas" w={2360} h={1640} />
        </div>
      </section>

      {/* -------------------------------------------------------- recursos */}
      <section id="recursos" className="mx-auto mt-28 max-w-[1120px] scroll-mt-20 px-4 sm:px-6">
        <h2 className="max-w-[640px] text-[32px] leading-[1.15] font-bold tracking-[-0.02em] sm:text-[40px]">
          Do primeiro dia de aula até a prova final.
        </h2>
        <p className="mt-3 max-w-[600px] text-[17px] text-label-2">
          Tudo o que costuma ficar espalhado entre caderno, pasta de PDFs, agenda e planilha de notas.
        </p>
        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <span className="flex size-10 items-center justify-center rounded-[12px] bg-fill">
                <Icon size={20} strokeWidth={1.9} />
              </span>
              <h3 className="mt-3 text-[17px] font-semibold">{title}</h3>
              <p className="mt-1.5 text-[15px] leading-[1.55] text-label-2">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 grid items-start gap-6 md:grid-cols-[1.6fr_1fr]">
          <Shot src="/site/aula.png" alt="Folha de aula com texto digitado, escrita à mão e marca-texto" w={2360} h={1640} />
          <Shot src="/site/celular.png" alt="Domeni no celular" w={1170} h={2532} className="mx-auto max-w-[300px]" />
        </div>
      </section>

      {/* -------------------------------------------------------------- IA */}
      <section id="ia" className="mt-28 scroll-mt-20 bg-surface-2 py-20">
        <div className="mx-auto grid max-w-[1120px] items-center gap-12 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 text-[14px] font-semibold text-accent">
              <Sparkles size={16} /> IA sob demanda
            </p>
            <h2 className="mt-3 text-[32px] leading-[1.15] font-bold tracking-[-0.02em] sm:text-[40px]">
              Uma IA que estuda com você, não por você.
            </h2>
            <p className="mt-3 text-[17px] text-label-2">
              Resumo da aula, flashcards, questões no estilo de prova, explicação do que ficou confuso e pesquisa a
              fundo com fontes.
            </p>
            <ul className="mt-8 space-y-5">
              {AI_POINTS.map((p) => (
                <li key={p.title} className="flex gap-3">
                  <Check size={20} strokeWidth={2.4} className="mt-0.5 flex-none text-accent" />
                  <span>
                    <span className="block font-semibold">{p.title}</span>
                    <span className="block text-[15px] text-label-2">{p.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <Shot src="/site/ia.png" alt="Resumo gerado pela IA a partir das anotações da aula" w={2360} h={1640} />
        </div>
      </section>

      {/* -------------------------------------------------------- privacidade */}
      <section className="mx-auto mt-28 max-w-[1120px] px-4 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { icon: CloudOff, title: "Funciona sem internet", text: "Seus cadernos ficam no aparelho e abrem em qualquer lugar." },
            { icon: Lock, title: "Seus dados são seus", text: "Nada de anúncio nem venda de dados. Exporte tudo ou exclua a conta quando quiser." },
            { icon: ShieldCheck, title: "Cuidado no estágio", text: "O app lembra de nunca guardar nome ou dado que identifique a pessoa atendida." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-[16px] bg-fill px-6 py-6">
              <Icon size={22} strokeWidth={1.9} />
              <h3 className="mt-3 text-[17px] font-semibold">{title}</h3>
              <p className="mt-1.5 text-[15px] text-label-2">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ preços */}
      <section id="precos" className="mx-auto mt-28 max-w-[1120px] scroll-mt-20 px-4 sm:px-6">
        <h2 className="text-center text-[32px] leading-[1.15] font-bold tracking-[-0.02em] sm:text-[40px]">Simples e justo.</h2>
        <p className="mx-auto mt-3 max-w-[560px] text-center text-[17px] text-label-2">
          O grátis é completo para estudar. O Plus junta seus aparelhos e libera mais IA.
        </p>
        <div className="mx-auto mt-10 grid max-w-[880px] gap-5 md:grid-cols-2">
          <div className="rounded-[20px] px-7 py-7 shadow-[0_0_0_1px_var(--edge)]">
            <h3 className="text-[18px] font-semibold">Grátis</h3>
            <p className="mt-2 text-[40px] font-bold tracking-[-0.02em]">R$ 0</p>
            <p className="text-[14px] text-label-2">para sempre</p>
            <ul className="mt-6 space-y-2.5">
              {PLAN_FEATURES.gratis.map((f) => (
                <li key={f} className="flex gap-2.5 text-[15px]">
                  <Check size={18} strokeWidth={2.4} className="mt-0.5 flex-none text-label-3" /> {f}
                </li>
              ))}
            </ul>
            <NextLink href="/app" className="mt-8 flex h-12 items-center justify-center rounded-[12px] bg-fill text-[16px] font-semibold">
              Começar grátis
            </NextLink>
          </div>
          <div className="relative rounded-[20px] px-7 py-7 shadow-[0_0_0_2px_var(--accent)]">
            <span className="absolute -top-3 left-7 rounded-[8px] bg-accent-solid px-2 py-1 text-[12px] font-semibold text-on-accent">
              {TRIAL_DAYS} dias grátis no cartão
            </span>
            <h3 className="text-[18px] font-semibold">Plus</h3>
            <p className="mt-2 text-[40px] font-bold tracking-[-0.02em]">
              {PRICES.mensal.label}
              <span className="text-[16px] font-medium text-label-2"> /mês</span>
            </p>
            <p className="text-[14px] text-label-2">
              ou {PRICES.anual.label} por ano ({PRICES.anual.monthly} por mês), no cartão ou Pix
            </p>
            <ul className="mt-6 space-y-2.5">
              {PLAN_FEATURES.plus.map((f) => (
                <li key={f} className="flex gap-2.5 text-[15px]">
                  <Check size={18} strokeWidth={2.4} className="mt-0.5 flex-none text-accent" /> {f}
                </li>
              ))}
            </ul>
            <a
              href="/app#/conta"
              className="mt-8 flex h-12 items-center justify-center rounded-[12px] bg-label text-[16px] font-semibold text-bg"
            >
              Assinar o Plus
            </a>
            <p className="mt-3 text-center text-[12.5px] text-label-3">
              Cancele quando quiser. 7 dias para desistir com reembolso total.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- lista */}
      <section id="lista" className="mx-auto mt-28 max-w-[880px] scroll-mt-20 px-4 sm:px-6">
        <div className="rounded-[24px] px-6 py-10 shadow-[0_0_0_1px_var(--edge)] sm:px-10">
          <p className="inline-flex items-center gap-2 text-[14px] font-semibold text-accent">
            <Search size={16} /> Lançamento oficial: {LAUNCH_WINDOW.label}
          </p>
          <h2 className="mt-3 text-[28px] leading-[1.2] font-bold tracking-[-0.02em] sm:text-[34px]">
            Entre na lista e ganhe o planner do semestre.
          </h2>
          <p className="mt-3 text-[16px] leading-[1.55] text-label-2">
            Em janeiro você recebe um planner gratuito para organizar o semestre. Na semana de lançamento, o plano anual
            sai por preço de fundadora: {FOUNDER.label} por ano enquanto você mantiver a assinatura, só naqueles 7 dias.
            Quem está na lista fica sabendo primeiro, e suas respostas ajudam a decidir o que vem primeiro no app.
          </p>
          <div className="mt-8">
            <Waitlist />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ dúvidas */}
      <section id="perguntas" className="mx-auto mt-28 max-w-[760px] scroll-mt-20 px-4 sm:px-6">
        <h2 className="text-[32px] leading-[1.15] font-bold tracking-[-0.02em]">Perguntas frequentes</h2>
        <div className="mt-8 divide-y divide-sep border-y border-sep">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold">
                {item.q}
                <span className="text-[22px] font-normal text-label-3 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[15.5px] leading-[1.6] text-label-2">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
