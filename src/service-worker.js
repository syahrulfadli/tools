/**
 * Service worker PWA. File ini templat: plugin `serviceWorker` di vite.config.ts mengganti
 * __VERSION__ dan __PRECACHE__ lalu menulisnya ke dist/client/sw.js. Tidak didaftarkan di dev.
 *
 * - Precache: shell ("/"), semua JS/CSS/aset hasil build, manifest, dan ikon, supaya setiap
 *   tool bisa dibuka tanpa internet setelah kunjungan pertama.
 * - Navigasi: jaringan dulu (selalu versi terbaru), shell dari cache bila offline.
 * - /assets/* dan /vendor/* yang belum di-cache (cmap & font pdf.js) disimpan saat pertama diambil.
 * - /api/* dan origin lain (Google Fonts) tidak disentuh; offline, font jatuh ke font sistem.
 *
 * Yang di-cache hanya file aplikasi. File user dibaca lewat object URL, tidak lewat fetch
 * ke jaringan, jadi tidak pernah masuk cache ini.
 */
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;
const PREFIX = "tools-";
const CACHE = PREFIX + VERSION;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((path) => new Request(path, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

// Versi baru langsung aktif dan menghapus cache lama. Halaman yang masih memakai chunk lama
// akan gagal memuatnya dan RouteErrorBoundary menawarkan muat ulang.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/", { cacheName: CACHE, ignoreVary: true }).then((cached) => cached ?? Response.error())));
    return;
  }

  event.respondWith(fromCache(request, url));
});

async function fromCache(request, url) {
  const cache = await caches.open(CACHE);
  // ignoreVary: chunk JS diminta dalam mode CORS (ada header Origin), precache tidak; bila server
  // mengirim `Vary: Origin`, tanpa ini keduanya dianggap berbeda dan offline gagal.
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  const response = await fetch(request);
  const runtime = url.pathname.startsWith("/assets/") || url.pathname.startsWith("/vendor/");
  // Jangan simpan HTML yang dikirim sebagai pengganti file yang tidak ada.
  if (runtime && response.ok && !response.headers.get("Content-Type")?.includes("text/html")) {
    cache.put(request, response.clone());
  }
  return response;
}
