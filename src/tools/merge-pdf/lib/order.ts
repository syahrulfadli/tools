/** Pindahkan satu elemen ke indeks lain tanpa mengubah array asal. Indeks di luar batas dijepit. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return [...list];
  const target = Math.max(0, Math.min(list.length - 1, to));
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

/**
 * Indeks tujuan baris yang sedang diseret: jumlah baris lain yang titik tengahnya sudah dilewati
 * pointer. `centers` = posisi tengah tiap baris (urutan tampil), `from` = indeks baris yang diseret.
 */
export function dropIndex(centers: readonly number[], from: number, y: number): number {
  return centers.filter((center, index) => index !== from && center < y).length;
}
