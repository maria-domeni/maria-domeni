"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect } from "react";
import { PwaManager } from "@/components/PwaManager";
import { Page, ScreenSkeleton } from "@/components/shell/Page";
import { Shell } from "@/components/shell/Shell";
import { EmptyState, Link } from "@/components/ui/basics";
import { OverlayProvider } from "@/components/ui/overlays";
import { useAppearanceSync } from "@/lib/hooks";
import { screenKey, takeScrollTarget, useRoute, type Route } from "@/lib/router";
import DisciplineScreen from "@/screens/DisciplineScreen";
import NotebooksScreen from "@/screens/NotebooksScreen";
import ReviewsScreen from "@/screens/ReviewsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import TodayScreen from "@/screens/TodayScreen";
import { Compass } from "lucide-react";

// A tela da aula carrega o editor de texto, que é a parte mais pesada do app.
const LessonScreen = dynamic(() => import("@/screens/LessonScreen"), {
  ssr: false,
  loading: () => <ScreenSkeleton />,
});

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case "hoje":
      return <TodayScreen />;
    case "cadernos":
      return <NotebooksScreen />;
    case "disciplina":
      return <DisciplineScreen id={route.id} />;
    case "aula":
      return <LessonScreen id={route.id} tab={route.tab} />;
    case "revisoes":
      return <ReviewsScreen />;
    case "ajustes":
      return <SettingsScreen />;
    default:
      return (
        <Page title="Página não encontrada">
          <div className="mt-6">
            <EmptyState
              icon={Compass}
              title="Esse endereço não existe"
              action={
                <Link
                  to="#/"
                  className="pressable inline-flex h-11 items-center rounded-full bg-accent-solid px-5 text-[16px] font-semibold text-white"
                >
                  Ir para Hoje
                </Link>
              }
            />
          </div>
        </Page>
      );
  }
}

/** Reaplica a rolagem ao trocar de tela: topo em telas novas, posição anterior ao voltar. */
function useScrollRestoration(key: string | null) {
  useLayoutEffect(() => {
    if (key === null) return;
    const target = takeScrollTarget();
    if (target === null) return;
    window.scrollTo(0, target);
    if (target === 0) return;
    // O conteúdo vem do banco e pode ainda não ter altura; tenta por alguns quadros.
    let frames = 0;
    let raf = 0;
    const retry = () => {
      if (Math.abs(window.scrollY - target) <= 2 || frames++ > 40) return;
      window.scrollTo(0, target);
      raf = window.requestAnimationFrame(retry);
    };
    raf = window.requestAnimationFrame(retry);
    return () => window.cancelAnimationFrame(raf);
  }, [key]);
}

export function AtlasApp() {
  const route = useRoute();
  const key = route ? screenKey(route) : null;
  useAppearanceSync();
  useScrollRestoration(key);

  useEffect(() => {
    // Pede ao navegador para não limpar os dados do app sob pressão de espaço.
    void navigator.storage?.persist?.().catch(() => undefined);
  }, []);

  return (
    <OverlayProvider>
      <Shell route={route}>{route ? <Screen key={key} route={route} /> : <ScreenSkeleton />}</Shell>
      <PwaManager />
    </OverlayProvider>
  );
}
