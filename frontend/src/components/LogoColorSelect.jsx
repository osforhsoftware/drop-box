import { useState } from "react";
import { getColorHex } from "../constants/colorSwatch";
import { LOGO_COLOR } from "../constants/brand";

function ColorDot({ color, selected, onClick, isLogoColor }) {
  const hex = getColorHex(color);
  if (!hex) return null;

  const isLight = ["#f5f5f5", "#fffdd0", "#d4c4a8", "#c0c0c0"].includes(hex);

  return (
    <button
      type="button"
      onClick={onClick}
      title={isLogoColor ? `${color} (logo color)` : color}
      aria-pressed={selected}
      className={`relative w-9 h-9 rounded-full border-2 transition-all shrink-0 ${
        selected
          ? "border-brand scale-110 shadow-[0_0_12px_rgba(109,177,97,0.45)]"
          : isLight
            ? "border-white/25 hover:border-white/40"
            : "border-white/10 hover:border-white/25"
      }`}
      style={{ backgroundColor: hex }}
    >
      {isLogoColor && (
        <span
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brand border border-white/30"
          aria-hidden
        />
      )}
    </button>
  );
}

/**
 * Visual color tag picker. Green maps to the CASEBOX logo color (#6DB161).
 */
export default function LogoColorSelect({
  label = "Colors",
  value = [],
  onChange,
  options = [],
  hint,
  testId,
}) {
  const selected = Array.isArray(value) ? value : [];
  const selectedLower = new Set(selected.map((c) => c.toLowerCase()));
  const logoColorName = options.find((c) => getColorHex(c)?.toLowerCase() === LOGO_COLOR) || "Green";
  const [customHex, setCustomHex] = useState("#6DB161");
  const [hexError, setHexError] = useState("");

  const toggle = (color) => {
    const key = color.toLowerCase();
    if (selectedLower.has(key)) {
      onChange(selected.filter((c) => c.toLowerCase() !== key));
    } else {
      onChange([...selected, color]);
    }
  };

  const addCustomColor = () => {
    const rawHex = customHex.trim();
    const normalizedHex = (rawHex.startsWith("#") ? rawHex : `#${rawHex}`).toUpperCase();
    if (!/^#([0-9A-F]{3}|[0-9A-F]{6})$/.test(normalizedHex)) {
      setHexError("Enter a valid hex color, for example #6DB161.");
      return;
    }

    setHexError("");
    if (!selectedLower.has(normalizedHex.toLowerCase())) {
      onChange([...selected, normalizedHex]);
    }
  };

  return (
    <div data-testid={testId}>
      {label && <label className="text-xs text-white/50 block mb-2">{label}</label>}
      {options.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {options.map((color) => (
            <ColorDot
              key={color}
              color={color}
              selected={selectedLower.has(color.toLowerCase())}
              onClick={() => toggle(color)}
              isLogoColor={color.toLowerCase() === logoColorName.toLowerCase()}
            />
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <input
          type="color"
          value={getColorHex(customHex) || "#6DB161"}
          onChange={(event) => {
            setCustomHex(event.target.value.toUpperCase());
            setHexError("");
          }}
          aria-label="Choose a custom color"
          title="Choose a custom color"
          className="w-11 h-10 rounded-lg border border-white/15 bg-transparent p-1 cursor-pointer"
        />
        <input
          type="text"
          value={customHex}
          onChange={(event) => {
            setCustomHex(event.target.value);
            setHexError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustomColor();
            }
          }}
          placeholder="#6DB161"
          aria-label="Custom color hex code"
          aria-invalid={Boolean(hexError)}
          className="form-field flex-1 min-w-[140px] font-mono uppercase"
        />
        <button
          type="button"
          onClick={addCustomColor}
          className="h-10 rounded-lg border border-brand/40 bg-brand/15 px-4 text-sm text-white hover:bg-brand/25 transition-colors"
        >
          Add color
        </button>
      </div>
      {hexError && <p className="text-[11px] text-red-400 mt-1">{hexError}</p>}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((color) => (
            <button
              type="button"
              key={color}
              onClick={() => toggle(color)}
              title={`Remove ${color}`}
              className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand/15 border border-brand/30 text-white/80 hover:bg-red-500/15 hover:border-red-400/40"
            >
              {color} ×
            </button>
          ))}
        </div>
      )}
      {hint && <p className="text-[11px] text-white/35 mt-1.5">{hint}</p>}
    </div>
  );
}
