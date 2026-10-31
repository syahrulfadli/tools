/**
 * Melacak gambar piksel menjadi bentuk vektor dengan imagetracerjs, lalu menyusun SVG yang ringkas
 * (satu `<path>` per warna). Fungsi murni di atas data RGBA, dipakai dari Web Worker dan diuji di Node.
 */
import ImageTracer, { type Indexed, type TracerColor, type TracerOptions } from "imagetracerjs";

export interface Raster {
  width: number;
  height: number;
  /** RGBA, 4 byte per piksel. */
  data: Uint8ClampedArray;
}

export type TraceMode = "color" | "mono";
export type Detail = "low" | "medium" | "high";

export interface TraceSettings {
  mode: TraceMode;
  /** Jumlah warna palet (mode warna), tidak termasuk area transparan. */
  colors: number;
  detail: Detail;
  /** 0–255: piksel lebih gelap dari ini jadi hitam (mode hitam putih). */
  threshold: number;
}

export interface TraceResult {
  svg: string;
  /** Jumlah warna yang benar-benar dipakai. */
  colors: number;
  /** Jumlah bentuk tertutup (tanpa lubang). */
  shapes: number;
}

/** Piksel dengan alfa di bawah ini dianggap transparan. */
const ALPHA_CUTOFF = 128;

/**
 * Detail rendah: bentuk kecil dibuang dan kurva lebih longgar (file kecil, mulus).
 * Detail tinggi: bentuk kecil dipertahankan dan kurva mengikuti tepi rapat (file besar).
 */
const DETAIL: Record<Detail, Pick<TracerOptions, "pathomit" | "ltres" | "qtres" | "roundcoords">> = {
  low: { pathomit: 24, ltres: 2, qtres: 2, roundcoords: 1 },
  medium: { pathomit: 8, ltres: 1, qtres: 1, roundcoords: 1 },
  high: { pathomit: 1, ltres: 0.5, qtres: 0.5, roundcoords: 2 },
};

