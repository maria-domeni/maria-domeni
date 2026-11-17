"use client";

import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
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
  Bold,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Redo2,
  TextQuote,
  Trash2,
  Underline,
  Undo2,
} from "lucide-react";
import { useRef, type ComponentType } from "react";
import { cx } from "@/components/ui/basics";
import { useImagePicker } from "@/components/ui/media";
import { useToast } from "@/components/ui/overlays";
import { ImageError, saveImage } from "@/lib/images";
import { useImageUrl } from "@/lib/useImage";

const NOTE_IMAGE_MAX_EDGE = 2000;

type ImageSize = "p" | "m" | "g";
const IMAGE_SIZES: { value: ImageSize; label: string; title: string }[] = [
  { value: "p", label: "P", title: "Pequena" },
  { value: "m", label: "M", title: "Média" },
  { value: "g", label: "G", title: "Largura toda" },
];

/** Como a imagem aparece dentro da anotação, com os controles quando selecionada. */
function ImageView({ node, selected, updateAttributes, deleteNode, editor }: NodeViewProps) {
  const image = useImageUrl(node.attrs.imageId as string | null);
  const size = (node.attrs.size as ImageSize) ?? "g";
  return (
    <NodeViewWrapper className={cx("atlas-image", selected && "is-selected")} data-size={size} data-drag-handle>
      {image.status === "pronto" ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagem local (blob)
        <img src={image.url} alt="" draggable={false} />
      ) : image.status === "ausente" ? (
        <div className="flex h-24 items-center justify-center rounded-[14px] bg-fill text-[14px] leading-normal text-label-2">
          Imagem não encontrada
        </div>
      ) : (
        <div className="h-40 rounded-[14px] bg-fill" />
      )}
      {selected && editor.isEditable ? (
        <div
          contentEditable={false}
          className="material-surface absolute top-2 right-2 flex items-center gap-0.5 rounded-full p-1 leading-normal shadow-float"
        >
          {IMAGE_SIZES.map((option) => (
            <button
              key={option.value}
              type="button"
              title={option.title}
              aria-label={`Tamanho: ${option.title}`}
              aria-pressed={size === option.value}
              onClick={() => updateAttributes({ size: option.value })}
              className={cx(
                "pressable inline-flex size-9 items-center justify-center rounded-full text-[14px] font-bold",
                size === option.value ? "bg-accent-solid text-white" : "text-label",
              )}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            title="Remover imagem"
            aria-label="Remover imagem"
            onClick={() => deleteNode()}
            className="pressable inline-flex size-9 items-center justify-center rounded-full text-danger"
          >
            <Trash2 size={17} strokeWidth={2.2} />
          </button>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

/**
 * Imagem da anotação. O HTML guarda só o id (data-image-id); os bytes ficam
 * no banco do aparelho. Imagens com endereço externo não são aceitas.
 */
const AtlasImage = Node.create({
  name: "atlasImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      imageId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-image-id"),
        renderHTML: (attributes) => ({ "data-image-id": attributes.imageId as string }),
      },
      size: {
        default: "g",
        parseHTML: (element) => {
          const value = element.getAttribute("data-size");
          return value === "p" || value === "m" ? value : "g";
        },
        renderHTML: (attributes) => ({ "data-size": attributes.size as string }),
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
    return ReactNodeViewRenderer(ImageView);
  },
});

function imageFiles(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));
}

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
  const toast = useToast();
  const editorRef = useRef<Editor | null>(null);

  const insertImage = (imageId: string) => {
    editorRef.current?.chain().focus().insertContent({ type: "atlasImage", attrs: { imageId } }).run();
  };

  async function insertFiles(files: File[]) {
    try {
      for (const file of files) insertImage(await saveImage(file, { maxEdge: NOTE_IMAGE_MAX_EDGE }));
    } catch (error) {
      toast(error instanceof ImageError ? error.message : "Não foi possível adicionar a imagem.");
    }
  }

  const picker = useImagePicker({ maxEdge: NOTE_IMAGE_MAX_EDGE, multiple: true, onPicked: insertImage });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, protocols: ["http", "https"] },
      }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      AtlasImage,
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "atlas-prose", "aria-label": label, role: "textbox", "aria-multiline": "true" },
      // colar ou soltar uma imagem guarda o arquivo no aparelho e insere na anotação
      handlePaste: (_view, event) => {
        const files = imageFiles(event.clipboardData?.files);
        if (files.length === 0) return false;
        event.preventDefault();
        void insertFiles(files);
        return true;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const files = imageFiles((event as DragEvent).dataTransfer?.files);
        if (files.length === 0) return false;
        event.preventDefault();
        void insertFiles(files);
        return true;
      },
    },
    onCreate: ({ editor: current }) => {
      editorRef.current = current;
    },
    onDestroy: () => {
      editorRef.current = null;
    },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? "" : current.getHTML()),
  });

  return (
    <div className="rounded-[20px] bg-surface shadow-card">
      <Toolbar editor={editor} onAddImage={picker.pick} imageBusy={picker.busy} />
      <EditorContent editor={editor} />
      {picker.input}
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

function Toolbar({
  editor,
  onAddImage,
  imageBusy,
}: {
  editor: Editor | null;
  onAddImage: () => void;
  imageBusy: boolean;
}) {
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
    [{ key: "image", label: "Imagem", icon: ImagePlus, disabled: imageBusy, run: onAddImage }],
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
