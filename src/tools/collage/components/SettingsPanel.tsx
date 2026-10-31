import { useState, type Dispatch } from "react";
import { Minus, Plus } from "lucide-react";
import type { Fit } from "../lib/crop";
import { DEFAULT_SETTINGS, outputSize, type CollageSettings } from "../lib/layout";
import { isDefaultSettings } from "../lib/persist";
import {
  BACKGROUNDS,
  BORDER_COLORS,
  GRID_PRESETS,
  MAX_GRID,
  MAX_RATIO_PART,
  MIN_GRID,
  RATIO_PRESETS,
  SIZE_PRESETS,
  SPACING_LIMITS,
} from "../lib/presets";
import type { CollageAction } from "../lib/state";
import { GridGlyph, RatioGlyph } from "./Glyphs";
import { ColorSwatches, PanelSection, Segmented, Slider } from "../../../components/tool/controls";

export const FIT_OPTIONS: { value: Fit; label: string }[] = [
  { value: "cover", label: "Isi penuh" },
  { value: "contain", label: "Utuh" },
];

interface Props {
  settings: CollageSettings;
  dispatch: Dispatch<CollageAction>;
}

export function SettingsPanel({ settings, dispatch }: Props) {
  const set = (patch: Partial<CollageSettings>) => dispatch({ type: "settings", patch });
  const isCustomRatio = !RATIO_PRESETS.some((p) => p.w === settings.ratioW && p.h === settings.ratioH);

  return (
    <aside className="panel settings" aria-label="Pengaturan kolase">
      <PanelSection title="Grid" aside={`${settings.rows * settings.cols} sel`}>
        <div className="preset-grid">
          {GRID_PRESETS.map(({ rows, cols }) => {
            const active = rows === settings.rows && cols === settings.cols;
            return (
              <button
                key={`${rows}x${cols}`}
                type="button"
                className={`preset${active ? " is-active" : ""}`}
                aria-pressed={active}
                onClick={() => set({ rows, cols })}
              >
                <GridGlyph rows={rows} cols={cols} size={28} />
                <span className="num">
                  {rows}×{cols}
                </span>
              </button>
            );
          })}
        </div>
        <div className="steppers">
          <Stepper label="Baris" value={settings.rows} min={MIN_GRID} max={MAX_GRID} onChange={(rows) => set({ rows })} />
          <Stepper label="Kolom" value={settings.cols} min={MIN_GRID} max={MAX_GRID} onChange={(cols) => set({ cols })} />
        </div>
      </PanelSection>

      <PanelSection title="Rasio" aside={`${settings.ratioW}:${settings.ratioH}`}>
        <div className="ratio-list">
          {RATIO_PRESETS.map(({ w, h, use }) => {
            const active = w === settings.ratioW && h === settings.ratioH;
            return (
              <button
                key={`${w}:${h}`}
                type="button"
                className={`ratio${active ? " is-active" : ""}`}
                aria-pressed={active}
                onClick={() => set({ ratioW: w, ratioH: h })}
              >
                <RatioGlyph w={w} h={h} />
                <span className="ratio__text">
                  <span className="num">
                    {w}:{h}
                  </span>
                  <span className="ratio__use">{use}</span>
                </span>
              </button>
            );
          })}
        </div>
        <fieldset className={`ratio-custom${isCustomRatio ? " is-active" : ""}`}>
          <legend>Rasio kustom</legend>
          <NumberField label="Lebar" value={settings.ratioW} min={1} max={MAX_RATIO_PART} onChange={(ratioW) => set({ ratioW })} />
          <span aria-hidden="true">:</span>
          <NumberField label="Tinggi" value={settings.ratioH} min={1} max={MAX_RATIO_PART} onChange={(ratioH) => set({ ratioH })} />
        </fieldset>
      </PanelSection>

      <PanelSection title="Foto di sel">
        <Segmented label="Cara foto mengisi sel" options={FIT_OPTIONS} value={settings.fit} onChange={(fit) => set({ fit })} />
        <p className="field-note">
          {settings.fit === "cover"
            ? "Foto menutupi seluruh sel; tepi yang tidak muat dipotong."
            : "Seluruh foto terlihat tanpa dipotong; sisa ruang sel diisi warna latar."}{" "}
          Berlaku untuk semua sel; tiap sel bisa diubah di Sel terpilih.
        </p>
      </PanelSection>

      <PanelSection title="Jarak dan sudut">
        <Slider label="Jarak antar foto" value={settings.gap} max={SPACING_LIMITS.gap} onChange={(gap) => set({ gap })} />
        <Slider label="Tepi luar" value={settings.padding} max={SPACING_LIMITS.padding} onChange={(padding) => set({ padding })} />
        <Slider label="Sudut membulat" value={settings.radius} max={SPACING_LIMITS.radius} onChange={(radius) => set({ radius })} />
      </PanelSection>

      <PanelSection title="Bingkai foto">
        <Slider
          label="Tebal bingkai"
          value={settings.borderWidth}
          max={SPACING_LIMITS.border}
          display={settings.borderWidth === 0 ? "Tanpa" : undefined}
          onChange={(borderWidth) => set({ borderWidth })}
        />
        {settings.borderWidth > 0 && (
          <ColorSwatches
            label="Warna bingkai"
            options={BORDER_COLORS}
            value={settings.borderColor}
            onChange={(borderColor) => set({ borderColor })}
          />
        )}
      </PanelSection>

      <PanelSection title="Latar">
        <ColorSwatches
          label="Warna latar"
          options={BACKGROUNDS}
          value={settings.background}
          onChange={(background) => set({ background })}
        />
        {settings.background === "transparent" && settings.format === "jpeg" && (
          <p className="field-note" role="status">
            JPG tidak mendukung transparansi; latar akan diisi putih. Pilih PNG untuk latar transparan.
          </p>
        )}
      </PanelSection>

      <PanelSection title="Setelan tersimpan">
        <p className="field-note">
          Setelan terakhir diingat di browser ini dan dipakai lagi saat kamu membuka Kolase. Foto tidak ikut disimpan.
        </p>
        <div className="button-row">
          <button
            type="button"
            className="btn"
            disabled={isDefaultSettings(settings)}
            onClick={() => set(DEFAULT_SETTINGS)}
          >
            Kembalikan ke bawaan
          </button>
        </div>
      </PanelSection>
    </aside>
  );
}

