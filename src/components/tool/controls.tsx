import type { ReactNode } from "react";

/** Satu seksi panel: judul kecil, keterangan di kanan (angka/ringkasan), lalu isi. */
export function PanelSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel__section">
      <header className="panel__head">
        <h2>{title}</h2>
        {aside !== undefined && <span className="num">{aside}</span>}
      </header>
      {children}
    </section>
  );
}

export function Slider({
  label,
  value,
  min = 0,
  max,
  step = 1,
  display,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max: number;
  step?: number;
  /** Teks nilai di kanan label; bawaan angka mentah. */
  display?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider">
      <span className="slider__row">
        <span>{label}</span>
        <span className="num">{display ?? value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented-field">
      <span className="segmented-field__label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            className={option.value === value ? "is-active" : undefined}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Pilihan warna: beberapa swatch tetap plus pemilih warna bebas ("Lainnya").
 * Nilai "transparent" digambar sebagai papan catur.
 */
export function ColorSwatches({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const isPreset = options.some((option) => option.value === value);
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={`swatch${value === option.value ? " is-active" : ""}`}
          onClick={() => onChange(option.value)}
        >
          <span
            className={`swatch__chip${option.value === "transparent" ? " swatch__chip--transparent" : ""}`}
            style={option.value === "transparent" ? undefined : { background: option.value }}
          />
          {option.label}
        </button>
      ))}
      <label className={`swatch${isPreset ? "" : " is-active"}`}>
        <input type="color" value={value.startsWith("#") ? value : "#ffffff"} onChange={(event) => onChange(event.target.value)} />
        Lainnya
      </label>
    </div>
  );
}

/** Sakelar on/off dengan label dan keterangan opsional. Warna "on" = tinta, bukan aksen. */
export function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`toggle${disabled ? " is-disabled" : ""}`}>
      <span className="toggle__text">
        <span className="toggle__label">{label}</span>
        {description && <span className="toggle__description">{description}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle__track" aria-hidden="true" />
    </label>
  );
}
