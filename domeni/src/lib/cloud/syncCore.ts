import type { SyncMeta, SyncTable } from "./track";

/** Regras da sincronização que não dependem de rede (testadas em sync.test.ts). */

export interface RemoteRow {
  tbl: SyncTable;
  id: string;
  data: Record<string, unknown> | null;
  u: number;
  deleted: boolean;
  rev: number;
}

export interface OutgoingRow {
  tbl: SyncTable;
  id: string;
  u: number;
  deleted: boolean;
  data: Record<string, unknown> | null;
}

/** Campos que nunca saem do aparelho. */
const LOCAL_ONLY_SETTINGS = ["aiAccessCode"] as const;

export function isDirty(record: SyncMeta | undefined): boolean {
  if (!record) return false;
  return record._d === 1 || record._s === undefined;
}

/** O que acontece com um registro que chegou da nuvem. */
export function decide(local: SyncMeta | undefined, row: Pick<RemoteRow, "u" | "deleted">): "apply" | "skip" | "mark-clean" {
  if (!local) return row.deleted ? "skip" : "apply";
  const localU = local._u ?? 0;
  if (localU === row.u) return local._d === 1 || local._s !== row.u ? "mark-clean" : "skip";
  // mudança local mais nova ainda não enviada: ela vence e vai subir depois
  if (isDirty(local) && localU > row.u) return "skip";
  return "apply";
}

/** Prepara um registro local para subir (sem campos internos nem segredos). */
export function toOutgoing(tbl: SyncTable, id: string, record: Record<string, unknown>, blob: boolean): OutgoingRow {
  const data: Record<string, unknown> = { ...record };
  delete data._u;
  delete data._s;
  delete data._d;
  if (blob) {
    delete data.data;
    data.__blob = true;
  }
  if (tbl === "settings" && data.value && typeof data.value === "object") {
    const value = { ...(data.value as Record<string, unknown>) };
    for (const key of LOCAL_ONLY_SETTINGS) delete value[key];
    data.value = value;
  }
  return { tbl, id, u: typeof record._u === "number" ? record._u : 1, deleted: false, data };
}

/** Monta o registro local a partir do que veio da nuvem. */
export function fromRemote(
  row: RemoteRow,
  keyPath: string,
  local: Record<string, unknown> | undefined,
  binary?: ArrayBuffer,
): Record<string, unknown> {
  const record: Record<string, unknown> = { ...(row.data ?? {}) };
  delete record.__blob;
  if (binary) record.data = binary;
  if (row.tbl === "settings" && local?.value && typeof record.value === "object" && record.value) {
    const kept: Record<string, unknown> = {};
    for (const key of LOCAL_ONLY_SETTINGS) {
      const v = (local.value as Record<string, unknown>)[key];
      if (v !== undefined) kept[key] = v;
    }
    record.value = { ...(record.value as Record<string, unknown>), ...kept };
  }
  record[keyPath] = row.id;
  record._u = row.u;
  record._s = row.u;
  return record;
}

/** Divide em lotes de até `maxBytes` (um registro grande vai sozinho). */
export function batches<T>(items: T[], size: (item: T) => number, maxBytes = 900_000, maxCount = 200): T[][] {
  const out: T[][] = [];
  let current: T[] = [];
  let bytes = 0;
  for (const item of items) {
    const n = size(item);
    if (current.length > 0 && (bytes + n > maxBytes || current.length >= maxCount)) {
      out.push(current);
      current = [];
      bytes = 0;
    }
    current.push(item);
    bytes += n;
  }
  if (current.length > 0) out.push(current);
  return out;
}

export function storagePath(userId: string, tbl: string, id: string): string {
  return `${userId}/${tbl}/${encodeURIComponent(id)}`;
}
