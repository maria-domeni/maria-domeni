import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* ---------- localStorage e window mínimos para o motor rodar no Node ---------- */
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  get length() {
    return this.map.size;
  }
}
const ls = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: new Proxy(ls, {
  ownKeys: (t) => [...(t as unknown as { map: Map<string, string> }).map.keys()],
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
}), configurable: true });

/* ---------- servidor falso com as mesmas regras do SQL ---------- */
interface Row {
  tbl: string;
  id: string;
  data: Record<string, unknown> | null;
  u: number;
  deleted: boolean;
  rev: number;
}
const server = { rows: new Map<string, Row>(), rev: 0, files: new Map<string, Blob>(), plus: true };
function serverPut(r: Omit<Row, "rev">) {
  const key = `${r.tbl}/${r.id}`;
  const cur = server.rows.get(key);
  if (cur && cur.u >= r.u) return;
  server.rows.set(key, { ...r, data: r.deleted ? null : r.data, rev: ++server.rev });
}
const fakeSb = {
  rpc: async (name: string, args: { records: Omit<Row, "rev">[] }) => {
    expect(name).toBe("sync_push");
    if (!server.plus) return { data: null, error: { message: "sem-plano" } };
    for (const r of args.records) serverPut(JSON.parse(JSON.stringify(r)));
    return { data: args.records.length, error: null };
  },
  from: () => {
    let after = 0;
    let max = 1000;
    const q = {
      select: () => q,
      gt: (_c: string, v: number) => ((after = v), q),
      order: () => q,
      limit: (n: number) => {
        max = n;
        const data = [...server.rows.values()].filter((r) => r.rev > after).sort((a, b) => a.rev - b.rev).slice(0, max);
        return Promise.resolve({ data: JSON.parse(JSON.stringify(data)), error: null });
      },
    };
    return q;
  },
  storage: {
    from: () => ({
      upload: async (path: string, blob: Blob) => (server.files.set(path, blob), { error: null }),
      download: async (path: string) => {
        const b = server.files.get(path);
        return b ? { data: b, error: null } : { data: null, error: { message: "não achei" } };
      },
      remove: async (paths: string[]) => (paths.forEach((p) => server.files.delete(p)), { error: null }),
    }),
  },
};

const USER = { id: "user-1", email: "a@b.c" };
let plan: "plus" | "gratis" = "plus";
vi.mock("./config", async (orig) => ({ ...(await orig<typeof import("./config")>()), cloudEnabled: true }));
vi.mock("./client", () => ({ getSupabase: async () => fakeSb }));
vi.mock("./account", () => ({
  getAccount: () => ({ status: "signed-in", user: USER, info: { plan }, infoError: null }),
  subscribeAccount: () => () => undefined,
}));

const { db } = await import("@/lib/db");
const { syncNow, adoptDeviceForCurrentAccount } = await import("./sync");
const { decide, toOutgoing, batches } = await import("./syncCore");
const { saveSettings } = await import("@/lib/store");

beforeEach(async () => {
  server.rows.clear();
  server.files.clear();
  server.rev = 0;
  server.plus = true;
  plan = "plus";
  ls.clear();
  await Promise.all(db.tables.map((t) => t.clear()));
  ls.clear();
});

const sem = (id: string, number: number) => ({ id, number, cover: { color: "#fff", pattern: "liso", stickers: [] } });

describe("regras", () => {
  it("decide quem vence", () => {
    expect(decide(undefined, { u: 5, deleted: false })).toBe("apply");
    expect(decide(undefined, { u: 5, deleted: true })).toBe("skip");
    expect(decide({ _u: 5, _s: 5 }, { u: 5, deleted: false })).toBe("skip");
    expect(decide({ _u: 5, _d: 1 }, { u: 5, deleted: false })).toBe("mark-clean");
    expect(decide({ _u: 9, _d: 1 }, { u: 5, deleted: false })).toBe("skip");
    expect(decide({ _u: 3, _d: 1 }, { u: 5, deleted: false })).toBe("apply");
    expect(decide({ _u: 3, _s: 3 }, { u: 5, deleted: true })).toBe("apply");
  });
  it("não envia segredos nem campos internos", () => {
    const out = toOutgoing("settings", "app", { key: "app", value: { aiAccessCode: "x", profileName: "A" }, _u: 7, _d: 1 }, false);
    expect(out.data).toEqual({ key: "app", value: { profileName: "A" } });
    expect(out.u).toBe(7);
    const blob = toOutgoing("images", "i", { id: "i", data: new ArrayBuffer(4), _u: 2 }, true);
    expect(blob.data).toEqual({ id: "i", __blob: true });
  });
  it("divide lotes por tamanho", () => {
    expect(batches([1, 2, 3, 4], () => 400, 900).map((b) => b.length)).toEqual([2, 2]);
    expect(batches([1], () => 5000, 900).length).toBe(1);
  });
});

