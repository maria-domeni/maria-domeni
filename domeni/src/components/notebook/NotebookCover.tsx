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
          "inline-block rounded-[0.35em] px-[0.5em] py-[0.2em] leading-none font-semibold whitespace-nowrap text-[#2b2b2e]",
          className,
        )}
        style={{ background: textStickerColor(text), fontSize: "0.3em", ...style }}
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
 * Capa de caderno (como um caderno de verdade): cor, estampa discreta, foto,
 * etiqueta, elástico e adesivos. O nome fica embaixo da capa, na tela.
 */
export function NotebookCover({
  cover,
  title,
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
      role="img"
      aria-label={`Capa do caderno ${title}`}
      className={cx("notebook", !cover.imageId && `pattern-${cover.pattern}`, className)}
      style={{ "--cover": cover.color, "--cover-ink": ink } as CSSProperties}
    >
      {cover.imageId ? <StoredImage id={cover.imageId} className="notebook-image" /> : null}
      {cover.elastic ? <div className="notebook-elastic" /> : null}
      {cover.label && !cover.imageId ? (
        <div className="notebook-label" aria-hidden>
          <i />
          <i />
        </div>
      ) : null}
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

/** Pasta (para os semestres), no formato das pastas do iPad. */
export function Folder({ color, className, label }: { color: string; className?: string; label?: string }) {
  const back = shadeHex(color, -18);
  return (
    <svg viewBox="0 0 120 92" className={className} role="img" aria-label={label ?? "Pasta"}>
      <path d="M8 14 C 8 9 11 6 16 6 L 44 6 C 48 6 50 8 52 11 L 55 15 L 104 15 C 109 15 112 18 112 23 L 112 30 L 8 30 Z" fill={back} />
      <rect x={8} y={20} width={104} height={66} rx={8} fill={color} />
      <rect x={8} y={20} width={104} height={66} rx={8} fill="url(#folder-shine)" />
      <defs>
        <linearGradient id="folder-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.04" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function shadeHex(hex: string, amount: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + amount);
  const g = clamp(((n >> 8) & 255) + amount);
  const b = clamp((n & 255) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
