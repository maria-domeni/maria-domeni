"use client";

import { useSyncExternalStore } from "react";
import { db } from "@/lib/db";
import { getAccount, subscribeAccount } from "./account";
import { getSupabase } from "./client";
import { BLOB_TABLES, cloudEnabled } from "./config";
import { batches, decide, fromRemote, isDirty, storagePath, toOutgoing, type OutgoingRow, type RemoteRow } from "./syncCore";
import {
  OWNER_KEY,
  SYNC_TABLES,
  dropTombstones,
  markRemote,
  onLocalChange,
  readTombstones,
  syncOwner,
  writeTombstones,
  type SyncMeta,
  type SyncTable,
} from "./track";

/**
 * Sincronização entre aparelhos (Plus). Sobe o que mudou aqui, baixa o que
 * mudou em outros aparelhos; quando os dois mudaram, vale a versão mais nova.
 * Roda ao abrir o app, ao voltar para ele e alguns segundos depois de mudanças.
 * Não usa IA nem gasta créditos.
 */

export type SyncStatus =
  | { state: "off"; reason: "sem-nuvem" | "sem-conta" | "sem-plano" }
  | { state: "conflito"; otherOwner: string }
  | { state: "ocioso"; lastAt: number | null }
  | { state: "sincronizando"; lastAt: number | null }
  | { state: "erro"; message: string; lastAt: number | null };

let status: SyncStatus = { state: "off", reason: cloudEnabled ? "sem-conta" : "sem-nuvem" };
const listeners = new Set<() => void>();
function setStatus(next: SyncStatus) {
  status = next;
  for (const fn of listeners) fn();
}
const SERVER_STATUS: SyncStatus = { state: "off", reason: "sem-nuvem" };
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => status,
    () => SERVER_STATUS,
  );
}

const LAST_KEY = "domeni:sync:ultima";
const cursorKey = (uid: string) => `domeni:sync:cursor:${uid}`;
const initialKey = (uid: string) => `domeni:sync:inicial:${uid}`;