describe("sincronização", () => {
  it("marca mudanças locais e sobe tudo", async () => {
    await db.semesters.put(sem("s1", 1) as never);
    const local = await db.semesters.get("s1");
    expect((local as unknown as { _d: number })._d).toBe(1);
    await syncNow();
    expect(server.rows.get("semesters/s1")?.data).toMatchObject({ id: "s1", number: 1 });
    const after = (await db.semesters.get("s1")) as unknown as { _d?: number; _s?: number; _u: number };
    expect(after._d).toBeUndefined();
    expect(after._s).toBe(after._u);
    expect(await db.semesters.where("_d").equals(1).count()).toBe(0);
  });

  it("baixa mudanças de outro aparelho e respeita a mais nova", async () => {
    await db.semesters.put(sem("s1", 1) as never);
    await syncNow();
    const u = server.rows.get("semesters/s1")!.u;
    serverPut({ tbl: "semesters", id: "s1", data: { ...sem("s1", 2) }, u: u + 1000, deleted: false });
    serverPut({ tbl: "semesters", id: "s2", data: { ...sem("s2", 3) }, u: u + 10, deleted: false });
    await syncNow();
    expect((await db.semesters.get("s1"))?.number).toBe(2);
    expect((await db.semesters.get("s2"))?.number).toBe(3);
    // nada volta a subir: o que veio da nuvem não conta como mudança local
    expect(await db.semesters.where("_d").equals(1).count()).toBe(0);
  });

  it("mudança local mais nova não é sobrescrita", async () => {
    await db.semesters.put(sem("s1", 1) as never);
    await syncNow();
    serverPut({ tbl: "semesters", id: "s1", data: { ...sem("s1", 5) }, u: 1, deleted: false }); // velho: ignorado
    await db.semesters.update("s1", { number: 7 });
    await syncNow();
    expect((await db.semesters.get("s1"))?.number).toBe(7);
    expect(server.rows.get("semesters/s1")?.data).toMatchObject({ number: 7 });
  });

  it("apagar aqui apaga na nuvem e vice-versa", async () => {
    await db.semesters.bulkPut([sem("s1", 1), sem("s2", 2)] as never);
    await syncNow();
    await db.semesters.delete("s1");
    await syncNow();
    expect(server.rows.get("semesters/s1")?.deleted).toBe(true);
    const u = server.rows.get("semesters/s2")!.u;
    serverPut({ tbl: "semesters", id: "s2", data: null, u: u + 5, deleted: true });
    await syncNow();
    expect(await db.semesters.count()).toBe(0);
  });

  it("arquivos vão para o storage e voltam", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;
    await db.images.put({ id: "img1", type: "image/png", data: bytes, width: 1, height: 1, createdAt: "2026-01-01" });
    await syncNow();
    expect(server.rows.get("images/img1")?.data).toMatchObject({ id: "img1", __blob: true });
    expect(server.files.has("user-1/images/img1")).toBe(true);
    // novo aparelho: limpa local e baixa de novo
    await adoptDeviceForCurrentAccount();
    const back = await db.images.get("img1");
    expect(new Uint8Array(back!.data)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("guarda o código da IA só no aparelho", async () => {
    await saveSettings({ aiAccessCode: "segredo", profileName: "Bia" });
    await syncNow();
    expect(JSON.stringify(server.rows.get("settings/app")?.data)).not.toContain("segredo");
    const u = server.rows.get("settings/app")!.u;
    serverPut({ tbl: "settings", id: "app", data: { key: "app", value: { profileName: "Ana" } }, u: u + 5, deleted: false });
    await syncNow();
    const row = await db.settings.get("app");
    expect(row?.value).toMatchObject({ profileName: "Ana", aiAccessCode: "segredo" });
  });

  it("sem plano: não sobe, mas ainda baixa", async () => {
    plan = "gratis";
    ls.setItem("domeni:sync:owner", "user-1");
    serverPut({ tbl: "semesters", id: "s9", data: { ...sem("s9", 9) }, u: 5, deleted: false });
    await db.semesters.put(sem("s1", 1) as never);
    await syncNow();
    expect(server.rows.has("semesters/s1")).toBe(false);
    expect((await db.semesters.get("s9"))?.number).toBe(9);
  });

  it("não mistura contas no mesmo aparelho", async () => {
    ls.setItem("domeni:sync:owner", "outra-conta");
    await db.semesters.put(sem("s1", 1) as never);
    await syncNow();
    expect(server.rows.size).toBe(0);
  });
});
