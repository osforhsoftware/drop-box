import { Link, useLocation } from "react-router-dom";
import { Instagram, Mail } from "lucide-react";
import SiteLogo from "./SiteLogo";
import { COMPANY_NAME, CONTACT, FOOTER_BG_IMAGE, SHIPPING_INFO } from "../constants/company";

export default function Footer() {
  const location = useLocation();
  if (location.pathname.startsWith("/admin")) return null;

  return (
    <footer data-testid="site-footer" className="site-footer mt-32 border-t border-brand/15">
      <div
        className="site-footer__bg"
        style={{ backgroundImage: `url(${FOOTER_BG_IMAGE})` }}
        aria-hidden="true"
      />
      <div className="site-footer__overlay" aria-hidden="true" />

      <div className="relative z-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid md:grid-cols-2 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-1">
          <SiteLogo className="h-8" />
          <p className="text-sm text-white/50 mt-4 max-w-xs">
            Premium custom phone cases. Sleek, minimalist designs — printed in India, shipped{" "}
            {SHIPPING_INFO.coverage.toLowerCase()}.
          </p>
        </div>

        <div>
          <div className="label-eyebrow mb-4">Shop</div>
          <ul className="space-y-2 text-sm text-white">
            <li>
              <Link to="/shop">Shop Templates</Link>
            </li>
            <li>
              <Link to="/customize">Customize</Link>
            </li>
            <li>
              <Link to="/track">Track Order</Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="label-eyebrow mb-4">Company</div>
          <ul className="space-y-2 text-sm text-white">
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/faq">FAQ</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
            <li>
              <a href="/#how-it-works">How it works</a>
            </li>
            <li>
              <a href="/#testimonials">Reviews</a>
            </li>
          </ul>
        </div>

        <div>
          <div className="label-eyebrow mb-4">Legal</div>
          <ul className="space-y-2 text-sm text-white">
            <li>
              <Link to="/privacy">Privacy Policy</Link>
            </li>
            <li>
              <Link to="/terms">Terms &amp; Conditions</Link>
            </li>
            <li>
              <Link to="/returns">Refund &amp; Replacement Policy</Link>
            </li>
            <li>
              <Link to="/shipping">Shipping Policy</Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="label-eyebrow mb-4">Get in touch</div>
          <ul className="space-y-2 text-sm text-white">
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-white shrink-0" />
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </li>
            <li className="flex items-center gap-2 pt-1">
              <Instagram className="w-4 h-4 text-white shrink-0" />
              <a href={CONTACT.instagram.url} target="_blank" rel="noreferrer">
                {CONTACT.instagram.handle}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/[0.05] py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} {COMPANY_NAME} — Crafted in India
      </div>
      </div>
    </footer>
  );
}
