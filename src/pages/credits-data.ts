/**
 * Pustaka pihak ketiga yang menjadi inti tiap tool, untuk halaman /kredit.
 * Tool yang tidak muncul di `toolCredits` tidak memakai pustaka selain yang ada di `shared`
 * (hanya API bawaan browser). Perbarui bila dependensi sebuah tool berubah.
 */

export interface Library {
  name: string;
  /** Peran pustaka di dalam tool. */
  role: string;
  license: string;
  github: string;
  npm: string;
}

export const libraries = {
  "pdf-lib": {
    name: "pdf-lib",
    role: "Membaca dan menulis struktur PDF.",
    license: "MIT",
    github: "https://github.com/Hopding/pdf-lib",
    npm: "https://www.npmjs.com/package/pdf-lib",
  },
  "pdfjs-dist": {
    name: "PDF.js",
    role: "Merender halaman PDF jadi gambar dan thumbnail.",
    license: "Apache-2.0",
    github: "https://github.com/mozilla/pdf.js",
    npm: "https://www.npmjs.com/package/pdfjs-dist",
  },
  "docx-preview": {
    name: "docx-preview",
    role: "Membaca berkas .docx dan menampilkannya sebagai HTML.",
    license: "Apache-2.0",
    github: "https://github.com/VolodymyrBaydalka/docxjs",
    npm: "https://www.npmjs.com/package/docx-preview",
  },
  jszip: {
    name: "JSZip",
    role: "Membuka isi berkas .docx (arsip ZIP). Dipasang otomatis bersama docx-preview.",
    license: "MIT atau GPL-3.0",
    github: "https://github.com/Stuk/jszip",
    npm: "https://www.npmjs.com/package/jszip",
  },
} satisfies Record<string, Library>;

export type LibraryId = keyof typeof libraries;

/** Pustaka inti per tool, kunci = slug. */
export const toolCredits: Record<string, LibraryId[]> = {
  "pdf-ke-gambar": ["pdfjs-dist"],
  "word-ke-pdf": ["docx-preview", "jszip"],
  "gabung-pdf": ["pdf-lib", "pdfjs-dist"],
  "pisah-pdf": ["pdf-lib", "pdfjs-dist"],
  "kompres-pdf": ["pdf-lib", "pdfjs-dist"],
};

/** Catatan untuk tool yang tidak butuh pustaka pihak ketiga. */
export const toolNotes: Record<string, string> = {
  kolase: "Memakai Canvas API bawaan browser.",
  "gambar-ke-pdf": "Penulis PDF dan ZIP ditulis sendiri tanpa dependensi; gambar diproses dengan Canvas API.",
  "png-ke-jpg": "Memakai Canvas API bawaan browser.",
  "kompres-gambar": "Memakai Canvas API bawaan browser.",
  timer: "Memakai Web Audio dan API waktu bawaan browser.",
  "jam-dunia": "Memakai Intl.DateTimeFormat bawaan browser untuk zona waktu.",
};

/** Dipakai di semua halaman, bukan milik satu tool. */
export const shared: Library[] = [
  {
    name: "React",
    role: "Antarmuka seluruh situs.",
    license: "MIT",
    github: "https://github.com/facebook/react",
    npm: "https://www.npmjs.com/package/react",
  },
  {
    name: "React Router",
    role: "Perpindahan halaman antar tool.",
    license: "MIT",
    github: "https://github.com/remix-run/react-router",
    npm: "https://www.npmjs.com/package/react-router",
  },
  {
    name: "Lucide",
    role: "Ikon.",
    license: "ISC",
    github: "https://github.com/lucide-icons/lucide",
    npm: "https://www.npmjs.com/package/lucide-react",
  },
  {
    name: "Vite",
    role: "Build dan server pengembangan.",
    license: "MIT",
    github: "https://github.com/vitejs/vite",
    npm: "https://www.npmjs.com/package/vite",
  },
  {
    name: "Vitest",
    role: "Pengujian logika tiap tool.",
    license: "MIT",
    github: "https://github.com/vitest-dev/vitest",
    npm: "https://www.npmjs.com/package/vitest",
  },
  {
    name: "Wrangler (Cloudflare Workers)",
    role: "Hosting dan deploy.",
    license: "MIT atau Apache-2.0",
    github: "https://github.com/cloudflare/workers-sdk",
    npm: "https://www.npmjs.com/package/wrangler",
  },
];
