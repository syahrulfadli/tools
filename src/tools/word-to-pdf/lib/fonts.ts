/**
 * Font cadangan untuk font Office yang tidak terpasang di perangkat.
 *
 * docx-preview menulis `font-family: Calibri` tanpa cadangan, jadi di Android/Linux/macOS
 * tanpa Calibri browser jatuh ke font bawaan (biasanya serif). Di sini daftar font diberi
 * kembaran bermetrik sama bila ada (Carlito untuk Calibri, dst.) lalu keluarga generiknya.
 */

type Generic = "sans-serif" | "serif" | "monospace";

const GENERIC: Record<string, Generic> = {};
for (const name of [
  "aptos", "aptos display", "arial", "arial narrow", "calibri", "calibri light", "candara", "century gothic", "corbel",
  "franklin gothic book", "gill sans mt", "helvetica", "lato", "open sans", "roboto", "segoe ui", "tahoma",
  "trebuchet ms", "verdana",
]) GENERIC[name] = "sans-serif";
for (const name of [
  "book antiqua", "bookman old style", "cambria", "century schoolbook", "constantia", "garamond", "georgia",
  "palatino linotype", "times", "times new roman",
]) GENERIC[name] = "serif";
for (const name of ["cascadia code", "consolas", "courier", "courier new", "lucida console"]) GENERIC[name] = "monospace";

/** Font bebas dengan lebar huruf sama, agar baris dan halaman tidak bergeser. */
const METRIC_TWINS: Record<string, string[]> = {
  calibri: ["Carlito"],
  cambria: ["Caladea"],
  arial: ["Liberation Sans", "Arimo"],
  "times new roman": ["Liberation Serif", "Tinos"],
  "courier new": ["Liberation Mono", "Cousine"],
};

const GENERIC_NAMES = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace"]);

const unquote = (name: string) => name.trim().replace(/^(["'])(.*)\1$/, "$2");
const quote = (name: string) => (/^[\w-]+$/.test(name) ? name : `"${name}"`);

/** "Calibri" → `Calibri, Carlito, sans-serif`. Daftar yang sudah punya generik atau tak dikenal dibiarkan. */
export function withFallback(fontFamily: string): string {
  const names = fontFamily.split(",").map(unquote).filter(Boolean);
  const lower = names.map((name) => name.toLowerCase());
  if (lower.some((name) => GENERIC_NAMES.has(name))) return fontFamily;
  const known = lower.find((name) => GENERIC[name]);
  if (!known) return fontFamily;
  const extra = lower.flatMap((name) => METRIC_TWINS[name] ?? []).filter((twin) => !lower.includes(twin.toLowerCase()));
  return [...names, ...new Set(extra)].map(quote).concat(GENERIC[known]).join(", ");
}
