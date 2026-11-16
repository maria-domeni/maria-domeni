"use client";

import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Redo2,
  TextQuote,
  Underline,
  Undo2,
} from "lucide-react";
import type { ComponentType } from "react";
import { cx } from "@/components/ui/basics";

interface RichEditorProps {
  initialHtml: string;
  onChange: (html: string) => void;
  placeholder: string;
  label: string;
}

/**
 * Editor de texto rico da aula. O conteúdo é guardado como HTML e sempre
 * passa pelo esquema do editor, que descarta qualquer marcação fora da lista
 * de elementos permitidos.
 */
export default function RichEditor({ initialHtml, onChange, placeholder, label }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, protocols: ["http", "https"] },
      }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "atlas-prose", "aria-label": label, role: "textbox", "aria-multiline": "true" },
    },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : current.getHTML()),
  });

  return (
    <div className="rounded-[20px] bg-surface shadow-card">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

type IconType = ComponentType<{ size?: number; strokeWidth?: number }>;

interface Tool {
  key: string;
  label: string;
  icon: IconType;
  active?: boolean;
  disabled?: boolean;
  run: () => void;
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            underline: current.isActive("underline"),
            highlight: current.isActive("highlight"),
            h2: current.isActive("heading", { level: 2 }),
            h3: current.isActive("heading", { level: 3 }),
            bullet: current.isActive("bulletList"),
            ordered: current.isActive("orderedList"),
            task: current.isActive("taskList"),
            quote: current.isActive("blockquote"),
            canUndo: current.can().undo(),
            canRedo: current.can().redo(),
          }
        : null,
  });

  const chain = () => editor?.chain().focus();
  const groups: Tool[][] = [
    [
      { key: "bold", label: "Negrito", icon: Bold, active: state?.bold, run: () => chain()?.toggleBold().run() },
      { key: "italic", label: "Itálico", icon: Italic, active: state?.italic, run: () => chain()?.toggleItalic().run() },
      {
        key: "underline",
        label: "Sublinhado",
        icon: Underline,
        active: state?.underline,
        run: () => chain()?.toggleUnderline().run(),
      },
      {
        key: "highlight",
        label: "Marca-texto",
        icon: Highlighter,
        active: state?.highlight,
        run: () => chain()?.toggleHighlight().run(),
      },
    ],
    [
      {
        key: "h2",
        label: "Título",
        icon: Heading2,
        active: state?.h2,
        run: () => chain()?.toggleHeading({ level: 2 }).run(),
      },
      {
        key: "h3",
        label: "Subtítulo",
        icon: Heading3,
        active: state?.h3,
        run: () => chain()?.toggleHeading({ level: 3 }).run(),
      },
    ],
    [
      { key: "bullet", label: "Lista", icon: List, active: state?.bullet, run: () => chain()?.toggleBulletList().run() },
      {
        key: "ordered",
        label: "Lista numerada",
        icon: ListOrdered,
        active: state?.ordered,
        run: () => chain()?.toggleOrderedList().run(),
      },
      {
        key: "task",
        label: "Lista de tarefas",
        icon: ListChecks,
        active: state?.task,
        run: () => chain()?.toggleTaskList().run(),
      },
      {
        key: "quote",
        label: "Citação",
        icon: TextQuote,
        active: state?.quote,
        run: () => chain()?.toggleBlockquote().run(),
      },
    ],
    [
      {
        key: "undo",
        label: "Desfazer",
        icon: Undo2,
        disabled: !state?.canUndo,
        run: () => chain()?.undo().run(),
      },
      {
        key: "redo",
        label: "Refazer",
        icon: Redo2,
        disabled: !state?.canRedo,
        run: () => chain()?.redo().run(),
      },
    ],
  ];

  return (
    <div
      role="toolbar"
      aria-label="Formatação"
      className="material-surface no-scrollbar sticky top-[calc(var(--nav-h)+env(safe-area-inset-top))] z-20 flex items-center gap-1 overflow-x-auto rounded-t-[20px] border-b border-sep px-2 py-1.5"
    >
      {groups.map((group, index) => (
        <div key={index} className="flex flex-none items-center gap-0.5">
          {index > 0 ? <span aria-hidden className="mx-0.5 h-5 w-px bg-sep" /> : null}
          {group.map((tool) => (
            <button
              key={tool.key}
              type="button"
              aria-label={tool.label}
              title={tool.label}
              aria-pressed={tool.active === undefined ? undefined : tool.active}
              disabled={!editor || tool.disabled}
              // mantém o cursor no texto ao tocar no botão
              onMouseDown={(event) => event.preventDefault()}
              onClick={tool.run}
              className={cx(
                "pressable inline-flex h-10 w-[34px] flex-none items-center justify-center rounded-[10px] disabled:opacity-30",
                tool.active ? "bg-accent-soft text-accent" : "text-label-2",
              )}
            >
              <tool.icon size={19} strokeWidth={2.2} />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
