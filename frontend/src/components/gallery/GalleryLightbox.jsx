import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { resolveMediaUrl } from "../../lib/api";

export default function GalleryLightbox({
  open,
  onClose,
  images = [],
  startIndex = 0,
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (open) {
      setIndex(startIndex);
      setZoomed(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, startIndex]);

  const prev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : images.length - 1));
    setZoomed(false);
  }, [images.length]);

  const next = useCallback(() => {
    setIndex((i) => (i < images.length - 1 ? i + 1 : 0));
    setZoomed(false);
  }, [images.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, prev, next]);

  if (!open || !images.length) return null;

  const current = images[index];
  const src = resolveMediaUrl(current?.thumbnail_url || current?.url || current);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          data-testid="gallery-lightbox"
        >
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            onClick={onClose}
          />

          <div className="relative z-10 w-full h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <div className="text-sm text-white/60 font-mono">
                {images.length > 1 && `${index + 1} / ${images.length}`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomed((z) => !z)}
                  className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
                  aria-label={zoomed ? "Zoom out" : "Zoom in"}
                >
                  {zoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center px-4 sm:px-16 relative min-h-0 pb-8">
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-2 sm:left-4 z-20 p-3 rounded-full glass hover:bg-brand/20 transition-colors"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              <motion.img
                key={src}
                src={src}
                alt="Customer photo"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: zoomed ? 1.5 : 1 }}
                transition={{ duration: 0.3 }}
                className={`max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
                onClick={() => setZoomed((z) => !z)}
                draggable={false}
              />

              {images.length > 1 && (
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-2 sm:right-4 z-20 p-3 rounded-full glass hover:bg-brand/20 transition-colors"
                  aria-label="Next"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
