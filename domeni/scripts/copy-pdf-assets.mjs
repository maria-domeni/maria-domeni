// Copia o leitor de PDF (pdf.js) para public/vendor, para funcionar sem internet.
import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pdfjs-dist");
const out = join(root, "public", "vendor", "pdfjs");
await mkdir(out, { recursive: true });
await cp(join(src, "build", "pdf.worker.min.mjs"), join(out, "pdf.worker.min.mjs"));
await cp(join(src, "wasm"), join(out, "wasm"), { recursive: true });
await cp(join(src, "standard_fonts"), join(out, "standard_fonts"), { recursive: true });
console.log("pdf.js copiado para public/vendor/pdfjs");
