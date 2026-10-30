import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import { seo } from "./build/seo";

/** File di public/ yang ikut di-precache service worker (selain hasil build). */
const PUBLIC_PRECACHE = [
  "/manifest.webmanifest",
  "/favicon.svg",
  "/theme-init.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

/**
 * Menulis dist/client/sw.js dari src/service-worker.js: daftar precache = shell "/",
 * file public di atas, dan semua JS/CSS/aset hasil build. Versi cache = hash isi semuanya,
 * jadi setiap deploy yang mengubah sesuatu memasang cache baru.
 */
function serviceWorker(): Plugin {
  return {
    name: "service-worker",
    apply: "build",
    enforce: "post",
    applyToEnvironment: (environment) => environment.name === "client",
    generateBundle(_, bundle) {
      const hash = createHash("sha256");
      const built: string[] = [];
      for (const [fileName, output] of Object.entries(bundle)) {
        hash.update(output.type === "chunk" ? output.code : output.source);
        if (fileName.startsWith(".") || fileName.endsWith(".map") || fileName.endsWith(".html")) continue;
        built.push(`/${fileName}`);
      }
      for (const path of PUBLIC_PRECACHE) hash.update(readFileSync(`public${path}`));
      const precache = ["/", ...PUBLIC_PRECACHE, ...built.sort()];
      const template = readFileSync("src/service-worker.js", "utf8");
      hash.update(template);
      const source = template
        .replace(/^const VERSION = .*$/m, `const VERSION = "${hash.digest("hex").slice(0, 12)}";`)
        .replace(/^const PRECACHE = .*$/m, `const PRECACHE = ${JSON.stringify(precache, null, 2)};`);
      if (source.includes('"__VERSION__"') || source.includes("= __PRECACHE__")) {
        this.error("src/service-worker.js: deklarasi VERSION/PRECACHE tidak ditemukan");
      }
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  plugins: [react(), cloudflare(), seo(), serviceWorker()],
});
