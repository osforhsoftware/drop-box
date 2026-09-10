import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
      className="offer-popup-image"
    />
  );

  return createPortal(
    <div
      data-testid="offer-popup"
      className="offer-popup fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label={offer.title || "Promotional offer"}
    >
      <div
        className="offer-popup-panel relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          data-testid="offer-popup-close"
          className="offer-popup-close"
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
    </div>,
    document.body,
  );
}
