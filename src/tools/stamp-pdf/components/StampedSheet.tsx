import type { CSSProperties } from "react";
import { Bone } from "../../../components/Skeleton";
import { visualSize, type PageBox } from "../../../lib/pdf-geometry";
import { CAP_HEIGHT, PT_PER_MM, formatPageNumber, hasWatermark, imageWatermarkSize, pageNumberFor, type NumberOptions, type WatermarkOptions } from "../lib/stamp";

interface Props {
  box: PageBox;
  page: number;
  /** Gambar halaman; tanpa ini tampil balok skeleton. */
  src?: string;
  numbers: NumberOptions;
  /** Nomor terakhir, untuk format "dari N". */
  last: number;
  watermark: WatermarkOptions;
  /** Object URL pratinjau watermark gambar. */
  imageUrl?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Satu halaman dengan nomor dan watermark ditumpuk di atasnya. Ukuran memakai cqi (persen lebar
 * halaman) agar sebanding dengan poin PDF, sehingga sama di kisi kecil maupun tampilan besar.
 */
export function StampedSheet({ box, page, src, numbers, last, watermark, imageUrl, className = "", style }: Props) {
  const size = visualSize(box);
  const n = numbers.enabled ? pageNumberFor(page, numbers) : null;
  const pt = (value: number) => `${(value / size.width) * 100}cqi`;
  const margin = numbers.marginMm * PT_PER_MM;
  const numberStyle: CSSProperties = {
    fontSize: pt(numbers.size),
    lineHeight: CAP_HEIGHT,
    [numbers.vertical]: `${(margin / size.height) * 100}%`,
    ...(numbers.horizontal === "center" ? { left: "50%", translate: "-50% 0" } : { [numbers.horizontal]: `${(margin / size.width) * 100}%` }),
  };
  const showWatermark = hasWatermark(watermark);
  const rotate = `${-watermark.angle}deg`;

  return (
    <span className={`page__sheet stamp-sheet ${className}`} style={{ aspectRatio: `${size.width} / ${size.height}`, ...style }}>
      {src ? <img src={src} alt="" /> : <Bone w="100%" h="100%" r={0} />}
      {showWatermark && watermark.kind === "text" && (
        <span className="stamp-watermark" style={{ fontSize: pt(watermark.size), opacity: watermark.opacity, color: watermark.color, rotate }}>
          {watermark.text.trim()}
        </span>
      )}
      {showWatermark && watermark.kind === "image" && watermark.image && imageUrl && (
        <img
          className="stamp-watermark stamp-watermark--image"
          src={imageUrl}
          alt=""
          style={{ width: `${(imageWatermarkSize(size, watermark.image, watermark.scale).width / size.width) * 100}%`, opacity: watermark.opacity, rotate }}
        />
      )}
      {n !== null && (
        <span className={`stamp-number stamp-number--${numbers.vertical}`} style={numberStyle}>
          {formatPageNumber(numbers.format, n, last)}
        </span>
      )}
    </span>
  );
}
