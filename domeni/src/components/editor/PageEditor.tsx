"use client";

import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import {
  EditorContent,
  mergeAttributes,
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type Editor,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Eraser,
  Hand,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Keyboard,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  PenLine,
  Plus,
  Redo2,
  RotateCw,
  Smile,
  StickyNote,
  Strikethrough,
  TextQuote,
  Trash2,
  Underline,
  Undo2,
  ArrowUpToLine,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Sticker } from "@/components/notebook/NotebookCover";
import { EMOJI_STICKERS, TEXT_STICKERS } from "@/components/notebook/stickers";
import { cx } from "@/components/ui/basics";
import { StoredImage, useImagePicker } from "@/components/ui/media";
import { useToast } from "@/components/ui/overlays";
import { newId } from "@/lib/ids";
import { ImageError, saveImage } from "@/lib/images";
import { savePageLayer } from "@/lib/store";
import type { InkStroke, InkTool, PageItem, PageLayer, PaperStyle } from "@/lib/types";
import { useImageUrl } from "@/lib/useImage";
import { MARKER_COLORS, PAGE_WIDTH, PEN_COLORS, strokeBottom, strokeHit, strokePath } from "./ink";

type Mode = "texto" | "caneta" | "marca" | "borracha" | "mover";
type IconType = ComponentType<{ size?: number; strokeWidth?: number }>;

const TEXT_COLORS = ["#2a2230", "#d6336c", "#3b5bdb", "#2b8a3e", "#e8590c", "#7048e8", "#c92a2a", "#868e96"];
const HIGHLIGHTS = ["var(--hl-amarelo)", "var(--hl-rosa)", "var(--hl-verde)", "var(--hl-azul)", "var(--hl-lilas)", "var(--hl-laranja)"];
const FONT_SIZES = ["14px", "16px", "18px", "22px", "28px", "36px"];
const POSTIT_COLORS = ["#fff3a8", "#ffd6e5", "#d3f9d8", "#d0ebff", "#e5dbff"];
const PAD_X = 64;
const PAD_TOP = 52;

/* ---------- imagem dentro do texto ---------- */

function InlineImageView({ node, selected, updateAttributes, deleteNode, editor }: NodeViewProps) {
  const image = useImageUrl(node.attrs.imageId as string | null);
  const size = (node.attrs.size as string) ?? "g";
  return (
    <NodeViewWrapper className={cx("note-image", selected && "is-selected")} data-size={size} data-drag-handle>
      {image.status === "pronto" ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagem local (blob)
        <img src={image.url} alt="" draggable={false} />
      ) : (
        <div className="h-32 rounded-xl bg-fill" />
      )}
      {selected && editor.isEditable ? (
        <div contentEditable={false} className="material-surface absolute top-2 right-2 flex gap-0.5 rounded-full p-1 shadow-float">
          {(["p", "m", "g"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => updateAttributes({ size: s })}
              className={cx("inline-flex size-8 items-center justify-center rounded-full text-[13px] font-bold", size === s ? "bg-accent-solid text-on-accent" : "")}
            >
              {s.toUpperCase()}
            </button>
          ))}
          <button type="button" onClick={() => deleteNode()} aria-label="Remover imagem" className="inline-flex size-8 items-center justify-center rounded-full text-danger">
            <Trash2 size={15} />
          </button>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

const InlineImage = Node.create({
  name: "atlasImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      imageId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-image-id"),
        renderHTML: (attrs) => ({ "data-image-id": attrs.imageId as string }),
      },
      size: {
        default: "g",
        parseHTML: (el) => {
          const v = el.getAttribute("data-size");
          return v === "p" || v === "m" ? v : "g";
        },
        renderHTML: (attrs) => ({ "data-size": attrs.size as string }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "img[data-image-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes, { alt: "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(InlineImageView);
  },
});

function ToolButton({
  label,
  icon: Icon,
  onClick,
  active,
  disabled,
}: {
  label: string;
  icon: IconType;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cx(
        "pressable inline-flex h-10 w-9 flex-none items-center justify-center rounded-[10px] disabled:opacity-30",
        active ? "bg-accent-soft text-accent" : "text-label-2",
      )}
    >
      <Icon size={18} strokeWidth={2.3} />
    </button>
  );
}

