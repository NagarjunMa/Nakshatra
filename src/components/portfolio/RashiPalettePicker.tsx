import { Check } from "lucide-react";
import {
  resolveForeground,
  type RashiPalette,
} from "@/features/portfolio/rashi-theme";

interface RashiPalettePickerProps {
  palettes: readonly RashiPalette[];
  selectedPaletteId?: string;
  onSelect: (palette: RashiPalette) => void;
  disabled?: boolean;
}

/**
 * Renders the curated background choices for the selected rashi.
 * Input: palette options, a selected palette ID, and a selection callback. Output: accessible swatch buttons.
 */
export function RashiPalettePicker({
  palettes,
  selectedPaletteId,
  onSelect,
  disabled = false,
}: RashiPalettePickerProps) {
  if (!palettes.length) {
    return (
      <p className="text-sm opacity-65">
        Select a rashi to reveal its portfolio colors.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {palettes.map((palette) => {
        const selected = palette.id === selectedPaletteId;
        const { foreground } = resolveForeground(palette.background);
        return (
          <button
            key={palette.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(palette)}
            className={`group relative flex min-h-16 items-center gap-3 overflow-hidden rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              selected
                ? "ring-1"
                : "hover:brightness-95"
            }`}
            style={{
              backgroundColor: palette.background,
              borderColor: selected ? foreground : "rgba(0, 0, 0, 0.18)",
              boxShadow: selected ? `0 0 0 1px ${foreground}` : undefined,
            }}
            aria-pressed={selected}
          >
            <span
              className="h-9 w-9 shrink-0 rounded-full border border-black/10 shadow-sm"
              style={{ backgroundColor: palette.accent }}
              aria-hidden="true"
            />
            <span className="min-w-0" style={{ color: foreground }}>
              <span className="block text-sm font-semibold">
                {palette.label}
              </span>
              <span className="mt-0.5 block text-xs opacity-75">
                {palette.background.toUpperCase()}
              </span>
            </span>
            {selected && (
              <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/70 text-white">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
