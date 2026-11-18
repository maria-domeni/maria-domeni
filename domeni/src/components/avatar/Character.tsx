"use client";

import { useId } from "react";
import type { AvatarConfig } from "@/lib/types";
import type { Mood } from "@/lib/alerts";

/**
 * Personagem desenhado em SVG, montado a partir das escolhas da pessoa
 * (pele, cabelo, olhos, boca, acessório, roupa) e do humor do momento.
 */

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function HairBack({ config }: { config: AvatarConfig }) {
  const c = config.hairColor;
  switch (config.hair) {
    case "longo":
      return <path d="M27 58 C 24 24, 96 24, 93 58 L 97 104 C 82 112, 38 112, 23 104 Z" fill={c} />;
    case "franja":
      return <path d="M28 58 C 26 26, 94 26, 92 58 L 93 84 C 84 90, 36 90, 27 84 Z" fill={c} />;
    case "cacheado":
      return (
        <g fill={c}>
          {[
            [30, 46, 13],
            [90, 46, 13],
            [26, 64, 12],
            [94, 64, 12],
            [30, 80, 11],
            [90, 80, 11],
            [38, 92, 10],
            [82, 92, 10],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case "rabo":
      return <path d="M86 40 C 112 44, 112 86, 98 98 C 104 76, 96 58, 84 52 Z" fill={c} />;
    case "tranca":
      return (
        <g fill={c}>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <ellipse cx={28} cy={70 + i * 9} rx={6.5} ry={5.5} />
              <ellipse cx={92} cy={70 + i * 9} rx={6.5} ry={5.5} />
            </g>
          ))}
          <circle cx={28} cy={108} r={3} fill={config.outfit} />
          <circle cx={92} cy={108} r={3} fill={config.outfit} />
        </g>
      );
    default:
      return null;
  }
}

