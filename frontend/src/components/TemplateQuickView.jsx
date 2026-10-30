import { Link } from "react-router-dom";
import { X, ShoppingBag, ArrowRight, Star } from "lucide-react";
import { resolveMediaUrl } from "../lib/api";
import {
  formatPrice,
  caseTypeLabel,
  displayTemplateTitle,
  productHasAvailableStock,
  listingPrice,
  listingPriceIsFrom,
} from "../constants/templateProducts";
import { partitionTags } from "../constants/colorSwatch";
import { ColorSwatchGroup } from "./ColorSwatch";

export default function TemplateQuickView({ item, onClose, onBuyNow, adminPreview = false }) {
  if (!item) return null;

  const price = listingPrice(item);
  const priceFrom = listingPriceIsFrom(item);
  const { colors: colorTags } = partitionTags(item.tags);
  const previewImage = resolveMediaUrl(item.thumbnail || item.images?.[0]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      data-testid="template-quick-view"
    >
      <div
        className="glass rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto grid md:grid-cols-2 gap-6 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative min-h-[280px] md:min-h-[420px] rounded-xl overflow-hidden bg-neutral-100">
          {previewImage ? (
            <img
              src={previewImage}
              alt={displayTemplateTitle(item.title)}
              className="absolute inset-0 w-full h-full object-contain p-3"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-sm text-white/40">
              No image
            </div>
          )}
        </div>
        <div>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand">
                {item.collection}
              </span>
              <h2 className="font-display text-2xl mt-1 break-words line-clamp-3">
                {displayTemplateTitle(item.title)}
              </h2>
            </div>
            <button type="button" onClick={onClose} className="text-white/50 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3 text-sm text-white/60">
            <Star className="w-4 h-4 fill-brand text-brand" />
            {item.rating?.toFixed(1)} · {item.review_count} reviews
          </div>
          <p className="text-sm text-white/60 mt-4 line-clamp-4">
            {item.short_description || item.description}
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">Brand</span>
              <span>
                {Array.isArray(item.compatibility) && item.compatibility.length > 1
                  ? item.compatibility.map((c) => c.brand).join(", ")
                  : item.phone_brand}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Case type</span>
              <span>
                {priceFrom
                  ? (item.material_labels || []).join(", ") || `${item.material_count} materials`
                  : caseTypeLabel(item.case_type)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Material</span>
              <span>{item.material || "—"}</span>
            </div>
            {colorTags.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-white/50">Color</span>
                <ColorSwatchGroup colors={colorTags} size="sm" showLabels />
              </div>
            )}
          </div>
          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-display text-3xl">
              {priceFrom ? <span className="text-base font-medium text-white/55 mr-1">Starting from</span> : null}
              {formatPrice(price)}
            </span>
            {!priceFrom && item.discount_percent > 0 && (
              <span className="text-white/40 line-through">{formatPrice(item.price)}</span>
            )}
          </div>
          <div className="mt-6 btn-row">
            {!adminPreview && onBuyNow && (
              <button
                type="button"
                onClick={() => onBuyNow?.(item)}
                className="btn-primary disabled:opacity-50"
                disabled={!productHasAvailableStock(item)}
              >
                <ShoppingBag aria-hidden /> {productHasAvailableStock(item) ? "Buy Now" : "Out of stock"}
              </button>
            )}
            {item.status === "published" && (
              <Link
                to={`/template/${item.slug}`}
                target={adminPreview ? "_blank" : undefined}
                rel={adminPreview ? "noopener noreferrer" : undefined}
                className="btn-secondary"
              >
                {adminPreview ? "View on shop" : "Details"} <ArrowRight aria-hidden />
              </Link>
            )}
            {adminPreview && item.status !== "published" && (
              <p className="text-sm text-white/50 flex items-center">Draft — publish to preview on shop.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
