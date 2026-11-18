"use client";

import { X } from "lucide-react";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button, cx } from "./basics";

/* ---------- <dialog> com animação de saída ---------- */

function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      closingRef.current = false;
      dialog.classList.remove("is-closing");
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Trava a rolagem da página enquanto a folha está aberta
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  const requestClose = useCallback(() => {
    const dialog = ref.current;
    if (!dialog || closingRef.current) return;
    closingRef.current = true;
    dialog.classList.add("is-closing");
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      dialog.classList.remove("is-closing");
      onClose();
    };
    dialog.addEventListener("animationend", finish, { once: true });
    window.setTimeout(finish, 320);
  }, [onClose]);

  return { ref, requestClose };
}

/* ---------- Folha (formulário) ---------- */

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Rótulo do botão principal. Sem ele a folha só tem "Fechar". */
  submitLabel?: string;
  /** Devolva `false` para manter a folha aberta (ex.: validação). */
  onSubmit?: () => void | false | Promise<void | false>;
  canSubmit?: boolean;
  /** Folha mais larga (no iPad e no computador) */
  wide?: boolean;
  children: ReactNode;
}

export function Sheet({
  open,
  onClose,
  title,
  submitLabel,
  onSubmit,
  canSubmit = true,
  wide,
  children,
}: SheetProps) {
  const { ref, requestClose } = useDialog(open, onClose);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!onSubmit || !canSubmit || busy) return;
    setBusy(true);
    try {
      const result = await onSubmit();
      if (result !== false) requestClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className={wide ? "dn-dialog dn-sheet is-wide" : "dn-dialog dn-sheet"}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      {open ? (
        <form onSubmit={handleSubmit} className="flex max-h-[inherit] flex-col">
          <header className="flex flex-none items-center gap-3 px-5 pt-4 pb-2">
            <h2 className="min-w-0 flex-1 truncate font-display text-[22px] leading-8 font-bold">
              <span className="marker">{title}</span>
            </h2>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Fechar"
              className="pressable inline-flex size-9 flex-none items-center justify-center rounded-full bg-fill text-label-2"
            >
              <X size={18} strokeWidth={2.6} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-5">{children}</div>
          {submitLabel ? (
            <footer className="flex flex-none items-center justify-end gap-2 border-t border-dashed border-sep px-5 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))]">
              <Button variant="gray" onClick={requestClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!canSubmit || busy}>
                {submitLabel}
              </Button>
            </footer>
          ) : (
            <div className="h-[env(safe-area-inset-bottom)] flex-none" />
          )}
        </form>
      ) : null}
    </dialog>
  );
}

/* ---------- Alerta de confirmação ---------- */

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error("useConfirm precisa do OverlayProvider");
  return fn;
}

/* ---------- Aviso rápido (toast) ---------- */

interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
}

type ToastFn = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<ToastFn | null>(null);

export function useToast(): ToastFn {
  const fn = useContext(ToastContext);
  if (!fn) throw new Error("useToast precisa do OverlayProvider");
  return fn;
}

interface ToastState extends ToastOptions {
  id: number;
  message: string;
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const confirm = useCallback<ConfirmFn>((options) => {
    resolver.current?.(false);
    setPending(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const answer = useRef(false);
  const settle = useCallback(() => {
    resolver.current?.(answer.current);
    resolver.current = null;
    answer.current = false;
    setPending(null);
  }, []);

  const { ref, requestClose } = useDialog(pending !== null, settle);

  const showToast = useCallback<ToastFn>((message, options) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, ...options });
    toastTimer.current = window.setTimeout(() => setToast(null), options?.onAction ? 5200 : 2800);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const confirmValue = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={confirmValue}>
      <ToastContext.Provider value={showToast}>
        {children}

        <dialog
          ref={ref}
          className="dn-dialog dn-alert"
          role="alertdialog"
          aria-label={pending?.title}
          onCancel={(event) => {
            event.preventDefault();
            requestClose();
          }}
        >
          {pending ? (
            <div className="px-5 pt-6 pb-4 text-center">
              <h2 className="text-[18px] leading-6 font-bold tracking-[-0.015em]">{pending.title}</h2>
              {pending.message ? (
                <p className="mt-1.5 text-[14.5px] leading-5 text-label-2">{pending.message}</p>
              ) : null}
              <div className="mt-5 flex flex-col gap-2">
                <Button
                  variant={pending.destructive ? "danger" : "filled"}
                  block
                  onClick={() => {
                    answer.current = true;
                    requestClose();
                  }}
                >
                  {pending.confirmLabel ?? "Confirmar"}
                </Button>
                <Button variant="gray" block onClick={requestClose} autoFocus>
                  {pending.cancelLabel ?? "Cancelar"}
                </Button>
              </div>
            </div>
          ) : null}
        </dialog>

        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-h)+env(safe-area-inset-bottom)+16px)] z-[60] flex justify-center px-4 md:bottom-8"
        >
          {toast ? (
            <div
              key={toast.id}
              className={cx(
                "toast-enter pointer-events-auto flex max-w-full items-center gap-3 rounded-full py-2.5 pr-3 pl-5 text-[15px] font-medium shadow-float",
                "bg-label text-bg",
              )}
            >
              <span className="truncate">{toast.message}</span>
              {toast.onAction ? (
                <button
                  type="button"
                  className="pressable rounded-full bg-white/20 px-3 py-1 text-[14px] font-semibold"
                  onClick={() => {
                    toast.onAction?.();
                    setToast(null);
                  }}
                >
                  {toast.actionLabel ?? "Desfazer"}
                </button>
              ) : (
                <span className="w-1" />
              )}
            </div>
          ) : null}
        </div>
      </ToastContext.Provider>
    </ConfirmContext.Provider>
  );
}
