import { resolveMediaUrl } from "../lib/api";

/**
 * Product photo with responsive WebP variants.
 * `variants` matches the API shape: { thumb, medium, large }.
 */
export default function ProductImage({
  src,
  alt = "",
  variants,
  className,
  width = 800,
  height = 640,
}) {
  const thumb = resolveMediaUrl(variants?.thumb);
  const medium = resolveMediaUrl(variants?.medium) || resolveMediaUrl(src);
  const large = resolveMediaUrl(variants?.large);
  const srcSet = [
    thumb ? `${thumb} 300w` : null,
    medium ? `${medium} 800w` : null,
    large ? `${large} 1600w` : null,
  ].filter(Boolean).join(", ");

  return (
    <img
      src={medium || undefined}
      srcSet={srcSet || undefined}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
      width={width}
      height={height}
      loading="lazy"
      alt={alt}
      className={className}
    />
  );
}
