/** Busca local (sem internet e sem IA) em anotações, livros e materiais. */

/** Minúsculas e sem acentos, para comparar "Esquizoparanóide" com "esquizoparanoide". */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Texto puro a partir do HTML das anotações. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/h[1-6]|\/li|\/blockquote|\/div)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

const STOPWORDS = new Set(
  "a o as os um uma uns umas de da do das dos em no na nos nas por para com sem que qual quais quem como onde quando sobre e ou se tem tenho ter algum alguma alguns algumas livro livros anotacao anotacoes eu me meu minha isso esse essa este esta fala falam falando assunto tema outro outra semestre aula aulas existe ha".split(
    " ",
  ),
);

/** Palavras importantes de uma pergunta ("tenho livro sobre esquizoparanoide?" → ["esquizoparanoide"]). */
export function keywordsOf(question: string): string[] {
  const words = fold(question)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return [...new Set(words)].slice(0, 8);
}

/** Trecho em volta da primeira ocorrência, com até `radius` caracteres de cada lado. */
export function snippetAround(text: string, terms: string[], radius = 90): string | null {
  const folded = fold(text);
  let index = -1;
  let length = 0;
  for (const term of terms) {
    const found = folded.indexOf(term);
    if (found >= 0 && (index < 0 || found < index)) {
      index = found;
      length = term.length;
    }
  }
  if (index < 0) return null;
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + length + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ").trim()}${end < text.length ? "…" : ""}`;
}

/** Pontuação: quantas palavras-chave aparecem e quantas vezes. */
export function scoreText(text: string, terms: string[]): number {
  if (terms.length === 0) return 0;
  const folded = fold(text);
  let score = 0;
  for (const term of terms) {
    let from = 0;
    let hits = 0;
    while (hits < 20) {
      const at = folded.indexOf(term, from);
      if (at < 0) break;
      hits++;
      from = at + term.length;
    }
    if (hits > 0) score += 10 + hits;
  }
  return score;
}

export interface SearchHit {
  kind: "aula" | "livro" | "material" | "cartao" | "questao" | "relatorio";
  id: string;
  title: string;
  subtitle: string;
  snippet: string;
  href: string;
  score: number;
  /** Página do livro, quando for um livro */
  page?: number;
}
