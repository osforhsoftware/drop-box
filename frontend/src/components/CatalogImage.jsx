import { useEffect, useState } from "react";
import { resolveMediaUrl } from "../lib/api";
import { DEMO_PHONE_CASE_OVERLAY } from "../lib/caseTemplate/demoTemplate";

/** Default phone mockup shown when a model has no uploaded image. */
export const DEFAULT_MODEL_MOCKUP = "/images/default-phone-mockup.svg";

export { DEMO_PHONE_CASE_OVERLAY };

const CASE_TINTS = {
  silicone: "from-brand/20 to-zinc-900",
  transparent: "from-brand/10 to-zinc-900",
  matte: "from-brand/15 to-zinc-950",
  glass: "from-brand-light/20 to-zinc-950",
};

function BrandFallback({ name, className = "" }) {
  const letter = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={`overflow-hidden shrink-0 grid place-items-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 ${className}`}
      aria-hidden
    >
      <span className="font-display text-[clamp(0.65rem,50%,1.25rem)] text-white/90 leading-none">{letter}</span>
    </div>
  );
}

function ModelFallback({ className = "" }) {
  return (
    <div
      className={`overflow-hidden shrink-0 grid place-items-center rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 border border-zinc-300/40 ${className}`}
      aria-hidden
    >
      <img
        src={DEFAULT_MODEL_MOCKUP}
        alt=""
        className="h-[72%] w-auto max-w-[58%] object-contain"
        draggable={false}
      />
    </div>
  );
}

function ProductFallback({ name, slug, className = "" }) {
  const tint = CASE_TINTS[slug] || "from-zinc-800 to-zinc-950";
  return (
    <div
      className={`overflow-hidden shrink-0 grid place-items-center rounded-md bg-gradient-to-br ${tint} border border-white/10 ${className}`}
      aria-hidden
      title={name || "Case type"}
    >
      <img
        src={DEMO_PHONE_CASE_OVERLAY}
        alt=""
        className="h-[88%] w-auto max-w-[70%] object-contain drop-shadow-md"
        draggable={false}
      />
    </div>
  );
}

/**
 * Renders a brand logo, model, or product image with automatic fallbacks.
 * @param {"brand"|"model"|"product"} type
 * @param {string|null} url - logo_url or image_url from API
 * @param {string} name - used for alt text and brand letter fallback
 * @param {string} [slug] - product slug for case-type tint fallback
 * @param {string} className - wrapper sizing classes
 * @param {string} imgClassName - extra classes on the img element
 */
export default function CatalogImage({ type, url, name, slug, className = "", imgClassName = "" }) {
  const src = resolveMediaUrl(url);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [url]);

  if (src && !imgError) {
    return (
      <div className={`overflow-hidden shrink-0 ${className}`}>
        <img
          src={src}
          alt={name || ""}
          onError={() => setImgError(true)}
          className={`w-full h-full object-contain ${imgClassName}`}
          loading="lazy"
        />
      </div>
    );
  }

  if (type === "brand") {
    return <BrandFallback name={name} className={className} />;
  }

  if (type === "product") {
    return <ProductFallback name={name} slug={slug} className={className} />;
  }

  return <ModelFallback className={className} />;
}
