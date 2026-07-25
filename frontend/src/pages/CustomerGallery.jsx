import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Loader2, Camera, Images, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import GalleryCard from "../components/gallery/GalleryCard";
import GalleryLightbox from "../components/gallery/GalleryLightbox";
import GalleryPagination from "../components/gallery/GalleryPagination";

const PAGE_SIZE = 20;

export default function CustomerGallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState("latest");
  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });
  const gridRef = useRef(null);

  const fetchPage = useCallback(async (pageNum, append = false) => {
    const { data } = await api.get("/gallery", {
      params: { page: pageNum, limit: PAGE_SIZE, sort },
    });
    const nextItems = data.items || [];
    setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
    setPage(data.page || pageNum);
    setTotalPages(data.total_pages || 1);
    setTotal(data.total || 0);
  }, [sort]);

  useEffect(() => {
    setLoading(true);
    fetchPage(1).finally(() => setLoading(false));
  }, [fetchPage]);

  const loadMore = () => {
    if (loadingMore || loading || page >= totalPages) return;
    setLoadingMore(true);
    fetchPage(page + 1, true).finally(() => setLoadingMore(false));
  };

  const openLightbox = async (item) => {
    try {
      const { data } = await api.get(`/gallery/entry/${item.entry_id}/images`);
      setLightbox({
        open: true,
        images: data,
        index: typeof item.image_index === "number" ? item.image_index : 0,
      });
    } catch {
      setLightbox({ open: true, images: [item], index: 0 });
    }
  };

  return (
    <div data-testid="customer-gallery-page" className="min-h-screen">
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-b from-brand/[0.07] via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-[min(100%,520px)] h-[320px] bg-[radial-gradient(ellipse_at_top_right,rgba(109,177,97,0.12),transparent_65%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-14 relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
            <div className="max-w-2xl">
              <div className="label-eyebrow flex items-center gap-2">
                <Camera className="w-4 h-4 text-brand" />
                Customer Gallery
              </div>
              <h1 className="font-display text-4xl lg:text-6xl mt-3 tracking-tight">
                Happy Customers
              </h1>
              <p className="text-white/60 mt-4 text-lg leading-relaxed">
                Real photos from customers who love their CASEBOX cases — unfiltered setups,
                desk shots, and everyday carry.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 lg:items-end">
              {!loading && total > 0 && (
                <div className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl glass border border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-brand/15 grid place-items-center">
                    <Images className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <div className="font-display text-2xl leading-none">{total}</div>
                    <div className="text-xs text-white/45 font-mono uppercase tracking-widest mt-1">
                      Community photos
                    </div>
                  </div>
                </div>
              )}
              <div>
                <Link
                  to="/gallery/upload"
                  className="btn-primary inline-flex items-center gap-2"
                  data-testid="gallery-upload-cta"
                >
                  <Upload className="w-4 h-4" />
                  Share Your Photos
                </Link>
                <p className="text-xs text-white/40 mt-3">Sign in required · Delivered orders only</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-12 pb-24">
        <div
          ref={gridRef}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Sparkles className="w-4 h-4 text-brand" />
            Tap any photo to view full size
          </div>

          <div className="flex items-center rounded-full border border-white/10 p-0.5 bg-white/[0.03] self-start sm:self-auto">
            {[
              { value: "latest", label: "Latest" },
              { value: "featured", label: "Featured" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSort(opt.value)}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
                  sort === opt.value
                    ? "bg-brand text-black font-medium shadow-sm"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <Camera className="w-12 h-12 text-white/20 mx-auto" />
            <p className="text-white/60 mt-4">No customer photos yet. Be the first to share!</p>
            <Link to="/gallery/upload" className="btn-primary inline-flex mt-6">
              Upload Your Photos
            </Link>
          </div>
        ) : (
          <>
            <div className="gallery-mosaic" data-testid="gallery-grid">
              {items.map((item, i) => (
                <GalleryCard
                  key={item.id}
                  item={item}
                  index={i}
                  onOpen={openLightbox}
                />
              ))}
            </div>

            <GalleryPagination
              page={page}
              totalPages={totalPages}
              total={total}
              shown={items.length}
              onLoadMore={loadMore}
              loading={loading}
              loadingMore={loadingMore}
            />
          </>
        )}
      </section>

      <GalleryLightbox
        open={lightbox.open}
        onClose={() => setLightbox((l) => ({ ...l, open: false }))}
        images={lightbox.images}
        startIndex={lightbox.index}
      />
    </div>
  );
}
