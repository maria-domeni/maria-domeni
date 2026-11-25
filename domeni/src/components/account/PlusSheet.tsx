"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Button, cx } from "@/components/ui/basics";
import { Sheet, useToast } from "@/components/ui/overlays";
import { useAccount } from "@/lib/cloud/account";
import { useNowMs } from "@/lib/hooks";
import { closePlus, usePaywall } from "@/lib/cloud/paywall";
import { buyPlus, isNativeApp } from "@/lib/cloud/purchase";
import { navigate } from "@/lib/router";
import { FOUNDER, PLAN_FEATURES, PRICES, TRIAL_DAYS, isLaunchWindow } from "@/lib/pricing";

/** Folha "Domeni Plus": planos, preço e botão de assinar. */
export function PlusSheet() {
  const { open, reason } = usePaywall();
  const account = useAccount();
  const toast = useToast();
  const [interval, setInterval] = useState<"anual" | "mensal">("anual");
  const [busy, setBusy] = useState<"cartao" | "pix" | null>(null);
  const native = isNativeApp();
  const signedIn = account.status === "signed-in";
  const info = signedIn ? account.info : null;
  const pix = !native && !!info?.billing.pix && interval === "anual";
  const firstTime = !info?.entitlement;
  const nowMs = useNowMs();
  const founder = !native && nowMs > 0 && isLaunchWindow(nowMs);

  async function buy(method: "cartao" | "pix") {
    if (!signedIn) {
      closePlus();
      navigate("#/conta");
      return;
    }
    setBusy(method);
    try {
      const result = await buyPlus(interval, method);
      if (result === "comprado") {
        toast("Pronto! O Plus está ativo.");
        closePlus();
      }
    } catch (error) {
      toast((error as Error).message || "Não consegui abrir o pagamento.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open={open} onClose={closePlus} title="Domeni Plus">
      {reason ? <p className="mb-4 rounded-[12px] bg-fill px-4 py-3 text-[14.5px] text-label">{reason}</p> : null}
      <p className="text-[15px] leading-[22px] text-label-2">
        Seus cadernos em todos os aparelhos, backup na nuvem e mais IA para estudar. O grátis continua grátis.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Plano">
        {(["anual", "mensal"] as const).map((key) => {
          const price = PRICES[key];
          const active = interval === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setInterval(key)}
              className={cx(
                "pressable relative rounded-[14px] px-4 py-3.5 text-left",
                active ? "bg-accent-soft ring-2 ring-accent" : "bg-fill",
              )}
            >
              {key === "anual" ? (
                <span className="absolute -top-2.5 right-3 rounded-[6px] bg-accent-solid px-1.5 py-0.5 text-[11px] font-semibold text-on-accent">
                  {founder ? "Fundadora" : "25% off"}
                </span>
              ) : null}
              <span className="block text-[13px] font-medium text-label-2">{key === "anual" ? "Anual" : "Mensal"}</span>
              {key === "anual" && founder ? (
                <>
                  <span className="mt-0.5 block text-[20px] font-semibold tabular-nums">{FOUNDER.label}</span>
                  <span className="block text-[12.5px] text-label-2">
                    <s>{PRICES.anual.label}</s> · preço de fundadora
                  </span>
                </>
              ) : (
                <>
                  <span className="mt-0.5 block text-[20px] font-semibold tabular-nums">{price.label}</span>
                  <span className="block text-[12.5px] text-label-2">
                    {key === "anual" ? `${PRICES.anual.monthly} por mês` : price.per}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <ul className="mt-5 space-y-2">
        {PLAN_FEATURES.plus.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-[15px] leading-[21px]">
            <Check size={17} strokeWidth={2.4} className="mt-0.5 flex-none text-accent" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-2.5">
        <Button block size="lg" onClick={() => void buy("cartao")} disabled={busy !== null}>
          {busy === "cartao"
            ? "Abrindo…"
            : !signedIn
              ? "Criar conta para assinar"
              : firstTime && TRIAL_DAYS > 0 && !native
                ? `Testar ${TRIAL_DAYS} dias grátis`
                : `Assinar ${interval === "anual" ? "anual" : "mensal"}`}
        </Button>
        {pix && signedIn ? (
          <Button block size="lg" variant="gray" onClick={() => void buy("pix")} disabled={busy !== null}>
            {busy === "pix" ? "Abrindo…" : `Pagar o ano com Pix (${PRICES.anual.label})`}
          </Button>
        ) : null}
      </div>
      <p className="mt-4 text-[12.5px] leading-[18px] text-label-3">
        {native
          ? "Cobrança pela loja de apps. Cancele quando quiser nos ajustes de assinaturas do aparelho."
          : firstTime && TRIAL_DAYS > 0
            ? `Cartão: ${TRIAL_DAYS} dias grátis e depois ${interval === "anual" ? PRICES.anual.label + " por ano" : PRICES.mensal.label + " por mês"}. Cancele antes e nada é cobrado. Desistiu depois de pagar? Você tem 7 dias para pedir o dinheiro de volta.`
            : "Cancele quando quiser em Conta › Gerenciar assinatura. Desistiu? Você tem 7 dias para pedir o dinheiro de volta."}
      </p>
    </Sheet>
  );
}
