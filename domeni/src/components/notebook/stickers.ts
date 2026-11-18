/** Adesivos para capas e folhas. Emojis ganham contorno branco de adesivo. */
export const EMOJI_STICKERS = [
  "🌸", "🌷", "🎀", "💗", "⭐", "✨", "🍓", "🍒", "🌈", "☁️",
  "🦋", "🐱", "🐻", "🧸", "🐰", "🍵", "☕", "📚", "🧠", "💡",
  "📝", "🎧", "🌙", "🌻", "🍀", "🫶", "💜", "🌼", "🧁", "💭",
];

/** Adesivos de texto (prefixo "txt:") */
export const TEXT_STICKERS = ["prova!", "revisar", "importante", "foco", "você consegue", "lembrar", "dúvida", "amei"];

export function isTextSticker(value: string): boolean {
  return value.startsWith("txt:");
}

export const TEXT_STICKER_COLORS = ["#ffd1e1", "#fff0a0", "#d4f5d0", "#d6e7ff", "#eadcff", "#ffe0c7"];

export function textStickerColor(text: string): string {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TEXT_STICKER_COLORS[hash % TEXT_STICKER_COLORS.length];
}
