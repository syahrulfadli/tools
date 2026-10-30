import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv, type Plugin } from "vite";

const SITE_NAME = "Productivity Tools";
const HOME_TITLE = "Productivity Tools: kolase foto, olah PDF, QR code, timer, dan jam dunia";
const HOME_DESCRIPTION =
  "Kumpulan tools sederhana untuk membantu pekerjaan sehari-hari: kolase foto, kompres gambar, kompres PDF, PDF ke gambar, PDF ke teks, gambar ke PDF, Word ke PDF, PNG ke JPEG, QR code, atur halaman PDF, nomor halaman dan watermark, tanda tangan PDF, timer, Pomodoro, dan jam dunia. Gratis, semua file diproses di browser dan tidak pernah disimpan.";
const OG_IMAGE = "/icons/icon-512.png";

interface ToolMeta {
  slug: string;
  name: string;
  description: string;
  category: string;
}

interface CategoryMeta {
  id: string;
  name: string;
}

/**
 * Membaca nama, deskripsi, dan kategori tool langsung dari `src/tools/<slug>/index.ts(x)` dan
 * `categories.ts` (komponen React tidak bisa diimpor dari konfigurasi Vite). Tool yang polanya
 * tidak terbaca menggagalkan build agar tidak diam-diam hilang dari sitemap.
 */
