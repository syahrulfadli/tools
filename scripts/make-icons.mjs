/**
 * Membuat ikon PWA (PNG) dari tanda merek di public/favicon.svg, tanpa dependensi:
 * bentuknya hanya persegi bersudut bulat, jadi dirasterisasi langsung dengan supersampling.
 * Hasil di public/icons/ di-commit; jalankan ulang (`npm run icons`) bila tanda merek berubah.
 *
 * - icon-*.png           purpose "any": kotak bersudut bulat, sudut transparan (Windows, desktop).
 * - icon-maskable-*.png  purpose "maskable": latar penuh, petak di dalam zona aman 80% (Android).
 * - apple-touch-icon.png latar penuh 180px; iOS membulatkan sudutnya sendiri.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateSync } from "node:zlib";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../public/icons");
const INK = [0x13, 0x14, 0x16];
const PAPER = [0xff, 0xff, 0xff];
const ACCENT = [0x5f, 0xb3, 0xc7];
const SAMPLES = 4;

/** Satuan 32 seperti viewBox favicon.svg. `scale` mengecilkan petak di sekitar pusat. */
function shapes({ rounded, scale }) {
  const tile = (x, y, color) => {
    const t = (v) => 16 + (v - 16) * scale;
    return { x: t(x), y: t(y), w: 8 * scale, h: 8 * scale, r: 1.5 * scale, color };
  };
  return [
    { x: 0, y: 0, w: 32, h: 32, r: rounded ? 7 : 0, color: INK },
    tile(7, 7, PAPER),
    tile(17, 7, PAPER),
    tile(7, 17, PAPER),
    tile(17, 17, ACCENT),
  ];
}

function inside(px, py, { x, y, w, h, r }) {
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

function render(size, layers) {
  const rgba = Buffer.alloc(size * size * 4);
  const unit = 32 / size;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const ux = (px + (sx + 0.5) / SAMPLES) * unit;
          const uy = (py + (sy + 0.5) / SAMPLES) * unit;
          // Lapisan teratas yang mengenai titik ini menang.
          for (let i = layers.length - 1; i >= 0; i--) {
            if (!inside(ux, uy, layers[i])) continue;
            [r, g, b] = [r + layers[i].color[0], g + layers[i].color[1], b + layers[i].color[2]];
            a++;
            break;
          }
        }
      }
      const o = (py * size + px) * 4;
      // Warna di-unpremultiply supaya tepi antialias tidak menggelap.
      rgba[o] = a ? Math.round(r / a) : 0;
      rgba[o + 1] = a ? Math.round(g / a) : 0;
      rgba[o + 2] = a ? Math.round(b / a) : 0;
      rgba[o + 3] = Math.round((a / SAMPLES ** 2) * 255);
    }
  }
  return png(size, rgba);
}

function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const icons = [
  ["icon-192.png", 192, { rounded: true, scale: 1 }],
  ["icon-512.png", 512, { rounded: true, scale: 1 }],
  // Blok petak 18/32 → 14/32 agar sudutnya tetap di dalam lingkaran zona aman (radius 40%).
  ["icon-maskable-192.png", 192, { rounded: false, scale: 14 / 18 }],
  ["icon-maskable-512.png", 512, { rounded: false, scale: 14 / 18 }],
  ["apple-touch-icon.png", 180, { rounded: false, scale: 0.9 }],
];

mkdirSync(OUT, { recursive: true });
for (const [name, size, options] of icons) {
  writeFileSync(join(OUT, name), render(size, shapes(options)));
  console.log(`public/icons/${name}`);
}
