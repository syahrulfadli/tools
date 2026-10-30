/** Utilitas file bersama. Semua bekerja di browser; tidak ada yang dikirim ke server. */

/** Picu unduhan lewat object URL sementara, lalu lepas URL-nya. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024).toLocaleString("id-ID")} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
}

/** Nama file tanpa ekstensi terakhir: "laporan.final.pdf" → "laporan.final". */
export function baseName(filename: string) {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(0, dot) : filename;
}

/** Stempel waktu ringkas untuk nama file: 20261030-142501. */
export function fileStamp(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0"); // taste-skill-ignore: stempel waktu
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/**
 * Pastikan nama unik dalam satu batch (untuk isi ZIP): "foto.jpg", "foto (2).jpg", ...
 */
export function uniqueNamer() {
  const used = new Map<string, number>();
  return (name: string) => {
    const key = name.toLowerCase();
    const count = (used.get(key) ?? 0) + 1;
    used.set(key, count);
    if (count === 1) return name;
    const dot = name.lastIndexOf(".");
    return dot > 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`;
  };
}
