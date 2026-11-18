"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Page } from "@/components/shell/Page";
import { Card, Link } from "@/components/ui/basics";
import { useDebounced } from "@/lib/hooks";
import type { SearchHit } from "@/lib/search";
import { searchEverything } from "@/lib/searchDb";

const KIND_LABEL: Record<SearchHit["kind"], string> = {
  aula: "📓 Anotação",
  livro: "📚 Biblioteca",
  material: "✨ Material",
  cartao: "🃏 Flashcard",
  questao: "❓ Questão",
  relatorio: "🩺 Relatório",
};

/** Busca em tudo: anotações de todos os semestres, livros, materiais e relatórios. */
export default function SearchScreen({ initial }: { initial: string }) {
  const [query, setQuery] = useState(initial);
  const debounced = useDebounced(query, 250);
  const [hits, setHits] = useState<SearchHit[] | null>(null);

  const active = debounced.trim().length >= 2;
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void searchEverything(debounced, 60).then((r) => {
      if (!cancelled) setHits(r.hits);
    });
    return () => {
      cancelled = true;
    };
  }, [debounced, active]);
  const shown = active ? hits : null;

  return (
    <Page title="Buscar" subtitle="Procure uma palavra-chave em todas as suas aulas, livros e materiais.">
      <label className="mt-3 flex h-14 items-center gap-3 rounded-full bg-surface px-5 shadow-card">
        <Search size={20} className="text-label-3" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex.: esquizoparanoide, transferência, SUAS…"
          className="min-w-0 flex-1 bg-transparent text-[17px] outline-none"
          enterKeyHint="search"
        />
      </label>
      <div className="mt-5 space-y-2.5">
        {shown === null ? (
          <p className="px-1 text-[15px] text-label-3">Dica: o personagem no canto da tela faz essa mesma busca sem você sair da aula.</p>
        ) : shown.length === 0 ? (
          <Card className="px-5 py-4 text-label-2">Nada encontrado para “{debounced}”.</Card>
        ) : (
          shown.map((hit) => (
            <Link key={`${hit.kind}-${hit.id}`} to={hit.href} className="lift card block px-4 py-3">
              <p className="text-[12.5px] font-extrabold tracking-[0.04em] text-accent uppercase">{KIND_LABEL[hit.kind]}</p>
              <p className="font-bold">{hit.title}</p>
              <p className="text-[13px] text-label-2">{hit.subtitle}</p>
              {hit.snippet ? <p className="mt-1 text-[14px] leading-5 text-label-2">{hit.snippet}</p> : null}
            </Link>
          ))
        )}
      </div>
    </Page>
  );
}
