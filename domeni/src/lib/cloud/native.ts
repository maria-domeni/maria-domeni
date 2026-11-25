"use client";

import { getAccount } from "./account";

/**
 * Compras dentro do app (App Store e Google Play) pelo RevenueCat. Só roda no
 * app das lojas. As chaves públicas do RevenueCat vêm do build:
 * NEXT_PUBLIC_REVENUECAT_IOS_KEY e NEXT_PUBLIC_REVENUECAT_ANDROID_KEY.
 * Os produtos precisam ter "mensal" ou "anual" no identificador.
 */

type Purchases = typeof import("@revenuecat/purchases-capacitor").Purchases;

let configured: Promise<Purchases> | null = null;

async function purchases(): Promise<Purchases> {
  configured ??= (async () => {
    const [{ Purchases }, { Capacitor }] = await Promise.all([
      import("@revenuecat/purchases-capacitor"),
      import("@capacitor/core"),
    ]);
    const apiKey =
      Capacitor.getPlatform() === "ios"
        ? (process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? "")
        : (process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ?? "");
    if (!apiKey) throw new Error("As compras pela loja ainda não foram configuradas.");
    const account = getAccount();
    await Purchases.configure({ apiKey, appUserID: account.status === "signed-in" ? account.user.id : undefined });
    return Purchases;
  })();
  const p = await configured;
  const account = getAccount();
  if (account.status === "signed-in") {
    const { customerInfo } = await p.getCustomerInfo();
    if (customerInfo.originalAppUserId !== account.user.id) await p.logIn({ appUserID: account.user.id });
  }
  return p;
}

export async function purchaseInStore(interval: "mensal" | "anual"): Promise<"comprado" | "cancelado"> {
  if (getAccount().status !== "signed-in") throw new Error("Entre na sua conta antes de assinar.");
  const p = await purchases();
  const offerings = await p.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  const wanted = packages.find((pkg) =>
    interval === "anual"
      ? pkg.packageType === "ANNUAL" || /anual|annual|year/i.test(pkg.product.identifier)
      : pkg.packageType === "MONTHLY" || /mensal|month/i.test(pkg.product.identifier),
  );
  if (!wanted) throw new Error("Plano não encontrado na loja. Tente mais tarde.");
  try {
    await p.purchasePackage({ aPackage: wanted });
    return "comprado";
  } catch (error) {
    if ((error as { userCancelled?: boolean })?.userCancelled) return "cancelado";
    throw new Error("A compra não foi concluída. Nada foi cobrado.");
  }
}

export async function restoreInStore(): Promise<void> {
  const p = await purchases();
  await p.restorePurchases();
}
