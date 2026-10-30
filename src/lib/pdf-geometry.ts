/**
 * Geometri halaman PDF untuk menempel teks/gambar di posisi yang user lihat.
 *
 * Halaman PDF bisa punya atribut /Rotate (0, 90, 180, 270, searah jarum jam) dan CropBox yang
 * tidak mulai di (0, 0). Pratinjau pdf.js sudah memutar halaman, jadi user memilih posisi di
 * "ruang tampilan": titik asal kiri bawah halaman seperti terlihat, x ke kanan, y ke atas,
 * satuan poin. pdf-lib menggambar di ruang pengguna halaman (sebelum diputar). Fungsi di sini
 * menerjemahkan keduanya.
 */

export type Rotation = 0 | 90 | 180 | 270;

/** CropBox halaman (ruang pengguna) dan rotasinya. */
export interface PageBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: Rotation;
}

/** Sudut apa pun (boleh negatif) → 0/90/180/270. */
export function normalizeRotation(degrees: number): Rotation {
  const turned = (((Math.round(degrees / 90) * 90) % 360) + 360) % 360;
  return turned as Rotation;
}

/** Ukuran halaman seperti terlihat (lebar dan tinggi bertukar bila diputar 90/270). */
export function visualSize(box: PageBox) {
  return box.rotation === 90 || box.rotation === 270 ? { width: box.height, height: box.width } : { width: box.width, height: box.height };
}

/**
 * Titik di ruang tampilan → ruang pengguna, plus sudut yang perlu ditambahkan ke teks/gambar
 * (derajat, berlawanan jarum jam seperti `degrees()` pdf-lib) agar tampak tegak.
 */
export function toUserSpace(box: PageBox, vx: number, vy: number) {
  const { x, y, width: w, height: h, rotation } = box;
  switch (rotation) {
    case 90:
      return { x: x + w - vy, y: y + vx, angle: 90 };
    case 180:
      return { x: x + w - vx, y: y + h - vy, angle: 180 };
    case 270:
      return { x: x + vy, y: y + h - vx, angle: 270 };
    default:
      return { x: x + vx, y: y + vy, angle: 0 };
  }
}

/** Putar vektor (dx, dy) sebesar `degrees` berlawanan jarum jam. */
export function rotateVector(dx: number, dy: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}