/** Ukuran dan format unduhan. Ditaruh di panel kanan, dekat tombol unduh. */
export function ExportSection({ settings, dispatch }: Props) {
  const set = (patch: Partial<CollageSettings>) => dispatch({ type: "settings", patch });
  const output = outputSize(settings.ratioW, settings.ratioH, settings.longEdge);
  return (
    <PanelSection title="Ekspor" aside={`${output.width.toLocaleString("id-ID")} × ${output.height.toLocaleString("id-ID")} px`}>
      <Segmented
        label="Sisi terpanjang"
        options={SIZE_PRESETS.map((size) => ({ value: size, label: `${size.toLocaleString("id-ID")} px` }))}
        value={settings.longEdge}
        onChange={(longEdge) => set({ longEdge })}
      />
      <Segmented
        label="Format"
        options={[
          { value: "png", label: "PNG" },
          { value: "jpeg", label: "JPG" },
        ]}
        value={settings.format}
        onChange={(format) => set({ format })}
      />
    </PanelSection>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="stepper">
      <span className="stepper__label">{label}</span>
      <div className="stepper__control">
        <button type="button" className="btn btn--icon" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Kurangi ${label.toLowerCase()}`}>
          <Minus size={14} strokeWidth={1.5} />
        </button>
        <output className="num" aria-live="polite" aria-label={label}>
          {value}
        </output>
        <button type="button" className="btn btn--icon" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`Tambah ${label.toLowerCase()}`}>
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  // Draf teks lokal: field boleh kosong sementara diketik, nilai sah langsung diterapkan.
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  return (
    <label className="number-field">
      <span className="visually-hidden">{label}</span>
      <input
        className="num"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={editing ? draft : value}
        onFocus={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        onBlur={() => setEditing(false)}
        onChange={(event) => {
          setDraft(event.target.value);
          const next = Math.round(Number(event.target.value));
          if (event.target.value !== "" && next >= min && next <= max) onChange(next);
        }}
      />
    </label>
  );
}

