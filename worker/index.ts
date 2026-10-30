/**
 * Worker backend.
 *
 * Aset statis (hasil build React) dilayani langsung oleh Workers Static Assets;
 * Worker ini hanya dijalankan untuk /api/* (lihat `run_worker_first` di wrangler.jsonc).
 *
 * Prinsip: tidak ada data user yang disimpan. Tidak ada binding KV/R2/D1, dan setiap
 * respons API diberi `Cache-Control: no-store`. Tool yang memproses file (mis. kolase)
 * bekerja sepenuhnya di browser, jadi file tidak pernah dikirim ke sini.
 */

type Handler = (request: Request, env: Env) => Response | Promise<Response>;

const routes: Record<string, Handler> = {
  "GET /api/health": () => json({ ok: true, storesUserData: false }),
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const handler = routes[`${request.method} ${pathname}`];
    if (handler) return handler(request, env);
    if (pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
