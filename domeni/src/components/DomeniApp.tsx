"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect } from "react";
import { AvatarDock } from "@/components/avatar/AvatarDock";
import { Reminders } from "@/components/Reminders";
import { PwaManager } from "@/components/PwaManager";
import { Page, ScreenSkeleton } from "@/components/shell/Page";
import { Shell } from "@/components/shell/Shell";
import { EmptyState, Link } from "@/components/ui/basics";
import { OverlayProvider } from "@/components/ui/overlays";
import { useAppearanceSync } from "@/lib/hooks";
import { screenKey, takeScrollTarget, useRoute, type Route } from "@/lib/router";
import AgendaScreen from "@/screens/AgendaScreen";
import CharacterScreen from "@/screens/CharacterScreen";
import DisciplineScreen from "@/screens/DisciplineScreen";
import HoursScreen from "@/screens/HoursScreen";
import InternshipScreen from "@/screens/InternshipScreen";
import NotebooksScreen from "@/screens/NotebooksScreen";
import PerformanceScreen from "@/screens/PerformanceScreen";
import ReviewsScreen from "@/screens/ReviewsScreen";
import SearchScreen from "@/screens/SearchScreen";
import SemesterScreen from "@/screens/SemesterScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import StudyScreen from "@/screens/StudyScreen";
import TodayScreen from "@/screens/TodayScreen";

// Telas pesadas (editor com caneta e leitor de PDF) carregam só quando abertas.
const LessonScreen = dynamic(() => import("@/screens/LessonScreen"), {
  ssr: false,
  loading: () => <ScreenSkeleton />,
});
const LibraryScreen = dynamic(() => import("@/screens/LibraryScreen"), {
  ssr: false,
  loading: () => <ScreenSkeleton />,
});

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case "hoje":
      return <TodayScreen />;
    case "cadernos":
      return <NotebooksScreen />;
    case "semestre":
      return <SemesterScreen id={route.id} />;
    case "disciplina":
      return <DisciplineScreen id={route.id} tab={route.tab} />;
    case "aula":
      return <LessonScreen id={route.id} tab={route.tab} />;
    case "agenda":
      return <AgendaScreen />;
    case "desempenho":
      return <PerformanceScreen />;
    case "biblioteca":
      return <LibraryScreen id={route.id} page={route.page} />;
    case "estudar":
      return <StudyScreen disciplineId={route.id} />;
    case "estagio":
      return <InternshipScreen id={route.id} />;
    case "horas":
      return <HoursScreen />;
    case "revisoes":
      return <ReviewsScreen />;
    case "personagem":
      return <CharacterScreen />;
    case "busca":
      return <SearchScreen initial={route.q} />;
    case "ajustes":
      return <SettingsScreen section={route.section} />;
    default:
      return (
        <Page title="Página não encontrada">
          <div className="mt-6">
            <EmptyState
              emoji="🧭"
              title="Esse endereço não existe"
              action={
                <Link
                  to="#/"
                  className="pressable inline-flex h-11 items-center rounded-full bg-accent-solid px-5 text-[16px] font-bold text-on-accent"
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

export function DomeniApp() {
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
      <AvatarDock />
      <Reminders />
      <PwaManager />
    </OverlayProvider>
  );
}
