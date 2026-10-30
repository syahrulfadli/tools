/**
 * Susunan halaman Atur Halaman PDF. Fungsi murni; setiap perubahan mengembalikan array baru.
 * Halaman yang dihapus tetap ada di daftar (ditandai `deleted`) agar bisa dikembalikan.
 */
import { normalizeRotation, type Rotation } from "../../../lib/pdf-geometry";
import { moveItem } from "../../merge-pdf/lib/order";

export interface PageItem {
  /** Nomor halaman di PDF asal, mulai 1. Unik, jadi dipakai sebagai key. */
  source: number;
  /** Rotasi tambahan searah jarum jam. */
  rotate: Rotation;
  deleted: boolean;
}

export function initialPages(count: number): PageItem[] {
  return Array.from({ length: count }, (_, i) => ({ source: i + 1, rotate: 0, deleted: false }));
}

export function movePage(list: readonly PageItem[], from: number, to: number) {
  return moveItem(list, from, to);
}

export function rotatePage(list: readonly PageItem[], index: number, by: number) {
  return list.map((item, i) => (i === index ? { ...item, rotate: normalizeRotation(item.rotate + by) } : item));
}

export function rotateAll(list: readonly PageItem[], by: number) {
  return list.map((item) => (item.deleted ? item : { ...item, rotate: normalizeRotation(item.rotate + by) }));
}

export function toggleDeleted(list: readonly PageItem[], index: number) {
  return list.map((item, i) => (i === index ? { ...item, deleted: !item.deleted } : item));
}

/** Tandai halaman asal tertentu sebagai dihapus (dari isian "2, 5-7"). */
export function deleteSources(list: readonly PageItem[], sources: readonly number[]) {
  const set = new Set(sources);
  return list.map((item) => (set.has(item.source) ? { ...item, deleted: true } : item));
}

export function reversePages(list: readonly PageItem[]) {
  return [...list].reverse();
}

/** Daftar untuk `rearrangePdf`: hanya halaman yang tidak dihapus, sesuai urutan. */
export function outputPlan(list: readonly PageItem[]) {
  return list.filter((item) => !item.deleted).map((item) => ({ page: item.source, rotate: item.rotate }));
}

export function summarize(list: readonly PageItem[]) {
  const kept = list.filter((item) => !item.deleted);
  return {
    kept: kept.length,
    deleted: list.length - kept.length,
    rotated: kept.filter((item) => item.rotate !== 0).length,
    moved: kept.some((item, i) => i > 0 && item.source < kept[i - 1].source),
  };
}

/** Tidak ada yang berubah dibanding PDF asal. */
export function isUnchanged(list: readonly PageItem[]) {
  return list.every((item, i) => item.source === i + 1 && item.rotate === 0 && !item.deleted);
}
