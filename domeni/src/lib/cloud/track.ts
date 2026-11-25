import type { Dexie, Transaction } from "dexie";

/**
 * Marca o que mudou no aparelho para a sincronização saber o que enviar.
 * Cada registro ganha `_u` (hora da última mudança, em ms) e `_d` (1 enquanto
 * não foi enviado). Registros que vêm da nuvem são gravados numa transação
 * marcada como remota e não contam como mudança local.
 */

export const SYNC_TABLES = [
  "semesters",
  "disciplines",
  "lessons",
  "pages",
  "recordings",
  "reviews",
  "tasks",
  "attendance",
  "grades",
  "books",
  "bookTexts",
  "cards",
  "questions",
  "hours",
  "internships",
  "fieldNotes",
  "reports",
  "aiOutputs",
  "calendar",
  "images",
  "files",
  "settings",
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export interface SyncMeta {
  _u?: number;
  _s?: number;
  _d?: 1;
}

export interface Tombstone {
  tbl: SyncTable;
  id: string;
  u: number;
}

const remoteTransactions = new WeakSet<object>();
export function markRemote(tx: object): void {
  remoteTransactions.add(tx);
}

let last = 0;
/** Relógio que nunca repete nem volta, para duas mudanças seguidas não empatarem. */
export function tick(): number {
  const now = Date.now();
  last = now > last ? now : last + 1;
  return last;
}

const listeners = new Set<() => void>();
export function onLocalChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // quem escuta não pode quebrar a gravação
    }
  }
}

export const OWNER_KEY = "domeni:sync:owner";
const TOMBSTONES_KEY = "domeni:sync:apagados";

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Só guarda o que foi apagado se este aparelho já sincroniza com uma conta. */
export function syncOwner(): string | null {
  return storage()?.getItem(OWNER_KEY) ?? null;
}

export function readTombstones(): Tombstone[] {
  try {
    const raw = storage()?.getItem(TOMBSTONES_KEY);
    const list = raw ? (JSON.parse(raw) as Tombstone[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeTombstones(list: Tombstone[]): void {
  try {
    const s = storage();
    if (!s) return;
    if (list.length === 0) s.removeItem(TOMBSTONES_KEY);
    else s.setItem(TOMBSTONES_KEY, JSON.stringify(list));
  } catch {
    // sem espaço: a exclusão volta da nuvem na próxima vez, nada se perde
  }
}

/** Tira da lista os apagados já enviados (por identidade, para não perder novos). */
export function dropTombstones(sent: Tombstone[]): void {
  const done = new Set(sent.map((t) => `${t.tbl}\u0001${t.id}\u0001${t.u}`));
  writeTombstones(readTombstones().filter((t) => !done.has(`${t.tbl}\u0001${t.id}\u0001${t.u}`)));
}

function addTombstone(tbl: SyncTable, id: string) {
  if (!syncOwner()) return;
  const list = readTombstones().filter((t) => !(t.tbl === tbl && t.id === id));
  list.push({ tbl, id, u: tick() });
  writeTombstones(list);
}

export function installTracking(db: Dexie): void {
  for (const name of SYNC_TABLES) {
    const table = db.table(name);
    table.hook("creating", function (_key: unknown, obj: SyncMeta, trans: Transaction) {
      if (remoteTransactions.has(trans)) return;
      obj._u = tick();
      obj._d = 1;
      delete obj._s;
      notify();
    });
    table.hook("updating", function (_mods: object, _key: unknown, _obj: SyncMeta, trans: Transaction) {
      if (remoteTransactions.has(trans)) return undefined;
      notify();
      return { _u: tick(), _d: 1 };
    });
    table.hook("deleting", function (key: unknown, _obj: unknown, trans: Transaction) {
      if (remoteTransactions.has(trans)) return;
      addTombstone(name, String(key));
      notify();
    });
  }
}
