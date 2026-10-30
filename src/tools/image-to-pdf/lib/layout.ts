/**
 * Tata letak halaman PDF: ukuran kertas, orientasi, margin, posisi gambar, dan matriks
 * transformasi (rotasi/cermin) untuk operator `cm` PDF. Fungsi murni, dipakai pratinjau
 * dan pembuat PDF agar hasilnya sama.
 *
 * Satuan: poin PDF (1/72 inci). y pada `box` dihitung dari atas halaman (seperti layar).
 */

export const MM = 72 / 25.4;
/** "Sesuai gambar": 1 piksel = 0,75 pt (96 dpi), dibatasi ukuran halaman maks PDF. */
export const PX_TO_PT = 0.75;
export const MAX_PAGE = 14_400;

export type PageSizeId = "image" | "a4" | "f4" | "letter" | "legal" | "a5";
export type Orientation = "auto" | "portrait" | "landscape";
export type Rotation = 0 | 90 | 180 | 270;

export const PAGE_SIZES: { id: PageSizeId; label: string; size?: [number, number]; hint: string }[] = [
  { id: "image", label: "Sesuai gambar", hint: "Halaman seukuran gambar" },
  { id: "a4", label: "A4", size: [210 * MM, 297 * MM], hint: "210 × 297 mm" },
  { id: "f4", label: "F4", size: [215 * MM, 330 * MM], hint: "215 × 330 mm (Folio)" },
  { id: "letter", label: "Letter", size: [612, 792], hint: "8,5 × 11 in" },
  { id: "legal", label: "Legal", size: [612, 1008], hint: "8,5 × 14 in" },
  { id: "a5", label: "A5", size: [148 * MM, 210 * MM], hint: "148 × 210 mm" },
];

export interface PageSettings {
  pageSize: PageSizeId;
  orientation: Orientation;
  /** Margin dalam mm. */
  margin: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageLayout {
  width: number;
  height: number;
  /** Kotak tempat gambar (setelah diputar) digambar, y dari atas. */
  box: Box;
}

/** Ukuran gambar setelah rotasi pengguna: 90/270 menukar lebar dan tinggi. */
export function rotatedSize(width: number, height: number, rotation: Rotation) {
  return rotation % 180 === 0 ? { width, height } : { width: height, height: width };
}

/**
 * Halaman untuk satu gambar berukuran tampil `imgW × imgH` (piksel, sudah tegak & diputar).
 * Gambar dimuat utuh di area dalam margin dan diletakkan di tengah; tidak pernah diperbesar
 * melewati ukuran 96 dpi-nya pada kertas besar? Tidak: gambar selalu dibesarkan sampai pas,
 * seperti mencetak "fit to page".
 */
export function pageLayout(imgW: number, imgH: number, settings: PageSettings): PageLayout {
  const margin = settings.margin * MM;

  if (settings.pageSize === "image") {
    const scale = Math.min(1, (MAX_PAGE - 2 * margin) / (Math.max(imgW, imgH) * PX_TO_PT));
    const w = imgW * PX_TO_PT * scale;
    const h = imgH * PX_TO_PT * scale;
    return { width: w + 2 * margin, height: h + 2 * margin, box: { x: margin, y: margin, width: w, height: h } };
  }

  const [shortSide, longSide] = [...PAGE_SIZES.find((p) => p.id === settings.pageSize)!.size!].sort((a, b) => a - b);
  const landscape = settings.orientation === "landscape" || (settings.orientation === "auto" && imgW > imgH);
  const width = landscape ? longSide : shortSide;
  const height = landscape ? shortSide : longSide;
  const areaW = Math.max(1, width - 2 * margin);
  const areaH = Math.max(1, height - 2 * margin);
  const scale = Math.min(areaW / imgW, areaH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { width, height, box: { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h } };
}

type Mat = [number, number, number, number]; // [m11, m12, m21, m22]: x' = m11·x + m12·y, y' = m21·x + m22·y

const IDENTITY: Mat = [1, 0, 0, 1];
const ROT_CW: Mat = [0, 1, -1, 0]; // putar 90° searah jarum jam (sumbu y ke atas)
const ROT_CCW: Mat = [0, -1, 1, 0];
const ROT_180: Mat = [-1, 0, 0, -1];
const FLIP_H: Mat = [-1, 0, 0, 1];
const FLIP_V: Mat = [1, 0, 0, -1];

function mul(a: Mat, b: Mat): Mat {
  return [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3]];
}

/** Transformasi yang membuat gambar tersimpan tampil tegak, per tag EXIF Orientation. */
const EXIF: Record<number, Mat> = {
  1: IDENTITY,
  2: FLIP_H,
  3: ROT_180,
  4: FLIP_V,
  5: mul(ROT_CCW, FLIP_H),
  6: ROT_CW,
  7: mul(ROT_CW, FLIP_H),
  8: ROT_CCW,
};

const USER: Record<Rotation, Mat> = { 0: IDENTITY, 90: ROT_CW, 180: ROT_180, 270: ROT_CCW };

/** EXIF 5–8 menukar sumbu: ukuran tampil = tinggi × lebar tersimpan. */
export function exifSwapsAxes(orientation: number) {
  return orientation >= 5 && orientation <= 8;
}

/**
 * Matriks `cm` PDF [a b c d e f] yang memetakan persegi satuan gambar (ukuran tersimpan,
 * orientasi EXIF `orientation`) ke `box` pada halaman setinggi `pageHeight`, dengan
 * rotasi pengguna `rotation`.
 */
export function imageMatrix(box: Box, pageHeight: number, orientation: number, rotation: Rotation): [number, number, number, number, number, number] {
  const m = mul(USER[rotation], EXIF[orientation] ?? IDENTITY);
  // Bila matriks menukar sumbu, sisi u gambar menjadi sisi tinggi di halaman.
  const swaps = m[0] === 0;
  const sw = swaps ? box.height : box.width;
  const sh = swaps ? box.width : box.height;
  const a = m[0] * sw;
  const c = m[1] * sh;
  const b = m[2] * sw;
  const d = m[3] * sh;
  const cx = box.x + box.width / 2;
  const cy = pageHeight - (box.y + box.height / 2);
  return [a, b, c, d, cx - (a + c) / 2, cy - (b + d) / 2];
}
