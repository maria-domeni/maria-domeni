import { getStroke } from "perfect-freehand";
import type { InkStroke } from "@/lib/types";

/** Largura fixa da folha, em pixels: a caneta e o texto ficam sempre alinhados. */
export const PAGE_WIDTH = 820;

/** Converte o contorno do traço num caminho SVG suave. */
function pathFromOutline(outline: number[][]): string {
  if (outline.length < 2) return "";
  const avg = (a: number, b: number) => ((a + b) / 2).toFixed(2);
  let d = `M${outline[0][0].toFixed(2)},${outline[0][1].toFixed(2)} Q`;
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[(i + 1) % outline.length];
    d += `${x0.toFixed(2)},${y0.toFixed(2)} ${avg(x0, x1)},${avg(y0, y1)} `;
  }
  return `${d}Z`;
}

export function strokePath(stroke: Pick<InkStroke, "points" | "size" | "tool">, pen: boolean): string {
  const pts: number[][] = [];
  for (let i = 0; i + 2 < stroke.points.length + 1; i += 3) pts.push([stroke.points[i], stroke.points[i + 1], stroke.points[i + 2] ?? 0.5]);
  const outline = getStroke(pts, {
    size: stroke.size,
    thinning: stroke.tool === "marca" ? 0 : 0.55,
    smoothing: 0.6,
    streamline: 0.45,
    simulatePressure: !pen,
    start: { taper: stroke.tool === "marca" ? 0 : 6, cap: true },
    end: { taper: stroke.tool === "marca" ? 0 : 6, cap: true },
    last: true,
  });
  return pathFromOutline(outline);
}

/** O traço passa perto do ponto? (para a borracha) */
export function strokeHit(stroke: InkStroke, x: number, y: number, radius: number): boolean {
  const r2 = (radius + stroke.size / 2) ** 2;
  for (let i = 0; i + 1 < stroke.points.length; i += 3) {
    const dx = stroke.points[i] - x;
    const dy = stroke.points[i + 1] - y;
    if (dx * dx + dy * dy <= r2) return true;
  }
  return false;
}

export function strokeBottom(stroke: InkStroke): number {
  let max = 0;
  for (let i = 1; i < stroke.points.length; i += 3) max = Math.max(max, stroke.points[i]);
  return max;
}

export const PEN_COLORS = ["#2a2230", "#3b5bdb", "#d6336c", "#2b8a3e", "#e8590c", "#7048e8", "#c92a2a", "#868e96"];
export const MARKER_COLORS = ["#ffe066", "#ffa8c5", "#a9e34b", "#74c0fc", "#d0bfff", "#ffc078"];
