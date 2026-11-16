"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import {
  useId,
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import {
  COLOR_KEYS,
  COLOR_LABEL,
  WEEKDAY_SHORT,
  type ColorKey,
} from "@/lib/types";
import { cx } from "./basics";

const CONTROL =
  "w-full rounded-[13px] bg-fill px-3.5 text-[17px] text-label transition-shadow focus:shadow-[0_0_0_2px_var(--accent)]";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block px-0.5 text-[14px] leading-[18px] font-semibold text-label-2">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block px-0.5 text-[13px] leading-[17px] text-label-3">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(CONTROL, "h-11", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select className={cx(CONTROL, "h-11 appearance-none truncate pr-8", className)} {...rest}>
        {children}
      </select>
      <ChevronsUpDown
        aria-hidden
        size={15}
        strokeWidth={2.4}
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-label-3"
      />
    </span>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Linhas mínimas; a caixa cresce conforme o texto. */
  minRows?: number;
  bare?: boolean;
}

export function TextArea({ className, minRows = 3, bare, value, ...rest }: TextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      className={cx(
        "block w-full resize-none overflow-hidden text-[17px] leading-[1.5]",
        bare ? "bg-transparent" : cx(CONTROL, "py-2.5"),
        className,
      )}
      {...rest}
    />
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-[31px] w-[51px] flex-none rounded-full transition-colors duration-200 disabled:opacity-40",
        !checked && "bg-fill-2",
      )}
      style={checked ? { backgroundColor: "#34b866" } : undefined}
    >
      <span
        className={cx(
          "absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.22)] transition-transform duration-300 ease-(--e-spring)",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  badge?: boolean;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={(event) => {
        const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (step === 0) return;
        event.preventDefault();
        const next = options[(index + step + options.length) % options.length];
        onChange(next.value);
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
        buttons[options.indexOf(next)]?.focus();
      }}
      className={cx("relative grid rounded-[11px] bg-fill p-[3px]", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute top-[3px] bottom-[3px] left-[3px] rounded-[9px] bg-(--thumb) shadow-[0_1px_4px_rgba(0,0,0,0.14)] transition-transform duration-300 ease-(--e-out)"
        style={{
          width: `calc((100% - 6px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cx(
              "relative z-[1] flex h-9 items-center justify-center gap-1.5 rounded-[9px] px-2 text-[15px] transition-colors",
              selected ? "font-semibold text-label" : "font-medium text-label-2",
            )}
          >
            <span className="truncate">{option.label}</span>
            {option.badge ? <span className="size-1.5 flex-none rounded-full bg-danger" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Dias da semana, de segunda a domingo. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (value: number[]) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Dias de aula">
      {WEEK_ORDER.map((day) => {
        const selected = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={selected}
            onClick={() =>
              onChange(selected ? value.filter((d) => d !== day) : [...value, day])
            }
            className={cx(
              "pressable h-11 rounded-[13px] text-[15px] font-semibold",
              selected ? "bg-accent-solid text-white" : "bg-fill text-label-2",
            )}
          >
            {WEEKDAY_SHORT[day]}
          </button>
        );
      })}
    </div>
  );
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: ColorKey;
  onChange: (value: ColorKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Cor">
      {COLOR_KEYS.map((color) => {
        const selected = color === value;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={COLOR_LABEL[color]}
            title={COLOR_LABEL[color]}
            onClick={() => onChange(color)}
            className={cx(
              `dc dc-${color} pressable inline-flex size-10 items-center justify-center rounded-full bg-dc text-white`,
              selected && "shadow-[0_0_0_3px_var(--surface),0_0_0_5px_var(--dc)]",
            )}
          >
            {selected ? <Check size={18} strokeWidth={3} /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Linha de formulário com rótulo à esquerda e controle à direita. */
export function SettingRow({
  label,
  description,
  children,
  htmlFor,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  const fallbackId = useId();
  return (
    <div className="flex min-h-[56px] items-center gap-4 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor ?? fallbackId} className="block text-[17px] leading-[22px]">
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 text-[13.5px] leading-[18px] text-label-2">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-none items-center">{children}</div>
    </div>
  );
}
