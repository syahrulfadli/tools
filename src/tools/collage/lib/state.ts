import { DEFAULT_FRAMING, type Framing } from "./crop";
import type { Photo } from "./images";
import { DEFAULT_SETTINGS, type CollageSettings } from "./layout";

/**
 * State kolase. Foto disimpan sekali di `photos`; sel hanya menyimpan id foto dan
 * pembingkaiannya, sehingga satu foto bisa dipindah atau ditukar antar sel tanpa disalin.
 */
export interface Cell {
  photoId: string | null;
  framing: Framing;
}

export interface CollageState {
  settings: CollageSettings;
  photos: Photo[];
  cells: Cell[];
  selected: number | null;
}

export type CollageAction =
  | { type: "addPhotos"; photos: Photo[]; target?: number }
  | { type: "removePhoto"; photoId: string }
  | { type: "assign"; cell: number; photoId: string }
  | { type: "clearCell"; cell: number }
  | { type: "frame"; cell: number; framing: Framing }
  | { type: "select"; cell: number | null }
  | { type: "settings"; patch: Partial<CollageSettings> }
  | { type: "reset" };

const emptyCell = (): Cell => ({ photoId: null, framing: DEFAULT_FRAMING });

export function initialState(): CollageState {
  const settings = DEFAULT_SETTINGS;
  return {
    settings,
    photos: [],
    cells: Array.from({ length: settings.rows * settings.cols }, emptyCell),
    selected: null,
  };
}

export function collageReducer(state: CollageState, action: CollageAction): CollageState {
  switch (action.type) {
    case "addPhotos": {
      const photos = [...state.photos, ...action.photos];
      const queue = action.photos.map((photo) => photo.id);
      const cells = state.cells.slice();
      // Foto pertama masuk ke sel tujuan (bila ada), sisanya mengisi sel kosong berurutan.
      if (action.target !== undefined && queue.length > 0) {
        cells[action.target] = { photoId: queue.shift()!, framing: DEFAULT_FRAMING };
      }
      fillEmpty(cells, queue);
      return { ...state, photos, cells };
    }

    case "removePhoto": {
      const cells = state.cells.map((cell) => (cell.photoId === action.photoId ? emptyCell() : cell));
      return { ...state, photos: state.photos.filter((photo) => photo.id !== action.photoId), cells };
    }

    case "assign": {
      const cells = state.cells.slice();
      const from = cells.findIndex((cell) => cell.photoId === action.photoId);
      if (from === action.cell) return state;
      const previous = cells[action.cell];
      // Foto yang sudah di sel lain ditukar tempat dengan isi sel tujuan.
      if (from !== -1) cells[from] = previous.photoId ? previous : emptyCell();
      cells[action.cell] = { photoId: action.photoId, framing: DEFAULT_FRAMING };
      return { ...state, cells, selected: action.cell };
    }

    case "clearCell": {
      const cells = state.cells.slice();
      cells[action.cell] = emptyCell();
      return { ...state, cells };
    }

    case "frame": {
      const cells = state.cells.slice();
      cells[action.cell] = { ...cells[action.cell], framing: action.framing };
      return { ...state, cells };
    }

    case "select":
      return { ...state, selected: action.cell };

    case "settings": {
      const settings = { ...state.settings, ...action.patch };
      // Mode isi/utuh global berlaku ke semua sel: pilihan per sel sebelumnya dihapus.
      const base =
        action.patch.fit !== undefined
          ? state.cells.map((cell) => ({ ...cell, framing: { ...cell.framing, fit: undefined } }))
          : state.cells;
      const count = settings.rows * settings.cols;
      if (count === base.length) return { ...state, settings, cells: base };

      // Grid berubah: sel lama dipertahankan sesuai urutan baca, foto yang terlepas
      // mengisi sel kosong berikutnya, dan sisanya tetap menunggu di daftar foto.
      const cells = Array.from({ length: count }, (_, i) => base[i] ?? emptyCell());
      const placed = new Set(cells.map((cell) => cell.photoId));
      fillEmpty(
        cells,
        state.photos.map((photo) => photo.id).filter((id) => !placed.has(id)),
      );
      const selected = state.selected !== null && state.selected < count ? state.selected : null;
      return { ...state, settings, cells, selected };
    }

    case "reset":
      return { ...initialState(), settings: state.settings, cells: state.cells.map(emptyCell) };
  }
}

function fillEmpty(cells: Cell[], queue: string[]) {
  for (let i = 0; i < cells.length && queue.length > 0; i++) {
    if (!cells[i].photoId) cells[i] = { photoId: queue.shift()!, framing: DEFAULT_FRAMING };
  }
}
