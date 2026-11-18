import { DATA_TABLES, db, type DataTableName } from "./db";
import { isISODate, todayISO } from "./dates";
import { base64ToBytes, bytesToBase64, pruneImages } from "./images";
import { normalizeSettings } from "./settings";
import type { Settings } from "./types";

/** Formato do arquivo de backup do Domeni. */
export const BACKUP_FORMAT_VERSION = 1;
export const LAST_BACKUP_KEY = "domeni-ultimo-backup";

type Row = Record<string, unknown>;

export interface BackupFile {
  app: "domeni";
  formatVersion: number;
  exportedAt: string;
  tables: Partial<Record<DataTableName, Row[]>>;
  settings: Settings;
}

export class BackupError extends Error {}

/** Bytes viram {"$b64": "..."} dentro do JSON. */
function encodeValue(value: unknown): unknown {
  if (value instanceof ArrayBuffer) return { $b64: bytesToBase64(value) };
  if (Array.isArray(value)) return value.map(encodeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encodeValue(v)]));
  }
  return value;
}

function decodeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeValue);
  if (value && typeof value === "object") {
    const record = value as Row;
    const keys = Object.keys(record);
    if (keys.length === 1 && keys[0] === "$b64") {
      if (typeof record.$b64 !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(record.$b64)) {
        throw new BackupError("O arquivo tem um anexo danificado.");
      }
      return base64ToBytes(record.$b64);
    }
    return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, decodeValue(v)]));
  }
  return value;
}

const KEY_OF: Partial<Record<DataTableName, string>> = { pages: "lessonId", bookTexts: "bookId" };

export async function exportBackup(): Promise<BackupFile> {
  await pruneImages();
  const tables: BackupFile["tables"] = {};
  for (const name of DATA_TABLES) {
    const rows = (await db.table(name).toArray()) as Row[];
    tables[name] = rows.map((row) => encodeValue(row) as Row);
  }
  const settingsRow = await db.settings.get("app");
  // O código de acesso da IA não vai para o arquivo
  const settings = { ...normalizeSettings(settingsRow?.value), aiAccessCode: "" };
  return {
    app: "domeni",
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
    settings,
  };
}

/** Confere e prepara um arquivo de backup para restaurar. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError("Este arquivo não é um backup do Domeni.");
  }
  const file = raw as Partial<BackupFile>;
  if (!file || file.app !== "domeni" || typeof file.tables !== "object" || file.tables === null) {
    throw new BackupError("Este arquivo não é um backup do Domeni.");
  }
  if (typeof file.formatVersion !== "number" || file.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupError("Este backup é de uma versão mais nova do Domeni. Atualize o app e tente de novo.");
  }
  const tables: BackupFile["tables"] = {};
  for (const name of DATA_TABLES) {
    const rows = (file.tables as Record<string, unknown>)[name];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) throw new BackupError("O arquivo de backup está incompleto.");
    const key = KEY_OF[name] ?? "id";
    tables[name] = rows.map((row) => {
      if (!row || typeof row !== "object" || typeof (row as Row)[key] !== "string") {
        throw new BackupError("O arquivo de backup está danificado.");
      }
      return decodeValue(row) as Row;
    });
  }
  return {
    app: "domeni",
    formatVersion: file.formatVersion,
    exportedAt: typeof file.exportedAt === "string" ? file.exportedAt : "",
    tables,
    settings: normalizeSettings(file.settings),
  };
}

/** Troca todos os dados do aparelho pelos do backup. */
export async function restoreBackup(file: BackupFile): Promise<void> {
  const current = normalizeSettings((await db.settings.get("app"))?.value);
  await db.transaction("rw", [...DATA_TABLES.map((name) => db.table(name)), db.settings], async () => {
    for (const name of DATA_TABLES) await db.table(name).clear();
    for (const name of DATA_TABLES) {
      const rows = file.tables[name];
      if (rows && rows.length > 0) await db.table(name).bulkPut(rows);
    }
    await db.settings.put({
      key: "app",
      // mantém o código de acesso da IA que já estava neste aparelho
      value: { ...file.settings, aiAccessCode: current.aiAccessCode, onboarded: true },
    });
  });
}

export async function eraseEverything(): Promise<void> {
  await db.transaction("rw", [...DATA_TABLES.map((name) => db.table(name)), db.settings], async () => {
    for (const name of DATA_TABLES) await db.table(name).clear();
    await db.settings.clear();
  });
}

export function backupSummary(file: BackupFile): string {
  const count = (name: DataTableName) => file.tables[name]?.length ?? 0;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const parts = [
    plural(count("semesters"), "semestre", "semestres"),
    plural(count("disciplines"), "disciplina", "disciplinas"),
    plural(count("lessons"), "aula", "aulas"),
  ];
  if (count("books") > 0) parts.push(plural(count("books"), "livro", "livros"));
  if (count("cards") > 0) parts.push(plural(count("cards"), "flashcard", "flashcards"));
  return parts.join(", ");
}

export function backupFilename(date: string = todayISO()): string {
  return `domeni-backup-${date}.json`;
}

/**
 * Entrega um arquivo à pessoa. No iPad abre a folha de compartilhamento
 * (Salvar em Arquivos); no computador baixa direto.
 */
export async function deliverFile(blob: File): Promise<"compartilhado" | "baixado" | "cancelado"> {
  const touch = typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;
  if (touch && typeof navigator.canShare === "function" && navigator.canShare({ files: [blob] })) {
    try {
      await navigator.share({ files: [blob], title: blob.name });
      return "compartilhado";
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return "cancelado";
      // sem permissão para compartilhar: cai para o download
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = blob.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return "baixado";
}

export async function deliverBackup(file: BackupFile): Promise<"compartilhado" | "baixado" | "cancelado"> {
  const name = backupFilename();
  const blob = new File([JSON.stringify(file)], name, { type: "application/json" });
  const result = await deliverFile(blob);
  if (result !== "cancelado") markBackupDone();
  return result;
}

function markBackupDone(): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, todayISO());
  } catch {
    // sem armazenamento local: só não lembramos a data
  }
}

export function lastBackupDate(): string | null {
  try {
    const value = localStorage.getItem(LAST_BACKUP_KEY);
    return isISODate(value) ? value : null;
  } catch {
    return null;
  }
}
