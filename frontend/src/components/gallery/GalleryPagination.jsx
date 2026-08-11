import { Loader2 } from "lucide-react";

export default function GalleryPagination({
  page,
  totalPages,
  total,
  shown,
  onLoadMore,
  loading,
  loadingMore,
}) {
  const hasMore = page < totalPages;
  if (!hasMore && total <= 0) return null;

  return (
    <div className="flex flex-col items-center gap-4 pt-10" data-testid="gallery-pagination">
      {total > 0 && (
        <p className="text-xs text-white/40 font-mono">
          Showing {shown} of {total} photos
        </p>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading || loadingMore}
          className="btn-secondary inline-flex items-center gap-2 min-w-[10rem] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="gallery-load-more"
        >
          {loadingMore ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </>
          ) : (
            "Load More"
          )}
        </button>
      )}
    </div>
  );
}
