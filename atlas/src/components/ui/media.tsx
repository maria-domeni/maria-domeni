"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { IMAGE_ACCEPT, ImageError, saveImage } from "@/lib/images";
import type { Cover } from "@/lib/types";
import { useImageUrl } from "@/lib/useImage";
import { cx, tint } from "./basics";
import { useToast } from "./overlays";

/** Imagem guardada no aparelho. Sem imagem (ou enquanto carrega) não mostra nada. */
export function StoredImage({
  id,
  className,
  alt = "",
}: {
  id: string | null | undefined;
  className?: string;
  alt?: string;
}) {
  const image = useImageUrl(id);
  if (image.status !== "pronto") return null;
  // eslint-disable-next-line @next/next/no-img-element -- imagem local (blob), sem otimização possível
  return <img src={image.url} alt={alt} className={className} draggable={false} />;
}

export function Avatar({
  imageId,
  name,
  size = 36,
  className,
}: {
  imageId: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const image = useImageUrl(imageId);
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className={cx(
        "inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-accent-soft font-bold text-accent",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {image.status === "pronto" ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagem local (blob)
        <img src={image.url} alt="" className="size-full object-cover" draggable={false} />
      ) : (
        initial || "A"
      )}
    </span>
  );
}

/** Faixa de capa: gradiente pronto ou imagem enviada. */
export function CoverBox({
  cover,
  className,
  children,
}: {
  cover: Cover;
  className?: string;
  children?: ReactNode;
}) {
  const image = useImageUrl(cover.kind === "imagem" ? cover.imageId : null);
  const hasImage = image.status === "pronto";
  return (
    <div className={cx("cover", `cover-${cover.preset}`, hasImage && "has-image", className)}>
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagem local (blob)
        <img src={image.url} alt="" className="cover-image" draggable={false} />
      ) : null}
      {children}
    </div>
  );
}

/** Capa de uma disciplina: a imagem dela ou um gradiente na cor dela. */
export function DisciplineCover({
  color,
  imageId,
  className,
  children,
}: {
  color: string;
  imageId: string | null | undefined;
  className?: string;
  children?: ReactNode;
}) {
  const image = useImageUrl(imageId);
  const hasImage = image.status === "pronto";
  return (
    <div {...tint(color, cx("cover cover-dc", hasImage && "has-image", className))}>
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagem local (blob)
        <img src={image.url} alt="" className="cover-image" draggable={false} />
      ) : null}
      {children}
    </div>
  );
}

/**
 * Abre a galeria/arquivos do aparelho, guarda a imagem escolhida e devolve o id.
 * Use `input` em algum lugar da tela e chame `pick()` no botão.
 */
export function useImagePicker(options: {
  maxEdge: number;
  multiple?: boolean;
  onPicked: (imageId: string) => void | Promise<void>;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const id = await saveImage(file, { maxEdge: options.maxEdge });
        await options.onPicked(id);
      }
    } catch (error) {
      toast(error instanceof ImageError ? error.message : "Não foi possível adicionar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  const input = (
    <input
      ref={ref}
      type="file"
      accept={IMAGE_ACCEPT}
      multiple={options.multiple}
      className="hidden"
      tabIndex={-1}
      aria-hidden
      onChange={(event) => {
        const files = event.target.files;
        void handle(files).finally(() => {
          event.target.value = "";
        });
      }}
    />
  );

  return { input, pick: () => ref.current?.click(), busy };
}

/** Campo de formulário para escolher, trocar ou remover uma imagem. */
export function ImageField({
  imageId,
  onChange,
  maxEdge,
  label,
  shape = "wide",
  placeholder,
}: {
  imageId: string | null;
  onChange: (imageId: string | null) => void;
  maxEdge: number;
  label: string;
  shape?: "wide" | "round";
  placeholder?: ReactNode;
}) {
  const picker = useImagePicker({ maxEdge, onPicked: (id) => onChange(id) });
  const image = useImageUrl(imageId);
  const round = shape === "round";
  return (
    <div className={cx("flex items-center gap-3", !round && "flex-col items-stretch")}>
      <button
        type="button"
        onClick={picker.pick}
        aria-label={imageId ? `Trocar ${label}` : `Escolher ${label}`}
        className={cx(
          "pressable relative flex flex-none items-center justify-center overflow-hidden bg-fill text-label-2",
          round ? "size-[72px] rounded-full" : "h-[120px] w-full rounded-[16px]",
        )}
      >
        {image.status === "pronto" ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagem local (blob)
          <img src={image.url} alt="" className="size-full object-cover" draggable={false} />
        ) : (
          (placeholder ?? (
            <span className="flex flex-col items-center gap-1 text-[14px] font-medium">
              <ImagePlus size={22} strokeWidth={2} />
              {round ? null : "Escolher imagem"}
            </span>
          ))
        )}
      </button>
      <div className={cx("flex gap-2", round && "flex-col items-start")}>
        <button
          type="button"
          onClick={picker.pick}
          disabled={picker.busy}
          className="pressable inline-flex h-9 items-center gap-1.5 rounded-full bg-accent-soft px-3.5 text-[15px] font-semibold text-accent disabled:opacity-40"
        >
          <ImagePlus size={16} strokeWidth={2.4} />
          {picker.busy ? "Preparando…" : imageId ? "Trocar" : `Escolher ${label}`}
        </button>
        {imageId ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="pressable inline-flex h-9 items-center gap-1 rounded-full bg-fill px-3.5 text-[15px] font-semibold text-label"
          >
            <X size={15} strokeWidth={2.6} />
            Remover
          </button>
        ) : null}
      </div>
      {picker.input}
    </div>
  );
}

const EMOJIS = [
  "📘", "📗", "📕", "📙", "📓", "🧠", "💬", "🫀", "🧪", "🔬",
  "🧬", "⚖️", "🏥", "🩺", "👶", "👥", "🏫", "📊", "🧮", "💻",
  "🎨", "🎭", "🌍", "📜", "✍️", "💡", "🔎", "🗂️", "🕊️", "⭐",
];

export function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  return (
    <div>
      <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label="Símbolo">
        {EMOJIS.map((emoji) => {
          const selected = emoji === value;
          return (
            <button
              key={emoji}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Símbolo ${emoji}`}
              onClick={() => onChange(selected ? "" : emoji)}
              className={cx(
                "pressable flex aspect-square items-center justify-center rounded-[11px] text-[22px] leading-none",
                selected ? "bg-accent-soft shadow-[inset_0_0_0_2px_var(--accent)]" : "bg-fill",
              )}
            >
              {emoji}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 px-0.5 text-[13px] leading-[17px] text-label-3">
        Toque de novo para tirar o símbolo.
      </p>
    </div>
  );
}
