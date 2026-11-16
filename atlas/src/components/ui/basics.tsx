"use client";

import { ChevronRight } from "lucide-react";
import type { ButtonHTMLAttributes, ComponentType, ReactNode } from "react";
import { markLinkNavigation } from "@/lib/router";
import { DIFFICULTY_LABEL, type ColorKey, type Difficulty } from "@/lib/types";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type IconType = ComponentType<{ size?: number | string; strokeWidth?: number; className?: string }>;

/* ---------- Botões ---------- */

type Variant = "filled" | "tinted" | "gray" | "plain" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  filled: "bg-accent-solid text-white",
  tinted: "bg-accent-soft text-accent",
  gray: "bg-fill text-label",
  plain: "text-accent",
  danger: "bg-danger-soft text-danger",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[15px] gap-1.5",
  md: "h-11 px-5 text-[16px] gap-2",
  lg: "h-[50px] px-6 text-[17px] gap-2",
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
        "pressable inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap disabled:pointer-events-none disabled:opacity-40",
        VARIANT[variant],
        SIZE[size],
        variant === "plain" && "px-2",
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon size={size === "sm" ? 16 : 18} strokeWidth={2.3} /> : null}
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
  const color = tone === "danger" ? "text-danger" : tone === "neutral" ? "text-label-2" : "text-accent";
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "pressable inline-flex size-11 flex-none items-center justify-center rounded-full disabled:opacity-40",
        color,
        filled && "bg-fill",
        className,
      )}
      {...rest}
    >
      <Icon size={21} strokeWidth={2.1} />
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
    <Tag className={cx("overflow-hidden rounded-[20px] bg-surface shadow-card", className)}>
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
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("mt-9", className)}>
      <div className="mb-2.5 flex min-h-9 items-end justify-between gap-3 px-1">
        <h2 className="text-[22px] leading-7 font-bold tracking-[-0.02em]">
          {title}
          {count !== undefined && count > 0 ? (
            <span className="ml-2 text-[17px] font-semibold text-label-3">{count}</span>
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
        <div className="truncate text-[17px] leading-[22px] font-medium">{title}</div>
        {subtitle ? (
          <div className="mt-0.5 truncate text-[14px] leading-[19px] text-label-2">{subtitle}</div>
        ) : null}
      </div>
      {trailing ? <div className="flex flex-none items-center gap-2">{trailing}</div> : null}
      {chevron ? <ChevronRight size={18} strokeWidth={2.4} className="flex-none text-label-3" /> : null}
    </>
  );
  const base = cx("flex min-h-[60px] w-full items-center gap-3.5 px-4 text-left", className);
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
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[13px] leading-none font-semibold whitespace-nowrap",
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
export function ColorBar({ color, className }: { color: ColorKey; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(`dc dc-${color} block h-9 w-1 rounded-full bg-dc`, className)}
    />
  );
}

export function ColorDot({ color, className }: { color: ColorKey; className?: string }) {
  return (
    <span aria-hidden className={cx(`dc dc-${color} block size-2.5 rounded-full bg-dc`, className)} />
  );
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
      className={cx("inline-flex flex-none items-center justify-center rounded-[11px]", TONE[tone])}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.52)} strokeWidth={2.2} />
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: IconType;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-[18px] bg-accent-soft text-accent">
        <Icon size={28} strokeWidth={2} />
      </span>
      <h3 className="text-[20px] leading-6 font-bold tracking-[-0.02em]">{title}</h3>
      {children ? (
        <p className="mt-1.5 max-w-[42ch] text-[15px] leading-[21px] text-label-2">{children}</p>
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
      className={cx("h-1.5 overflow-hidden rounded-full bg-fill", className)}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
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
