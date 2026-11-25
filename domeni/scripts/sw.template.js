/*
 * Service worker do Atlas. Este arquivo é um modelo: o build troca os dois
 * marcadores abaixo e grava o resultado em public/sw.js.
 *
 * O app é uma página só. O service worker guarda essa página e todos os
 * arquivos estáticos de uma versão; depois disso o Atlas abre e navega sem rede.
 */
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;

const CACHE_PREFIX = "atlas-";
const CACHE = CACHE_PREFIX + VERSION;
const SHELL = "/app";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const store = async (url) => {
        const response = await fetch(new Request(url, { cache: "reload" }));
        if (!response.ok) throw new Error("Não foi possível guardar " + url);
        await cache.put(url, response);
      };
      await store(SHELL);
      const batch = 8;
      for (let i = 0; i < PRECACHE.length; i += batch) {
        await Promise.all(PRECACHE.slice(i, i + batch).map(store));
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

// A versão nova só assume quando a pessoa toca em "Atualizar".
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "ATIVAR") self.skipWaiting();
});

async function shell(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(SHELL);
  if (cached) return cached;
  return fetch(request);
}

async function otherPage(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE);
    return (await cache.match(SHELL)) || Response.error();
  }
}

async function asset(request, url) {
  const cache = await caches.open(CACHE);
  const immutable = url.pathname.startsWith("/_next/static/");
  const cached = await cache.match(request, { ignoreSearch: immutable, ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && (immutable || url.pathname.startsWith("/icons/"))) {
    cache.put(request, response.clone()).catch(() => undefined);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(url.pathname === SHELL ? shell(request) : otherPage(request));
    return;
  }
  // Dados de navegação do framework: não são usados (a navegação é local).
  if (request.headers.has("RSC") || url.searchParams.has("_rsc")) return;

  event.respondWith(asset(request, url));
});
