"use client";

import type { CSSProperties } from "react";
import { StoredImage } from "@/components/ui/media";
import { contrast } from "@/lib/color";
import type { NotebookCover as Cover } from "@/lib/types";
import { cx } from "@/components/ui/basics";
import { isTextSticker, textStickerColor } from "./stickers";

/** Cor do texto que fica legível sobre a capa. */
export function inkFor(color: string): string {
  return contrast(color, "#2b1a22") >= contrast(color, "#ffffff") ? "#2b1a22" : "#ffffff";
}

export function Sticker({ value, className, style }: { value: string; className?: string; style?: CSSProperties }) {
  if (isTextSticker(value)) {
    const text = value.slice(4);
    return (
      <span
        className={cx(
          "inline-block rounded-[0.5em] px-[0.5em] py-[0.15em] font-hand leading-none font-bold whitespace-nowrap text-[#3a2530]",
          className,
        )}
        style={{ background: textStickerColor(text), fontSize: "0.55em", ...style }}
      >
        {text}
      </span>
    );
  }
  return (
    <span className={className} style={style}>
      {value}
    </span>
  );
}

/**
 * Capa de caderno (semestre ou disciplina): cor, estampa, foto, etiqueta,
 * elástico e adesivos. Tudo escala com a largura da capa.
 */
export function NotebookCover({
  cover,
  title,
  subtitle,
  className,
  children,
}: {
  cover: Cover;
  title: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const ink = inkFor(cover.color);
  return (
    <div
      className={cx("notebook", !cover.imageId && `pattern-${cover.pattern}`, className)}
      style={{ "--cover": cover.color, "--cover-ink": ink, containerType: "inline-size" } as CSSProperties}
    >
      {cover.imageId ? <StoredImage id={cover.imageId} className="notebook-image" /> : null}
      {cover.elastic ? <div className="notebook-elastic" /> : null}
      {cover.label ? (
        <div className="notebook-label">
          <div className="font-display leading-[1.1] font-bold break-words" style={{ fontSize: "clamp(11px, 9.5cqw, 30px)" }}>
            {title}
          </div>
          {subtitle ? (
            <div className="mt-0.5 truncate font-semibold opacity-60" style={{ fontSize: "clamp(9px, 6cqw, 16px)" }}>
              {subtitle}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className="absolute inset-x-[14%] bottom-[10%] font-display leading-tight font-bold break-words"
          style={{ fontSize: "clamp(12px, 10cqw, 32px)", color: ink, textShadow: cover.imageId ? "0 1px 8px rgba(0,0,0,.45)" : undefined }}
        >
          {title}
        </div>
      )}
      {cover.stickers.map((sticker) => (
        <Sticker
          key={sticker.id}
          value={sticker.value}
          className="notebook-sticker"
          style={{
            left: `${sticker.x * 100}%`,
            top: `${sticker.y * 100}%`,
            fontSize: `${sticker.size * 100}cqw`,
            transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
          }}
        />
      ))}
      {children}
    </div>
  );
}
