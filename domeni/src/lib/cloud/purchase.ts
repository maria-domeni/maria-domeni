"use client";

import { isLaunchWindow } from "@/lib/pricing";
import { refreshAccount, startCheckout } from "./account";

/** Comprar o Plus: no site vai para o Stripe; no app das lojas, compra pela loja. */

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export async function buyPlus(interval: "mensal" | "anual", method: "cartao" | "pix" = "cartao"): Promise<"redirect" | "comprado" | "cancelado"> {
  if (isNativeApp()) {
    const { purchaseInStore } = await import("./native");
    const result = await purchaseInStore(interval);
    if (result === "comprado") {
      // o aviso da loja chega ao servidor em segundos
      for (let i = 0; i < 10; i++) {
        const info = await refreshAccount();
        if (info?.plan === "plus") break;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    return result;
  }
  const url = await startCheckout(interval, method, interval === "anual" && method === "cartao" && isLaunchWindow() ? "fundadora" : undefined);
  window.location.assign(url);
  return "redirect";
}

export async function restorePurchases(): Promise<void> {
  if (!isNativeApp()) return;
  const { restoreInStore } = await import("./native");
  await restoreInStore();
  await refreshAccount();
}
