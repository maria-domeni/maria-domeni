/** Data local no formato AAAA-MM-DD (sem fuso horário). */
export type ISODate = string;

export type DisciplineStatus = "andamento" | "concluida" | "futura";
/** Estágios não entram no limite de faltas. */
export type DisciplineKind = "regular" | "estagio";

export type LessonType = "teorica" | "pratica" | "supervisao" | "seminario" | "revisao" | "prova";

export type Difficulty = "facil" | "medio" | "dificil";

/** Compromissos da agenda (provas, entregas, lembretes…). */
export type TaskType =
  | "prova"
  | "trabalho"
  | "seminario"
  | "relatorio"
  | "leitura"
  | "lembrete"
  | "evento"
  | "outro";

export type ColorKey =
  | "vermelho"
  | "laranja"
  | "amarelo"
  | "verde"
  | "turquesa"
  | "azul"
  | "indigo"
  | "rosa"
  | "lilas"
  | "cereja";

export type AccentKey = "rosa" | "cereja" | "lilas" | "indigo" | "azul" | "verde" | "laranja" | "grafite";

export type ThemeMode = "auto" | "claro" | "escuro";

/** Tom do papel e das superfícies. */
export type Tone = "neutro" | "creme" | "rosado" | "lavanda" | "menta" | "cafe";

export type FontKey = "sistema" | "inter" | "nunito" | "lexend" | "lora" | "fraunces" | "patrick";

/** "igual" usa a mesma fonte do restante do app. */
export type TitleFontKey = FontKey | "caveat" | "pacifico" | "igual";

/** Fundo do app: papel quadriculado, pontilhado, liso ou com brilho da cor. */
export type BackgroundStyle = "quadriculado" | "pontilhado" | "liso" | "aurora";

export type TextScale = "pequeno" | "padrao" | "grande";

export type PaperStyle = "liso" | "quadriculado" | "pontilhado" | "pautado";

export type ThemePreset = "rose" | "lavanda" | "matcha" | "caderno" | "minimal" | "noite" | "cafe";

export type CoverPattern =
  | "liso"
  | "listras"
  | "xadrez"
  | "bolinhas"
  | "quadriculado"
  | "losangos"
  | "ondas"
  | "marmore";

/** Adesivo colado numa capa. Posição e tamanho em frações da capa (0 a 1). */
export interface CoverSticker {
  id: string;
  value: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

export interface NotebookCover {
  color: string;
  pattern: CoverPattern;
  imageId: string | null;
  stickers: CoverSticker[];
  /** Etiqueta com o nome, como nos cadernos de capa dura */
  label: boolean;
  /** Elástico de fechar */
  elastic: boolean;
}

/** Imagem guardada no aparelho (capas, foto de perfil, imagens das anotações). */
export interface ImageRecord {
  id: string;
  type: string;
  data: ArrayBuffer;
  width: number;
  height: number;
  createdAt: string;
}

/** Arquivo guardado no aparelho (PDFs da biblioteca, áudios de aula). */
export interface FileRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
  createdAt: string;
}

export interface Semester {
  id: string;
  number: number;
  start?: ISODate;
  end?: ISODate;
  cover: NotebookCover;
  createdAt: string;
  updatedAt: string;
}

/** Um horário da grade: dia, hora e quem dá a aula. */
export interface ClassSlot {
  id: string;
  /** 0 = domingo … 6 = sábado */
  weekday: number;
  start: string;
  end: string;
  professor: string;
  room: string;
  /** Quantas aulas contam nesse dia (para faltas) */
  classes: number;
}

