import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  Shield,
  Palette,
  Camera,
  Truck,
  Package,
  Instagram,
} from "lucide-react";
import {
  COMPANY_NAME,
  TAGLINES,
  COMPANY_INTRO,
  VALUE_PROPOSITIONS,
  CASE_TYPES,
  ACCESSORIES,
  SHIPPING_INFO,
  BRAND_AESTHETIC,
  CONTACT,
} from "../constants/company";

const VALUE_ICONS = [Palette, Shield, Camera];

export default function About() {
  return (
    <div data-testid="about-page" className="pb-16">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-12 lg:pt-20 pb-16">
        <div className="label-eyebrow">About {COMPANY_NAME}</div>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl mt-3 max-w-3xl tracking-tight">
          {TAGLINES[0]}
        </h1>
        <p className="mt-4 text-lg text-brand-light font-medium">{TAGLINES[1]}</p>
        <p className="mt-6 text-white/60 max-w-2xl leading-relaxed">{COMPANY_INTRO}</p>
        <div className="flex flex-wrap gap-3 mt-10">
          <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
            Shop templates <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/customize" className="btn-secondary inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Start designing
          </Link>
        </div>
      </section>

      {/* Value propositions */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="label-eyebrow">Why {COMPANY_NAME}</div>
        <h2 className="font-display text-3xl lg:text-4xl mt-3 mb-10">Built around you.</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {VALUE_PROPOSITIONS.map((text, i) => {
            const Icon = VALUE_ICONS[i] || Sparkles;
            return (
              <div key={text} className="glass rounded-2xl p-6">
                <div className="w-10 h-10 rounded-lg bg-brand/15 border border-brand/30 grid place-items-center mb-4">
                  <Icon className="w-5 h-5 text-brand-light" />
                </div>
                <p className="text-white/80 leading-relaxed">{text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Services & products */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="glass rounded-3xl p-8 lg:p-12">
          <div className="label-eyebrow">Services &amp; Products</div>
          <h2 className="font-display text-3xl lg:text-4xl mt-3 mb-4">
            Custom cases for every phone.
          </h2>
          <p className="text-white/60 max-w-2xl mb-10">
            {COMPANY_NAME} provides custom-made phone cases for iOS (iPhone) and Android — including
            Samsung S Series and other major brands.
          </p>

          <h3 className="font-display text-xl mb-6">Case types &amp; materials</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            {CASE_TYPES.map((item) => (
              <div key={item.name} className="glass-2 rounded-xl p-5">
                <div className="font-medium text-white">{item.name}</div>
                <p className="text-sm text-white/55 mt-2 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          <h3 className="font-display text-xl mb-6">Additional accessories</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {ACCESSORIES.map((item) => (
              <div key={item.name} className="glass-2 rounded-xl p-5">
                <div className="font-medium text-white">{item.name}</div>
                <p className="text-sm text-white/55 mt-2 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shipping */}
      <section id="shipping" className="max-w-7xl mx-auto px-6 lg:px-10 py-16 scroll-mt-24">
        <div className="label-eyebrow">E-Commerce &amp; Shipping</div>
        <h2 className="font-display text-3xl lg:text-4xl mt-3 mb-10">Shipping policy</h2>
        <p className="text-white/55 mb-8 text-sm">
          <Link to="/shipping" className="text-brand-light hover:text-brand-accent transition-colors">
            View full shipping policy →
          </Link>
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass rounded-2xl p-6">
            <Truck className="w-6 h-6 text-brand-light mb-4" />
            <div className="font-medium">Coverage</div>
            <p className="text-sm text-white/60 mt-2">{SHIPPING_INFO.coverage}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <Package className="w-6 h-6 text-brand-light mb-4" />
            <div className="font-medium">Order fulfillment</div>
            <p className="text-sm text-white/60 mt-2">{SHIPPING_INFO.fulfillment}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <Truck className="w-6 h-6 text-brand-light mb-4" />
            <div className="font-medium">Delivery</div>
            <p className="text-sm text-white/60 mt-2">
              {SHIPPING_INFO.feeNote} {SHIPPING_INFO.deliveryNote}
            </p>
          </div>
        </div>
      </section>

      {/* Brand aesthetic */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="label-eyebrow">Visual Identity</div>
        <h2 className="font-display text-3xl lg:text-4xl mt-3 mb-10">Design language</h2>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="glass rounded-2xl p-6">
            <div className="label-eyebrow mb-2">Logo</div>
            <p className="text-sm text-white/65 leading-relaxed">{BRAND_AESTHETIC.logo}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="label-eyebrow mb-2">Color palette</div>
            <p className="text-sm text-white/65 leading-relaxed">{BRAND_AESTHETIC.palette}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="label-eyebrow mb-2">Aesthetic tone</div>
            <p className="text-sm text-white/65 leading-relaxed">{BRAND_AESTHETIC.tone}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 lg:px-10 py-16 text-center">
        <h2 className="font-display text-3xl lg:text-4xl">Ready to create yours?</h2>
        <p className="text-white/60 mt-4">{CONTACT.primaryChannel}</p>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <a
            href={CONTACT.instagram.url}
            target="_blank"
            rel="noreferrer"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Instagram className="w-4 h-4" />
            {CONTACT.instagram.handle}
          </a>
          <Link to="/contact" className="btn-secondary inline-flex items-center gap-2">
            Contact us <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
