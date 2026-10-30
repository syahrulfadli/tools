// Salin cmap dan font standar pdf.js ke public/vendor/pdfjs agar dilayani dari domain sendiri
// (dibutuhkan PDF dengan huruf CJK atau font yang tidak disematkan). Dijalankan otomatis
// lewat skrip npm predev/prebuild; hasilnya diabaikan git.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = dirname(require.resolve("pdfjs-dist/package.json"));
const target = new URL("../public/vendor/pdfjs/", import.meta.url).pathname;

mkdirSync(target, { recursive: true });
for (const dir of ["cmaps", "standard_fonts"]) {
  const from = join(root, dir);
  if (!existsSync(from)) throw new Error(`pdfjs-dist tidak punya folder ${dir}`);
  cpSync(from, join(target, dir), { recursive: true });
}
console.log("pdf.js assets → public/vendor/pdfjs");
