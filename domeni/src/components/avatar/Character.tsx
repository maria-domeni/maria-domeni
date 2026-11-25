"use client";

import { useId } from "react";
import type { Mood } from "@/lib/alerts";
import type { AvatarConfig } from "@/lib/types";

/**
 * O personagem do Domeni: um bichinho de traço simples (gato, coelho, urso,
 * raposa, pinguim ou bolinha), com cor, olhos e acessório escolhidos pela
 * pessoa, e expressão que muda com o humor do momento.
 */

const INK = "#2b2b2e";
const BLUSH = "#f4a3b4";

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + amount);
  const g = clamp(((n >> 8) & 255) + amount);
  const b = clamp((n & 255) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function isDark(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum < 110;
}

const BODY = "M60 30 C 88 30 100 52 100 78 C 100 100 85 108 60 108 C 35 108 20 100 20 78 C 20 52 32 30 60 30 Z";

function Ears({ config, fill, inner }: { config: AvatarConfig; fill: string; inner: string }) {
  switch (config.species) {
    case "gato":
      return (
        <g>
          <path d="M31 50 L 29 21 C 29 18 32 17 34 19 L 52 35 Z" fill={fill} />
          <path d="M89 50 L 91 21 C 91 18 88 17 86 19 L 68 35 Z" fill={fill} />
          <path d="M34 42 L 33 27 L 44 36 Z" fill={inner} />
          <path d="M86 42 L 87 27 L 76 36 Z" fill={inner} />
        </g>
      );
    case "coelho":
      return (
        <g>
          <ellipse cx={45} cy={22} rx={8.5} ry={21} transform="rotate(-12 45 22)" fill={fill} />
          <ellipse cx={75} cy={22} rx={8.5} ry={21} transform="rotate(12 75 22)" fill={fill} />
          <ellipse cx={45} cy={23} rx={4} ry={14} transform="rotate(-12 45 23)" fill={inner} />
          <ellipse cx={75} cy={23} rx={4} ry={14} transform="rotate(12 75 23)" fill={inner} />
        </g>
      );
    case "urso":
      return (
        <g>
          <circle cx={36} cy={38} r={11} fill={fill} />
          <circle cx={84} cy={38} r={11} fill={fill} />
          <circle cx={36} cy={39} r={5.5} fill={inner} />
          <circle cx={84} cy={39} r={5.5} fill={inner} />
        </g>
      );
    case "raposa":
      return (
        <g>
          <path d="M28 54 L 26 16 L 56 36 Z" fill={fill} />
          <path d="M92 54 L 94 16 L 64 36 Z" fill={fill} />
          <path d="M27 24 L 26 16 L 34 21 Z" fill={INK} opacity={0.75} />
          <path d="M93 24 L 94 16 L 86 21 Z" fill={INK} opacity={0.75} />
          <path d="M32 44 L 31 26 L 46 36 Z" fill={inner} />
          <path d="M88 44 L 89 26 L 74 36 Z" fill={inner} />
        </g>
      );
    case "bolinha":
      return (
        <g>
          <path d="M60 31 C 60 24 61 20 63 16" stroke="#6f9e7c" strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <path d="M63 17 C 70 10 80 12 81 17 C 74 22 67 21 63 17 Z" fill="#8cbf95" />
          <path d="M62 19 C 56 13 47 15 46 20 C 52 24 58 23 62 19 Z" fill="#a6d1ad" />
        </g>
      );
    default:
      return null;
  }
}

function Eyes({ config, mood, light }: { config: AvatarConfig; mood: Mood; light: boolean }) {
  const ink = light ? "#ffffff" : INK;
  const kind = mood === "sonolenta" ? "sonolentos" : config.eyes;
  const y = 67;
  const left = 48;
  const right = 72;
  switch (kind) {
    case "felizes":
      return (
        <g fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round">
          <path d={`M${left - 4.5} ${y + 1.5} Q ${left} ${y - 4} ${left + 4.5} ${y + 1.5}`} />
          <path d={`M${right - 4.5} ${y + 1.5} Q ${right} ${y - 4} ${right + 4.5} ${y + 1.5}`} />
        </g>
      );
    case "sonolentos":
      return (
        <g fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round">
          <path d={`M${left - 4.5} ${y} Q ${left} ${y + 3.5} ${left + 4.5} ${y}`} />
          <path d={`M${right - 4.5} ${y} Q ${right} ${y + 3.5} ${right + 4.5} ${y}`} />
        </g>
      );
    case "brilhantes":
      return (
        <g>
          <ellipse cx={left} cy={y} rx={4.6} ry={5.4} fill={ink} />
          <ellipse cx={right} cy={y} rx={4.6} ry={5.4} fill={ink} />
          <circle cx={left + 1.6} cy={y - 2} r={1.7} fill={light ? INK : "#fff"} />
          <circle cx={right + 1.6} cy={y - 2} r={1.7} fill={light ? INK : "#fff"} />
          <circle cx={left - 1.6} cy={y + 2.2} r={0.9} fill={light ? INK : "#fff"} />
          <circle cx={right - 1.6} cy={y + 2.2} r={0.9} fill={light ? INK : "#fff"} />
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx={left} cy={y} rx={3.2} ry={3.8} fill={ink} />
          <ellipse cx={right} cy={y} rx={3.2} ry={3.8} fill={ink} />
          <circle cx={left + 1} cy={y - 1.4} r={1} fill={light ? INK : "#fff"} />
          <circle cx={right + 1} cy={y - 1.4} r={1} fill={light ? INK : "#fff"} />
        </g>
      );
  }
}

function Mouth({ config, mood, light }: { config: AvatarConfig; mood: Mood; light: boolean }) {
  const ink = light ? "#ffffff" : INK;
  if (config.species === "pinguim") {
    return <path d="M55.5 74 L 64.5 74 L 60 80 Z" fill="#f2a541" />;
  }
  const nose =
    config.species === "urso" ? (
      <ellipse cx={60} cy={74} rx={3.4} ry={2.4} fill={ink} />
    ) : config.species === "gato" || config.species === "raposa" ? (
      <path d="M57.6 73 L 62.4 73 L 60 75.6 Z" fill={config.species === "gato" ? "#e89aa9" : ink} />
    ) : config.species === "coelho" ? (
      <path d="M58 73 L 62 73 L 60 75 Z" fill="#e89aa9" />
    ) : null;
  if (mood === "preocupada") {
    return (
      <g>
        {nose}
        <ellipse cx={60} cy={80} rx={2.4} ry={2.8} fill={ink} />
      </g>
    );
  }
  const smile =
    config.species === "gato" || config.species === "coelho" ? (
      <path d="M55 77 Q 57.5 80 60 77 Q 62.5 80 65 77" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />
    ) : (
      <path d="M56 78 Q 60 81.5 64 78" fill="none" stroke={ink} strokeWidth={2.1} strokeLinecap="round" />
    );
  return (
    <g>
      {nose}
      {smile}
    </g>
  );
}

function Accessory({ config }: { config: AvatarConfig }) {
  switch (config.accessory) {
    case "laco":
      return (
        <g transform="translate(80 40) rotate(16)">
          <path d="M0 0 C -10 -8 -13 5 -2 3 Z" fill="#e8799e" />
          <path d="M0 0 C 10 -8 13 5 2 3 Z" fill="#e8799e" />
          <circle cx={0} cy={1} r={2.8} fill="#c95a80" />
        </g>
      );
    case "oculos":
      return (
        <g fill="none" stroke={INK} strokeWidth={1.8}>
          <circle cx={48} cy={67} r={7.5} fill="rgba(255,255,255,0.15)" />
          <circle cx={72} cy={67} r={7.5} fill="rgba(255,255,255,0.15)" />
          <path d="M55.5 66 Q 60 64 64.5 66" />
        </g>
      );
    case "fones":
      return (
        <g>
          <path d="M24 66 C 22 26 98 26 96 66" fill="none" stroke="#3a3a40" strokeWidth={4} strokeLinecap="round" />
          <rect x={17} y={58} width={10} height={17} rx={5} fill="#3a3a40" />
          <rect x={93} y={58} width={10} height={17} rx={5} fill="#3a3a40" />
        </g>
      );
    case "cachecol":
      return (
        <g>
          <path d="M28 88 C 45 96 75 96 92 88 L 92 95 C 75 103 45 103 28 95 Z" fill="#c95a6a" />
          <rect x={70} y={93} width={9} height={17} rx={3} fill="#b44c5c" />
        </g>
      );
    case "boina":
      return (
        <g>
          <ellipse cx={58} cy={33} rx={27} ry={9} fill="#3f3d45" />
          <circle cx={58} cy={24} r={2.6} fill="#3f3d45" />
        </g>
      );
    case "flor":
      return (
        <g transform="translate(37 38)">
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse key={deg} cx={0} cy={-5} rx={3.6} ry={5.4} fill="#fff" transform={`rotate(${deg})`} />
          ))}
          <circle r={3} fill="#f2c94c" />
        </g>
      );
    default:
      return null;
  }
}

