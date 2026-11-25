// Gera a versão do app para as lojas (pasta "out") e copia para os projetos
// iOS/Android. Precisa do endereço do site publicado, onde fica o servidor:
//
//   NEXT_PUBLIC_API_BASE=https://seu-dominio npm run build:native
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

const api = process.env.NEXT_PUBLIC_API_BASE ?? "";
if (!/^https:\/\//.test(api)) {
  console.error("Defina NEXT_PUBLIC_API_BASE com o endereço https do site publicado (ex.: https://domeni.app).");
  process.exit(1);
}

const env = { ...process.env, NEXT_PUBLIC_NATIVE: "1", NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? api };
rmSync("out", { recursive: true, force: true });
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run("node", ["scripts/copy-pdf-assets.mjs"]);
run("npx", ["next", "build"]);

// O app abre direto em /app (a página de vendas não entra no app)
const appHtml = ["out/app/index.html", "out/app.html"].find((p) => existsSync(p));
if (!appHtml) {
  console.error("Não achei out/app/index.html.");
  process.exit(1);
}
copyFileSync(appHtml, "out/index.html");
for (const page of ["termos", "privacidade", "cancelamento", "site", "sw.js"]) rmSync(join("out", page), { recursive: true, force: true });
console.log(`App das lojas gerado em out/ (${readdirSync("out").length} itens), servidor: ${api}`);

if (existsSync("ios") || existsSync("android")) run("npx", ["cap", "sync"]);
else console.log("Rode `npx cap add ios` e `npx cap add android` uma vez para criar os projetos.");
