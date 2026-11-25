"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { BookPlus, FileUp, Search, Trash2 } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useMemo, useRef, useState } from "react";
import { Page, ScreenSkeleton, Tabs } from "@/components/shell/Page";
import { Button, Card, EmptyState, ProgressBar, Section, cx } from "@/components/ui/basics";
import { Field, Select, TextArea, TextInput } from "@/components/ui/fields";
import { StoredImage } from "@/components/ui/media";
import { Sheet, useConfirm, useToast } from "@/components/ui/overlays";
import { inkFor } from "@/components/notebook/NotebookCover";
import { db } from "@/lib/db";
import { saveImage } from "@/lib/images";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { closePdf, coverBlob, extractText, openPdf, pdfInfo, renderPage } from "@/lib/pdf";
import { navigate } from "@/lib/router";
import { fold, snippetAround } from "@/lib/search";
import { createBook, deleteBook, saveFile, updateBook } from "@/lib/store";
import { resolveCurrentSemester } from "@/lib/today";
import { BOOK_KIND_LABEL, BOOK_STATUS_LABEL, type Book, type BookKind, type BookStatus } from "@/lib/types";

const SPINE_COLORS = ["#9c5b6e", "#8fa3b8", "#8fa58a", "#c9b293", "#b3a5cc", "#3b4a5c", "#d9a9ad", "#5e2a3a"];

function pickSpineColor(): string {
  return SPINE_COLORS[Math.floor(Math.random() * SPINE_COLORS.length)];
}

export default function LibraryScreen({ id, page }: { id: string | null; page: number | null }) {
  if (id) return <BookScreen id={id} startPage={page} />;
  return <Shelf />;
}

/* ------------------------------------------------------------------ */
/* Estante                                                             */
/* ------------------------------------------------------------------ */

function Shelf() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<"todos" | BookStatus>("todos");
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const books = useLiveQuery(() => db.books.toArray(), []);

  async function importFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast(`${file.name} não é PDF`);
        continue;
      }
      try {
        setImporting(`Abrindo ${file.name}…`);
        const stored = await saveFile(file, file.name);
        const doc = await openPdf(stored.data);
        const info = await pdfInfo(doc);
        const blob = await coverBlob(doc);
        const coverImageId = blob ? await saveImage(new File([blob], "capa.jpg", { type: "image/jpeg" }), { maxEdge: 640 }) : null;
        const title = info.title || file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
        const book = await createBook({
          title,
          author: info.author,
          fileId: stored.id,
          coverImageId,
          pages: doc.numPages,
          kind: doc.numPages < 60 ? "artigo" : "livro",
          color: pickSpineColor(),
        });
        const pages = await extractText(doc, (done, total) => setImporting(`Lendo ${title}: página ${done} de ${total}`));
        await db.bookTexts.put({ bookId: book.id, pages });
        await closePdf(doc);
        toast(`“${title}” está na estante`);
      } catch {
        toast(`Não consegui abrir ${file.name}`);
      }
    }
    setImporting(null);
  }

  if (!books) return <ScreenSkeleton />;
  const q = fold(query.trim());
  const shown = books
    .filter((b) => filter === "todos" || b.status === filter)
    .filter((b) => !q || fold(`${b.title} ${b.author} ${b.tags.join(" ")}`).includes(q))
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  const reading = books.filter((b) => b.status === "lendo");

  return (
    <Page
      title="Biblioteca"
      subtitle="Sua estante: livros, artigos e apostilas. O personagem procura palavras-chave dentro deles."
      wide
      actions={
        <>
          <Button size="sm" variant="gray" icon={BookPlus} onClick={() => setManual(true)}>
            Livro físico
          </Button>
          <Button size="sm" icon={FileUp} onClick={() => fileRef.current?.click()}>
            PDF
          </Button>
        </>
      }
    >
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => void importFiles(e.target.files).finally(() => (e.target.value = ""))} />
      {importing ? <Card className="mt-3 bg-accent-faint px-4 py-3 text-[14.5px] font-semibold">📚 {importing}</Card> : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-[8px] bg-surface px-4 shadow-card">
          <Search size={17} className="text-label-3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar título, autor ou tag" className="min-w-0 flex-1 bg-transparent outline-none" />
        </label>
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: "todos", label: "Todos", badge: books.length || undefined },
            { value: "lendo", label: "Lendo" },
            { value: "quero-ler", label: "Quero ler" },
            { value: "lido", label: "Lidos" },
          ]}
        />
      </div>

      {books.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Sua estante está vazia" action={<Button icon={FileUp} onClick={() => fileRef.current?.click()}>Adicionar PDF</Button>}>
            Adicione os PDFs dos textos da faculdade. Eles ficam guardados no aparelho, abrem sem internet e entram na busca.
          </EmptyState>
        </div>
      ) : (
        <>
          {reading.length > 0 && filter === "todos" && !q ? (
            <Section title="Lendo agora">
              <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
                {reading.map((book) => (
                  <button key={book.id} type="button" onClick={() => navigate(`#/biblioteca/${book.id}`)} className="lift card flex w-[290px] flex-none items-center gap-3 p-3 text-left">
                    <BookCover book={book} className="w-[60px] flex-none" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 font-semibold">{book.title}</span>
                      <span className="block truncate text-[13px] text-label-2">{book.author}</span>
                      {book.pages > 0 ? <ProgressBar ratio={book.currentPage / book.pages} className="mt-2" /> : null}
                      {book.pages > 0 ? <span className="text-[12px] text-label-3">p. {book.currentPage || 1} de {book.pages}</span> : null}
                    </span>
                  </button>
                ))}
              </div>
            </Section>
          ) : null}
          <ShelfRows books={shown} />
        </>
      )}
      <ManualBookSheet open={manual} onClose={() => setManual(false)} />
    </Page>
  );
}

