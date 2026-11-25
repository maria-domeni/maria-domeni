"use client";

import { ChevronRight } from "lucide-react";
import type { ButtonHTMLAttributes, ComponentType, CSSProperties, ReactNode } from "react";
import { colorVariants, isHexColor } from "@/lib/color";
import { markLinkNavigation } from "@/lib/router";
import { COLOR_KEYS, DIFFICULTY_LABEL, type ColorKey, type Difficulty } from "@/lib/types";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type IconType = ComponentType<{ size?: number | string; strokeWidth?: number; className?: string }>;

/* ---------- Cor da disciplina ---------- */

const variantCache = new Map<string, { light: string; dark: string }>();

/**
 * Classe e estilo que definem var(--dc) para uma cor de disciplina, seja da
 * paleta ("rosa") ou livre ("#aa33cc").
 */
export function tint(color: string, className?: string): { className: string; style?: CSSProperties } {
  if (isHexColor(color)) {
    let variants = variantCache.get(color);
    if (!variants) {
      variants = colorVariants(color);
      variantCache.set(color, variants);
    }
    return {
      className: cx("dc", className),
      style: { "--dc-l": variants.light, "--dc-d": variants.dark } as CSSProperties,
    };
  }
  const key = COLOR_KEYS.includes(color as ColorKey) ? color : "rosa";
  return { className: cx(`dc dc-${key}`, className) };
}

/* ---------- Botões ---------- */

type Variant = "filled" | "tinted" | "gray" | "plain" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  filled: "bg-accent-solid text-on-accent",
  tinted: "bg-accent-soft text-accent",
  gray: "bg-fill text-label",
  plain: "text-accent",
  danger: "bg-danger-soft text-danger",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[14px] gap-1.5",
  md: "h-10 px-4 text-[15px] gap-2",
  lg: "h-12 px-5 text-[16px] gap-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconType;
  block?: boolean;
}

export function Button({
  variant = "filled",
  size = "md",
  icon: Icon,
  block,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "pressable inline-flex items-center justify-center rounded-[10px] font-semibold whitespace-nowrap disabled:pointer-events-none disabled:opacity-40",
        VARIANT[variant],
        SIZE[size],
        variant === "plain" && "px-2",
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon size={size === "sm" ? 15 : 17} strokeWidth={2.2} /> : null}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconType;
  label: string;
  tone?: "accent" | "neutral" | "danger";
  filled?: boolean;
}

export function IconButton({
  icon: Icon,
  label,
  tone = "accent",
  filled,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  const color = tone === "danger" ? "text-danger" : tone === "neutral" ? "text-label-2" : "text-label-2";
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "pressable row-pressable inline-flex size-9 flex-none items-center justify-center rounded-[10px] disabled:opacity-40",
        color,
        filled && "bg-fill",
        className,
      )}
      {...rest}
    >
      <Icon size={19} strokeWidth={2} />
    </button>
  );
}

/* ---------- Links internos ---------- */

interface LinkProps {
  to: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  "aria-current"?: "page" | undefined;
  onClick?: () => void;
}