export interface Discipline {
  id: string;
  semesterId: string;
  name: string;
  kind: DisciplineKind;
  professors: string[];
  /** Uma cor da paleta (ColorKey) ou uma cor livre no formato #rrggbb. */
  color: string;
  emoji: string;
  cover: NotebookCover;
  status: DisciplineStatus;
  slots: ClassSlot[];
  /** Limite de faltas (em aulas). null = usa o padrão dos Ajustes. */
  absenceLimit: number | null;
  /** Média para aprovação. null = usa a dos Ajustes. */
  passingGrade: number | null;
  ementa: string;
  notebookLmUrl: string;
  theaUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  disciplineId: string;
  number: number | null;
  title: string;
  date: ISODate | null;
  type: LessonType;
  /** null = ainda não marcado */
  attended: boolean | null;
  reading: string;
  readingDone: boolean;
  questions: string;
  /** Anotações da aula (HTML do editor) */
  notes: string;
  doubts: string;
  feynman: string;
  gaps: string;
  summary: string;
  mindmap: string;
  examQuestions: string;
  /** Transcrição feita durante a gravação */
  transcript: string;
  /** Folha da página. null = a padrão dos Ajustes */
  paper: PaperStyle | null;
  paperColor: string | null;
  reviewsOn: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InkTool = "caneta" | "marca";

/** Traço da caneta. Pontos em pixels da folha (largura fixa), [x, y, pressão…]. */
export interface InkStroke {
  id: string;
  tool: InkTool;
  color: string;
  size: number;
  points: number[];
}

export type PageItemKind = "imagem" | "adesivo" | "postit";

/** Imagem, adesivo ou post-it solto na folha (pode ser arrastado). */
export interface PageItem {
  id: string;
  kind: PageItemKind;
  x: number;
  y: number;
  w: number;
  rotation: number;
  z: number;
  imageId?: string;
  /** Adesivo: id do adesivo ou emoji */
  value?: string;
  /** Post-it */
  text?: string;
  color?: string;
}

export interface PageLayer {
  lessonId: string;
  strokes: InkStroke[];
  items: PageItem[];
  updatedAt: string;
}

export interface Recording {
  id: string;
  lessonId: string;
  fileId: string;
  durationSec: number;
  createdAt: string;
}

export interface Review {
  id: string;
  lessonId: string;
  step: number;
  kind: "regular" | "reforco";
  dueDate: ISODate;
  doneAt?: ISODate;
  difficulty?: Difficulty;
  parentId?: string;
}

export interface Task {
  id: string;
  disciplineId: string | null;
  title: string;
  type: TaskType;
  dueDate: ISODate;
  /** "HH:MM" ou "" para o dia todo */
  time: string;
  /** Minutos de antecedência do aviso; null = sem aviso */
  remindMinutes: number | null;
  /** Mostra contagem regressiva na tela Hoje */
  countdown: boolean;
  done: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** Falta registrada num dia de aula. */
export interface Attendance {
  id: string;
  disciplineId: string;
  date: ISODate;
  /** Aulas faltadas nesse dia */
  absences: number;
  /** Aulas que havia nesse dia */
  classes: number;
  professor: string;
  note: string;
  createdAt: string;
}

/** Avaliação com peso e nota. */
export interface Grade {
  id: string;
  disciplineId: string;
  name: string;
  weight: number;
  value: number | null;
  date: ISODate | null;
  professor: string;
  createdAt: string;
  updatedAt: string;
}

export type BookKind = "livro" | "artigo" | "apostila" | "outro";
export type BookStatus = "quero-ler" | "lendo" | "lido";

export interface Book {
  id: string;
  title: string;
  author: string;
  year: string;
  kind: BookKind;
  status: BookStatus;
  disciplineIds: string[];
  tags: string[];
  color: string;
  fileId: string | null;
  coverImageId: string | null;
  pages: number;
  currentPage: number;
  /** Data para começar a leitura (lembrete) */
  startBy: ISODate | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** Texto extraído de cada página do PDF, para a busca. */
export interface BookText {
  bookId: string;
  pages: string[];
}

export interface Flashcard {
  id: string;
  disciplineId: string | null;
  lessonId: string | null;
  front: string;
  back: string;
  due: ISODate;
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  source: "manual" | "ia";
  createdAt: string;
}

export interface Question {
  id: string;
  disciplineId: string | null;
  lessonId: string | null;
  stem: string;
  /** Vazio = questão discursiva */
  options: string[];
  answer: number | null;
  explanation: string;
  right: number;
  wrong: number;
  source: "manual" | "ia";
  createdAt: string;
}

export type HourKind = "complementar" | "extensao";

export interface HourEntry {
  id: string;
  kind: HourKind;
  title: string;
  date: ISODate;
  hours: number;
  notes: string;
  createdAt: string;
}

export interface Internship {
  id: string;
  name: string;
  place: string;
  supervisor: string;
  disciplineId: string | null;
  requiredHours: number | null;
  start: ISODate | null;
  end: ISODate | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** Diário de campo do estágio (sem dados de pessoas atendidas). */
export interface FieldNote {
  id: string;
  internshipId: string;
  date: ISODate;
  hours: number;
  text: string;
  createdAt: string;
}

export interface Report {
  id: string;
  internshipId: string | null;
  title: string;
  /** Markdown */
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type AiAction =
  | "resumo"
  | "resumo-aesthetic"
  | "flashcards"
  | "questoes"
  | "jogo"
  | "aprofundar"
  | "explicar"
  | "conversa"
  | "relatorio"
  | "organizar-transcricao";

/** Material gerado pela IA a pedido (fica guardado na disciplina). */
export interface AiOutput {
  id: string;
  action: AiAction;
  disciplineId: string | null;
  lessonId: string | null;
  title: string;
  /** Markdown, ou JSON quando o material tem formato próprio */
  content: string;
  model: string;
  createdAt: string;
}

export interface AiLogEntry {
  id: string;
  at: string;
  action: AiAction;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

/** Evento importado do Google Agenda (endereço iCal). */
export interface CalendarEvent {
  id: string;
  title: string;
  date: ISODate;
  time: string;
  endTime: string;
  allDay: boolean;
  location: string;
}

export type AvatarTone = "carinhosa" | "animada" | "direta" | "engracada" | "calma";
export type AvatarHair = "curto" | "longo" | "coque" | "cacheado" | "franja" | "rabo" | "careca" | "tranca";
export type AvatarEyes = "redondos" | "felizes" | "estrela" | "sonolentos";
export type AvatarMouth = "sorriso" | "aberto" | "gatinho" | "tranquilo";
export type AvatarAccessory = "nenhum" | "oculos" | "laco" | "fones" | "flor" | "chapeu" | "estrela";

export interface AvatarConfig {
  name: string;
  tone: AvatarTone;
  skin: string;
  hair: AvatarHair;
  hairColor: string;
  eyes: AvatarEyes;
  mouth: AvatarMouth;
  accessory: AvatarAccessory;
  outfit: string;
  blush: boolean;
  /** Mostrar o personagem no canto da tela */
  visible: boolean;
  side: "direita" | "esquerda";
}

export type AiModel = "claude-opus-5-5" | "claude-sonnet-5-5" | "claude-haiku-5-5";

export interface Settings {
  onboarded: boolean;
  profileName: string;
  course: string;
  institution: string;
  totalSemesters: number;
  currentSemesterId: string | null;
  avatarImageId: string | null;
  /* Revisão espaçada */
  reviewIntervals: number[];
  hardReinforceDays: number;
  /* Regras da faculdade (todas configuráveis) */
  defaultAbsenceLimit: number | null;
  classesPerDay: number;
  passingGrade: number | null;
  gradeMax: number;
  requiredComplementary: number | null;
  requiredExtension: number | null;
  /* Aparência */
  preset: ThemePreset | "personalizado";
  theme: ThemeMode;
  tone: Tone;
  accent: AccentKey | "personalizada";
  customAccent: string;
  fontBody: FontKey;
  fontTitle: TitleFontKey;
  textScale: TextScale;
  background: BackgroundStyle;
  paper: PaperStyle;
  /** Na folha da aula, só a Apple Pencil escreve; o dedo rola */
  pencilOnly: boolean;
  /* Personagem */
  avatar: AvatarConfig;
  /* Integrações */
  googleIcsUrl: string;
  spotifyUrl: string;
  /* IA (só roda quando você pede) */
  aiEnabled: boolean;
  aiModel: AiModel;
  aiAccessCode: string;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  name: "Mimi",
  tone: "carinhosa",
  skin: "#f2c6a0",
  hair: "longo",
  hairColor: "#4a2c22",
  eyes: "redondos",
  mouth: "sorriso",
  accessory: "laco",
  outfit: "#f4a7c0",
  blush: true,
  visible: true,
  side: "direita",
};

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  profileName: "",
  course: "",
  institution: "",
  totalSemesters: 10,
  currentSemesterId: null,
  avatarImageId: null,
  reviewIntervals: [1, 7, 30],
  hardReinforceDays: 3,
  defaultAbsenceLimit: null,
  classesPerDay: 4,
  passingGrade: null,
  gradeMax: 10,
  requiredComplementary: null,
  requiredExtension: null,
  preset: "rose",
  theme: "auto",
  tone: "rosado",
  accent: "rosa",
  customAccent: "#d94f86",
  fontBody: "nunito",
  fontTitle: "pacifico",
  textScale: "padrao",
  background: "quadriculado",
  paper: "quadriculado",
  pencilOnly: true,
  avatar: DEFAULT_AVATAR,
  googleIcsUrl: "",
  spotifyUrl: "",
  aiEnabled: true,
  aiModel: "claude-opus-5-5",
  aiAccessCode: "",
};

export const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  teorica: "Teórica",
  pratica: "Prática",
  supervisao: "Supervisão",
  seminario: "Seminário",
  revisao: "Revisão",
  prova: "Prova",
};

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  prova: "Prova",
  trabalho: "Trabalho",
  seminario: "Seminário",
  relatorio: "Relatório",
  leitura: "Leitura",
  lembrete: "Lembrete",
  evento: "Evento",
  outro: "Outro",
};

export const TASK_TYPE_EMOJI: Record<TaskType, string> = {
  prova: "📝",
  trabalho: "📎",
  seminario: "🎤",
  relatorio: "📄",
  leitura: "📖",
  lembrete: "🔔",
  evento: "📅",
  outro: "✨",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

export const STATUS_LABEL: Record<DisciplineStatus, string> = {
  andamento: "Em andamento",
  concluida: "Concluída",
  futura: "Futura",
};

export const COLOR_KEYS: ColorKey[] = [
  "rosa",
  "lilas",
  "indigo",
  "azul",
  "turquesa",
  "verde",
  "amarelo",
  "laranja",
  "vermelho",
  "cereja",
];

export const COLOR_LABEL: Record<ColorKey, string> = {
  vermelho: "Vermelho",
  laranja: "Laranja",
  amarelo: "Amarelo",
  verde: "Verde",
  turquesa: "Turquesa",
  azul: "Azul",
  indigo: "Índigo",
  rosa: "Rosa",
  lilas: "Lilás",
  cereja: "Cereja",
};

/** Cores-base de cada chave da paleta (para capas e calendário). */
export const COLOR_HEX: Record<ColorKey, string> = {
  vermelho: "#e5484d",
  laranja: "#f2994a",
  amarelo: "#f2c94c",
  verde: "#6fbf8a",
  turquesa: "#4fb8b0",
  azul: "#5b9bd5",
  indigo: "#7b7fe0",
  rosa: "#f08bb0",
  lilas: "#b49be6",
  cereja: "#8e2f55",
};

export const ACCENT_KEYS: AccentKey[] = ["rosa", "cereja", "lilas", "indigo", "azul", "verde", "laranja", "grafite"];

export const ACCENT_LABEL: Record<AccentKey, string> = {
  rosa: "Rosa",
  cereja: "Cereja",
  lilas: "Lilás",
  indigo: "Índigo",
  azul: "Azul",
  verde: "Verde",
  laranja: "Laranja",
  grafite: "Grafite",
};

export const TONES: Tone[] = ["rosado", "creme", "lavanda", "menta", "neutro", "cafe"];

export const TONE_LABEL: Record<Tone, string> = {
  neutro: "Branco",
  creme: "Creme",
  rosado: "Rosado",
  lavanda: "Lavanda",
  menta: "Menta",
  cafe: "Café",
};

export const FONT_KEYS: FontKey[] = ["sistema", "nunito", "inter", "lexend", "lora", "fraunces", "patrick"];

export const TITLE_FONT_KEYS: TitleFontKey[] = [
  "igual",
  "pacifico",
  "caveat",
  "fraunces",
  "lora",
  "nunito",
  "lexend",
  "inter",
  "patrick",
  "sistema",
];

export const FONT_LABEL: Record<TitleFontKey, string> = {
  igual: "Igual ao texto",
  sistema: "Do aparelho",
  inter: "Inter",
  nunito: "Nunito",
  lexend: "Lexend",
  lora: "Lora",
  fraunces: "Fraunces",
  patrick: "Patrick Hand",
  caveat: "Caveat",
  pacifico: "Pacifico",
};

export const FONT_HINT: Record<TitleFontKey, string> = {
  igual: "Mesma fonte",
  sistema: "Padrão do aparelho",
  inter: "Neutra",
  nunito: "Arredondada",
  lexend: "Leitura fácil",
  lora: "Serifada",
  fraunces: "Editorial",
  patrick: "Letra de mão",
  caveat: "Manuscrita",
  pacifico: "Letreiro",
};

export const PAPER_LABEL: Record<PaperStyle, string> = {
  liso: "Lisa",
  quadriculado: "Quadriculada",
  pontilhado: "Pontilhada",
  pautado: "Pautada",
};

export const BACKGROUND_LABEL: Record<BackgroundStyle, string> = {
  quadriculado: "Quadriculado",
  pontilhado: "Pontilhado",
  liso: "Liso",
  aurora: "Brilho",
};

export const COVER_PATTERNS: CoverPattern[] = [
  "liso",
  "listras",
  "xadrez",
  "bolinhas",
  "quadriculado",
  "losangos",
  "ondas",
  "marmore",
];

export const COVER_PATTERN_LABEL: Record<CoverPattern, string> = {
  liso: "Lisa",
  listras: "Listras",
  xadrez: "Xadrez",
  bolinhas: "Bolinhas",
  quadriculado: "Quadriculada",
  losangos: "Losangos",
  ondas: "Ondas",
  marmore: "Mármore",
};

export const AI_MODEL_LABEL: Record<AiModel, { name: string; hint: string }> = {
  "claude-opus-5-5": { name: "Opus 5.5", hint: "Mais caprichado · custa mais" },
  "claude-sonnet-5-5": { name: "Sonnet 5.5", hint: "Equilibrado · metade do preço" },
  "claude-haiku-5-5": { name: "Haiku 5.5", hint: "Rápido e bem barato" },
};

export const HOUR_KIND_LABEL: Record<HourKind, string> = {
  complementar: "Atividades complementares",
  extensao: "Extensão",
};

export const BOOK_KIND_LABEL: Record<BookKind, string> = {
  livro: "Livro",
  artigo: "Artigo",
  apostila: "Apostila",
  outro: "Outro",
};

export const BOOK_STATUS_LABEL: Record<BookStatus, string> = {
  "quero-ler": "Quero ler",
  lendo: "Lendo",
  lido: "Lido",
};

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAY_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function defaultCover(color: string, pattern: CoverPattern = "liso"): NotebookCover {
  return { color, pattern, imageId: null, stickers: [], label: true, elastic: false };
}
