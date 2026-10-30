/**
 * Kategori tool. Urutan di sini = urutan kelompok di home.
 * Tambah kategori baru di sini, lalu pakai `id`-nya di ToolDefinition.category.
 */
export const categories = [
  {
    id: "image-editor",
    name: "Edit Gambar",
    description: "Susun dan olah foto langsung di browser.",
  },
  {
    id: "file-converter",
    name: "File Converter",
    description: "Ubah format file tanpa perlu mengunggahnya ke mana pun.",
  },
  {
    id: "pdf-tools",
    name: "Olah PDF",
    description: "Gabung, pisah, atur halaman, beri nomor, dan tanda tangani PDF langsung di browser, tanpa perlu diunggah.",
  },
  {
    id: "compressor",
    name: "Kompres",
    description: "Perkecil ukuran gambar dan PDF langsung di browser, tanpa perlu diunggah.",
  },
  {
    id: "time",
    name: "Waktu",
    description: "Hitung mundur, atur sesi fokus, ukur durasi, dan cek jam di kota lain tanpa perlu memasang aplikasi.",
  },
] as const;

export type CategoryId = (typeof categories)[number]["id"];
export type Category = (typeof categories)[number];

export function findCategory(id: string | null | undefined): Category | undefined {
  return categories.find((category) => category.id === id);
}
