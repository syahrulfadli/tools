import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import { ImagePlus } from "lucide-react";
import { coverCrop, panBy, zoomTo } from "../lib/crop";
import type { Photo } from "../lib/images";
import { cellRects, cornerRadius, outputSize, unitSize, type Rect } from "../lib/layout";
import type { CollageAction, CollageState } from "../lib/state";

export const PHOTO_DRAG_TYPE = "application/x-collage-photo";

interface Props {
  state: CollageState;
  photoById: Map<string, Photo>;
  dispatch: Dispatch<CollageAction>;
  /** Buka pemilih file untuk mengisi sel tertentu. */
  onPickForCell: (cell: number) => void;
  onDropFiles: (files: File[], cell: number) => void;
}

const WELL_PAD = 32;
const KEY_PAN = 0.1;
const KEY_ZOOM = 0.1;

/**
 * Pratinjau kolase yang bisa disunting. Geometri datang dari lib/layout dan lib/crop,
 * fungsi yang sama dengan ekspor, jadi yang terlihat = yang diunduh.
 */
export function CollageCanvas({ state, photoById, dispatch, onPickForCell, onDropFiles }: Props) {
  const { settings, cells, selected } = state;
  const wellRef = useRef<HTMLDivElement>(null);
  const [well, setWell] = useState({ width: 0, height: 0 });
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const drag = useRef<{ cell: number; x: number; y: number; pointer: number } | null>(null);

  useLayoutEffect(() => {
    const el = wellRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setWell({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Ukuran pratinjau: rasio kolase dimuat sebesar mungkin di dalam well.
  const ratio = settings.ratioW / settings.ratioH;
  const availW = Math.max(0, well.width - WELL_PAD * 2);
  const availH = Math.max(0, well.height - WELL_PAD * 2);
  const previewW = Math.floor(Math.min(availW, availH * ratio));
  const previewH = Math.floor(previewW / ratio);
  const rects = previewW > 0 ? cellRects(previewW, previewH, settings) : [];
  const unit = unitSize(previewW, previewH);
  const output = outputSize(settings.ratioW, settings.ratioH, settings.longEdge);

  // Ctrl/⌘ + scroll (juga pinch di trackpad) untuk zoom sel di bawah kursor.
  const latest = useRef({ cells, photoById, rects });
  latest.current = { cells, photoById, rects };
  useEffect(() => {
    const el = wellRef.current;
    if (!el) return;
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-cell]");
      if (!target) return;
      const index = Number(target.dataset.cell);
      const cell = latest.current.cells[index];
      if (!cell?.photoId) return;
      event.preventDefault();
      const zoom = cell.framing.zoom * Math.exp(-event.deltaY * 0.01);
      dispatch({ type: "frame", cell: index, framing: zoomTo(cell.framing, zoom) });
      dispatch({ type: "select", cell: index });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [dispatch]);

  function photoIn(index: number) {
    const id = cells[index]?.photoId;
    return id ? photoById.get(id) : undefined;
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>, index: number) {
    const photo = photoIn(index);
    if (!photo || event.button !== 0) return;
    // Di layar sentuh, ketukan pertama hanya memilih sel agar halaman tetap bisa digulir.
    if (event.pointerType === "touch" && selected !== index) {
      dispatch({ type: "select", cell: index });
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { cell: index, x: event.clientX, y: event.clientY, pointer: event.pointerId };
    dispatch({ type: "select", cell: index });
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>, index: number, rect: Rect) {
    const active = drag.current;
    const photo = photoIn(index);
    if (!active || active.pointer !== event.pointerId || active.cell !== index || !photo) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    active.x = event.clientX;
    active.y = event.clientY;
    const framing = panBy(cells[index].framing, dx, dy, photo.width, photo.height, rect.width, rect.height);
    dispatch({ type: "frame", cell: index, framing });
  }

  function onPointerUp() {
    drag.current = null;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
    const cell = cells[index];
    const photo = photoIn(index);
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!photo) onPickForCell(index);
      else dispatch({ type: "select", cell: index });
      return;
    }
    if (!photo) return;
    const { framing } = cell;
    const moves: Record<string, () => typeof framing> = {
      // Panah menggeser foto searah tombol, sama seperti menyeret.
      ArrowLeft: () => ({ ...framing, x: Math.min(1, framing.x + KEY_PAN) }),
      ArrowRight: () => ({ ...framing, x: Math.max(-1, framing.x - KEY_PAN) }),
      ArrowUp: () => ({ ...framing, y: Math.min(1, framing.y + KEY_PAN) }),
      ArrowDown: () => ({ ...framing, y: Math.max(-1, framing.y - KEY_PAN) }),
      "+": () => zoomTo(framing, framing.zoom + KEY_ZOOM),
      "=": () => zoomTo(framing, framing.zoom + KEY_ZOOM),
      "-": () => zoomTo(framing, framing.zoom - KEY_ZOOM),
    };
    if (moves[event.key]) {
      event.preventDefault();
      dispatch({ type: "select", cell: index });
      dispatch({ type: "frame", cell: index, framing: moves[event.key]() });
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      dispatch({ type: "clearCell", cell: index });
    }
  }

  function acceptsDrop(event: DragEvent) {
    const types = Array.from(event.dataTransfer.types);
    return types.includes(PHOTO_DRAG_TYPE) || types.includes("Files");
  }

  function onDrop(event: DragEvent<HTMLDivElement>, index: number) {
    if (!acceptsDrop(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setDropTarget(null);
    const photoId = event.dataTransfer.getData(PHOTO_DRAG_TYPE);
    if (photoId) {
      dispatch({ type: "assign", cell: index, photoId });
      return;
    }
    const files = Array.from(event.dataTransfer.files);
    if (files.length) onDropFiles(files, index);
  }

  const transparent = settings.background === "transparent";

  return (
    <div
      ref={wellRef}
      className="canvas-well"
      onPointerDown={(event) => {
        // Klik di luar kolase melepas pilihan sel.
        if (event.target === event.currentTarget) dispatch({ type: "select", cell: null });
      }}
    >
      {previewW > 0 && (
        <div
          className={`sheet-preview${transparent ? " sheet-preview--transparent" : ""}`}
          style={{ width: previewW, height: previewH, background: transparent ? undefined : settings.background }}
          role="group"
          aria-label={`Pratinjau kolase ${settings.rows} × ${settings.cols}, rasio ${settings.ratioW}:${settings.ratioH}`}
        >
          {rects.map((rect, index) => {
            const photo = photoIn(index);
            const cell = cells[index];
            const row = Math.floor(index / settings.cols) + 1;
            const col = (index % settings.cols) + 1;
            const crop = photo ? coverCrop(photo.width, photo.height, rect.width, rect.height, cell.framing) : null;
            const classes = [
              "cell",
              photo ? "cell--filled" : "cell--empty",
              selected === index && "is-selected",
              dropTarget === index && "is-drop-target",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div
                key={index}
                data-cell={index}
                className={classes}
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                  borderRadius: cornerRadius(settings.radius, rect, unit),
                }}
                role="button"
                tabIndex={0}
                aria-pressed={photo ? selected === index : undefined}
                aria-label={
                  photo
                    ? `Sel baris ${row} kolom ${col}: ${photo.name}. Seret atau tombol panah untuk menggeser, plus dan minus untuk zoom.`
                    : `Sel baris ${row} kolom ${col} kosong. Tekan Enter untuk menambah foto.`
                }
                onClick={() => {
                  if (!photo) onPickForCell(index);
                }}
                onPointerDown={(event) => onPointerDown(event, index)}
                onPointerMove={(event) => onPointerMove(event, index, rect)}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={(event) => onKeyDown(event, index)}
                onDragOver={(event) => {
                  if (!acceptsDrop(event)) return;
                  event.preventDefault();
                  event.stopPropagation();
                  setDropTarget(index);
                }}
                onDragLeave={() => setDropTarget((current) => (current === index ? null : current))}
                onDrop={(event) => onDrop(event, index)}
              >
                {photo && crop ? (
                  <img
                    src={photo.url}
                    alt=""
                    draggable={false}
                    style={{
                      width: photo.width * crop.scale,
                      height: photo.height * crop.scale,
                      transform: `translate(${-crop.sx * crop.scale}px, ${-crop.sy * crop.scale}px)`,
                    }}
                  />
                ) : (
                  <span className="cell__add">
                    <ImagePlus size={rect.width < 64 || rect.height < 64 ? 16 : 20} strokeWidth={1.5} aria-hidden="true" />
                    {rect.width >= 96 && rect.height >= 72 && <span>Tambah foto</span>}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="canvas-well__stamp num">
        {output.width.toLocaleString("id-ID")} × {output.height.toLocaleString("id-ID")} px
      </p>
    </div>
  );
}
