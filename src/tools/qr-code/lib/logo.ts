/** Baca gambar logo dari file dan kecilkan ke PNG ringan, siap ditempel di QR (SVG dan kanvas). */

export interface Logo {
  name: string;
  /** Data URL PNG: bisa disematkan di file SVG unduhan, tidak seperti object URL. */
  href: string;
  /** Lebar/tinggi. */
  aspect: number;
  /** Gambar yang sudah dimuat, untuk digambar ke kanvas PNG. */
  image: HTMLImageElement;
}

/** Logo di QR jarang lebih dari ±400 px di cetakan terbesar; 512 px cukup tajam dan tetap ringan. */
const MAX_SIDE = 512;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gambar logo tidak bisa dibaca. Pakai PNG, JPEG, WebP, atau SVG."));
    image.src = src;
  });
}

export async function loadLogo(file: File): Promise<Logo> {
  const url = URL.createObjectURL(file);
  try {
    const source = await loadImage(url);
    // SVG tanpa ukuran bawaan melapor 0; anggap persegi.
    const width = source.naturalWidth || MAX_SIDE;
    const height = source.naturalHeight || MAX_SIDE;
    const factor = Math.min(1, MAX_SIDE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * factor));
    canvas.height = Math.max(1, Math.round(height * factor));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung canvas 2D.");
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const href = canvas.toDataURL("image/png");
    const aspect = canvas.width / canvas.height;
    canvas.width = 0;
    canvas.height = 0;
    return { name: file.name, href, aspect, image: await loadImage(href) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
