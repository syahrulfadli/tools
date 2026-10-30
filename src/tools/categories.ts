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
    description: "Ubah format file tanpa mengunggahnya ke mana pun.",
  },
  {
    id: "time",
    name: "Waktu",
    description: "Hitung mundur, ukur durasi, dan cek jam di kota lain tanpa aplikasi tambahan.",
  },
] as const;

export type CategoryId = (typeof categories)[number]["id"];
export type Category = (typeof categories)[number];

export function findCategory(id: string | null | undefined): Category | undefined {
  return categories.find((category) => category.id === id);
}
