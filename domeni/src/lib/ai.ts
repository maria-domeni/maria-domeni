"use client";

import { db } from "./db";
import { normalizeSettings } from "./settings";
import { logAiUse } from "./store";
import { estimateCost } from "./aiPricing";
import { getAccount, refreshAccount } from "./cloud/account";
import { accessToken } from "./cloud/client";
import { apiUrl, cloudEnabled } from "./cloud/config";
import { openPlus } from "./cloud/paywall";
import { navigate } from "./router";
import type { AiAction } from "./types";

/**
 * IA sob demanda. Nada aqui roda sozinho: cada chamada parte de um botão que
 * a pessoa tocou. A chave da Anthropic fica só no servidor.
 */

export { MODEL_PRICE, estimateCost } from "./aiPricing";

export class AiError extends Error {
  constructor(
    message: string,
    readonly code:
      | "desligada"
      | "sem-codigo"
      | "codigo"
      | "sem-chave"
      | "rede"
      | "limite"
      | "recusa"
      | "erro"
      | "sem-conta"
      | "sem-sessao"
      | "cota"
      | "sem-cota"
      | "pausada",
    /** true quando o app já mostrou algo (ex.: a folha do Plus) */
    readonly handled = false,
  ) {
    super(message);
  }
}

/** Mostra o erro da IA do jeito certo: oferta do Plus, botão de entrar ou aviso simples. */
export function showAiError(
  error: unknown,
  toast: (message: string, options?: { actionLabel?: string; onAction?: () => void }) => void,
  fallback = "A IA não conseguiu terminar. Tente de novo.",
): void {
  if (error instanceof AiError) {
    if (error.handled) return;
    if (error.code === "sem-conta" || error.code === "sem-sessao") {
      toast(error.message, { actionLabel: "Entrar", onAction: () => navigate("#/conta") });
      return;
    }
    toast(error.message);
    return;
  }
  if ((error as DOMException)?.name === "AbortError") return;
  toast(fallback);
}

export interface AiResult {
  text: string;
  json: unknown;
  model: string;
}

interface AiEvent {
  type: "text" | "done" | "error";
  text?: string;
  json?: unknown;
  model?: string;
  usage?: { input: number; output: number; searches?: number };
  message?: string;
  code?: AiError["code"];
}

/** Chama a IA no servidor. `onText` recebe o texto conforme ele chega. */
export async function askAi(
  action: AiAction,
  input: Record<string, unknown>,
  options: { onText?: (full: string) => void; signal?: AbortSignal } = {},
): Promise<AiResult> {
  const settings = normalizeSettings((await db.settings.get("app"))?.value);
  if (!settings.aiEnabled) {
    throw new AiError("A IA está desligada nos Ajustes.", "desligada");
  }
  const token = await accessToken();
  if (!token && !settings.aiAccessCode) {
    throw cloudEnabled
      ? new AiError("Entre na sua conta (é grátis) para usar a IA.", "sem-conta")
      : new AiError("Coloque o código de acesso da IA em Ajustes > IA.", "sem-codigo");
  }
  let response: Response;
  try {
    response = await fetch(apiUrl("/api/ia"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : { "x-domeni-code": settings.aiAccessCode }),
      },
      body: JSON.stringify({ action, model: settings.aiModel, input }),
      signal: options.signal,
    });
  } catch (error) {
    if ((error as DOMException)?.name === "AbortError") throw error;
    throw new AiError("Sem conexão com a internet. A IA precisa de internet.", "rede");
  }
  if (!response.ok || !response.body) {
    let message = "A IA não respondeu. Tente de novo.";
    let code: AiError["code"] = "erro";
    try {
      const body = (await response.json()) as { message?: string; code?: AiError["code"] };
      if (body.message) message = body.message;
      if (body.code) code = body.code;
    } catch {
      // resposta sem corpo
    }
    if (code === "cota" || code === "sem-cota") {
      const plus = (() => {
        const a = getAccount();
        return a.status === "signed-in" && a.info?.plan === "plus";
      })();
      if (!plus) {
        openPlus(message);
        throw new AiError(message, code, true);
      }
    }
    throw new AiError(message, code);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let result: AiResult | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
      if (!line) continue;
      const event = JSON.parse(line) as AiEvent;
      if (event.type === "text" && event.text) {
        text += event.text;
        options.onText?.(text);
      } else if (event.type === "error") {
        throw new AiError(event.message ?? "A IA não conseguiu terminar.", event.code ?? "erro");
      } else if (event.type === "done") {
        const model = event.model ?? settings.aiModel;
        result = { text, json: event.json ?? null, model };
        if (event.usage) {
          await logAiUse({
            action,
            model,
            inputTokens: event.usage.input,
            outputTokens: event.usage.output,
            costUsd: estimateCost(model, event.usage.input, event.usage.output, event.usage.searches ?? 0),
          });
        }
      }
    }
  }
  if (!result) throw new AiError("A resposta da IA chegou incompleta. Tente de novo.", "erro");
  if (getAccount().status === "signed-in") void refreshAccount();
  return result;
}

/** Gasto estimado no mês atual, em dólares. */
export async function monthCost(now = new Date()): Promise<{ usd: number; calls: number }> {
  const prefix = now.toISOString().slice(0, 7);
  const entries = await db.aiLog.filter((e) => e.at.startsWith(prefix)).toArray();
  return { usd: entries.reduce((s, e) => s + e.costUsd, 0), calls: entries.length };
}
