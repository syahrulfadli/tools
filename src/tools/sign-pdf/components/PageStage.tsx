import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { X } from "lucide-react";
import { Bone } from "../../../components/Skeleton";
import type { Thumb } from "../../../components/tool/usePdfDocument";
import { clampPlacement, placementHeight, type Placement } from "../lib/placement";

interface Drag {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  origin: Placement;
}

/**
 * Satu halaman besar dengan tanda tangan yang bisa diseret (pindah) dan ditarik sudutnya (ubah
 * ukuran). Klik di area kosong menempel tanda tangan baru di titik itu. Dengan keyboard: Tab ke
 * tanda tangan, panah untuk menggeser (Shift = lebih jauh), + / − untuk ukuran, Delete untuk hapus.
 */
export function PageStage({
  image,
  aspect,
  signatureUrl,
  ratio,
  placements,
  selected,
  onSelect,
  onChange,
  onRemove,
  onPlace,
}: {
  image: Thumb | null;
  /** Lebar/tinggi halaman seperti terlihat. */
  aspect: number;
  signatureUrl: string | null;
  /** Tinggi/lebar gambar tanda tangan. */
  ratio: number;
  placements: Placement[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChange: (placement: Placement) => void;
  onRemove: (id: string) => void;
  onPlace: (cx: number, cy: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  function start(event: PointerEvent, placement: Placement, mode: Drag["mode"]) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { id: placement.id, mode, startX: event.clientX, startY: event.clientY, origin: placement };
    onSelect(placement.id);
  }

  function move(event: PointerEvent) {
    const current = drag.current;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!current || !rect) return;
    const dx = (event.clientX - current.startX) / rect.width;
    const dy = (event.clientY - current.startY) / rect.height;
    const { origin } = current;
    const next = current.mode === "move" ? { ...origin, x: origin.x + dx, y: origin.y + dy } : { ...origin, w: origin.w + dx };
    onChange(clampPlacement(next, ratio, aspect));
  }

  function end() {
    drag.current = null;
  }

  function onKey(event: KeyboardEvent, placement: Placement) {
    const step = event.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (event.key in moves) {
      const [dx, dy] = moves[event.key];
      onChange(clampPlacement({ ...placement, x: placement.x + dx, y: placement.y + dy }, ratio, aspect));
    } else if (event.key === "+" || event.key === "=") onChange(clampPlacement({ ...placement, w: placement.w + step }, ratio, aspect));
    else if (event.key === "-") onChange(clampPlacement({ ...placement, w: placement.w - step }, ratio, aspect));
    else if (event.key === "Delete" || event.key === "Backspace") onRemove(placement.id);
    else if (event.key === "Escape") onSelect(null);
    else return;
    event.preventDefault();
  }

  return (
    <div
      ref={stageRef}
      className={`sign-stage${signatureUrl ? " can-place" : ""}`}
      // Lebar dibatasi tinggi layar agar satu halaman utuh terlihat (tanda tangan sering di bagian bawah).
      style={{ aspectRatio: String(aspect), width: `min(100%, 760px, max(280px, calc((100dvh - 170px) * ${aspect})))` }}
      onPointerDown={(event) => {
        if (event.button !== 0 || event.target !== event.currentTarget) return;
        onSelect(null);
        const rect = event.currentTarget.getBoundingClientRect();
        if (signatureUrl) onPlace((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
      }}
    >
      {image ? <img src={image.url} alt="" className="sign-stage__page" draggable={false} /> : <Bone w="100%" h="100%" r={0} />}
      {signatureUrl &&
        placements.map((placement) => {
          const h = placementHeight(placement.w, ratio, aspect);
          const isSelected = placement.id === selected;
          return (
            <div
              key={placement.id}
              role="button"
              tabIndex={0}
              aria-label="Tanda tangan. Panah untuk menggeser, plus dan minus untuk ukuran, Delete untuk menghapus."
              aria-pressed={isSelected}
              className={`sign-mark${isSelected ? " is-selected" : ""}`}
              style={{ left: `${placement.x * 100}%`, top: `${placement.y * 100}%`, width: `${placement.w * 100}%`, height: `${h * 100}%` }}
              onPointerDown={(event) => start(event, placement, "move")}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              onFocus={() => onSelect(placement.id)}
              onKeyDown={(event) => onKey(event, placement)}
            >
              <img src={signatureUrl} alt="" draggable={false} />
              {isSelected && (
                <>
                  <button
                    type="button"
                    className="sign-mark__remove"
                    aria-label="Hapus tanda tangan ini"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onRemove(placement.id)}
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                  <span
                    className="sign-mark__resize"
                    aria-hidden="true"
                    onPointerDown={(event) => start(event, placement, "resize")}
                    onPointerMove={move}
                    onPointerUp={end}
                    onPointerCancel={end}
                  />
                </>
              )}
            </div>
          );
        })}
    </div>
  );
}