function HairFront({ config }: { config: AvatarConfig }) {
  const c = config.hairColor;
  switch (config.hair) {
    case "careca":
      return <ellipse cx={50} cy={34} rx={7} ry={3.5} fill="#fff" opacity={0.35} />;
    case "curto":
    case "rabo":
    case "coque":
      return (
        <g fill={c}>
          {config.hair === "coque" ? <circle cx={60} cy={20} r={12.5} /> : null}
          <path d="M28 58 C 24 20, 96 20, 92 58 C 88 44, 76 35, 60 37 C 46 35, 33 44, 28 58 Z" />
          <path d="M28 58 C 28 50, 30 46, 33 44 L 31 64 Z" />
          <path d="M92 58 C 92 50, 90 46, 87 44 L 89 64 Z" />
        </g>
      );
    case "franja":
      return <path d="M29 54 L 29 44 C 31 24, 89 24, 91 44 L 91 54 C 80 47, 40 47, 29 54 Z" fill={c} />;
    case "cacheado":
      return (
        <g fill={c}>
          {[
            [36, 34, 11],
            [48, 26, 11],
            [60, 24, 11],
            [72, 26, 11],
            [84, 34, 11],
            [42, 40, 8],
            [78, 40, 8],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case "longo":
    case "tranca":
    default:
      return (
        <path
          d="M28 58 C 26 24, 94 24, 92 58 C 86 44, 72 36, 60 41 C 50 36, 36 42, 28 58 Z"
          fill={c}
        />
      );
  }
}

function Eyes({ config, mood }: { config: AvatarConfig; mood: Mood }) {
  const ink = "#2a1d24";
  const kind = mood === "sonolenta" ? "sonolentos" : config.eyes;
  const left = 47;
  const right = 73;
  const y = 61;
  switch (kind) {
    case "felizes":
      return (
        <g fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round">
          <path d={`M${left - 5} ${y + 1} Q ${left} ${y - 5} ${left + 5} ${y + 1}`} />
          <path d={`M${right - 5} ${y + 1} Q ${right} ${y - 5} ${right + 5} ${y + 1}`} />
        </g>
      );
    case "sonolentos":
      return (
        <g fill="none" stroke={ink} strokeWidth={2.8} strokeLinecap="round">
          <path d={`M${left - 5} ${y} Q ${left} ${y + 4} ${left + 5} ${y}`} />
          <path d={`M${right - 5} ${y} Q ${right} ${y + 4} ${right + 5} ${y}`} />
        </g>
      );
    case "estrela": {
      const star = (cx: number) =>
        Array.from({ length: 10 }, (_, i) => {
          const r = i % 2 === 0 ? 5.5 : 2.4;
          const a = (Math.PI / 5) * i - Math.PI / 2;
          return `${cx + r * Math.cos(a)},${y + r * Math.sin(a)}`;
        }).join(" ");
      return (
        <g fill={ink}>
          <polygon points={star(left)} />
          <polygon points={star(right)} />
        </g>
      );
    }
    default:
      return (
        <g>
          <ellipse cx={left} cy={y} rx={4.4} ry={5.2} fill={ink} />
          <ellipse cx={right} cy={y} rx={4.4} ry={5.2} fill={ink} />
          <circle cx={left + 1.6} cy={y - 2} r={1.5} fill="#fff" />
          <circle cx={right + 1.6} cy={y - 2} r={1.5} fill="#fff" />
        </g>
      );
  }
}

function Mouth({ config, mood }: { config: AvatarConfig; mood: Mood }) {
  const ink = "#2a1d24";
  if (mood === "preocupada") {
    return <ellipse cx={60} cy={77} rx={3.2} ry={3.8} fill={ink} />;
  }
  if (mood === "sonolenta") {
    return <path d="M56 77 Q 60 79 64 77" fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />;
  }
  switch (config.mouth) {
    case "aberto":
      return (
        <g>
          <path d="M52 73 Q 60 86 68 73 Z" fill={ink} />
          <path d="M55.5 78.5 Q 60 82 64.5 78.5 Q 60 80 55.5 78.5 Z" fill="#f27a8f" />
        </g>
      );
    case "gatinho":
      return (
        <path
          d="M52 74 Q 56 79 60 74 Q 64 79 68 74"
          fill="none"
          stroke={ink}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      );
    case "tranquilo":
      return <path d="M55 76 L 65 76" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />;
    default:
      return (
        <path d="M53 73 Q 60 81 67 73" fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round" />
      );
  }
}

function Accessory({ config }: { config: AvatarConfig }) {
  switch (config.accessory) {
    case "laco": {
      const c = "#ef6a9a";
      return (
        <g transform="translate(84 30) rotate(18)">
          <path d="M0 0 C -12 -10, -16 6, -2 3 Z" fill={c} />
          <path d="M0 0 C 12 -10, 16 6, 2 3 Z" fill={c} />
          <circle cx={0} cy={1} r={3.4} fill={shade(c, -30)} />
        </g>
      );
    }
    case "oculos":
      return (
        <g fill="none" stroke="#3a2a33" strokeWidth={2.3}>
          <circle cx={47} cy={61} r={8.5} fill="rgba(255,255,255,0.18)" />
          <circle cx={73} cy={61} r={8.5} fill="rgba(255,255,255,0.18)" />
          <path d="M55.5 60 Q 60 57 64.5 60" />
        </g>
      );
    case "fones":
      return (
        <g>
          <path d="M26 58 C 24 18, 96 18, 94 58" fill="none" stroke="#3b3448" strokeWidth={5} strokeLinecap="round" />
          <rect x={18} y={52} width={12} height={20} rx={6} fill="#8f7cf0" />
          <rect x={90} y={52} width={12} height={20} rx={6} fill="#8f7cf0" />
        </g>
      );
    case "flor":
      return (
        <g transform="translate(34 34)">
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse key={deg} cx={0} cy={-6} rx={4.2} ry={6.5} fill="#ffd1e1" transform={`rotate(${deg})`} />
          ))}
          <circle r={3.6} fill="#ffcf4d" />
        </g>
      );
    case "chapeu":
      return (
        <g>
          <ellipse cx={60} cy={30} rx={34} ry={7} fill="#3d2f3a" />
          <path d="M38 30 C 40 8, 80 8, 82 30 Z" fill="#4a3946" />
          <rect x={38} y={24} width={44} height={5} fill="#ef6a9a" />
        </g>
      );
    case "estrela":
      return (
        <polygon
          transform="translate(86 36) rotate(12)"
          points={Array.from({ length: 10 }, (_, i) => {
            const r = i % 2 === 0 ? 8 : 3.6;
            const a = (Math.PI / 5) * i - Math.PI / 2;
            return `${r * Math.cos(a)},${r * Math.sin(a)}`;
          }).join(" ")}
          fill="#ffcf4d"
          stroke="#e8a92a"
          strokeWidth={1}
        />
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
  const skinShadow = shade(config.skin, -22);
  const clipId = `dn-char-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`${config.name}, seu personagem`}
    >
      {background ? <circle cx={60} cy={60} r={60} fill={background} /> : null}
      <defs>
        <clipPath id={clipId}>
          <circle cx={60} cy={60} r={60} />
        </clipPath>
      </defs>
      <g clipPath={background ? `url(#${clipId})` : undefined}>
        <HairBack config={config} />
        {/* corpo */}
        <path d="M18 124 C 20 100, 38 92, 60 92 C 82 92, 100 100, 102 124 Z" fill={config.outfit} />
        <path d="M48 93 Q 60 104 72 93" fill="none" stroke={shade(config.outfit, -28)} strokeWidth={2.4} />
        <rect x={53} y={80} width={14} height={14} rx={6} fill={skinShadow} />
        {/* orelhas e rosto */}
        <circle cx={30} cy={62} r={6.5} fill={config.skin} />
        <circle cx={90} cy={62} r={6.5} fill={config.skin} />
        <ellipse cx={60} cy={58} rx={30} ry={30.5} fill={config.skin} />
        <HairFront config={config} />
        {mood === "preocupada" ? (
          <g stroke="#2a1d24" strokeWidth={2.2} strokeLinecap="round">
            <path d="M41 50 L 52 47" />
            <path d="M79 50 L 68 47" />
          </g>
        ) : null}
        <Eyes config={config} mood={mood} />
        {config.blush ? (
          <g fill="#ff8fab" opacity={0.45}>
            <ellipse cx={40} cy={71} rx={6} ry={3.6} />
            <ellipse cx={80} cy={71} rx={6} ry={3.6} />
          </g>
        ) : null}
        <Mouth config={config} mood={mood} />
        <Accessory config={config} />
        {mood === "animada" ? (
          <g fill="#ffcf4d">
            <path d="M102 20 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" />
            <path d="M16 30 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" />
          </g>
        ) : null}
        {mood === "sonolenta" ? (
          <text x={92} y={30} fontSize={16} fontWeight={800} fill="#8f7cf0" fontFamily="system-ui">
            z
          </text>
        ) : null}
      </g>
    </svg>
  );
}
