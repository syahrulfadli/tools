/**
 * Memperkecil PDF dengan meng-encode ulang gambar JPEG di dalamnya (diperkecil + kualitas lebih
 * rendah). Teks, vektor, dan susunan halaman tidak disentuh, jadi teks tetap bisa dipilih.
 * Hanya gambar JPEG (DCTDecode) berwarna/abu-abu tanpa Decode/Mask yang diganti; gambar lain
 * dibiarkan. Pemrosesan PDF memakai pdf-lib; pengodean gambar disuntikkan lewat `encode`.
 */
import { PDFArray, PDFBool, PDFDocument, PDFName, PDFNumber, PDFRawStream, type PDFDict, type PDFObject } from "pdf-lib";

export interface ImageInfo {
  width: number;
  height: number;
}

export interface Reencoded {
  /** JPEG baru (RGB). */
  data: Uint8Array;
  width: number;
  height: number;
}

/** Kembalikan JPEG baru, atau null bila tidak perlu diganti. */
export type ImageEncoder = (jpeg: Uint8Array, info: ImageInfo) => Promise<Reencoded | null>;

export interface RecompressResult {
  bytes: Uint8Array;
  /** Jumlah gambar JPEG yang memenuhi syarat, dan yang benar-benar diganti. */
  candidates: number;
  replaced: number;
}

export class EncryptedPdfError extends Error {
  constructor() {
    super("PDF ini dilindungi kata sandi. Buka proteksinya dulu, lalu coba lagi.");
  }
}

/** Gambar lebih kecil dari ini tidak sepadan dikompres ulang. */
const MIN_IMAGE_BYTES = 10 * 1024;
/** Hasil baru dipakai hanya bila minimal ini lebih kecil (rasio ukuran baru/lama). */
const MIN_GAIN = 0.9;

const name = PDFName.of;

function filterNames(dict: PDFDict) {
  const filter = dict.lookup(name("Filter"));
  if (filter instanceof PDFName) return [filter];
  if (filter instanceof PDFArray) return filter.asArray().map((item) => (item instanceof PDFName ? item : undefined));
  return [];
}

/** Ruang warna yang aman diganti: DeviceRGB/DeviceGray, atau ICCBased dengan 1 atau 3 kanal. */
function isSupportedColorSpace(dict: PDFDict) {
  const space = dict.lookup(name("ColorSpace"));
  if (space === name("DeviceRGB") || space === name("DeviceGray")) return true;
  if (space instanceof PDFArray && space.lookup(0) === name("ICCBased")) {
    const profile = space.lookup(1);
    const channels = profile instanceof PDFRawStream ? profile.dict.lookup(name("N")) : undefined;
    return channels instanceof PDFNumber && (channels.asNumber() === 1 || channels.asNumber() === 3);
  }
  return false;
}

function replaceable(dict: PDFDict): ImageInfo | null {
  if (dict.lookup(name("Subtype")) !== name("Image")) return null;
  const filters = filterNames(dict);
  if (filters.length !== 1 || filters[0] !== name("DCTDecode")) return null;
  if (dict.has(name("Decode")) || dict.has(name("Mask"))) return null;
  const mask: PDFObject | undefined = dict.lookup(name("ImageMask"));
  if (mask instanceof PDFBool && mask.asBoolean()) return null;
  if (!isSupportedColorSpace(dict)) return null;
  const width = dict.lookup(name("Width"));
  const height = dict.lookup(name("Height"));
  if (!(width instanceof PDFNumber) || !(height instanceof PDFNumber)) return null;
  return { width: width.asNumber(), height: height.asNumber() };
}

export async function recompressImages(
  source: Uint8Array,
  encode: ImageEncoder,
  onProgress?: (done: number, total: number) => void,
): Promise<RecompressResult> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(source, { updateMetadata: false, throwOnInvalidObject: false });
  } catch (error) {
    if ((error as Error).name === "EncryptedPDFError") throw new EncryptedPdfError();
    throw new Error("File ini bukan PDF yang valid atau rusak.");
  }
  const context = doc.context;

  const targets = context
    .enumerateIndirectObjects()
    .flatMap(([ref, object]) => {
      if (!(object instanceof PDFRawStream) || object.getContentsSize() < MIN_IMAGE_BYTES) return [];
      const info = replaceable(object.dict);
      return info ? [{ ref, stream: object, info }] : [];
    });

  let replaced = 0;
  for (const [i, { ref, stream, info }] of targets.entries()) {
    onProgress?.(i, targets.length);
    const original = stream.getContents();
    const next = await encode(original, info);
    if (!next || next.data.length >= original.length * MIN_GAIN) continue;
    const dict = stream.dict;
    dict.set(name("Width"), PDFNumber.of(next.width));
    dict.set(name("Height"), PDFNumber.of(next.height));
    dict.set(name("ColorSpace"), name("DeviceRGB"));
    dict.set(name("BitsPerComponent"), PDFNumber.of(8));
    dict.set(name("Filter"), name("DCTDecode"));
    dict.delete(name("DecodeParms"));
    context.assign(ref, PDFRawStream.of(dict, next.data));
    replaced++;
  }
  onProgress?.(targets.length, targets.length);

  const bytes = await doc.save({ useObjectStreams: true });
  return { bytes, candidates: targets.length, replaced };
}