function ShelfRows({ books }: { books: Book[] }) {
  const perRow = 6;
  const rows: Book[][] = [];
  for (let i = 0; i < books.length; i += perRow) rows.push(books.slice(i, i + perRow));
  return (
    <div className="mt-8 space-y-10">
      {rows.map((row, r) => (
        <div key={r} className="relative">
          <div className="grid grid-cols-3 items-end gap-x-4 gap-y-8 px-3 sm:grid-cols-6 sm:px-5">
            {row.map((book) => (
              <button key={book.id} type="button" onClick={() => navigate(`#/biblioteca/${book.id}`)} className="group text-left" aria-label={book.title}>
                <BookCover book={book} className="lift" />
                <span className="mt-2 line-clamp-2 block text-[13px] leading-4 font-semibold">{book.title}</span>
              </button>
            ))}
          </div>
          {/* tábua da prateleira */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-[38px] -z-10 h-[10px] rounded-[3px]"
            style={{
              background: "linear-gradient(180deg, var(--surface-2), color-mix(in srgb, var(--label) 10%, var(--surface-2)))",
              boxShadow: "0 1px 0 var(--edge), 0 8px 16px -10px rgba(0,0,0,.35)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function BookCover({ book, className }: { book: Book; className?: string }) {
  return (
    <span
      className={cx("relative block aspect-[2/3] overflow-hidden rounded-[4px_10px_10px_4px]", className)}
      style={{
        background: book.color,
        boxShadow: "inset 6px 0 0 rgba(0,0,0,.14), inset 8px 0 0 rgba(255,255,255,.18), 0 10px 18px -10px rgba(40,15,30,.6)",
        color: inkFor(book.color),
      }}
    >
      {book.coverImageId ? (
        <StoredImage id={book.coverImageId} className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex flex-col justify-between p-[12%]">
          <span className="font-display text-[clamp(11px,1.6vw,17px)] leading-tight font-semibold">{book.title}</span>
          <span className="text-[clamp(9px,1.1vw,12px)] font-semibold opacity-80">{book.author}</span>
        </span>
      )}
      {book.status === "lido" ? <span className="absolute top-1 right-1 rounded-[8px] bg-white/90 px-1.5 text-[11px] font-semibold text-[#2e8b57]">lido ✓</span> : null}
    </span>
  );
}

function ManualBookSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState("");
  const [kind, setKind] = useState<BookKind>("livro");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Livro físico"
      submitLabel="Pôr na estante"
      canSubmit={title.trim().length > 0}
      onSubmit={async () => {
        const book = await createBook({
          title,
          author,
          kind,
          pages: Math.max(0, Number(pages) || 0),
          color: pickSpineColor(),
        });
        setTitle("");
        setAuthor("");
        setPages("");
        navigate(`#/biblioteca/${book.id}`);
      }}
    >
      <div className="space-y-4">
        <Field label="Título">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Autor(es)">
          <TextInput value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Páginas">
            <TextInput inputMode="numeric" value={pages} onChange={(e) => setPages(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Tipo">
            <Select value={kind} onChange={(e) => setKind(e.target.value as BookKind)}>
              {(Object.keys(BOOK_KIND_LABEL) as BookKind[]).map((k) => (
                <option key={k} value={k}>
                  {BOOK_KIND_LABEL[k]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Livro                                                               */
/* ------------------------------------------------------------------ */

function BookScreen({ id, startPage }: { id: string; startPage: number | null }) {
  const confirm = useConfirm();
  const settings = useSettingsOrDefault();
  const today = useToday();
  const [reading, setReading] = useState(startPage !== null);
  const data = useLiveQuery(async () => {
    const book = (await db.books.get(id)) ?? null;
    const [disciplines, semesters, text] = await Promise.all([db.disciplines.toArray(), db.semesters.toArray(), db.bookTexts.get(id)]);
    return { book, disciplines, semesters, hasText: !!text };
  }, [id]);
  const [search, setSearch] = useState("");
  const [jump, setJump] = useState<number | null>(startPage);
  const results = useLiveQuery(async () => {
    const q = fold(search.trim());
    if (q.length < 2) return [];
    const text = await db.bookTexts.get(id);
    if (!text) return [];
    const found: { page: number; snippet: string }[] = [];
    text.pages.forEach((p, i) => {
      if (fold(p).includes(q)) found.push({ page: i + 1, snippet: snippetAround(p, [q], 70) ?? "" });
    });
    return found.slice(0, 40);
  }, [search, id]);

  if (!data) return <ScreenSkeleton />;
  if (!data.book) {
    return (
      <Page title="Livro" back={{ to: "#/biblioteca", label: "Biblioteca" }}>
        <div className="mt-6">
          <EmptyState title="Esse livro não está mais na estante" />
        </div>
      </Page>
    );
  }
  const book = data.book;
  const semester = resolveCurrentSemester(data.semesters, settings, today);
  const disciplines = data.disciplines.filter((d) => !semester || d.semesterId === semester.id);

  return (
    <Page title={book.title} back={{ to: "#/biblioteca", label: "Biblioteca" }} wide titleSlot={<span />}>
      <div className="mt-2 grid gap-6 md:grid-cols-[200px_1fr]">
        <div>
          <BookCover book={book} className="mx-auto w-[150px] md:w-full" />
          {book.fileId ? (
            <Button block className="mt-4" onClick={() => setReading((v) => !v)}>
              {reading ? "Fechar leitor" : book.currentPage > 1 ? `Continuar (p. ${book.currentPage})` : "Ler"}
            </Button>
          ) : null}
        </div>
        <div className="space-y-4">
          <TextArea
            bare
            minRows={1}
            value={book.title}
            onChange={(e) => void updateBook(book.id, { title: e.target.value.replace(/\n/g, " ") })}
            className="font-display !text-[30px] !leading-[38px] font-semibold"
            aria-label="Título"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Autor">
              <TextInput value={book.author} onChange={(e) => void updateBook(book.id, { author: e.target.value })} />
            </Field>
            <Field label="Ano">
              <TextInput value={book.year} onChange={(e) => void updateBook(book.id, { year: e.target.value })} />
            </Field>
            <Field label="Situação">
              <Select value={book.status} onChange={(e) => void updateBook(book.id, { status: e.target.value as BookStatus })}>
                {(Object.keys(BOOK_STATUS_LABEL) as BookStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {BOOK_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Começar a ler até" hint="O personagem te lembra">
              <TextInput type="date" value={book.startBy ?? ""} onChange={(e) => void updateBook(book.id, { startBy: e.target.value || null })} />
            </Field>
          </div>
          <div>
            <p className="mb-1.5 text-[14px] font-semibold text-label-2">Disciplinas</p>
            <div className="flex flex-wrap gap-1.5">
              {disciplines.map((d) => {
                const on = book.disciplineIds.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      void updateBook(book.id, { disciplineIds: on ? book.disciplineIds.filter((x) => x !== d.id) : [...book.disciplineIds, d.id] })
                    }
                    className={cx("pressable h-9 rounded-[8px] px-3 text-[13.5px] font-semibold", on ? "bg-accent-solid text-on-accent" : "bg-fill text-label-2")}
                  >
                    {d.emoji} {d.name}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Tags (separe por vírgula)">
            <TextInput
              defaultValue={book.tags.join(", ")}
              onBlur={(e) => void updateBook(book.id, { tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
              placeholder="Ex.: Klein, psicanálise, desenvolvimento"
            />
          </Field>
          <Field label="Minhas notas sobre o livro">
            <TextArea value={book.notes} onChange={(e) => void updateBook(book.id, { notes: e.target.value })} minRows={3} />
          </Field>
          {data.hasText ? (
            <div>
              <label className="flex h-11 items-center gap-2 rounded-[8px] bg-surface px-4 shadow-card">
                <Search size={17} className="text-label-3" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Procurar dentro do livro" className="min-w-0 flex-1 bg-transparent outline-none" />
              </label>
              {results && results.length > 0 ? (
                <Card className="mt-2 max-h-[260px] divide-y divide-sep overflow-y-auto">
                  {results.map((r) => (
                    <button
                      key={r.page}
                      type="button"
                      onClick={() => {
                        setReading(true);
                        setJump(r.page);
                      }}
                      className="row-pressable block w-full px-4 py-2.5 text-left"
                    >
                      <span className="text-[13px] font-semibold text-accent">p. {r.page}</span>
                      <span className="block text-[14px] text-label-2">{r.snippet}</span>
                    </button>
                  ))}
                </Card>
              ) : search.trim().length >= 2 ? (
                <p className="mt-2 text-[14px] text-label-3">Nada encontrado.</p>
              ) : null}
            </div>
          ) : book.fileId ? (
            <p className="text-[13.5px] text-label-3">O texto deste PDF não pôde ser lido (pode ser digitalizado como imagem).</p>
          ) : null}
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={async () => {
              if (!(await confirm({ title: `Tirar “${book.title}” da estante?`, message: "O PDF guardado também será apagado.", confirmLabel: "Tirar", destructive: true }))) return;
              await deleteBook(book.id);
              navigate("#/biblioteca", { replace: true });
            }}
          >
            Tirar da estante
          </Button>
        </div>
      </div>
      {reading && book.fileId ? <Reader book={book} jump={jump} /> : null}
    </Page>
  );
}

function Reader({ book, jump }: { book: Book; jump: number | null }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);

  useEffect(() => {
    let cancelled = false;
    let opened: PDFDocumentProxy | null = null;
    void (async () => {
      try {
        const file = book.fileId ? await db.files.get(book.fileId) : undefined;
        if (!file) throw new Error("sem arquivo");
        opened = await openPdf(file.data);
        if (!cancelled) setDoc(opened);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      void closePdf(opened);
    };
  }, [book.fileId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(Math.min(900, el.clientWidth)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !jump) return;
    const target = containerRef.current?.querySelector(`[data-page="${jump}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [doc, jump]);

  const pages = useMemo(() => (doc ? Array.from({ length: doc.numPages }, (_, i) => i + 1) : []), [doc]);

  if (error) return <Card className="mt-6 px-5 py-4 text-label-2">Não consegui abrir este PDF.</Card>;
  return (
    <div ref={containerRef} className="mt-8 space-y-4">
      {!doc ? <Card className="h-[400px] animate-pulse">{null}</Card> : null}
      {doc
        ? pages.map((n) => <PdfPage key={n} doc={doc} n={n} width={width} bookId={book.id} total={doc.numPages} current={book.currentPage} />)
        : null}
    </div>
  );
}

function PdfPage({ doc, n, width, bookId, total, current }: { doc: PDFDocumentProxy; n: number; width: number; bookId: string; total: number; current: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const rendered = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (entry.intersectionRatio > 0.5 && n !== current) void updateBook(bookId, { currentPage: n, ...(n === total ? { status: "lido" as const } : {}) });
        }
      },
      { rootMargin: "600px 0px", threshold: [0, 0.6] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [n, bookId, total, current]);

  useEffect(() => {
    if (!visible || !canvasRef.current || rendered.current === width) return;
    rendered.current = width;
    void renderPage(doc, n, canvasRef.current, width).catch(() => undefined);
  }, [visible, doc, n, width]);

  return (
    <div ref={ref} data-page={n} className="mx-auto overflow-hidden rounded-[10px] bg-white shadow-card" style={{ width, minHeight: visible ? undefined : width * 1.35 }}>
      <canvas ref={canvasRef} className="block" />
      <p className="bg-surface py-1 text-center text-[12px] font-semibold text-label-3">
        {n} / {total}
      </p>
    </div>
  );
}
