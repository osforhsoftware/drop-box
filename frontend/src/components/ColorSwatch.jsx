import { getColorHex } from "../constants/colorSwatch";

export default function ColorSwatch({ color, size = "md", showLabel = false, className = "" }) {
  const hex = getColorHex(color);
  if (!hex) return null;

  const sizeClass =
    size === "sm" ? "w-5 h-5" : size === "lg" ? "w-8 h-8" : "w-6 h-6";
  const isLight = ["#f5f5f5", "#fffdd0", "#d4c4a8", "#c0c0c0", "transparent"].includes(hex);

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={String(color)}
    >
      <span
        className={`${sizeClass} rounded-full border shrink-0 ${
          isLight ? "border-white/25" : "border-white/10"
        }`}
        style={{
          background: hex === "transparent"
            ? "linear-gradient(135deg, #fff 45%, transparent 45%, transparent 55%, #fff 55%)"
            : hex,
          backgroundColor: hex !== "transparent" ? hex : undefined,
        }}
        aria-hidden
      />
      {showLabel && (
        <span className="text-xs text-white/60 capitalize">{color}</span>
      )}
    </span>
  );
}

export function ColorSwatchGroup({ colors, size = "md", showLabels = false, className = "" }) {
  if (!colors?.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {colors.map((color) => (
        <ColorSwatch
          key={color}
          color={color}
          size={size}
          showLabel={showLabels}
        />
      ))}
    </div>
  );
}