/** Kecerahan persepsi (Rec. 601), 0–255. */
export function luminance(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Siapkan piksel: alfa jadi biner (transparan penuh atau opak penuh) agar tepi semi-transparan
 * tidak menjadi warna sendiri. Mode hitam putih: piksel opak di bawah ambang jadi hitam, sisanya transparan.
 */
export function prepare(raster: Raster, settings: Pick<TraceSettings, "mode" | "threshold">): Raster {
  const data = new Uint8ClampedArray(raster.data.length);
  for (let i = 0; i < data.length; i += 4) {
    const opaque = raster.data[i + 3] >= ALPHA_CUTOFF;
    if (settings.mode === "mono") {
      const dark = opaque && luminance(raster.data[i], raster.data[i + 1], raster.data[i + 2]) < settings.threshold;
      data[i + 3] = dark ? 255 : 0;
    } else if (opaque) {
      data[i] = raster.data[i];
      data[i + 1] = raster.data[i + 1];
      data[i + 2] = raster.data[i + 2];
      data[i + 3] = 255;
    }
  }
  return { width: raster.width, height: raster.height, data };
}

/**
 * Palet awal dengan median cut atas piksel opak (maks. ±40 ribu sampel). Imagetracer lalu
 * menyempurnakannya dengan k-means. Lebih stabil daripada sampel grid bawaan imagetracer,
 * yang bisa melewatkan warna kecil tapi penting (mis. teks di logo).
 */
export function medianCutPalette(raster: Raster, count: number): TracerColor[] {
  const total = raster.width * raster.height;
  const step = Math.max(1, Math.floor(total / 40_000));
  const pixels: [number, number, number][] = [];
  for (let p = 0; p < total; p += step) {
    const i = p * 4;
    if (raster.data[i + 3] >= ALPHA_CUTOFF) pixels.push([raster.data[i], raster.data[i + 1], raster.data[i + 2]]);
  }
  if (pixels.length === 0) return [];

  let boxes = [pixels];
  while (boxes.length < count) {
    // Belah kotak dengan rentang kanal terlebar.
    let best = -1;
    let bestRange = 0;
    let bestChannel = 0;
    boxes.forEach((box, index) => {
      if (box.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let min = 255;
        let max = 0;
        for (const px of box) {
          if (px[c] < min) min = px[c];
          if (px[c] > max) max = px[c];
        }
        if (max - min > bestRange) {
          bestRange = max - min;
          best = index;
          bestChannel = c;
        }
      }
    });
    if (best < 0) break;
    // Belah di tengah rentang nilai, bukan di median jumlah piksel: warna yang sedikit tapi
    // jauh berbeda (teks merah di latar putih) mendapat kotak sendiri, tidak ikut dirata-rata.
    let min = 255;
    for (const px of boxes[best]) if (px[bestChannel] < min) min = px[bestChannel];
    const cut = min + bestRange / 2;
    const low = boxes[best].filter((px) => px[bestChannel] < cut);
    const high = boxes[best].filter((px) => px[bestChannel] >= cut);
    boxes = [...boxes.slice(0, best), low, high, ...boxes.slice(best + 1)];
  }

  return boxes.map((box) => {
    const sum = box.reduce((acc, px) => [acc[0] + px[0], acc[1] + px[1], acc[2] + px[2]], [0, 0, 0]);
    return { r: Math.round(sum[0] / box.length), g: Math.round(sum[1] / box.length), b: Math.round(sum[2] / box.length), a: 255 };
  });
}

export function hexColor({ r, g, b }: TracerColor) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Lacak `raster` (sudah diperkecil ke ukuran lacak) menjadi SVG berukuran `output` piksel.
 * `onProgress(selesai, total)` dipanggil setiap satu warna selesai dilacak.
 */
export function traceToSvg(
  raster: Raster,
  settings: TraceSettings,
  output: { width: number; height: number },
  onProgress?: (done: number, total: number) => void,
): TraceResult {
  const image = prepare(raster, settings);
  const mono = settings.mode === "mono";
  const transparent = { r: 0, g: 0, b: 0, a: 0 };
  const palette = mono ? [{ r: 0, g: 0, b: 0, a: 255 }] : medianCutPalette(image, settings.colors);
  const options = ImageTracer.checkoptions({
    ...DETAIL[settings.detail],
    // Warna transparan selalu ada di palet agar area kosong tidak diserap warna terdekat.
    pal: [...palette, transparent],
    colorquantcycles: mono ? 1 : 3,
    rightangleenhance: true,
    strokewidth: 0,
    linefilter: false,
    scale: 1,
    blurradius: 0,
  });
  const indexed: Indexed = ImageTracer.colorquantization(image, options);

  // Hitung piksel per warna: warna kosong dilewati, warna terluas digambar paling dulu
  // agar garis tepi warna kecil berada di atasnya.
  const counts = new Array<number>(indexed.palette.length).fill(0);
  for (const row of indexed.array) for (const index of row) if (index >= 0) counts[index]++;
  const order = indexed.palette
    .map((color, index) => ({ color, index, count: counts[index] }))
    .filter(({ color, count }) => count > 0 && color.a >= ALPHA_CUTOFF)
    .sort((a, b) => b.count - a.count);

  const paths: string[] = [];
  let shapes = 0;
  order.forEach(({ color, index }, step) => {
    const layer = ImageTracer.batchtracepaths(
      ImageTracer.internodes(ImageTracer.pathscan(ImageTracer.layeringstep(indexed, index), options.pathomit), options),
      options.ltres,
      options.qtres,
    );
    const tracedata = { layers: [], palette: indexed.palette, width: image.width, height: image.height } as { layers: unknown[][]; palette: TracerColor[]; width: number; height: number };
    tracedata.layers[index] = layer;
    let d = "";
    for (let p = 0; p < layer.length; p++) {
      if ((layer[p] as { isholepath: boolean }).isholepath) continue;
      const element = ImageTracer.svgpathstring(tracedata, index, p, options);
      const match = element.match(/ d="([^"]*)"/);
      if (match) {
        d += match[1];
        shapes++;
      }
    }
    if (d) {
      const hex = mono ? "#000000" : hexColor(color);
      // Garis tipis sewarna menutup celah rambut di antara warna yang bersebelahan.
      const stroke = mono ? "" : ` stroke="${hex}" stroke-width="0.6" stroke-linejoin="round"`;
      paths.push(`<path fill="${hex}"${stroke} d="${d.trim()}"/>`);
    }
    onProgress?.(step + 1, order.length);
  });

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${output.width}" height="${output.height}" viewBox="0 0 ${image.width} ${image.height}">\n` +
    paths.join("\n") +
    `\n</svg>\n`;
  return { svg, colors: paths.length, shapes };
}