function lastAt(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

function keyPathOf(tbl: SyncTable): string {
  return db.table(tbl).schema.primKey.keyPath as string;
}

/** Quem pode sincronizar agora (e por que não). */
function eligibility(): { ok: true; uid: string; plus: boolean } | { ok: false; status: SyncStatus } {
  if (!cloudEnabled) return { ok: false, status: { state: "off", reason: "sem-nuvem" } };
  const account = getAccount();
  if (account.status !== "signed-in") return { ok: false, status: { state: "off", reason: "sem-conta" } };
  const uid = account.user.id;
  const owner = syncOwner();
  if (owner && owner !== uid) return { ok: false, status: { state: "conflito", otherOwner: owner } };
  const plus = account.info?.plan === "plus";
  if (!account.info) return { ok: false, status: { state: "off", reason: "sem-plano" } };
  if (!plus && !owner) return { ok: false, status: { state: "off", reason: "sem-plano" } };
  return { ok: true, uid, plus };
}

let running: Promise<void> | null = null;
let again = false;

/** Sincroniza agora. Se já estiver rodando, roda de novo no fim. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await runOnce();
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

async function runOnce(): Promise<void> {
  const check = eligibility();
  if (!check.ok) {
    setStatus(check.status);
    return;
  }
  const { uid, plus } = check;
  setStatus({ state: "sincronizando", lastAt: lastAt() });
  try {
    try {
      localStorage.setItem(OWNER_KEY, uid);
    } catch {
      // sem armazenamento: segue sem guardar exclusões
    }
    const sb = await getSupabase();
    if (plus) await push(sb, uid);
    await pull(sb, uid);
    const now = Date.now();
    try {
      localStorage.setItem(LAST_KEY, String(now));
    } catch {
      // ignora
    }
    setStatus(plus ? { state: "ocioso", lastAt: now } : { state: "off", reason: "sem-plano" });
  } catch (error) {
    const raw = (error as { message?: string })?.message ?? "";
    const message = /sem-plano/.test(raw)
      ? "Seu plano não está ativo. A sincronização está pausada."
      : /fetch|network|Failed/i.test(raw)
        ? "Sem internet. Tento de novo quando a conexão voltar."
        : /quota|row-level|policy|exceed/i.test(raw)
          ? "O espaço na nuvem acabou (limite do plano). Apague arquivos grandes para continuar."
          : `Não consegui sincronizar agora. ${raw}`.trim();
    setStatus({ state: "erro", message, lastAt: lastAt() });
  }
}

type Sb = Awaited<ReturnType<typeof getSupabase>>;

async function rpcPush(sb: Sb, rows: OutgoingRow[]) {
  for (const batch of batches(rows, (r) => JSON.stringify(r).length)) {
    const { error } = await sb.rpc("sync_push", { records: batch });
    if (error) throw new Error(error.message);
  }
}

async function push(sb: Sb, uid: string) {
  // 1. o que foi apagado aqui
  const tombs = readTombstones();
  if (tombs.length > 0) {
    await rpcPush(
      sb,
      tombs.map((t) => ({ tbl: t.tbl, id: t.id, u: t.u, deleted: true, data: null })),
    );
    const files = tombs.filter((t) => BLOB_TABLES.has(t.tbl)).map((t) => storagePath(uid, t.tbl, t.id));
    if (files.length > 0) await sb.storage.from("arquivos").remove(files);
    dropTombstones(tombs);
  }

  // 2. o que mudou aqui
  const firstTime = (() => {
    try {
      return !localStorage.getItem(initialKey(uid));
    } catch {
      return true;
    }
  })();
  for (const tbl of SYNC_TABLES) {
    const table = db.table(tbl);
    const keyPath = keyPathOf(tbl);
    const dirty = (
      firstTime
        ? await table.filter((r: SyncMeta) => isDirty(r)).toArray()
        : await table.where("_d").equals(1).toArray()
    ) as (Record<string, unknown> & SyncMeta)[];
    if (dirty.length === 0) continue;
    const blob = BLOB_TABLES.has(tbl);
    const outgoing: OutgoingRow[] = [];
    for (const record of dirty) {
      const id = String(record[keyPath]);
      if (blob && record.data instanceof ArrayBuffer) {
        const type = typeof record.type === "string" && record.type ? record.type : "application/octet-stream";
        const { error } = await sb.storage
          .from("arquivos")
          .upload(storagePath(uid, tbl, id), new Blob([record.data], { type }), { upsert: true, contentType: type });
        if (error) throw new Error(error.message);
      }
      outgoing.push(toOutgoing(tbl, id, record, blob));
    }
    await rpcPush(sb, outgoing);
    await markClean(tbl, outgoing);
  }
  if (firstTime) {
    try {
      localStorage.setItem(initialKey(uid), "1");
    } catch {
      // ignora
    }
  }
}

async function markClean(tbl: SyncTable, sent: OutgoingRow[]) {
  const table = db.table(tbl);
  await db.transaction("rw", table, async (tx) => {
    markRemote(tx);
    for (const row of sent) {
      const current = (await table.get(row.id)) as SyncMeta | undefined;
      if (!current) continue;
      if ((current._u ?? 1) === row.u) await table.update(row.id, { _u: row.u, _s: row.u, _d: undefined });
    }
  });
}

async function pull(sb: Sb, uid: string) {
  let cursor = 0;
  try {
    cursor = Number(localStorage.getItem(cursorKey(uid))) || 0;
  } catch {
    // começa do zero
  }
  for (;;) {
    const { data, error } = await sb
      .from("sync_records")
      .select("tbl,id,data,u,deleted,rev")
      .gt("rev", cursor)
      .order("rev", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as RemoteRow[];
    if (rows.length === 0) break;
    await applyRemote(sb, uid, rows);
    cursor = rows[rows.length - 1].rev;
    try {
      localStorage.setItem(cursorKey(uid), String(cursor));
    } catch {
      // sem marcador: baixa de novo da próxima vez, sem perder nada
    }
    if (rows.length < 200) break;
  }
}

async function applyRemote(sb: Sb, uid: string, rows: RemoteRow[]) {
  const known = new Set<string>(SYNC_TABLES);
  // baixa os arquivos antes de abrir a transação (rede não pode ficar dentro dela)
  const binaries = new Map<string, ArrayBuffer>();
  for (const row of rows) {
    if (!known.has(row.tbl) || row.deleted || !BLOB_TABLES.has(row.tbl)) continue;
    const local = (await db.table(row.tbl).get(row.id)) as SyncMeta | undefined;
    if (decide(local, row) !== "apply") continue;
    const { data, error } = await sb.storage.from("arquivos").download(storagePath(uid, row.tbl, row.id));
    if (error || !data) throw new Error(error?.message ?? "Arquivo não encontrado na nuvem.");
    binaries.set(`${row.tbl}\u0001${row.id}`, await data.arrayBuffer());
  }
  const tables = [...new Set(rows.map((r) => r.tbl).filter((t) => known.has(t)))];
  if (tables.length === 0) return;
  await db.transaction("rw", tables.map((t) => db.table(t)), async (tx) => {
    markRemote(tx);
    for (const row of rows) {
      if (!known.has(row.tbl)) continue;
      const table = db.table(row.tbl);
      const local = (await table.get(row.id)) as (Record<string, unknown> & SyncMeta) | undefined;
      const action = decide(local, row);
      if (action === "skip") continue;
      if (action === "mark-clean") {
        await table.update(row.id, { _s: row.u, _d: undefined });
        continue;
      }
      if (row.deleted) {
        await table.delete(row.id);
        continue;
      }
      const binary = binaries.get(`${row.tbl}\u0001${row.id}`);
      if (BLOB_TABLES.has(row.tbl) && !binary) continue;
      await table.put(fromRemote(row, keyPathOf(row.tbl), local, binary));
    }
  });
}

/** Este aparelho tem dados de outra conta: apaga tudo daqui e passa a usar a conta atual. */
export async function adoptDeviceForCurrentAccount(): Promise<void> {
  const account = getAccount();
  if (account.status !== "signed-in") return;
  await db.transaction("rw", SYNC_TABLES.map((t) => db.table(t)), async (tx) => {
    markRemote(tx);
    for (const t of SYNC_TABLES) await db.table(t).clear();
  });
  writeTombstones([]);
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith("domeni:sync:")) localStorage.removeItem(key);
    localStorage.setItem(OWNER_KEY, account.user.id);
  } catch {
    // ignora
  }
  await syncNow();
}

/** Sair da conta neste aparelho para de sincronizar, mas mantém os dados aqui. */
export function forgetSyncOwner(): void {
  try {
    localStorage.removeItem(OWNER_KEY);
  } catch {
    // ignora
  }
  writeTombstones([]);
}

let started = false;
let timer = 0;

/** Liga os gatilhos: abrir, voltar para o app, ficar online e mudanças locais. */
export function startSync(): void {
  if (started || !cloudEnabled || typeof window === "undefined") return;
  started = true;
  const schedule = (ms: number) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void syncNow(), ms);
  };
  let lastAccount = "";
  subscribeAccount(() => {
    const a = getAccount();
    const sig = a.status === "signed-in" ? `${a.user.id}:${a.info?.plan ?? "?"}` : a.status;
    if (sig === lastAccount) return;
    lastAccount = sig;
    schedule(300);
  });
  onLocalChange(() => {
    if (status.state === "ocioso" || status.state === "erro") schedule(12_000);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedule(500);
  });
  window.addEventListener("online", () => schedule(1000));
  window.setInterval(() => {
    if (document.visibilityState === "visible") void syncNow();
  }, 5 * 60_000);
  schedule(800);
}
