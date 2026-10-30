/**
 * Pembungkus localStorage untuk preferensi (bukan file atau data user). Semua akses dibungkus
 * try/catch: penyimpanan bisa diblokir (mode privat, kebijakan browser) atau penuh, dan tool
 * harus tetap berjalan dengan nilai bawaan.
 */

export function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Diblokir atau penuh: setelan berlaku sampai tab ditutup.
  }
}

export function removeKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Diblokir: tidak ada yang perlu dihapus.
  }
}
