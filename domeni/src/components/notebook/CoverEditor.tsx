"use client";

import { RotateCw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { cx } from "@/components/ui/basics";
import { CustomColorSwatch, Switch } from "@/components/ui/fields";
import { ImageField } from "@/components/ui/media";
import { Sheet } from "@/components/ui/overlays";
import { newId } from "@/lib/ids";
import { COVER_PATTERNS, COVER_PATTERN_LABEL, type CoverSticker, type NotebookCover as Cover } from "@/lib/types";
import { NotebookCover, Sticker } from "./NotebookCover";
import { EMOJI_STICKERS, TEXT_STICKERS } from "./stickers";

export const COVER_COLORS = [
  "#f4b6c8", "#f08bb0", "#8e2f55", "#5c1f3a", "#c9b6f0", "#9d86e0",
  "#a9c8ee", "#2f4f7a", "#a8d5c2", "#5e8c6a", "#f7d08a", "#e9967a",
  "#e9e4dc", "#c8b6a6", "#2b2b30", "#f5f5f2",
];

function randomIn(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Folha para personalizar a capa: cor, estampa, foto, etiqueta, elástico e adesivos. */
export function CoverEditor({
  open,
  onClose,
  value,
  title,
  subtitle,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  value: Cover;
  title: string;
  subtitle?: string;
  onSave: (cover: Cover) => Promise<void> | void;
}) {
  const [cover, setCover] = useState<Cover>(value);
  const [selected, setSelected] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; pointerId: number } | null>(null);

  const patch = (p: Partial<Cover>) => setCover((c) => ({ ...c, ...p }));
  const updateSticker = (id: string, p: Partial<CoverSticker>) =>
    setCover((c) => ({ ...c, stickers: c.stickers.map((s) => (s.id === id ? { ...s, ...p } : s)) }));

  function addSticker(value: string) {
    const sticker: CoverSticker = {
      id: newId(),
      value,
      x: randomIn(0.25, 0.75),
      y: randomIn(0.55, 0.85),
      size: value.startsWith("txt:") ? 0.32 : 0.2,
      rotation: Math.round(randomIn(-15, 15)),
    };
    setCover((c) => ({ ...c, stickers: [...c.stickers, sticker].slice(-24) }));
    setSelected(sticker.id);
  }

  function moveTo(event: React.PointerEvent) {
    const box = previewRef.current?.getBoundingClientRect();
    if (!box || !drag.current) return;
    const x = Math.min(0.98, Math.max(0.02, (event.clientX - box.left) / box.width));
    const y = Math.min(0.98, Math.max(0.02, (event.clientY - box.top) / box.height));
    updateSticker(drag.current.id, { x, y });
  }

  const current = cover.stickers.find((s) => s.id === selected) ?? null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Personalizar capa"
      submitLabel="Salvar capa"
      onSubmit={() => onSave(cover)}
      wide
    >
      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <div>
          <div
            ref={previewRef}
            className="relative mx-auto w-[220px] touch-none select-none md:w-full"
            style={{ containerType: "inline-size" }}
            onPointerMove={(event) => {
              if (drag.current?.pointerId === event.pointerId) moveTo(event);
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <NotebookCover cover={{ ...cover, stickers: [] }} title={title} subtitle={subtitle} />
            {cover.stickers.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                aria-label="Mover adesivo"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  drag.current = { id: sticker.id, pointerId: event.pointerId };
                  setSelected(sticker.id);
                }}
                className={cx(
                  "notebook-sticker absolute cursor-grab touch-none",
                  selected === sticker.id && "outline-2 outline-offset-4 outline-dashed outline-[var(--accent)]",
                )}
                style={{
                  left: `${sticker.x * 100}%`,
                  top: `${sticker.y * 100}%`,
                  fontSize: `${sticker.size * 100}cqw`,
                  transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
                }}
              >
                <Sticker value={sticker.value} />
              </button>
            ))}
          </div>
          {current ? (
            <div className="mt-4 rounded-2xl bg-fill p-3">
              <p className="text-[13px] font-bold text-label-2">Adesivo selecionado</p>
              <label className="mt-2 flex items-center gap-3 text-[14px] font-semibold">
                Tamanho
                <input
                  type="range"
                  min={0.08}
                  max={0.5}
                  step={0.01}
                  value={current.size}
                  onChange={(e) => updateSticker(current.id, { size: Number(e.target.value) })}
                  className="flex-1 accent-[var(--accent)]"
                />
              </label>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => updateSticker(current.id, { rotation: ((current.rotation + 20 + 180) % 360) - 180 })}
                  className="pressable inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-[14px] font-bold"
                >
                  <RotateCw size={15} strokeWidth={2.4} /> Girar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCover((c) => ({ ...c, stickers: c.stickers.filter((s) => s.id !== current.id) }));
                    setSelected(null);
                  }}
                  className="pressable inline-flex h-9 items-center gap-1.5 rounded-full bg-danger-soft px-3 text-[14px] font-bold text-danger"
                >
                  <Trash2 size={15} strokeWidth={2.4} /> Tirar
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-center text-[13px] text-label-3">Arraste os adesivos na capa para mudar de lugar.</p>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[14px] font-bold text-label-2">Cor</p>
            <div className="flex flex-wrap gap-2">
              {COVER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Cor ${color}`}
                  aria-pressed={cover.color === color}
                  onClick={() => patch({ color })}
                  className={cx(
                    "pressable size-9 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]",
                    cover.color === color && "ring-[3px] ring-accent ring-offset-2 ring-offset-surface",
                  )}
                  style={{ background: color }}
                />
              ))}
              <CustomColorSwatch
                value={cover.color}
                selected={!COVER_COLORS.includes(cover.color)}
                onChange={(color) => patch({ color })}
                label="Outra cor"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[14px] font-bold text-label-2">Estampa</p>
            <div className="grid grid-cols-4 gap-2">
              {COVER_PATTERNS.map((pattern) => (
                <button
                  key={pattern}
                  type="button"
                  onClick={() => patch({ pattern, imageId: null })}
                  aria-pressed={cover.pattern === pattern && !cover.imageId}
                  className={cx(
                    "pressable overflow-hidden rounded-xl text-[12px] font-bold",
                    cover.pattern === pattern && !cover.imageId ? "ring-[3px] ring-accent" : "ring-1 ring-sep",
                  )}
                >
                  <span className={cx("block h-11", `pattern-${pattern}`)} style={{ backgroundColor: cover.color }} />
                  <span className="block bg-surface py-1">{COVER_PATTERN_LABEL[pattern]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[14px] font-bold text-label-2">Foto na capa</p>
            <ImageField
              imageId={cover.imageId}
              onChange={(imageId) => patch({ imageId })}
              maxEdge={1200}
              label="foto"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-fill px-3.5 py-2.5 text-[15px] font-semibold">
              Etiqueta com o nome
              <Switch checked={cover.label} onChange={(label) => patch({ label })} label="Etiqueta com o nome" />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-fill px-3.5 py-2.5 text-[15px] font-semibold">
              Elástico
              <Switch checked={cover.elastic} onChange={(elastic) => patch({ elastic })} label="Elástico" />
            </label>
          </div>

          <div>
            <p className="mb-2 text-[14px] font-bold text-label-2">Adesivos</p>
            <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
              {EMOJI_STICKERS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addSticker(emoji)}
                  aria-label={`Adesivo ${emoji}`}
                  className="pressable flex aspect-square items-center justify-center rounded-xl bg-fill text-[22px]"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TEXT_STICKERS.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => addSticker(`txt:${text}`)}
                  className="pressable rounded-full text-[24px]"
                >
                  <Sticker value={`txt:${text}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
