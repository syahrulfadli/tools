/**
 * Memuat file gambar dari perangkat user ke memori browser (object URL).
 * File tidak pernah diunggah; URL dilepas saat foto dihapus atau tool ditutup.
 */

export interface Photo {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  image: HTMLImageElement;
}

export function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif|bmp|heic|heif)$/i.test(file.name);
}

export async function loadPhoto(file: File): Promise<Photo> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(url);
    const heic = /\.(heic|heif)$/i.test(file.name);
    throw new Error(heic ? "HEIC belum didukung browser ini. Ubah ke JPG dulu." : "File tidak bisa dibaca sebagai gambar.");
  }
  return {
    id: crypto.randomUUID(),
    name: file.name || "Gambar tempelan",
    url,
    width: image.naturalWidth,
    height: image.naturalHeight,
    image,
  };
}

export function releasePhoto(photo: Photo) {
  URL.revokeObjectURL(photo.url);
}
