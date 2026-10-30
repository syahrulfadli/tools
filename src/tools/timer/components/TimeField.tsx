import { useState } from "react";

/**
 * Kolom dua digit (jam/menit/detik) yang bisa diketik langsung pada angka besar.
 * Panah atas/bawah menambah/mengurangi; nilai di luar batas dibatasi saat disimpan.
 */
export function TimeField({ label, value, max, onCommit }: { label: string; value: number; max: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (text: string) => {
    const n = Number(text.replace(/\D/g, "") || 0);
    onCommit(Math.min(max, Math.max(0, n)));
    setDraft(null);
  };
  return (
    <input
      className="clock-digits__group"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={2}
      aria-label={label}
      value={draft ?? String(value).padStart(2, "0") /* taste-skill-ignore: digit jam */}
      onFocus={(event) => {
        setDraft(String(value).padStart(2, "0")); // taste-skill-ignore: digit jam
        event.target.select();
      }}
      onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 2))}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const next = Math.min(max, Math.max(0, Number(draft ?? value) + (event.key === "ArrowUp" ? 1 : -1)));
          onCommit(next);
          setDraft(String(next).padStart(2, "0")); // taste-skill-ignore: digit jam
        } else if (event.key === "Enter") {
          commit(event.currentTarget.value);
          event.currentTarget.blur();
        }
      }}
    />
  );
}