export function Character({
  config,
  mood = "feliz",
  size = 96,
  background,
  className,
}: {
  config: AvatarConfig;
  mood?: Mood;
  size?: number;
  /** Cor do círculo de fundo (sem fundo se não informado) */
  background?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const base = config.color;
  const penguin = config.species === "pinguim";
  const light = isDark(base) && !penguin;
  const inner = penguin ? base : "#f2b7c2";
  const belly = penguin ? "#f7f5f2" : shade(base, 18);
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} role="img" aria-label={`${config.name}, seu bichinho`}>
      <defs>
        <clipPath id={`clip-${id}`}>
          <circle cx={60} cy={60} r={60} />
        </clipPath>
        <linearGradient id={`fur-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(base, 10)} />
          <stop offset="1" stopColor={shade(base, -10)} />
        </linearGradient>
      </defs>
      {background ? <circle cx={60} cy={60} r={60} fill={background} /> : null}
      <g clipPath={background ? `url(#clip-${id})` : undefined} transform={background ? "translate(0 4)" : undefined}>
        {config.species === "gato" ? (
          <path d="M96 94 C 112 90 112 68 104 62" fill="none" stroke={shade(base, -8)} strokeWidth={7} strokeLinecap="round" />
        ) : null}
        {config.species === "raposa" ? (
          <path d="M94 98 C 116 96 116 70 104 64 C 108 78 102 88 92 90 Z" fill={shade(base, -6)} />
        ) : null}
        <Ears config={config} fill={penguin ? base : shade(base, -4)} inner={inner} />
        <path d={BODY} fill={`url(#fur-${id})`} />
        {penguin ? (
          <path d="M60 46 C 80 46 88 62 86 80 C 84 96 74 104 60 104 C 46 104 36 96 34 80 C 32 62 40 46 60 46 Z" fill={belly} />
        ) : config.species === "raposa" ? (
          <path d="M36 74 C 44 88 76 88 84 74 C 80 92 70 100 60 100 C 50 100 40 92 36 74 Z" fill="#fbf7f2" />
        ) : (
          <ellipse cx={60} cy={95} rx={21} ry={10} fill={belly} opacity={0.9} />
        )}
        {/* patinhas */}
        <ellipse cx={47} cy={106} rx={7} ry={3.6} fill={penguin ? "#f2a541" : shade(base, -16)} />
        <ellipse cx={73} cy={106} rx={7} ry={3.6} fill={penguin ? "#f2a541" : shade(base, -16)} />
        {mood === "preocupada" ? (
          <g stroke={light ? "#fff" : INK} strokeWidth={1.8} strokeLinecap="round">
            <path d="M43 59 L 51 57" />
            <path d="M77 59 L 69 57" />
          </g>
        ) : null}
        <Eyes config={config} mood={mood} light={light} />
        {config.blush ? (
          <g fill={BLUSH} opacity={0.45}>
            <ellipse cx={40} cy={76} rx={5} ry={3} />
            <ellipse cx={80} cy={76} rx={5} ry={3} />
          </g>
        ) : null}
        <Mouth config={config} mood={mood} light={light} />
        <Accessory config={config} />
        {mood === "preocupada" ? <path d="M94 50 C 92 54 92 57 95 57 C 98 57 98 54 94 50 Z" fill="#8fc3ec" /> : null}
        {mood === "animada" ? (
          <g fill="#f2c94c">
            <path d="M102 26 l1.6 4.6 4.6 1.6 -4.6 1.6 -1.6 4.6 -1.6 -4.6 -4.6 -1.6 4.6 -1.6z" />
            <path d="M18 36 l1.2 3.4 3.4 1.2 -3.4 1.2 -1.2 3.4 -1.2 -3.4 -3.4 -1.2 3.4 -1.2z" />
          </g>
        ) : null}
        {mood === "sonolenta" ? (
          <text x={92} y={34} fontSize={13} fontWeight={700} fill="#8a8a92" fontFamily="system-ui">
            z
          </text>
        ) : null}
      </g>
    </svg>
  );
}
