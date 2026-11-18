// Gera public/sw.js a partir do modelo, com a lista de arquivos do build.
// Roda depois de `next build` (veja o script "build" no package.json).
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const staticDir = join(root, ".next", "static");
const publicDir = join(root, "public");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    }),
  );
  return files.flat();
}

const toUrl = (base, dir, file) =>
  base + relative(dir, file).split(sep).map(encodeURIComponent).join("/");

const buildId = (await readFile(join(root, ".next", "BUILD_ID"), "utf8")).trim();

const assets = (await walk(staticDir))
  .filter((file) => !file.endsWith(".map"))
  .map((file) => toUrl("/_next/static/", staticDir, file));

const icons = (await walk(join(publicDir, "icons"))).map((file) =>
  toUrl("/icons/", join(publicDir, "icons"), file),
);

const vendorDir = join(publicDir, "vendor");
const vendor = (await walk(vendorDir).catch(() => []))
  .filter((file) => !/LICENSE|\.js$/.test(file) || file.endsWith(".min.mjs"))
  .map((file) => toUrl("/vendor/", vendorDir, file));

const precache = [...assets, ...icons, ...vendor, "/manifest.webmanifest"].sort();

const template = await readFile(join(root, "scripts", "sw.template.js"), "utf8");
const output = template
  .replace('"__VERSION__"', JSON.stringify(buildId))
  .replace("__PRECACHE__", JSON.stringify(precache, null, 2));

await writeFile(join(publicDir, "sw.js"), output);
console.log(`sw.js gerado: versão ${buildId}, ${precache.length} arquivos para uso offline.`);
