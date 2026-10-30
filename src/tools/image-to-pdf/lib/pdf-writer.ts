/**
 * Penulis PDF minimal (PDF 1.4) tanpa dependensi: satu gambar per halaman.
 *
 * - JPEG dimasukkan apa adanya dengan filter DCTDecode (tanpa decode/encode ulang).
 * - Gambar lain sebagai piksel RGB terkompresi FlateDecode, transparansi sebagai SMask.
 * - Rotasi dan orientasi lewat matriks `cm`, bukan dengan memutar piksel.
 */

export interface PdfImage {
  width: number;
  height: number;
  filter: "DCTDecode" | "FlateDecode";
  colorSpace: "DeviceRGB" | "DeviceGray";
  data: Uint8Array;
  /** Kanal alfa (8 bit, FlateDecode) bila gambar punya transparansi. */
  alpha?: Uint8Array;
}

export interface PdfPage {
  width: number;
  height: number;
  image: PdfImage;
  /** Matriks [a b c d e f] dari persegi satuan gambar ke halaman. */
  matrix: [number, number, number, number, number, number];
}

const encoder = new TextEncoder();

const num = (n: number) => {
  const fixed = n.toFixed(4).replace(/\.?0+$/, "");
  return fixed === "-0" ? "0" : fixed;
};

/** String literal PDF dengan karakter khusus di-escape; karakter non-ASCII diganti "?". */
function pdfString(text: string) {
  return `(${text.replace(/[^\x20-\x7e]/g, "?").replace(/([\\()])/g, "\\$1")})`;
}

function pdfDate(date: Date) {
  const p = (n: number) => String(n).padStart(2, "0"); // taste-skill-ignore: format tanggal PDF
  return `D:${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

export function buildPdf(pages: PdfPage[], { title = "", now = new Date() } = {}): Blob {
  const parts: BlobPart[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    parts.push(bytes as Uint8Array<ArrayBuffer>);
    length += bytes.length;
  };
  const object = (id: number, body: string) => {
    offsets[id] = length;
    push(`${id} 0 obj\n${body}\nendobj\n`);
  };
  const stream = (id: number, dict: string, data: Uint8Array) => {
    offsets[id] = length;
    push(`${id} 0 obj\n<< ${dict} /Length ${data.length} >>\nstream\n`);
    push(data);
    push("\nendstream\nendobj\n");
  };

  // Nomor objek: 1 katalog, 2 daftar halaman, 3 info, lalu 4 objek per halaman
  // (halaman, isi, gambar, alfa).
  const base = (i: number) => 4 + i * 4;

  // "%PDF-1.4" lalu baris komentar berisi byte > 127 agar file dikenali sebagai biner.
  push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${base(i)} 0 R`).join(" ")}] >>`);
  object(3, `<< /Title ${pdfString(title)} /Producer (Productivity Tools) /CreationDate (${pdfDate(now)}) >>`);

  pages.forEach((page, i) => {
    const [pageId, contentId, imageId, alphaId] = [base(i), base(i) + 1, base(i) + 2, base(i) + 3];
    const { image } = page;
    object(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(page.width)} ${num(page.height)}] ` +
        `/Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    stream(contentId, "", encoder.encode(`q ${page.matrix.map(num).join(" ")} cm /Im0 Do Q`));
    const smask = image.alpha ? ` /SMask ${alphaId} 0 R` : "";
    stream(
      imageId,
      `/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /${image.colorSpace} /BitsPerComponent 8 /Filter /${image.filter}${smask}`,
      image.data,
    );
    if (image.alpha) {
      stream(alphaId, `/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`, image.alpha);
    } else {
      object(alphaId, "null");
    }
  });

  const count = base(pages.length);
  const xref = length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let id = 1; id < count; id++) push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`); // taste-skill-ignore: format xref PDF
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  return new Blob(parts, { type: "application/pdf" });
}

/** Kompres data dengan zlib (FlateDecode) memakai CompressionStream bawaan browser/Node. */
export async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
