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
    role: "Membaca dan menyusun ulang isi PDF: menggabung, memisah, memutar halaman, menulis nomor halaman dan watermark, menempel tanda tangan, dan mengganti gambar di dalamnya.",
    license: "MIT",
    github: "https://github.com/Hopding/pdf-lib",
    npm: "https://www.npmjs.com/package/pdf-lib",
  },
  "pdfjs-dist": {
    name: "PDF.js",
    role: "Merender halaman PDF menjadi gambar, termasuk thumbnail-nya, dan mengambil teks dari PDF.",
    license: "Apache-2.0",
    github: "https://github.com/mozilla/pdf.js",
    npm: "https://www.npmjs.com/package/pdfjs-dist",
  },
  "docx-preview": {
    name: "docx-preview",
    role: "Membaca file .docx dan menampilkannya sebagai HTML yang siap dicetak ke PDF.",
    license: "Apache-2.0",
    github: "https://github.com/VolodymyrBaydalka/docxjs",
    npm: "https://www.npmjs.com/package/docx-preview",
  },
  jszip: {
    name: "JSZip",
    role: "Membuka isi file .docx, yang sebenarnya adalah arsip ZIP. Terpasang otomatis bersama docx-preview.",
    license: "MIT atau GPL-3.0",
    github: "https://github.com/Stuk/jszip",
    npm: "https://www.npmjs.com/package/jszip",
  },
  "qrcode-generator": {
    name: "qrcode-generator",
    role: "Menyusun pola kotak QR code dari teks atau link, termasuk koreksi kesalahannya.",
    license: "MIT",
    github: "https://github.com/kazuhikoarase/qrcode-generator",
    npm: "https://www.npmjs.com/package/qrcode-generator",
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
  "atur-halaman-pdf": ["pdf-lib", "pdfjs-dist"],
  "nomor-halaman-watermark": ["pdf-lib", "pdfjs-dist"],
  "tanda-tangan-pdf": ["pdf-lib", "pdfjs-dist"],
  "pdf-ke-teks": ["pdfjs-dist"],
  "qr-code": ["qrcode-generator"],
};

/** Catatan untuk tool yang tidak butuh pustaka pihak ketiga. */
export const toolNotes: Record<string, string> = {
  kolase: "Cukup memakai Canvas API bawaan browser, tanpa library tambahan.",
  "gambar-ke-pdf": "Penulis PDF-nya dibuat sendiri tanpa dependensi, dan gambarnya diolah dengan Canvas API.",
  "png-ke-jpg": "Cukup memakai Canvas API bawaan browser, tanpa library tambahan.",
  "kompres-gambar": "Cukup memakai Canvas API bawaan browser, tanpa library tambahan.",
  timer: "Cukup memakai Web Audio dan timer bawaan browser.",
  pomodoro: "Cukup memakai Web Audio dan timer bawaan browser, sama seperti Timer.",
  "jam-dunia": "Zona waktu, termasuk DST, ditangani Intl.DateTimeFormat bawaan browser.",
};

/** Dipakai di semua halaman, bukan milik satu tool. */
export const shared: Library[] = [
  {
    name: "React",
    role: "Fondasi antarmuka semua halaman.",
    license: "MIT",
    github: "https://github.com/facebook/react",
    npm: "https://www.npmjs.com/package/react",
  },
  {
    name: "React Router",
    role: "Mengatur perpindahan halaman antar tool.",
    license: "MIT",
    github: "https://github.com/remix-run/react-router",
    npm: "https://www.npmjs.com/package/react-router",
  },
  {
    name: "Lucide",
    role: "Semua ikon di situs ini.",
    license: "ISC",
    github: "https://github.com/lucide-icons/lucide",
    npm: "https://www.npmjs.com/package/lucide-react",
  },
  {
    name: "Vite",
    role: "Bundler dan server pengembangan.",
    license: "MIT",
    github: "https://github.com/vitejs/vite",
    npm: "https://www.npmjs.com/package/vite",
  },
  {
    name: "Vitest",
    role: "Menjalankan test untuk logika tiap tool.",
    license: "MIT",
    github: "https://github.com/vitest-dev/vitest",
    npm: "https://www.npmjs.com/package/vitest",
  },
  {
    name: "Wrangler (Cloudflare Workers)",
    role: "Deploy ke Cloudflare Workers, tempat situs ini berjalan.",
    license: "MIT atau Apache-2.0",
    github: "https://github.com/cloudflare/workers-sdk",
    npm: "https://www.npmjs.com/package/wrangler",
  },
];
