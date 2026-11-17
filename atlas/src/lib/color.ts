/** Utilitários de cor para as cores livres (destaque e disciplinas). */

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG entre duas cores (1 a 21). */
export function contrast(a: string, b: string): number {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const LIGHT_SURFACE = "#ffffff";
const DARK_SURFACE = "#1b1b1f";
const MIN_CONTRAST = 4.5;

/**
 * A partir de uma cor escolhida livremente, devolve duas versões com o mesmo
 * matiz: uma legível sobre fundo claro (e que aceita texto branco por cima) e
 * outra legível sobre fundo escuro.
 */
export function colorVariants(hex: string): { light: string; dark: string } {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));

  let lightL = l;
  let light = hex.toLowerCase();
  while (contrast(light, LIGHT_SURFACE) < MIN_CONTRAST && lightL > 0.04) {
    lightL -= 0.02;
    light = rgbToHex(hslToRgb([h, s, lightL]));
  }

  let darkL = l;
  let dark = hex.toLowerCase();
  while (contrast(dark, DARK_SURFACE) < MIN_CONTRAST + 1 && darkL < 0.96) {
    darkL += 0.02;
    dark = rgbToHex(hslToRgb([h, s, darkL]));
  }

  return { light, dark };
}
