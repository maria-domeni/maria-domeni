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

export const TEXT_STICKER_COLORS = ["#f7dbe3", "#f6ecc4", "#dcefdc", "#dce8f6", "#e7e0f5", "#f4e2d4"];

export function textStickerColor(text: string): string {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TEXT_STICKER_COLORS[hash % TEXT_STICKER_COLORS.length];
}
