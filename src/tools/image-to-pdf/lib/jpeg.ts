/**
 * Membaca header JPEG tanpa men-decode piksel: ukuran yang tersimpan, jumlah kanal warna,
 * dan orientasi EXIF. Dipakai agar JPEG bisa dimasukkan ke PDF apa adanya (lossless).
 */

export interface JpegInfo {
  /** Ukuran seperti tersimpan di file (sebelum orientasi EXIF diterapkan). */
  width: number;
  height: number;
  /** 1 = abu-abu, 3 = RGB/YCbCr, 4 = CMYK. */
  components: number;
  /** Tag EXIF Orientation 1–8; 1 = tegak. */
  orientation: number;
}

export function parseJpeg(bytes: Uint8Array): JpegInfo | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let orientation = 1;
  let offset = 2;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    // Penanda tanpa panjang (RSTn, TEM) dan bantalan 0xFF.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      offset += 2;
      continue;
    }
    const length = view.getUint16(offset + 2);
    const start = offset + 4;
    if (length < 2 || start + length - 2 > bytes.length) return null;

    if (marker === 0xe1 && orientation === 1) orientation = readExifOrientation(view, start, length - 2) ?? 1;

    // SOF0–SOF15 kecuali DHT (C4), JPG (C8), DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return {
        height: view.getUint16(start + 1),
        width: view.getUint16(start + 3),
        components: bytes[start + 5],
        orientation,
      };
    }
    if (marker === 0xda || marker === 0xd9) return null; // data gambar mulai tanpa SOF
    offset = start + length - 2;
  }
  return null;
}

function readExifOrientation(view: DataView, start: number, length: number): number | null {
  // "Exif\0\0" lalu header TIFF.
  if (length < 14 || view.getUint32(start) !== 0x45786966 || view.getUint16(start + 4) !== 0) return null;
  const tiff = start + 6;
  const little = view.getUint16(tiff) === 0x4949;
  if (!little && view.getUint16(tiff) !== 0x4d4d) return null;
  const u16 = (at: number) => view.getUint16(at, little);
  const u32 = (at: number) => view.getUint32(at, little);
  const ifd = tiff + u32(tiff + 4);
  const end = start + length;
  if (ifd + 2 > end) return null;
  const count = u16(ifd);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > end) return null;
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : null;
    }
  }
  return null;
}
