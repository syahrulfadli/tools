import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { setThemeMode, useThemeMode, type ThemeMode } from "../lib/theme";

const OPTIONS: { value: ThemeMode; label: string; Icon: LucideIcon }[] = [
  { value: "light", label: "Terang", Icon: Sun },
  { value: "dark", label: "Gelap", Icon: Moon },
  { value: "system", label: "Ikuti sistem", Icon: Monitor },
];

/** Pilihan tema di bar atas: tiga tombol ikon dalam satu segmented kecil. */
export function ThemeSwitch() {
  const mode = useThemeMode();
  return (
    <div className="theme-switch" role="radiogroup" aria-label="Tema">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={value === mode}
          aria-label={label}
          title={label}
          className={value === mode ? "is-active" : undefined}
          onClick={() => setThemeMode(value)}
        >
          <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