/** Link para outra tela do app (ex.: to="#/cadernos"). */
export function Link({ to, onClick, children, ...rest }: LinkProps) {
  return (
    <a
      href={to}
      onClick={() => {
        markLinkNavigation();
        onClick?.();
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/* ---------- Superfícies ---------- */

export function Card({
  className,
  children,
  as: Tag = "div",
}: {
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag className={cx("card overflow-hidden", className)}>
      {children}
    </Tag>
  );
}

export function Section({
  title,
  count,
  action,
  children,
  className,
  emoji,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  emoji?: string;
}) {
  return (
    <section className={cx("mt-8", className)} data-emoji={emoji ? "" : undefined}>
      <div className="mb-2.5 flex min-h-8 items-end justify-between gap-3">
        <h2 className="font-display text-[18px] leading-6 font-semibold">
          {title}
          {count !== undefined && count > 0 ? (
            <span className="ml-2 text-[15px] font-medium text-label-3">{count}</span>
          ) : null}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Lista agrupada: linhas dentro de um cartão, separadas por um fio. */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cx("divide-y divide-sep", className)}>
      {children}
    </Card>
  );
}

interface RowProps {
  to?: string;
  onClick?: () => void;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  className?: string;
}

export function Row({ to, onClick, leading, title, subtitle, trailing, chevron, className }: RowProps) {
  const body = (
    <>
      {leading ? <div className="flex-none">{leading}</div> : null}
      <div className="min-w-0 flex-1 py-3">
        <div className="truncate text-[15.5px] leading-[21px] font-medium">{title}</div>
        {subtitle ? (
          <div className="mt-0.5 truncate text-[13.5px] leading-[18px] text-label-2">{subtitle}</div>
        ) : null}
      </div>
      {trailing ? <div className="flex flex-none items-center gap-2">{trailing}</div> : null}
      {chevron ? <ChevronRight size={18} strokeWidth={2.4} className="flex-none text-label-3" /> : null}
    </>
  );
  const base = cx("flex min-h-[52px] w-full items-center gap-3 px-4 text-left", className);
  if (to) {
    return (
      <Link to={to} className={cx(base, "row-pressable")}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cx(base, "row-pressable")}>
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
}

/* ---------- Pequenos elementos ---------- */

type Tone = "neutral" | "accent" | "green" | "yellow" | "red" | "dc";

const TONE: Record<Tone, string> = {
  neutral: "bg-fill text-label-2",
  accent: "bg-accent-soft text-accent",
  green: "bg-success-soft text-success",
  yellow: "bg-yellow-soft text-yellow",
  red: "bg-danger-soft text-danger",
  dc: "bg-dc-soft text-dc",
};

export function Chip({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex h-[22px] items-center gap-1 rounded-[6px] px-2 text-[12.5px] leading-none font-medium whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const DIFFICULTY_TONE: Record<Difficulty, Tone> = { facil: "green", medio: "yellow", dificil: "red" };

export function DifficultyChip({ value }: { value: Difficulty }) {
  return <Chip tone={DIFFICULTY_TONE[value]}>{DIFFICULTY_LABEL[value]}</Chip>;
}

/** Barra colorida da disciplina, usada à esquerda das linhas. */
export function ColorBar({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden {...tint(color, cx("block h-9 w-1 rounded-full bg-dc", className))} />;
}

export function ColorDot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden {...tint(color, cx("block size-2.5 rounded-full bg-dc", className))} />;
}

export function IconBadge({
  icon: Icon,
  tone = "accent",
  size = 36,
}: {
  icon: IconType;
  tone?: Tone;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className={cx("inline-flex flex-none items-center justify-center rounded-[9px]", TONE[tone])}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.52)} strokeWidth={2.2} />
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  emoji,
  title,
  children,
  action,
}: {
  icon?: IconType;
  emoji?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-10 text-center">
      {emoji ? (
        <span className="mb-3 text-[34px] leading-none grayscale-[35%]" aria-hidden>
          {emoji}
        </span>
      ) : Icon ? (
        <span className="mb-3 inline-flex size-12 items-center justify-center rounded-[12px] bg-fill text-label-2">
          <Icon size={24} strokeWidth={1.8} />
        </span>
      ) : null}
      <h3 className="font-display text-[18px] leading-6 font-semibold">{title}</h3>
      {children ? (
        <p className="mt-1.5 max-w-[44ch] text-[14.5px] leading-[21px] text-label-2">{children}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}

export function ProgressBar({ ratio, className }: { ratio: number; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx("h-1.5 overflow-hidden rounded-full bg-fill-2", className)}
    >
      <div
        className="h-full rounded-full bg-[var(--bar,var(--accent))] transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Só aceita endereços http(s); qualquer outra coisa vira null. */
export function safeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
