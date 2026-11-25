import type { AiModel } from "./types";

/** Preço por milhão de tokens (entrada, saída), em dólares. Conferido em nov/2026. */
export const MODEL_PRICE: Record<AiModel, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};
/** Haiku 5.5 cobra mais quando o pedido passa de 100 mil tokens. */
const HAIKU_LONG: [number, number] = [0.5, 2.5];
export const WEB_SEARCH_PRICE = 10 / 1000;

export function estimateCost(model: string, input: number, output: number, searches = 0): number {
  let [pIn, pOut] = MODEL_PRICE[model as AiModel] ?? MODEL_PRICE["claude-opus-5-5"];
  if (model === "claude-haiku-5-5" && input > 100_000) [pIn, pOut] = HAIKU_LONG;
  return (input * pIn + output * pOut) / 1_000_000 + searches * WEB_SEARCH_PRICE;
}
