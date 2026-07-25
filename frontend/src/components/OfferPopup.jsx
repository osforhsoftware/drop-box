import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { api, resolveMediaUrl } from "../lib/api";

const DISMISS_PREFIX = "form_popup_dismissed_";

export default function OfferPopup() {
  const [offer, setOffer] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    api.get("/popup-offers/active")
      .then((r) => {
        const active = r.data?.offer;
        if (!active) return;
        if (sessionStorage.getItem(`${DISMISS_PREFIX}${active.id}`)) return;
        setOffer(active);
        setVisible(true);
      })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    if (offer) sessionStorage.setItem(`${DISMISS_PREFIX}${offer.id}`, "1");
    setVisible(false);
  };

  if (!visible || !offer) return null;

  const imgSrc = resolveMediaUrl(offer.image_url);
  const linkUrl = offer.link_url?.trim() || null;
  const isExternal = linkUrl && /^https?:\/\//i.test(linkUrl);

  const image = (
    <img
      src={imgSrc}
      alt={offer.title || "Special offer"}
      className="w-full h-auto max-h-[75vh] object-contain rounded-xl"
    />
  );

  return (
    <div
      data-testid="offer-popup"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label={offer.title || "Promotional offer"}
    >
      <div
        className="relative w-full max-w-[min(92vw,480px)] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          data-testid="offer-popup-close"
          className="absolute -top-1 -right-1 sm:top-2 sm:right-2 z-10 min-w-[44px] min-h-[44px] grid place-items-center rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/80 transition-colors"
          aria-label="Close popup"
        >
          <X className="w-5 h-5" />
        </button>

        {linkUrl ? (
          isExternal ? (
            <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="block">
              {image}
            </a>
          ) : (
            <Link to={linkUrl} onClick={dismiss} className="block">
              {image}
            </Link>
          )
        ) : (
          image
        )}
      </div>
    </div>
  );
}