function randomTilt(range: number): number {
  return Math.round(Math.random() * range * 2 - range);
}

/* ---------- folha ---------- */

export function PageEditor({
  initialHtml,
  layer,
  lessonId,
  paper,
  paperColor,
  pencilOnly,
  onHtml,
  placeholder,
}: {
  initialHtml: string;
  layer: PageLayer | undefined;
  lessonId: string;
  paper: PaperStyle;
  paperColor: string | null;
  pencilOnly: boolean;
  onHtml: (html: string) => void;
  placeholder: string;
}) {
  const toast = useToast();
  const outerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(PAGE_WIDTH);
  const [textHeight, setTextHeight] = useState(600);
  const [mode, setMode] = useState<Mode>("texto");
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penSize, setPenSize] = useState(3.2);
  const [markerColor, setMarkerColor] = useState(MARKER_COLORS[0]);
  const [strokes, setStrokes] = useState<InkStroke[]>(() => layer?.strokes ?? []);
  const [items, setItems] = useState<PageItem[]>(() => layer?.items ?? []);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [panel, setPanel] = useState<"adesivos" | null>(null);
  const [live, setLive] = useState<InkStroke | null>(null);
  const liveRef = useRef<InkStroke | null>(null);
  const history = useRef<{ undo: InkStroke[][]; redo: InkStroke[][] }>({ undo: [], redo: [] });
  const loaded = useRef(false);
  const scale = Math.min(1, width / PAGE_WIDTH);

  /* --- texto --- */
  const editorRef = useRef<Editor | null>(null);
  const insertInlineImage = useCallback((imageId: string) => {
    editorRef.current?.chain().focus().insertContent({ type: "atlasImage", attrs: { imageId } }).run();
  }, []);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, protocols: ["http", "https"] },
      }),
      TextStyleKit,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      InlineImage,
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "prose-dn", "aria-label": "Anotações da aula", role: "textbox", "aria-multiline": "true" },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
        if (files.length === 0) return false;
        event.preventDefault();
        void (async () => {
          try {
            for (const file of files) insertInlineImage(await saveImage(file, { maxEdge: 2000 }));
          } catch (error) {
            toast(error instanceof ImageError ? error.message : "Não foi possível colar a imagem.");
          }
        })();
        return true;
      },
    },
    onCreate: ({ editor: e }) => {
      editorRef.current = e;
    },
    onDestroy: () => {
      editorRef.current = null;
    },
    onUpdate: ({ editor: e }) => onHtml(e.isEmpty ? "" : e.getHTML()),
  });

  /* --- medidas --- */
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const text = textRef.current;
    if (!outer || !text) return;
    const observer = new ResizeObserver(() => {
      setWidth(outer.clientWidth);
      setTextHeight(text.offsetHeight);
    });
    observer.observe(outer);
    observer.observe(text);
    return () => observer.disconnect();
  }, []);

  /* --- salvar caneta e itens --- */
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    const timer = window.setTimeout(() => void savePageLayer(lessonId, { strokes, items }), 500);
    return () => window.clearTimeout(timer);
  }, [strokes, items, lessonId]);

  /* --- impedir que a Apple Pencil role a página enquanto escreve --- */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const stop = (event: TouchEvent) => {
      const stylus = Array.from(event.touches).some((t) => (t as Touch & { touchType?: string }).touchType === "stylus");
      if (stylus || !pencilOnly) event.preventDefault();
    };
    svg.addEventListener("touchstart", stop, { passive: false });
    svg.addEventListener("touchmove", stop, { passive: false });
    return () => {
      svg.removeEventListener("touchstart", stop);
      svg.removeEventListener("touchmove", stop);
    };
  }, [pencilOnly, mode]);

  const inkMode = mode === "caneta" || mode === "marca" || mode === "borracha";
  const contentBottom = Math.max(
    textHeight + PAD_TOP,
    ...strokes.map(strokeBottom),
    ...items.map((i) => i.y + i.w * (i.kind === "imagem" ? 1.2 : 1)),
  );
  const pageHeight = Math.max(1100, contentBottom + 520, live ? strokeBottom(live) + 400 : 0);

  function toPage(event: { clientX: number; clientY: number }) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
  }

  function commitStrokes(next: InkStroke[]) {
    history.current.undo.push(strokes);
    history.current.redo = [];
    if (history.current.undo.length > 60) history.current.undo.shift();
    setStrokes(next);
  }

  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (!inkMode) return;
    if (pencilOnly && event.pointerType === "touch") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = toPage(event);
    if (mode === "borracha") {
      const left = strokes.filter((s) => !strokeHit(s, x, y, 10));
      if (left.length !== strokes.length) commitStrokes(left);
      liveRef.current = { id: "borracha", tool: "caneta", color: "", size: 0, points: [] };
      return;
    }
    const tool: InkTool = mode === "marca" ? "marca" : "caneta";
    const stroke: InkStroke = {
      id: newId(),
      tool,
      color: tool === "marca" ? markerColor : penColor,
      size: tool === "marca" ? 22 : penSize,
      points: [x, y, event.pressure || 0.5],
    };
    liveRef.current = stroke;
    setLive(stroke);
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const current = liveRef.current;
    if (!current) return;
    const events = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
    if (current.id === "borracha") {
      for (const e of events) {
        const { x, y } = toPage(e);
        setStrokes((list) => {
          const left = list.filter((s) => !strokeHit(s, x, y, 10));
          if (left.length !== list.length) history.current.undo.push(list);
          return left.length !== list.length ? left : list;
        });
      }
      return;
    }
    const points = [...current.points];
    for (const e of events) {
      const { x, y } = toPage(e);
      points.push(Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round((e.pressure || 0.5) * 100) / 100);
    }
    const next = { ...current, points };
    liveRef.current = next;
    setLive(next);
  }

  function onPointerUp() {
    const current = liveRef.current;
    liveRef.current = null;
    setLive(null);
    if (!current || current.id === "borracha" || current.points.length < 3) return;
    commitStrokes([...strokes, current]);
  }

  /* --- itens soltos --- */
  function viewportCenter(): { x: number; y: number } {
    const rect = outerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 200, y: 200 };
    const y = (window.innerHeight / 2 - rect.top) / scale;
    return { x: PAGE_WIDTH / 2, y: Math.max(80, y) };
  }

  function addItem(item: Omit<PageItem, "id" | "z" | "x" | "y"> & { x?: number; y?: number }) {
    const c = viewportCenter();
    const z = items.reduce((m, i) => Math.max(m, i.z), 0) + 1;
    const created: PageItem = { ...item, id: newId(), z, x: item.x ?? c.x - item.w / 2, y: item.y ?? c.y - item.w / 2 };
    setItems((list) => [...list, created]);
    setSelectedItem(created.id);
    setMode("mover");
  }

  function addPostit() {
    addItem({ kind: "postit", w: 200, rotation: randomTilt(3), text: "", color: POSTIT_COLORS[items.length % POSTIT_COLORS.length] });
  }

  function undoInk() {
    const prev = history.current.undo.pop();
    if (prev) {
      history.current.redo.push(strokes);
      setStrokes(prev);
    }
  }

  function redoInk() {
    const next = history.current.redo.pop();
    if (next) {
      history.current.undo.push(strokes);
      setStrokes(next);
    }
  }

  const updateItem = (id: string, patch: Partial<PageItem>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const imagePicker = useImagePicker({
    maxEdge: 1800,
    onPicked: (imageId) => addItem({ kind: "imagem", imageId, w: 300, rotation: 0 }),
  });
  const inlinePicker = useImagePicker({ maxEdge: 2000, onPicked: insertInlineImage });

  const dragRef = useRef<{ id: string; kind: "move" | "resize"; startX: number; startY: number; orig: PageItem } | null>(null);

  function itemPointerDown(event: React.PointerEvent, item: PageItem, kind: "move" | "resize") {
    if (inkMode) return;
    event.stopPropagation();
    if (selectedItem !== item.id && kind === "move" && mode !== "mover") {
      setSelectedItem(item.id);
      return;
    }
    setSelectedItem(item.id);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = { id: item.id, kind, startX: event.clientX, startY: event.clientY, orig: item };
  }

  function itemPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / scale;
    const dy = (event.clientY - drag.startY) / scale;
    if (drag.kind === "move") {
      updateItem(drag.id, { x: Math.min(PAGE_WIDTH - 40, Math.max(-drag.orig.w + 40, drag.orig.x + dx)), y: Math.max(0, drag.orig.y + dy) });
    } else {
      updateItem(drag.id, { w: Math.min(PAGE_WIDTH, Math.max(40, drag.orig.w + dx)) });
    }
  }


  /* --- barra de ferramentas --- */
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            h1: e.isActive("heading", { level: 1 }),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            task: e.isActive("taskList"),
            quote: e.isActive("blockquote"),
            center: e.isActive({ textAlign: "center" }),
            fontSize: (e.getAttributes("textStyle").fontSize as string | undefined) ?? "",
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });
  const chain = () => editor?.chain().focus();

  const paperStyle = useMemo(
    () => ({ width: PAGE_WIDTH, height: pageHeight, transform: `scale(${scale})`, ...(paperColor ? { ["--paper-bg" as string]: paperColor } : {}) }),
    [pageHeight, scale, paperColor],
  );

  const modeButton = (value: Mode, label: string, Icon: IconType) => (
    <button
      key={value}
      type="button"
      onClick={() => {
        setMode(value);
        if (value !== "mover") setSelectedItem(null);
        setPanel(null);
      }}
      aria-pressed={mode === value}
      title={label}
      className={cx(
        "pressable inline-flex h-10 flex-none items-center gap-1.5 rounded-full px-3 text-[14px] font-bold",
        mode === value ? "bg-accent-solid text-on-accent" : "text-label-2",
      )}
    >
      <Icon size={18} strokeWidth={2.3} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  const tool = (key: string, label: string, Icon: IconType, run: () => void, active?: boolean, disabled?: boolean) => (
    <button
      key={key}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
      className={cx(
        "pressable inline-flex h-10 w-9 flex-none items-center justify-center rounded-[10px] disabled:opacity-30",
        active ? "bg-accent-soft text-accent" : "text-label-2",
      )}
    >
      <Icon size={18} strokeWidth={2.3} />
    </button>
  );

  const sep = (k: string) => <span key={k} aria-hidden className="mx-1 h-6 w-px flex-none bg-sep" />;

  return (
    <div>
      {/* Barra de ferramentas */}
      <div className="no-print material-surface sticky top-[calc(var(--nav-h)+env(safe-area-inset-top))] z-20 -mx-1 mb-3 rounded-[20px] px-1.5 py-1.5 shadow-card">
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
          {modeButton("texto", "Teclado", Keyboard)}
          {modeButton("caneta", "Caneta", PenLine)}
          {modeButton("marca", "Marca-texto", Highlighter)}
          {modeButton("borracha", "Borracha", Eraser)}
          {modeButton("mover", "Mover", Hand)}
          {sep("s0")}
          {tool("img", "Imagem solta na folha", ImagePlus, imagePicker.pick)}
          {tool("adesivo", "Adesivos", Smile, () => setPanel((p) => (p === "adesivos" ? null : "adesivos")), panel === "adesivos")}
          <ToolButton label="Post-it" icon={StickyNote} onClick={addPostit} />
        </div>
        {mode === "texto" ? (
          <div className="no-scrollbar mt-1 flex items-center gap-0.5 overflow-x-auto border-t border-dashed border-sep pt-1">
            {tool("b", "Negrito", Bold, () => chain()?.toggleBold().run(), state?.bold)}
            {tool("i", "Itálico", Italic, () => chain()?.toggleItalic().run(), state?.italic)}
            {tool("u", "Sublinhado", Underline, () => chain()?.toggleUnderline().run(), state?.underline)}
            {tool("s", "Riscado", Strikethrough, () => chain()?.toggleStrike().run(), state?.strike)}
            {sep("s1")}
            <select
              aria-label="Tamanho da letra"
              value={state?.fontSize ?? ""}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => (e.target.value ? chain()?.setFontSize(e.target.value).run() : chain()?.unsetFontSize().run())}
              className="h-9 flex-none rounded-[10px] bg-fill px-2 text-[13.5px] font-bold"
            >
              <option value="">Tamanho</option>
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("px", "")}
                </option>
              ))}
            </select>
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Cor do texto ${color}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chain()?.setColor(color).run()}
                className="pressable size-7 flex-none rounded-full ring-2 ring-surface"
                style={{ background: color }}
              />
            ))}
            {sep("s2")}
            {HIGHLIGHTS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label="Grifar"
                title="Grifar"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chain()?.toggleHighlight({ color }).run()}
                className="pressable inline-flex h-7 w-7 flex-none items-center justify-center rounded-[8px] text-[12px] font-black"
                style={{ background: color }}
              >
                A
              </button>
            ))}
            {sep("s3")}
            {tool("h1", "Título", Heading1, () => chain()?.toggleHeading({ level: 1 }).run(), state?.h1)}
            {tool("h2", "Subtítulo", Heading2, () => chain()?.toggleHeading({ level: 2 }).run(), state?.h2)}
            {tool("h3", "Tópico", Heading3, () => chain()?.toggleHeading({ level: 3 }).run(), state?.h3)}
            {tool("ul", "Lista", List, () => chain()?.toggleBulletList().run(), state?.bullet)}
            {tool("ol", "Lista numerada", ListOrdered, () => chain()?.toggleOrderedList().run(), state?.ordered)}
            {tool("task", "Checklist", ListChecks, () => chain()?.toggleTaskList().run(), state?.task)}
            {tool("quote", "Destaque", TextQuote, () => chain()?.toggleBlockquote().run(), state?.quote)}
            {tool("center", "Centralizar", state?.center ? AlignLeft : AlignCenter, () =>
              chain()?.setTextAlign(state?.center ? "left" : "center").run(),
            )}
            {tool("inline-img", "Imagem no texto", ImagePlus, inlinePicker.pick)}
            {sep("s4")}
            {tool("undo", "Desfazer", Undo2, () => chain()?.undo().run(), false, !state?.canUndo)}
            {tool("redo", "Refazer", Redo2, () => chain()?.redo().run(), false, !state?.canRedo)}
          </div>
        ) : null}
        {mode === "caneta" || mode === "marca" ? (
          <div className="no-scrollbar mt-1 flex items-center gap-1.5 overflow-x-auto border-t border-dashed border-sep px-1 pt-1.5">
            {(mode === "caneta" ? PEN_COLORS : MARKER_COLORS).map((color) => {
              const active = mode === "caneta" ? penColor === color : markerColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Cor ${color}`}
                  onClick={() => (mode === "caneta" ? setPenColor(color) : setMarkerColor(color))}
                  className={cx("pressable size-8 flex-none rounded-full", active && "ring-[3px] ring-accent ring-offset-2 ring-offset-surface")}
                  style={{ background: color }}
                />
              );
            })}
            {mode === "caneta" ? (
              <>
                {sep("p1")}
                {[2, 3.2, 5, 8].map((size) => (
                  <button
                    key={size}
                    type="button"
                    aria-label={`Espessura ${size}`}
                    onClick={() => setPenSize(size)}
                    className={cx("pressable inline-flex size-9 flex-none items-center justify-center rounded-full", penSize === size ? "bg-accent-soft" : "")}
                  >
                    <span className="rounded-full bg-label" style={{ width: size + 3, height: size + 3 }} />
                  </button>
                ))}
              </>
            ) : null}
            {sep("p2")}
            <ToolButton label="Desfazer traço" icon={Undo2} onClick={undoInk} />
            <ToolButton label="Refazer traço" icon={Redo2} onClick={redoInk} />
            <span className="ml-1 flex-none text-[12px] text-label-3">{pencilOnly ? "Só a Pencil escreve; o dedo rola" : "Dedo e caneta escrevem"}</span>
          </div>
        ) : null}
        {panel === "adesivos" ? (
          <div className="mt-1 border-t border-dashed border-sep px-1 pt-2 pb-1">
            <div className="grid grid-cols-10 gap-1">
              {EMOJI_STICKERS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    addItem({ kind: "adesivo", value: emoji, w: 90, rotation: randomTilt(10) });
                    setPanel(null);
                  }}
                  className="pressable flex aspect-square items-center justify-center rounded-xl bg-fill text-[22px]"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TEXT_STICKERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    addItem({ kind: "adesivo", value: `txt:${t}`, w: 140, rotation: randomTilt(5) });
                    setPanel(null);
                  }}
                  className="pressable text-[26px]"
                >
                  <Sticker value={`txt:${t}`} />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Folha */}
      <div ref={outerRef} className="page-outer relative w-full" style={{ height: pageHeight * scale }}>
        <div
          className={cx("paper print-page absolute top-0 origin-top-left overflow-hidden rounded-[20px] shadow-card", `paper-${paper}`)}
          style={{ ...paperStyle, left: Math.max(0, (width - PAGE_WIDTH * scale) / 2) }}
          onPointerDown={() => {
            if (mode === "mover" || mode === "texto") setSelectedItem(null);
          }}
        >
          <div ref={textRef} className="relative z-[1]" style={{ padding: `${PAD_TOP}px ${PAD_X}px 0` }}>
            <EditorContent editor={editor} />
          </div>

          <div className="absolute inset-0 z-[2]" style={{ pointerEvents: "none" }}>
            {[...items]
              .sort((a, b) => a.z - b.z)
              .map((item) => {
                const isSel = item.id === selectedItem;
                return (
                  <div
                    key={item.id}
                    className={cx("absolute", isSel && "outline-2 outline-offset-4 outline-dashed outline-[var(--accent)]")}
                    style={{
                      left: item.x,
                      top: item.y,
                      width: item.w,
                      transform: `rotate(${item.rotation}deg)`,
                      pointerEvents: inkMode ? "none" : "auto",
                      touchAction: isSel || mode === "mover" ? "none" : "auto",
                      cursor: mode === "mover" || isSel ? "grab" : "default",
                    }}
                    onPointerDown={(e) => itemPointerDown(e, item, "move")}
                    onPointerMove={itemPointerMove}
                    onPointerUp={() => {
                      dragRef.current = null;
                    }}
                  >
                    {item.kind === "imagem" ? (
                      <StoredImage id={item.imageId} className="block w-full rounded-[10px] shadow-sticker" />
                    ) : item.kind === "adesivo" ? (
                      <span className="notebook-sticker relative block text-center" style={{ fontSize: item.w * 0.8, transform: "none", lineHeight: 1 }}>
                        <Sticker value={item.value ?? "⭐"} />
                      </span>
                    ) : (
                      <div className="postit p-3" style={{ background: item.color, minHeight: item.w * 0.9 }}>
                        <textarea
                          value={item.text ?? ""}
                          onChange={(e) => updateItem(item.id, { text: e.target.value })}
                          onPointerDown={(e) => {
                            if (isSel && mode !== "mover") e.stopPropagation();
                          }}
                          placeholder="Escreva aqui…"
                          className="block w-full resize-none bg-transparent text-[20px] leading-[1.25] outline-none placeholder:text-black/30"
                          style={{ minHeight: item.w * 0.9 - 24, pointerEvents: isSel && mode !== "mover" ? "auto" : "none" }}
                        />
                      </div>
                    )}
                    {isSel && !inkMode ? (
                      <>
                        <span
                          role="button"
                          aria-label="Redimensionar"
                          onPointerDown={(e) => itemPointerDown(e, item, "resize")}
                          onPointerMove={itemPointerMove}
                          onPointerUp={() => {
                            dragRef.current = null;
                          }}
                          className="absolute -right-3 -bottom-3 size-7 touch-none rounded-full border-[3px] border-white bg-accent shadow-float"
                        />
                        <div
                          className="no-print material-surface absolute -top-12 left-1/2 flex -translate-x-1/2 gap-0.5 rounded-full p-1 shadow-float"
                          style={{ transform: `translateX(-50%) rotate(${-item.rotation}deg)` }}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <button type="button" aria-label="Menor" onClick={() => updateItem(item.id, { w: Math.max(40, item.w * 0.85) })} className="inline-flex size-8 items-center justify-center rounded-full">
                            <Minus size={15} strokeWidth={2.6} />
                          </button>
                          <button type="button" aria-label="Maior" onClick={() => updateItem(item.id, { w: Math.min(PAGE_WIDTH, item.w * 1.15) })} className="inline-flex size-8 items-center justify-center rounded-full">
                            <Plus size={15} strokeWidth={2.6} />
                          </button>
                          <button type="button" aria-label="Girar" onClick={() => updateItem(item.id, { rotation: ((item.rotation + 15 + 180) % 360) - 180 })} className="inline-flex size-8 items-center justify-center rounded-full">
                            <RotateCw size={15} strokeWidth={2.6} />
                          </button>
                          <button
                            type="button"
                            aria-label="Trazer para frente"
                            onClick={() => updateItem(item.id, { z: items.reduce((m, i) => Math.max(m, i.z), 0) + 1 })}
                            className="inline-flex size-8 items-center justify-center rounded-full"
                          >
                            <ArrowUpToLine size={15} strokeWidth={2.6} />
                          </button>
                          <button
                            type="button"
                            aria-label="Apagar"
                            onClick={() => {
                              setItems((list) => list.filter((i) => i.id !== item.id));
                              setSelectedItem(null);
                            }}
                            className="inline-flex size-8 items-center justify-center rounded-full text-danger"
                          >
                            <Trash2 size={15} strokeWidth={2.4} />
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
          </div>

          <svg
            ref={svgRef}
            className="ink-layer z-[3]"
            width={PAGE_WIDTH}
            height={pageHeight}
            style={{
              pointerEvents: inkMode ? "auto" : "none",
              touchAction: inkMode && !pencilOnly ? "none" : "pan-y",
              cursor: mode === "borracha" ? "cell" : inkMode ? "crosshair" : "default",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {strokes.map((stroke) => (
              <path
                key={stroke.id}
                d={strokePath(stroke, true)}
                fill={stroke.color}
                opacity={stroke.tool === "marca" ? 0.42 : 1}
                style={stroke.tool === "marca" ? { mixBlendMode: "multiply" } : undefined}
              />
            ))}
            {live ? <path d={strokePath(live, true)} fill={live.color} opacity={live.tool === "marca" ? 0.42 : 1} /> : null}
          </svg>
        </div>
      </div>
      {imagePicker.input}
      {inlinePicker.input}
    </div>
  );
}
