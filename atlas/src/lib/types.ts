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
  color: ColorKey;
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
  profileName: string;
  course: string;
  institution: string;
  totalSemesters: number;
  currentSemesterId: string | null;
  /** Dias após a aula para cada revisão (R1, R2, R3…) */
  reviewIntervals: number[];
  /** Dias até o reforço quando uma revisão é marcada como Difícil. 0 desliga. */
  hardReinforceDays: number;
  theme: ThemeMode;
  accent: AccentKey;
}

export const DEFAULT_SETTINGS: Settings = {
  profileName: "",
  course: "Psicologia",
  institution: "UMC",
  totalSemesters: 10,
  currentSemesterId: null,
  reviewIntervals: [1, 7, 30],
  hardReinforceDays: 3,
  theme: "auto",
  accent: "indigo",
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

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
