/** Data local no formato AAAA-MM-DD (sem fuso horário). */
export type ISODate = string;

export type DisciplineStatus = "andamento" | "concluida" | "futura";

export type LessonType =
  | "teorica"
  | "pratica"
  | "supervisao"
  | "seminario"
  | "revisao"
  | "prova";

export type Difficulty = "facil" | "medio" | "dificil";

export type TaskType =
  | "prova"
  | "trabalho"
  | "seminario"
  | "relatorio"
  | "leitura"
  | "outro";

export type ColorKey =
  | "vermelho"
  | "laranja"
  | "amarelo"
  | "verde"
  | "turquesa"
  | "azul"
  | "indigo"
  | "rosa";

export type AccentKey = "indigo" | "azul" | "rosa" | "verde" | "laranja" | "lilas";

export type ThemeMode = "auto" | "claro" | "escuro";

export type FontKey = "sistema" | "inter" | "nunito" | "lexend" | "lora" | "fraunces";

/** "igual" usa a mesma fonte do restante do app. */
export type TitleFontKey = FontKey | "caveat" | "igual";

export type BackgroundStyle = "liso" | "suave" | "aurora";

export type TextScale = "pequeno" | "padrao" | "grande";

export type CoverPreset =
  | "destaque"
  | "aurora"
  | "por-do-sol"
  | "oceano"
  | "floresta"
  | "lavanda"
  | "grafite";

export interface Cover {
  kind: "nenhuma" | "predefinida" | "imagem";
  preset: CoverPreset;
  imageId: string | null;
}

export type TodaySectionKey = "resumo" | "aulas" | "revisoes" | "prazos" | "leituras";

export interface TodaySection {
  key: TodaySectionKey;
  visible: boolean;
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

export interface Semester {
  id: string;
  number: number;
  start?: ISODate;
  end?: ISODate;
  createdAt: string;
  updatedAt: string;
}

export interface Discipline {
  id: string;
  semesterId: string;
  name: string;
  professor: string;
  /** Uma cor da paleta (ColorKey) ou uma cor livre no formato #rrggbb. */
  color: string;
  emoji: string;
  coverImageId: string | null;
  status: DisciplineStatus;
  /** 0 = domingo … 6 = sábado */
  weekdays: number[];
  startTime: string;
  endTime: string;
  room: string;
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
  /** Antes da aula */
  reading: string;
  readingDone: boolean;
  questions: string;
  /** Durante a aula (HTML do editor) */
  notes: string;
  doubts: string;
  /** Depois da aula */
  feynman: string;
  gaps: string;
  summary: string;
  mindmap: string;
  examQuestions: string;
  /** Revisão espaçada ligada para esta aula */
  reviewsOn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  lessonId: string;
  /** Índice do intervalo (0 = R1, 1 = R2…). No reforço, repete o passo de origem. */
  step: number;
  kind: "regular" | "reforco";
  dueDate: ISODate;
  doneAt?: ISODate;
  difficulty?: Difficulty;
  /** Revisão que gerou este reforço */
  parentId?: string;
}

export interface Task {
  id: string;
  disciplineId: string | null;
  title: string;
  type: TaskType;
  dueDate: ISODate;
  done: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  /** Já passou pela configuração inicial */
  onboarded: boolean;
  profileName: string;
  course: string;
  institution: string;
  totalSemesters: number;
  currentSemesterId: string | null;
  avatarImageId: string | null;
  /** Dias após a aula para cada revisão (R1, R2, R3…) */
  reviewIntervals: number[];
  /** Dias até o reforço quando uma revisão é marcada como Difícil. 0 desliga. */
  hardReinforceDays: number;
  theme: ThemeMode;
  accent: AccentKey | "personalizada";
  /** Cor livre (#rrggbb), usada quando accent é "personalizada" */
  customAccent: string;
  fontBody: FontKey;
  fontTitle: TitleFontKey;
  /** Tamanho do texto das anotações */
  textScale: TextScale;
  background: BackgroundStyle;
  todayCover: Cover;
  /** Ordem e visibilidade das seções da tela Hoje */
  todaySections: TodaySection[];
}

export const TODAY_SECTION_KEYS: TodaySectionKey[] = [
  "resumo",
  "aulas",
  "revisoes",
  "prazos",
  "leituras",
];

export const TODAY_SECTION_LABEL: Record<TodaySectionKey, string> = {
  resumo: "Resumo em números",
  aulas: "Aulas de hoje",
  revisoes: "Revisões",
  prazos: "Prazos",
  leituras: "Leitura prévia",
};

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  profileName: "",
  course: "",
  institution: "",
  totalSemesters: 8,
  currentSemesterId: null,
  avatarImageId: null,
  reviewIntervals: [1, 7, 30],
  hardReinforceDays: 3,
  theme: "auto",
  accent: "indigo",
  customAccent: "#7c3aed",
  fontBody: "sistema",
  fontTitle: "igual",
  textScale: "padrao",
  background: "aurora",
  todayCover: { kind: "predefinida", preset: "destaque", imageId: null },
  todaySections: TODAY_SECTION_KEYS.map((key) => ({ key, visible: true })),
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
  outro: "Outro",
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
  "indigo",
  "rosa",
  "verde",
  "laranja",
  "azul",
  "turquesa",
  "amarelo",
  "vermelho",
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
};

export const ACCENT_KEYS: AccentKey[] = ["indigo", "azul", "rosa", "verde", "laranja", "lilas"];

export const ACCENT_LABEL: Record<AccentKey, string> = {
  indigo: "Índigo",
  azul: "Azul",
  rosa: "Rosa",
  verde: "Verde",
  laranja: "Laranja",
  lilas: "Lilás",
};

export const FONT_KEYS: FontKey[] = ["sistema", "inter", "nunito", "lexend", "lora", "fraunces"];

export const TITLE_FONT_KEYS: TitleFontKey[] = [
  "igual",
  "sistema",
  "inter",
  "nunito",
  "lexend",
  "lora",
  "fraunces",
  "caveat",
];

export const FONT_LABEL: Record<TitleFontKey, string> = {
  igual: "Igual ao app",
  sistema: "Do sistema",
  inter: "Inter",
  nunito: "Nunito",
  lexend: "Lexend",
  lora: "Lora",
  fraunces: "Fraunces",
  caveat: "Caveat",
};

export const FONT_HINT: Record<TitleFontKey, string> = {
  igual: "Mesma fonte",
  sistema: "Padrão do aparelho",
  inter: "Neutra",
  nunito: "Arredondada",
  lexend: "Leitura fácil",
  lora: "Serifada",
  fraunces: "Editorial",
  caveat: "Manuscrita",
};

export const COVER_PRESETS: CoverPreset[] = [
  "destaque",
  "aurora",
  "por-do-sol",
  "oceano",
  "floresta",
  "lavanda",
  "grafite",
];

export const COVER_LABEL: Record<CoverPreset, string> = {
  destaque: "Cor de destaque",
  aurora: "Aurora",
  "por-do-sol": "Pôr do sol",
  oceano: "Oceano",
  floresta: "Floresta",
  lavanda: "Lavanda",
  grafite: "Grafite",
};

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
