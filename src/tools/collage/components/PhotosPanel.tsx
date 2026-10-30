import type { Dispatch, ReactNode } from "react";
import { Crosshair, Eraser, ImagePlus, X } from "lucide-react";
import { FailureList, FileDropzone, type FileFailure } from "../../../components/tool/FileDropzone";
import { Bone } from "../../../components/Skeleton";
import { DEFAULT_FRAMING, MAX_ZOOM, MIN_ZOOM, zoomTo } from "../lib/crop";
import type { Photo } from "../lib/images";
import type { CollageAction, CollageState } from "../lib/state";
import { Segmented } from "../../../components/tool/controls";
import { PHOTO_DRAG_TYPE } from "./CollageCanvas";
import { FIT_OPTIONS } from "./SettingsPanel";

interface Props {
  state: CollageState;
  photoById: Map<string, Photo>;
  dispatch: Dispatch<CollageAction>;
  pending: { done: number; total: number } | null;
  failures: FileFailure[];
  onDismissFailures: () => void;
  onAdd: () => void;
  onRemove: (photo: Photo) => void;
  /** Seksi tambahan di bawah (mis. Ekspor). */
  children?: ReactNode;
}

export function PhotosPanel({ state, photoById, dispatch, pending, failures, onDismissFailures, onAdd, onRemove, children }: Props) {
  const { photos, cells, selected, settings } = state;
  const cellOf = new Map(cells.map((cell, index) => [cell.photoId, index]));
  const unused = photos.filter((photo) => !cellOf.has(photo.id)).length;
  const selectedCell = selected !== null ? cells[selected] : null;
  const selectedPhoto = selectedCell?.photoId ? photoById.get(selectedCell.photoId) : undefined;

  function place(photo: Photo) {
    const current = cellOf.get(photo.id);
    if (selected !== null) {
      dispatch({ type: "assign", cell: selected, photoId: photo.id });
    } else if (current !== undefined) {
      dispatch({ type: "select", cell: current });
    } else {
      const empty = cells.findIndex((cell) => !cell.photoId);
      if (empty !== -1) dispatch({ type: "assign", cell: empty, photoId: photo.id });
    }
  }

  return (
    <aside className="panel photos" aria-label="Foto">
      <section className="panel__section">
        <header className="panel__head">
          <h2>Foto</h2>
          <span className="num">{photos.length > 0 ? `${photos.length} foto` : "Belum ada"}</span>
        </header>

        <FileDropzone
          icon={<ImagePlus size={20} strokeWidth={1.5} aria-hidden="true" />}
          title="Tambah foto"
          hint="JPG, PNG, WebP, GIF, AVIF. Bisa juga diseret ke kanvas atau ditempel (Ctrl+V)."
          onClick={onAdd}
        />

        {pending && (
          <p className="loading-line num" role="status">
            Memuat foto {pending.done} dari {pending.total}…
          </p>
        )}

        <FailureList failures={failures} onDismiss={onDismissFailures} />

        {(photos.length > 0 || pending) && (
          <ul className="tray">
            {photos.map((photo) => {
              const cell = cellOf.get(photo.id);
              return (
                <li key={photo.id} className={`thumb${cell === selected && cell !== undefined ? " is-selected" : ""}`}>
                  <button
                    type="button"
                    className="thumb__button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(PHOTO_DRAG_TYPE, photo.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => place(photo)}
                    aria-label={
                      selected !== null
                        ? `Taruh ${photo.name} di sel terpilih`
                        : cell !== undefined
                          ? `${photo.name}, di sel ${cell + 1}`
                          : `${photo.name}, belum dipakai`
                    }
                  >
                    <img src={photo.url} alt="" draggable={false} />
                    {cell !== undefined && <span className="thumb__badge num">{cell + 1}</span>}
                  </button>
                  <button type="button" className="thumb__remove" onClick={() => onRemove(photo)} aria-label={`Hapus ${photo.name}`}>
                    <X size={14} strokeWidth={2} />
                  </button>
                </li>
              );
            })}
            {pending &&
              Array.from({ length: pending.total - pending.done }, (_, i) => (
                <li key={`pending-${i}`} className="thumb thumb--pending" aria-hidden="true">
                  <Bone w="100%" h="100%" r={6} />
                </li>
              ))}
          </ul>
        )}

        {unused > 0 && (
          <p className="field-note num">
            {unused} foto belum dipakai. Tambah sel di Grid, atau seret ke sel untuk menukar.
          </p>
        )}
      </section>

      <section className="panel__section">
        <header className="panel__head">
          <h2>Sel terpilih</h2>
          {selected !== null && (
            <span className="num">
              Baris {Math.floor(selected / settings.cols) + 1} · Kolom {(selected % settings.cols) + 1}
            </span>
          )}
        </header>

        {selectedCell && selectedPhoto ? (
          <div className="cell-controls">
            <p className="cell-controls__name" title={selectedPhoto.name}>
              {selectedPhoto.name}
              <span className="num">
                {selectedPhoto.width.toLocaleString("id-ID")} × {selectedPhoto.height.toLocaleString("id-ID")} px
              </span>
            </p>
            <Segmented
              label="Tampilan foto"
              options={FIT_OPTIONS}
              value={selectedCell.framing.fit ?? settings.fit}
              onChange={(fit) =>
                // Ganti mode = mulai dari posisi tengah tanpa zoom, agar hasilnya langsung terlihat utuh/penuh.
                dispatch({ type: "frame", cell: selected!, framing: { ...DEFAULT_FRAMING, fit } })
              }
            />
            <label className="slider">
              <span className="slider__row">
                <span>Zoom</span>
                <span className="num">{Math.round(selectedCell.framing.zoom * 100)}%</span>
              </span>
              <input
                type="range"
                min={MIN_ZOOM * 100}
                max={MAX_ZOOM * 100}
                value={Math.round(selectedCell.framing.zoom * 100)}
                onChange={(event) =>
                  dispatch({ type: "frame", cell: selected!, framing: zoomTo(selectedCell.framing, Number(event.target.value) / 100) })
                }
              />
            </label>
            <div className="cell-controls__actions">
              <button type="button" className="btn" onClick={() =>
                  dispatch({ type: "frame", cell: selected!, framing: { ...DEFAULT_FRAMING, fit: selectedCell.framing.fit } })
                }>
                <Crosshair size={14} strokeWidth={1.5} aria-hidden="true" />
                Tengahkan
              </button>
              <button type="button" className="btn" onClick={() => dispatch({ type: "clearCell", cell: selected! })}>
                <Eraser size={14} strokeWidth={1.5} aria-hidden="true" />
                Kosongkan sel
              </button>
            </div>
          </div>
        ) : (
          <p className="field-note">
            {selected !== null
              ? "Sel ini kosong. Klik foto di atas untuk menaruhnya di sini."
              : "Pilih foto di kanvas untuk mengatur zoom dan posisinya. Seret foto di dalam sel untuk menggeser."}
          </p>
        )}
      </section>

      {children}
    </aside>
  );
}