function readTools(root: string): { tools: ToolMeta[]; categories: CategoryMeta[] } {
  const field = (source: string, key: string, file: string) => {
    const match = source.match(new RegExp(`^\\s*${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "m"));
    if (!match) throw new Error(`seo: field "${key}" tidak ditemukan di ${file}`);
    return JSON.parse(`"${match[1]}"`) as string;
  };

  const toolsDir = join(root, "src/tools");
  const registry = readFileSync(join(toolsDir, "registry.ts"), "utf8");
  const order = registry.match(/export const tools[^=]*=\s*\[([^\]]*)\]/)?.[1].split(",").map((s) => s.trim()).filter(Boolean) ?? [];

  const found = new Map<string, ToolMeta>();
  for (const dir of readdirSync(toolsDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const file = readdirSync(join(toolsDir, dir.name)).find((name) => /^index\.tsx?$/.test(name));
    if (!file) continue;
    const path = `src/tools/${dir.name}/${file}`;
    const source = readFileSync(join(root, path), "utf8");
    const variable = source.match(/export const (\w+): ToolDefinition/)?.[1];
    if (!variable) continue;
    found.set(variable, {
      slug: field(source, "slug", path),
      name: field(source, "name", path),
      description: field(source, "description", path),
      category: field(source, "category", path),
    });
  }
  const tools = order.map((variable) => {
    const tool = found.get(variable);
    if (!tool) throw new Error(`seo: tool "${variable}" di registry.ts tidak punya index.ts(x) yang terbaca`);
    return tool;
  });

  const categoriesSource = readFileSync(join(toolsDir, "categories.ts"), "utf8");
  const categories = [...categoriesSource.matchAll(/id:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g)].map((m) => ({ id: m[1], name: m[2] }));
  return { tools, categories };
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** JSON di dalam <script>: cegah "</script>" menutup tag lebih awal. */
const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

interface PageSeo {
  title: string;
  description: string;
  /** Path kanonik, mis. "/tools/kolase"; kosong untuk halaman noindex. */
  path?: string;
  noindex?: boolean;
  schema?: unknown[];
  /** HTML di <noscript>: isi yang bisa dibaca crawler tanpa JavaScript. */
  fallback?: string;
}

function renderHead(page: PageSeo, site: string | undefined) {
  const url = site && page.path !== undefined ? site + page.path : undefined;
  const image = site ? site + OG_IMAGE : undefined;
  const lines = [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    page.noindex ? `<meta name="robots" content="noindex" />` : `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    url ? `<link rel="canonical" href="${url}" />` : "",
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="id_ID" />`,
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    url ? `<meta property="og:url" content="${url}" />` : "",
    image ? `<meta property="og:image" content="${image}" />` : "",
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
    image ? `<meta name="twitter:image" content="${image}" />` : "",
    ...(page.schema ?? []).map((data) => `<script type="application/ld+json">${jsonLd(data)}</script>`),
  ];
  return lines.filter(Boolean).join("\n    ");
}

/** Ganti <title> dan <meta name="description"> bawaan index.html dengan blok SEO halaman. */
function renderPage(shell: string, page: PageSeo, site: string | undefined) {
  let html = shell
    .replace(/\s*<title>[\s\S]*?<\/title>/, "")
    .replace(/\s*<meta name="description"[^>]*>/, "")
    .replace("</head>", `    ${renderHead(page, site)}\n  </head>`);
  if (page.fallback) html = html.replace('<div id="root"></div>', `<div id="root"></div>\n    <noscript>${page.fallback}</noscript>`);
  return html;
}

export function seo(): Plugin {
  let root = process.cwd();
  let site: string | undefined;

  return {
    name: "seo",
    apply: "build",
    enforce: "post",
    applyToEnvironment: (environment) => environment.name === "client",
    configResolved(config) {
      root = config.root;
      const raw = process.env.SITE_URL ?? loadEnv(config.mode, root, "").SITE_URL;
      site = raw?.trim().replace(/\/+$/, "");
      if (site && !/^https:\/\/[^/\s]+$/.test(site)) throw new Error(`seo: SITE_URL harus berbentuk https://domain (tanpa path), dapat "${site}"`);
      if (!site) config.logger.warn("\nseo: SITE_URL belum diatur, jadi canonical, og:url, dan sitemap.xml dilewati. Isi di .env.production, mis. SITE_URL=https://tools.example.com\n");
    },
    generateBundle(_, bundle) {
      const { tools, categories } = readTools(root);
      const shellFile = bundle["index.html"];
      if (!shellFile || shellFile.type !== "asset") return this.error("seo: index.html hasil build tidak ditemukan");
      const shell = String(shellFile.source);
      const emit = (fileName: string, source: string) => this.emitFile({ type: "asset", fileName, source });
      const abs = (path: string) => (site ? site + path : path);

      const home: PageSeo = {
        title: HOME_TITLE,
        description: HOME_DESCRIPTION,
        path: "/",
        schema: [
          { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: abs("/"), inLanguage: "id", description: HOME_DESCRIPTION },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: tools.map((tool, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: tool.name,
              url: abs(`/tools/${tool.slug}`),
            })),
          },
        ],
        fallback: [
          `<h1>${SITE_NAME}</h1>`,
          `<p>${escapeHtml(HOME_DESCRIPTION)}</p>`,
          ...categories.map((category) => {
            const items = tools.filter((tool) => tool.category === category.id);
            if (items.length === 0) return "";
            const list = items
              .map((tool) => `<li><a href="/tools/${tool.slug}">${escapeHtml(tool.name)}</a>: ${escapeHtml(tool.description)}</li>`)
              .join("");
            return `<h2>${escapeHtml(category.name)}</h2><ul>${list}</ul>`;
          }),
        ].join(""),
      };
      shellFile.source = renderPage(shell, home, site);

      for (const tool of tools) {
        const categoryName = categories.find((category) => category.id === tool.category)?.name ?? "";
        const path = `/tools/${tool.slug}`;
        const page: PageSeo = {
          title: `${tool.name} · ${SITE_NAME}`,
          description: tool.description,
          path,
          schema: [
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: tool.name,
              description: tool.description,
              url: abs(path),
              applicationCategory: "UtilitiesApplication",
              applicationSubCategory: categoryName,
              operatingSystem: "Any (browser)",
              browserRequirements: "Membutuhkan JavaScript",
              inLanguage: "id",
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: SITE_NAME, item: abs("/") },
                { "@type": "ListItem", position: 2, name: tool.name, item: abs(path) },
              ],
            },
          ],
          fallback: `<p><a href="/">${SITE_NAME}</a></p><h1>${escapeHtml(tool.name)}</h1><p>${escapeHtml(tool.description)}</p><p>Tool ini membutuhkan JavaScript. Semua file diproses di browser dan tidak pernah dikirim ke server.</p>`,
        };
        emit(`tools/${tool.slug}/index.html`, renderPage(shell, page, site));
      }

      emit(
        "kredit/index.html",
        renderPage(
          shell,
          {
            title: `Kredit · ${SITE_NAME}`,
            description: "Library open source di balik tiap tool, lengkap dengan tautan GitHub dan npm.",
            path: "/kredit",
            fallback: `<p><a href="/">${SITE_NAME}</a></p><h1>Kredit</h1><p>Library open source di balik tiap tool: pdf-lib, PDF.js, docx-preview, JSZip, qrcode-generator, React, dan lainnya.</p>`,
          },
          site,
        ),
      );

      // 404.html dipakai Workers Static Assets (not_found_handling "404-page") untuk alamat yang tidak ada.
      emit("404.html", renderPage(shell, { title: `Tidak ditemukan · ${SITE_NAME}`, description: "Halaman ini tidak ada.", noindex: true }, site));

      emit("robots.txt", ["User-agent: *", "Allow: /", "Disallow: /api/", ...(site ? [``, `Sitemap: ${site}/sitemap.xml`] : []), ""].join("\n"));

      if (site) {
        const urls = ["/", "/kredit", ...tools.map((tool) => `/tools/${tool.slug}`)];
        const lastmod = new Date().toISOString().slice(0, 10);
        const body = urls.map((path) => `  <url><loc>${site}${path}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n");
        emit("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
      }
    },
  };
}
