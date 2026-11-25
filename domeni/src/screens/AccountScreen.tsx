"use client";

import { Cloud, CloudOff, KeyRound, LogOut, Mail, RefreshCw, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Page } from "@/components/shell/Page";
import { Button, Card, Section, cx } from "@/components/ui/basics";
import { Field, TextInput } from "@/components/ui/fields";
import { useConfirm, useToast } from "@/components/ui/overlays";
import {
  deleteAccount,
  openBillingPortal,
  refreshAccount,
  sendEmailCode,
  setPassword,
  signInWithPassword,
  signOut,
  useAccount,
  verifyEmailCode,
} from "@/lib/cloud/account";
import type { AccountInfo } from "@/lib/cloud/accountTypes";
import { apiUrl } from "@/lib/cloud/config";
import { openPlus } from "@/lib/cloud/paywall";
import { isNativeApp, restorePurchases } from "@/lib/cloud/purchase";
import { adoptDeviceForCurrentAccount, syncNow, useSyncStatus } from "@/lib/cloud/sync";
import { AI_LIMITS, PLUS_STORAGE_GB } from "@/lib/pricing";

const dateBR = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "";

function timeAgo(ms: number | null): string {
  if (!ms) return "ainda não sincronizou";
  const min = Math.round((Date.now() - ms) / 60_000);
  if (min < 1) return "sincronizado agora";
  if (min < 60) return `sincronizado há ${min} min`;
  return `sincronizado às ${new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function AccountScreen({ section }: { section: string | null }) {
  const account = useAccount();
  return (
    <Page title="Conta" back={{ to: "#/ajustes", label: "Ajustes" }}>
      {account.status === "off" ? (
        <Card className="mt-6 px-5 py-4 text-[15px] leading-[22px] text-label-2">
          <CloudOff size={20} className="mb-2 text-label-3" />
          As contas ainda não foram ligadas neste servidor. Tudo continua salvo neste aparelho e funcionando
          normalmente.
        </Card>
      ) : account.status === "loading" ? (
        <Card className="mt-6 h-40 animate-pulse" >
          <span className="sr-only">Carregando</span>
        </Card>
      ) : account.status === "signed-out" ? (
        <SignIn />
      ) : (
        <SignedIn email={account.user.email} info={account.info} error={account.infoError} success={section === "sucesso"} />
      )}
      <LegalLinks />
    </Page>
  );
}

/* ---------------------------------------------------------------- entrar */

function SignIn() {
  const toast = useToast();
  const [mode, setMode] = useState<"codigo" | "senha">("codigo");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPasswordValue] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "senha") await signInWithPassword(email, password);
      else if (!sent) {
        await sendEmailCode(email);
        setSent(true);
        toast("Enviamos um código para o seu e-mail.");
      } else await verifyEmailCode(email, code);
    } catch (error) {
      toast((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="mt-6 px-5 py-5">
        <h2 className="text-[19px] font-semibold">Entre ou crie sua conta</h2>
        <p className="mt-1 text-[14.5px] leading-[21px] text-label-2">
          É grátis. Com a conta você usa a IA ({AI_LIMITS.gratis.acao} ações por mês no grátis) e, no Plus, sincroniza
          entre iPad, celular e computador.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label="E-mail">
            <TextInput
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              disabled={sent && mode === "codigo"}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </Field>
          {mode === "codigo" && sent ? (
            <Field label="Código que chegou no seu e-mail" hint="Confira também a caixa de spam. O código vale por 1 hora.">
              <TextInput
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="tracking-[0.3em] tabular-nums"
              />
            </Field>
          ) : null}
          {mode === "senha" ? (
            <Field label="Senha">
              <TextInput
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
              />
            </Field>
          ) : null}
          <Button type="submit" block size="lg" disabled={busy} icon={mode === "codigo" ? Mail : KeyRound}>
            {busy ? "Um instante…" : mode === "senha" ? "Entrar" : sent ? "Entrar" : "Receber código por e-mail"}
          </Button>
        </form>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[14px]">
          {mode === "codigo" && sent ? (
            <button type="button" className="text-accent" onClick={() => { setSent(false); setCode(""); }}>
              Trocar e-mail ou reenviar
            </button>
          ) : null}
          <button type="button" className="text-accent" onClick={() => { setMode(mode === "codigo" ? "senha" : "codigo"); setSent(false); }}>
            {mode === "codigo" ? "Entrar com senha" : "Entrar com código por e-mail"}
          </button>
        </div>
      </Card>
      <p className="mt-4 flex gap-2 px-1 text-[13px] leading-[19px] text-label-2">
        <ShieldCheck size={16} className="mt-0.5 flex-none" />
        Seus cadernos continuam neste aparelho. Eles só vão para a nuvem se você ativar a sincronização do Plus.
      </p>
    </>
  );
}

/* -------------------------------------------------------------- logada */

function planLine(info: AccountInfo): string {
  const e = info.entitlement;
  if (info.owner) return "Conta da fundadora: tudo liberado.";
  if (!e || info.plan === "gratis") {
    if (e?.status === "canceled" || e?.status === "expired") return `Seu Plus terminou em ${dateBR(e.periodEnd)}.`;
    return "Plano grátis.";
  }
  const store = e.source === "app_store" ? " pela App Store" : e.source === "play_store" ? " pelo Google Play" : "";
  if (e.source === "stripe_pix") return `Plus anual pago com Pix, válido até ${dateBR(e.periodEnd)}.`;
  if (e.source === "cortesia") return e.periodEnd ? `Plus de cortesia até ${dateBR(e.periodEnd)}.` : "Plus de cortesia.";
  if (e.status === "trialing") return `Teste grátis${store} até ${dateBR(e.periodEnd)}.${e.cancelAtPeriodEnd ? " Não vai renovar." : ""}`;
  if (e.status === "past_due") return `Não conseguimos cobrar a última fatura${store}. Atualize o pagamento para não perder o Plus.`;
  if (e.cancelAtPeriodEnd) return `Plus ${e.interval ?? ""}${store} cancelado: vale até ${dateBR(e.periodEnd)}.`;
  return `Plus ${e.interval ?? ""}${store}. Renova em ${dateBR(e.periodEnd)}.`;
}

function Usage({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit < 0;
  const ratio = unlimited || limit === 0 ? 0 : Math.min(1, used / limit);
  return (
    <div>
      <div className="flex items-baseline justify-between text-[14.5px]">
        <span>{label}</span>
        <span className="tabular-nums text-label-2">
          {unlimited ? `${used} (sem limite)` : limit === 0 ? "só no Plus" : `${used} de ${limit}`}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fill-2">
        <div className={cx("h-full rounded-full", ratio >= 1 ? "bg-danger" : "bg-accent-solid")} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

function SignedIn({ email, info, error, success }: { email: string; info: AccountInfo | null; error: string | null; success: boolean }) {
  const toast = useToast();
  const confirm = useConfirm();
  const sync = useSyncStatus();
  const [busy, setBusy] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const native = isNativeApp();

  // voltou do pagamento: espera o aviso do Stripe liberar o Plus
  useEffect(() => {
    if (!success) return;
    let stop = false;
    void (async () => {
      for (let i = 0; i < 15 && !stop; i++) {
        const fresh = await refreshAccount();
        if (fresh?.plan === "plus") {
          toast("Pagamento confirmado. Bem-vinda ao Plus!");
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    })();
    return () => {
      stop = true;
    };
  }, [success, toast]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message || "Não deu certo. Tente de novo.");
    } finally {
      setBusy(null);
    }
  }

  const plus = info?.plan === "plus";
  const e = info?.entitlement;

  return (
    <>
      <Card className="mt-6 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 flex-none items-center justify-center rounded-full bg-fill text-[16px] font-semibold uppercase">
            {email.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold">{email}</p>
            <p className="text-[13.5px] text-label-2">{info ? planLine(info) : error ?? "Carregando seu plano…"}</p>
          </div>
          <span
            className={cx(
              "flex-none rounded-[8px] px-2 py-1 text-[12.5px] font-semibold",
              plus ? "bg-accent-soft text-accent" : "bg-fill text-label-2",
            )}
          >
            {plus ? "Plus" : "Grátis"}
          </span>
        </div>
        {success && !plus ? (
          <p className="mt-3 rounded-[10px] bg-fill px-3 py-2 text-[14px]">Recebemos seu pagamento. Liberando o Plus…</p>
        ) : null}
        {info && !info.owner ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {!plus ? (
              <Button icon={Sparkles} onClick={() => openPlus()}>
                Conhecer o Plus
              </Button>
            ) : null}
            {e && (e.source === "stripe" || e.source === "stripe_pix") && !native ? (
              <Button variant="gray" disabled={busy === "portal"} onClick={() => void run("portal", async () => window.location.assign(await openBillingPortal()))}>
                {busy === "portal" ? "Abrindo…" : "Gerenciar assinatura"}
              </Button>
            ) : null}
            {e?.source === "stripe_pix" && !native ? (
              <Button variant="gray" onClick={() => openPlus("Renove o ano com Pix ou passe para o cartão com renovação automática.")}>
                Renovar
              </Button>
            ) : null}
            {native ? (
              <Button variant="gray" disabled={busy === "restaurar"} onClick={() => void run("restaurar", restorePurchases)}>
                Restaurar compras
              </Button>
            ) : null}
          </div>
        ) : null}
        {e && (e.source === "app_store" || e.source === "play_store") ? (
          <p className="mt-3 text-[13px] text-label-2">
            Para cancelar ou trocar de plano, use {e.source === "app_store" ? "Ajustes › seu nome › Assinaturas no iPhone/iPad" : "Google Play › Pagamentos e assinaturas"}.
          </p>
        ) : null}
      </Card>

      {info ? (
        <Section title="IA neste mês">
          <Card className="space-y-4 px-5 py-4">
            <Usage label="Ações (resumos, flashcards, questões…)" used={info.usage.acao} limit={info.limits.acao} />
            <Usage label="Pesquisas a fundo com fontes" used={info.usage.pesquisa} limit={info.limits.pesquisa} />
            <p className="text-[12.5px] text-label-3">A cota renova no dia 1º. A IA só roda quando você toca num botão.</p>
          </Card>
        </Section>
      ) : null}

      <Section title="Sincronização">
        <Card className="px-5 py-4">
          {sync.state === "conflito" ? (
            <>
              <p className="text-[15px] leading-[22px]">
                Este aparelho tem cadernos de <strong>outra conta</strong>. Para não misturar, a sincronização está parada.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="danger"
                  disabled={busy === "adotar"}
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Apagar os dados deste aparelho?",
                      message: "Os cadernos da outra conta saem deste aparelho (eles continuam na nuvem da outra conta, se ela tiver Plus). Depois baixamos os desta conta.",
                      confirmLabel: "Apagar e usar esta conta",
                      destructive: true,
                    });
                    if (ok) await run("adotar", adoptDeviceForCurrentAccount);
                  }}
                >
                  Usar esta conta aqui
                </Button>
                <Button variant="gray" onClick={() => void run("sair", signOut)}>
                  Sair
                </Button>
              </div>
            </>
          ) : sync.state === "off" ? (
            <div className="flex items-start gap-3">
              <CloudOff size={20} className="mt-0.5 flex-none text-label-3" />
              <p className="text-[14.5px] leading-[21px] text-label-2">
                {sync.reason === "sem-plano"
                  ? `Com o Plus, seus cadernos ficam iguais em todos os aparelhos e com backup na nuvem (até ${PLUS_STORAGE_GB} GB de arquivos).`
                  : "Tudo fica salvo neste aparelho."}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Cloud size={20} className={cx("flex-none", sync.state === "erro" ? "text-danger" : "text-accent")} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">
                  {sync.state === "sincronizando" ? "Sincronizando…" : sync.state === "erro" ? sync.message : timeAgo(sync.lastAt)}
                </p>
                <p className="text-[12.5px] text-label-3">Ao abrir o app, ao voltar para ele e alguns segundos depois de cada mudança.</p>
              </div>
              <Button variant="gray" size="sm" icon={RefreshCw} disabled={sync.state === "sincronizando"} onClick={() => void syncNow()}>
                Agora
              </Button>
            </div>
          )}
        </Card>
      </Section>

      <Section title="Segurança">
        <Card className="px-5 py-4">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(ev) => {
              ev.preventDefault();
              if (newPassword.length < 8) {
                toast("Use pelo menos 8 caracteres.");
                return;
              }
              void run("senha", async () => {
                await setPassword(newPassword);
                setNewPassword("");
                toast("Senha salva. Você pode entrar com ela ou com código por e-mail.");
              });
            }}
          >
            <div className="min-w-[200px] flex-1">
              <Field label="Senha (opcional)" hint="Para entrar sem esperar o código por e-mail.">
                <TextInput type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </Field>
            </div>
            <Button type="submit" variant="gray" disabled={busy === "senha" || !newPassword}>
              Salvar senha
            </Button>
          </form>
        </Card>
      </Section>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button variant="gray" icon={LogOut} disabled={busy === "sair"} onClick={() => void run("sair", signOut)}>
          Sair desta conta
        </Button>
        <Button
          variant="danger"
          icon={Trash2}
          disabled={busy === "excluir"}
          onClick={async () => {
            const ok = await confirm({
              title: "Excluir sua conta?",
              message:
                "Apagamos sua conta, o plano e tudo o que está na nuvem. A assinatura pelo site é cancelada na hora. Assinatura pela App Store ou Google Play precisa ser cancelada na loja. Os cadernos deste aparelho continuam aqui.",
              confirmLabel: "Excluir para sempre",
              destructive: true,
            });
            if (ok) await run("excluir", async () => {
              await deleteAccount();
              toast("Conta excluída.");
            });
          }}
        >
          Excluir conta
        </Button>
      </div>
    </>
  );
}

function LegalLinks() {
  const base = apiUrl("");
  return (
    <p className="mt-10 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-label-3">
      <a href={`${base}/termos`} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
        Termos de uso
      </a>
      <a href={`${base}/privacidade`} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
        Privacidade
      </a>
      <a href={`${base}/cancelamento`} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
        Cancelamento e reembolso
      </a>
    </p>
  );
}
