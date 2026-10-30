/**
 * Pemisah bagian (section break) Word di model dokumen docx-preview.
 *
 * Paragraf yang mengakhiri satu bagian membawa `sectionProps`; bagian terakhir memakai
 * props badan dokumen. Jenis bagian (`type`) menentukan apakah bagian itu mulai di halaman
 * baru. Bawaan Word adalah "nextPage", tetapi docx-preview 0.4 mengabaikannya, jadi bagian
 * baru (mis. halaman lanskap) menempel di halaman sebelumnya.
 */

export interface BodyElement {
  type: string;
  sectionProps?: { type?: string } | null;
  pageBreakBefore?: boolean;
}

/**
 * Tandai paragraf pertama tiap bagian yang tidak "continuous" dengan `pageBreakBefore`,
 * yang dipahami docx-preview sebagai awal halaman baru. Mengubah `children` di tempat.
 */
export function breakBeforeNewSections(children: BodyElement[], bodyProps?: { type?: string } | null) {
  children.forEach((elem, i) => {
    if (!elem.sectionProps) return;
    const next = children.slice(i + 1).find((other) => other.sectionProps)?.sectionProps ?? bodyProps;
    const first = children[i + 1];
    if ((next?.type ?? "nextPage") !== "continuous" && first?.type === "paragraph") first.pageBreakBefore = true;
  });
}
