import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Expand } from "lucide-react";
import { resolveMediaUrl } from "../../lib/api";

const MOSAIC_CLASSES = [
  "gallery-tile--hero",
  "",
  "",
  "gallery-tile--wide",
  "",
  "",
  "",
  "gallery-tile--tall",
  "",
  "",
];

export function getGalleryTileClass(index = 0) {
  return MOSAIC_CLASSES[index % MOSAIC_CLASSES.length] || "";
}

export default function GalleryCard({
  item,
  index = 0,
  onOpen,
  variant = "grid",
  className = "",
  to,
}) {
  if (!item?.url && !item?.thumbnail_url) return null;

  const isGrid = variant === "grid";
  const tileClass = isGrid ? getGalleryTileClass(index) : "";
  const isLink = Boolean(to);

  const cardClassName = [
    "gallery-card group relative overflow-hidden text-left block",
    isGrid && !isLink ? `gallery-tile ${tileClass} h-full` : "",
    !isGrid ? "gallery-tile--strip w-44 sm:w-52 lg:w-60 flex-shrink-0" : "",
    isGrid && isLink ? "h-full min-h-full" : "",
    "rounded-2xl border border-white/[0.08] bg-[#141414]",
    "hover:border-brand/35 hover:shadow-[0_20px_50px_-20px_rgba(109,177,97,0.35)]",
    "transition-[border-color,box-shadow,transform] duration-300",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/80 via-[#121212] to-black" />

      <img
        src={resolveMediaUrl(item.thumbnail_url || item.url)}
        alt="Customer case photo"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-brand/[0.08]" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 flex items-end justify-between gap-2 translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/70">
          Customer photo
        </span>
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white group-hover:bg-brand group-hover:text-black group-hover:border-brand transition-colors duration-300">
          <Expand className="w-3.5 h-3.5" />
        </span>
      </div>
    </>
  );

  if (isLink) {
    const link = (
      <Link
        to={to}
        className={cardClassName}
        data-testid={`gallery-image-${item.id}`}
      >
        {inner}
      </Link>
    );

    if (!isGrid) return link;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: (index % 20) * 0.03, duration: 0.35, ease: "easeOut" }}
        className={`gallery-tile ${tileClass}`}
      >
        {link}
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      layout={isGrid}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index % 20) * 0.03, duration: 0.35, ease: "easeOut" }}
      onClick={() => onOpen?.(item)}
      className={cardClassName}
      data-testid={`gallery-image-${item.id}`}
    >
      {inner}
    </motion.button>
  );
}
