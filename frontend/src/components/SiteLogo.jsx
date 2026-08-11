const LOGO_SRC = "/images/casebox_logo_col.webp";

export default function SiteLogo({ className = "h-8", alt = "CASEBOX" }) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={`w-auto object-contain ${className}`}
    />
  );
}
