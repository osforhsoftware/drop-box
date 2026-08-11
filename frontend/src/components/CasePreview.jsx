// Realistic phone case preview component — pure CSS+SVG (no fabric.js needed for preview chip)
export default function CasePreview({ imageUrl, model, productSlug = "silicone" }) {
  const tint =
    productSlug === "transparent"
      ? "rgba(255,255,255,0.04)"
      : productSlug === "glass"
        ? "rgba(20,20,22,0.85)"
        : productSlug === "matte"
          ? "#1a1a1c"
          : "#0c0c0e";
  return (
    <div
      data-testid="case-preview-mini"
      className="relative w-[180px] h-[360px] rounded-[44px] overflow-hidden border border-white/10"
      style={{ background: tint }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="design"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-xs text-white/40">
          Your design here
        </div>
      )}
      {/* glare */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/0 via-white/[0.06] to-white/0" />
      {model && (
        <div className="absolute bottom-3 left-0 right-0 text-center text-[10px] uppercase tracking-widest text-white/60">
          {model}
        </div>
      )}
    </div>
  );
}
