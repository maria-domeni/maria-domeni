"use client";

import { Headphones, Minus, X } from "lucide-react";
import { Link, cx } from "@/components/ui/basics";
import { useSettingsOrDefault } from "@/lib/hooks";
import { setMusicOpen, spotifyEmbedUrl, stopMusic, useMusic } from "./music";

/**
 * Tocador do Spotify que fica por cima das telas. Ao minimizar, o tocador
 * continua carregado (a música não para) e vira um botãozinho.
 */
export function SpotifyDock() {
  const { open, started } = useMusic();
  const settings = useSettingsOrDefault();
  const embed = settings.spotifyUrl ? spotifyEmbedUrl(settings.spotifyUrl) : null;
  if (!started) return null;

  return (
    <div
      className={cx(
        "spotify-dock no-print fixed z-50",
        "bottom-[calc(var(--tab-h)+env(safe-area-inset-bottom)+20px)] left-3 md:bottom-5 md:left-[calc(var(--sidebar-w)+20px)]",
      )}
    >
      <div className={cx("card w-[min(340px,calc(100vw-110px))] overflow-hidden p-2", !open && "sr-only")}>
        <div className="flex items-center gap-2 px-1.5 pb-1.5">
          <Headphones size={17} strokeWidth={2.4} className="text-[#1db954]" />
          <span className="flex-1 text-[14px] font-bold">Música</span>
          <button
            type="button"
            onClick={() => setMusicOpen(false)}
            aria-label="Minimizar música"
            className="pressable inline-flex size-8 items-center justify-center rounded-full bg-fill text-label-2"
          >
            <Minus size={16} strokeWidth={2.6} />
          </button>
        </div>
        {embed ? (
          <iframe
            title="Spotify"
            src={embed}
            width="100%"
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-[14px] border-0"
          />
        ) : (
          <div className="rounded-[14px] bg-fill px-3 py-4 text-[14px] leading-5 text-label-2">
            Cole o link de uma playlist, álbum ou podcast do Spotify em{" "}
            <Link to="#/ajustes/integracoes" onClick={() => setMusicOpen(false)} className="font-bold text-accent">
              Ajustes › Integrações
            </Link>
            .
          </div>
        )}
      </div>
      {!open ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMusicOpen(true)}
            className="pressable inline-flex h-11 items-center gap-2 rounded-full bg-surface px-3.5 text-[14px] font-bold shadow-float"
          >
            <Headphones size={18} strokeWidth={2.4} className="text-[#1db954]" />
            Música
          </button>
          <button
            type="button"
            onClick={stopMusic}
            aria-label="Fechar o tocador"
            title="Fechar o tocador"
            className="pressable inline-flex size-9 items-center justify-center rounded-full bg-surface text-label-3 shadow-card"
          >
            <X size={15} strokeWidth={2.6} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
