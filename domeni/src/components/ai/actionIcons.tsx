import {
  AudioLines,
  BookOpenCheck,
  CircleHelp,
  FileText,
  Gamepad2,
  Layers,
  Lightbulb,
  MessagesSquare,
  NotebookText,
  Search,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { AiAction } from "@/lib/types";

/** Ícone de cada ação de IA (no lugar de emojis, para o visual limpo). */
export const ACTION_ICON: Record<AiAction, LucideIcon> = {
  resumo: FileText,
  "resumo-aesthetic": NotebookText,
  flashcards: Layers,
  questoes: CircleHelp,
  jogo: Gamepad2,
  aprofundar: Search,
  explicar: Lightbulb,
  conversa: MessagesSquare,
  relatorio: Stethoscope,
  "organizar-transcricao": AudioLines,
};

export function ActionIcon({ action, size = 20, className }: { action: AiAction | null; size?: number; className?: string }) {
  const Icon = action ? ACTION_ICON[action] : Sparkles;
  return (
    <span className={`flex size-9 flex-none items-center justify-center rounded-[10px] bg-fill text-label ${className ?? ""}`}>
      <Icon size={size} strokeWidth={1.9} />
    </span>
  );
}

export { BookOpenCheck };

/** Nome amigável do modelo (ex.: "Claude Haiku 5.5"). */
export function modelLabel(model: string): string {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)/.exec(model);
  if (!m) return model;
  return `Claude ${m[1].charAt(0).toUpperCase()}${m[1].slice(1)} ${m[2]}.${m[3]}`;
}
