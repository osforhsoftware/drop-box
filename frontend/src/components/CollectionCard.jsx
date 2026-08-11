import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Layers } from "lucide-react";
import { api, resolveMediaUrl } from "../lib/api";

const COLLECTION_ACCENTS = {
  Essentials: "from-zinc-500/40 via-zinc-700/40 to-zinc-900",
  "Limited Edition": "from-brand/40 via-brand-dark/30 to-zinc-900",
  "Artist Series": "from-brand-light/35 via-brand/25 to-zinc-900",
  Seasonal: "from-brand-accent/30 via-brand-light/20 to-zinc-900",
  Collab: "from-brand/35 via-brand-accent/25 to-zinc-900",
};

export default function CollectionCard({ collection }) {
  const [preview, setPreview] = useState(null);
  const [count, setCount] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/shop/templates", { params: { collection, limit: 1, page: 1, sort: "popular" } })
      .then(({ data }) => {
        if (cancelled) return;
        const item = data?.items?.[0];
        setPreview(item?.thumbnail || item?.images?.[0] || null);
        setCount(typeof data?.total === "number" ? data.total : null);
        setImgError(false);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [collection]);

  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [preview]);

  const accent = COLLECTION_ACCENTS[collection] || "from-zinc-600/40 via-zinc-800/40 to-zinc-900";
  const slug = collection.toLowerCase().replace(/\s+/g, "-");
  const imageSrc = preview && !imgError ? resolveMediaUrl(preview) : null;

  const markLoaded = (node) => {
    if (node?.complete && node.naturalWidth > 0) {
      setImgLoaded(true);
    }
  };

  return (
    <Link
      to={`/shop?collection=${encodeURIComponent(collection)}`}
      className="rounded-2xl overflow-hidden group relative h-[240px] flex flex-col justify-end border border-white/10 hover:border-brand/50 transition-colors"
      data-testid={`collection-${slug}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} aria-hidden />

      {imageSrc && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            ref={markLoaded}
            src={imageSrc}
            alt={`${collection} collection`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            } group-hover:scale-105 transition-transform duration-500`}
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/5 pointer-events-none" />

      <div className="relative p-6">
        <span className="font-mono text-[11px] text-brand uppercase tracking-widest">{collection}</span>
        <h3 className="font-display text-2xl mt-2 group-hover:text-brand transition-colors">
          Explore {collection}
        </h3>
        <div className="flex items-center justify-between mt-4">
          <span className="flex items-center gap-1.5 text-sm text-white/70">
            <Layers className="w-3.5 h-3.5" />
            {count === null ? "Loading…" : count === 0 ? "Coming soon" : `${count} design${count !== 1 ? "s" : ""}`}
          </span>
          <ArrowRight className="w-5 h-5 text-white/60 group-hover:text-brand group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
}
