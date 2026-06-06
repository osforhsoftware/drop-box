import { Link } from "react-router-dom";
import { ArrowRight, Upload, Zap, Truck, Shield, Star } from "lucide-react";
import CasePreview from "../components/CasePreview";

const BRANDS_DISPLAY = [
  "Apple",
  "Samsung",
  "Xiaomi",
  "Vivo",
  "Oppo",
  "OnePlus",
  "Google Pixel",
];

const STEPS = [
  { n: "01", t: "Choose your phone", d: "Pick brand and exact model." },
  { n: "02", t: "Upload your art", d: "JPG/PNG/WEBP. Drag, zoom, rotate." },
  { n: "03", t: "Preview & order", d: "Live 3D preview, pay via UPI." },
  { n: "04", t: "We print & ship", d: "Studio-grade UV printing." },
];

const TESTIMONIALS = [
  {
    n: "Aanya R.",
    h: "Made my late grandfather's painting into a case. Got teary-eyed.",
    r: 5,
  },
  { n: "Karan M.", h: "Print quality is genuinely insane. Sharp, vivid.", r: 5 },
  { n: "Ishita J.", h: "Ordered 6 for the squad. Everyone obsessed.", r: 5 },
];

export default function Home() {
  return (
    <div data-testid="home-page">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src="https://images.pexels.com/photos/9807251/pexels-photo-9807251.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1600"
            className="w-full h-full object-cover opacity-40"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/60 via-[#09090b]/80 to-[#09090b]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-20 pb-28 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="label-eyebrow mb-6">
              Studio · Print · India · Shipped in 72h
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-medium tracking-tighter leading-[0.95]">
              The case that
              <br />
              <span className="text-[#ff4f00]">looks like you</span>.
            </h1>
            <p className="mt-6 text-lg text-white/70 max-w-xl">
              Upload a photo, an illustration, a memory. We turn it into a
              precision-printed phone case — engineered to outlast trends.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/customize"
                data-testid="hero-start-btn"
                className="btn-primary flex items-center gap-2"
              >
                Start designing <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#how-it-works" className="btn-secondary">
                How it works
              </a>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-white/40 font-mono uppercase tracking-widest">
              <span>UV print 1200dpi</span>
              <span>·</span>
              <span>Scratch resistant</span>
              <span>·</span>
              <span>Lifetime art</span>
            </div>
          </div>
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute -inset-10 bg-[#ff4f00]/20 blur-3xl rounded-full" />
              <div className="relative rotate-[8deg]">
                <CasePreview
                  imageUrl="https://images.unsplash.com/photo-1502764613149-7f1d229e230f?auto=format&fit=crop&w=600&q=80"
                  model="iPhone 15 Pro"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brands marquee */}
      <section className="border-y border-white/[0.06] py-6 overflow-hidden">
        <div className="flex gap-16 whitespace-nowrap marquee-track">
          {[...BRANDS_DISPLAY, ...BRANDS_DISPLAY, ...BRANDS_DISPLAY].map(
            (b, i) => (
              <span
                key={i}
                className="font-mono text-sm uppercase tracking-[0.3em] text-white/30"
              >
                {b}
              </span>
            ),
          )}
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="label-eyebrow">Featured · Custom builds</div>
            <h2 className="font-display text-4xl lg:text-5xl mt-3">
              Built for the bold.
            </h2>
          </div>
          <Link
            to="/customize"
            className="hidden sm:flex items-center gap-2 text-sm text-white/60 hover:text-white"
          >
            Design yours <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            "https://images.unsplash.com/photo-1517022812141-23620dba5c23?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1500964757637-c85e8a162699?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1502209524164-acea936639a2?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=80",
          ].map((src, i) => (
            <div
              key={i}
              className="glass glass-hover rounded-2xl p-4 group"
              data-testid={`featured-case-${i}`}
            >
              <div className="flex justify-center">
                <div className="scale-[0.55] origin-center">
                  <CasePreview imageUrl={src} model="" />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-xs text-white/50">
                  FORM-0{i + 1}
                </span>
                <span className="text-sm font-medium">₹399</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="max-w-7xl mx-auto px-6 lg:px-10 py-24"
      >
        <div className="label-eyebrow">The Process</div>
        <h2 className="font-display text-4xl lg:text-5xl mt-3 mb-12">
          Four steps. Zero compromise.
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div
              key={s.n}
              data-testid={`step-${s.n}`}
              className="glass glass-hover rounded-2xl p-6"
            >
              <div className="font-mono text-xs text-[#ff4f00]">{s.n}</div>
              <div className="mt-6 font-display text-2xl">{s.t}</div>
              <p className="mt-2 text-sm text-white/60">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Brand grid CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="glass rounded-3xl p-10 lg:p-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="label-eyebrow">Compatibility</div>
            <h3 className="font-display text-3xl lg:text-4xl mt-3">
              Works with every flagship.
            </h3>
            <p className="text-white/60 mt-4 max-w-md">
              From iPhone 13 to Galaxy S24 Ultra — and every Pixel, Vivo, and
              OnePlus in between.
            </p>
            <Link
              to="/customize"
              data-testid="compat-cta"
              className="btn-primary inline-flex items-center gap-2 mt-8"
            >
              Find your phone <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {BRANDS_DISPLAY.map((b) => (
              <div
                key={b}
                className="glass-2 rounded-xl px-3 py-4 text-center text-sm text-white/80"
              >
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="max-w-7xl mx-auto px-6 lg:px-10 py-24"
      >
        <div className="label-eyebrow">Customer Stories</div>
        <h2 className="font-display text-4xl lg:text-5xl mt-3 mb-12">
          Loved by 12,000+ creators.
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-8"
              data-testid={`testimonial-${i}`}
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.r }).map((_, k) => (
                  <Star
                    key={k}
                    className="w-4 h-4 fill-[#ff4f00] text-[#ff4f00]"
                  />
                ))}
              </div>
              <p className="text-white/80 leading-relaxed">"{t.h}"</p>
              <div className="mt-6 font-mono text-xs uppercase tracking-widest text-white/40">
                {t.n}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features strip */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid md:grid-cols-3 gap-6">
        {[
          { i: Zap, t: "Studio-grade UV print", d: "1200dpi vibrant output" },
          { i: Shield, t: "Drop-tested shell", d: "Military-grade protection" },
          { i: Truck, t: "Free India shipping", d: "Delivered in 3–5 days" },
        ].map(({ i: Icon, t, d }, k) => (
          <div key={k} className="glass-2 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#ff4f00]/15 border border-[#ff4f00]/30 grid place-items-center">
              <Icon className="w-5 h-5 text-[#ff4f00]" />
            </div>
            <div>
              <div className="font-medium">{t}</div>
              <div className="text-sm text-white/50">{d}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-6 lg:px-10 py-24 text-center">
        <Upload className="w-10 h-10 text-[#ff4f00] mx-auto" />
        <h2 className="font-display text-4xl lg:text-6xl mt-6 tracking-tighter">
          Your art. Your case.
          <br />
          Forever.
        </h2>
        <Link
          to="/customize"
          data-testid="footer-cta"
          className="btn-primary inline-flex items-center gap-2 mt-10"
        >
          Begin your case <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
