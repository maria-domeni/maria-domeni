"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Registra o service worker (que guarda o app para uso sem internet) e
 * avisa quando há uma versão nova pronta para ser aplicada.
 */
export function PwaManager() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const reloading = useRef(false);

  useEffect(() => {
    // no app das lojas os arquivos já vêm dentro do app: não precisa de service worker
    if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_NATIVE === "1" || !("serviceWorker" in navigator)) return;
    let cancelled = false;

    const onControllerChange = () => {
      if (reloading.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (cancelled) return;
        const track = (worker: ServiceWorker | null) => {
          if (!worker) return;
          const check = () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
          };
          check();
          worker.addEventListener("statechange", check);
        };
        track(registration.waiting);
        registration.addEventListener("updatefound", () => track(registration.installing));

        const update = () => {
          if (document.visibilityState === "visible") void registration.update().catch(() => undefined);
        };
        document.addEventListener("visibilitychange", update);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+10px)] z-[70] flex justify-center px-4">
      <button
        type="button"
        onClick={() => {
          reloading.current = true;
          waiting.postMessage({ type: "ATIVAR" });
        }}
        className="toast-enter pressable pointer-events-auto inline-flex h-11 items-center gap-2 rounded-[8px] bg-accent-solid px-5 text-[15px] font-semibold text-white shadow-float"
      >
        <RefreshCw size={16} strokeWidth={2.6} />
        Nova versão disponível · Atualizar
      </button>
    </div>
  );
}
