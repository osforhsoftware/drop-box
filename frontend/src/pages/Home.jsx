import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import {
  ArrowRight,
  Upload,
  Zap,
  Truck,
  Shield,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  ImagePlus,
  Eye,
  Printer,
} from "lucide-react";
import VideoHero from "../components/VideoHero";
import ShopByCategory from "../components/ShopByCategory";
import OfferPopup from "../components/OfferPopup";
import FeaturedTemplatesSlider from "../components/FeaturedTemplatesSlider";
import CustomerGalleryStrip from "../components/gallery/CustomerGalleryStrip";
import { BrandLogoMarquee } from "../components/BrandLogos";
import { SHIPPING_INFO } from "../constants/company";

const STEPS = [
  { n: "01", t: "Choose your phone", d: "Pick brand and exact model.", icon: Smartphone },
  { n: "02", t: "Upload your art", d: "JPG/PNG/WEBP. Drag, zoom, rotate.", icon: ImagePlus },
  { n: "03", t: "Preview & order", d: "Live 3D preview, pay via UPI.", icon: Eye },
  { n: "04", t: "We print & ship", d: "Studio-grade UV printing.", icon: Printer },
];

/** Latest process gallery assets — new uploads replace previous step screenshots. */
const PROCESS_IMAGES = [
  {
    src: "/images/process-gallery-0.png",
    alt: "CASE BOX custom designer with artwork positioned on an iPhone case",
    eyebrow: "Upload your art",
    caption: "Drag, zoom, and place your design live.",
    fit: "contain",
  },
  {
    src: "/images/process-gallery-1.jpg",
    alt: "CASE BOX unboxing with celestial Astron custom phone case",
    eyebrow: "Premium unboxing",
    caption: "Studio print, packaged to impress.",
  },
  {
    src: "/images/process-gallery-2.jpg",
    alt: "CASE BOX unboxing with wanderlust mountain landscape phone case",
    eyebrow: "Your design, delivered",
    caption: "See the finish before it ships.",
  },
  {
    src: "/images/process-gallery-3.jpg",
    alt: "CASE BOX unboxing with green and gold oni mask phone case",
    eyebrow: "Print & ship",
    caption: "UV-printed cases, ready to gift.",
  },
];

function ProcessTimeline() {
  const trackRef = useRef(null);
  const pauseUntilRef = useRef(0);
  const [activeCount, setActiveCount] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const totalImages = PROCESS_IMAGES.length;

  const goTo = (nextIndex, { userDriven = false } = {}) => {
    if (!totalImages) return;
    const normalized = ((nextIndex % totalImages) + totalImages) % totalImages;
    setImageIndex(normalized);
    if (userDriven) {
      pauseUntilRef.current = Date.now() + 8000;
    }
  };

  const goPrev = () => goTo(imageIndex - 1, { userDriven: true });
  const goNext = () => goTo(imageIndex + 1, { userDriven: true });

  useEffect(() => {
    if (totalImages <= 1) return undefined;
    const timer = window.setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      setImageIndex((current) => (current + 1) % totalImages);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [totalImages]);

  // Keep gallery in sync with scroll progress through the four steps (soft hint, not a hard lock).
  useEffect(() => {
    if (activeCount <= 0 || totalImages <= 1) return;
    if (Date.now() < pauseUntilRef.current) return;
    const mapped = Math.min(totalImages - 1, Math.max(0, activeCount - 1));
    setImageIndex((prev) => (prev === mapped ? prev : mapped));
  }, [activeCount, totalImages]);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 0.75", "end 0.45"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = Math.min(
      STEPS.length,
      Math.floor(v * STEPS.length + 0.15) + (v > 0.02 ? 1 : 0)
    );
    setActiveCount((prev) => (prev === next ? prev : next));
  });

  const activeImage = PROCESS_IMAGES[imageIndex] || PROCESS_IMAGES[0];

  return (
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center">
      <ol ref={trackRef} className="relative list-none p-0 m-0 max-w-xl lg:max-w-none">
        <div
          className="pointer-events-none absolute left-[1.375rem] sm:left-[1.625rem] top-[1.375rem] bottom-[1.375rem] sm:top-[1.625rem] sm:bottom-[1.625rem] z-0 w-px overflow-hidden bg-white/[0.08]"
          aria-hidden
        >
          <motion.div
            className="absolute inset-x-0 top-0 h-full origin-top bg-gradient-to-b from-brand via-brand-light to-brand-accent"
            style={{ scaleY: scrollYProgress }}
          />
        </div>

        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i < activeCount;

          return (
            <motion.li
              key={s.n}
              data-testid={`step-${s.n}`}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 flex gap-5 sm:gap-6 pb-8 sm:pb-9 last:pb-0"
            >
              <motion.div
                animate={{
                  scale: active ? 1 : 0.92,
                  borderColor: active ? "rgba(109,177,97,0.7)" : "rgba(109,177,97,0.25)",
                  boxShadow: active
                    ? "0 0 28px -4px rgba(109,177,97,0.55)"
                    : "0 0 0 0 rgba(109,177,97,0)",
                }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className="relative z-10 flex h-11 w-11 sm:h-[3.25rem] sm:w-[3.25rem] flex-shrink-0 items-center justify-center rounded-full border border-brand/25 bg-[#0d0d0d]"
              >
                <span className="absolute inset-0 rounded-full bg-[#0d0d0d]" aria-hidden />
                {active && (
                  <span className="absolute inset-0 rounded-full bg-brand/15" aria-hidden />
                )}
                <Icon
                  className={`relative z-10 h-4 w-4 sm:h-5 sm:w-5 transition-colors duration-300 ${
                    active ? "text-brand-light" : "text-white/35"
                  }`}
                  strokeWidth={1.75}
                />
              </motion.div>

              <div className="pt-1 min-w-0 sm:pt-2">
                <div
                  className={`font-mono text-[11px] tracking-widest mb-1.5 transition-colors duration-300 ${
                    active ? "text-brand" : "text-white/30"
                  }`}
                >
                  {s.n}
                </div>
                <h3
                  className={`font-display text-xl sm:text-2xl lg:text-3xl leading-tight transition-colors duration-300 ${
                    active ? "text-white" : "text-white/45"
                  }`}
                >
                  {s.t}
                </h3>
                <p
                  className={`mt-1.5 text-sm sm:text-base leading-relaxed max-w-md transition-colors duration-300 ${
                    active ? "text-white/60" : "text-white/30"
                  }`}
                >
                  {s.d}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ol>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="relative lg:sticky lg:top-28"
      >
        <div
          className="relative overflow-hidden rounded-2xl aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5] max-h-[560px] lg:max-h-[640px] w-full bg-[#121212] ring-1 ring-white/[0.06] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.75)]"
          data-testid="process-image-slider"
        >
          {PROCESS_IMAGES.map((image, index) => (
            <motion.img
              key={image.src}
              src={image.src}
              alt={image.alt}
              animate={{
                opacity: imageIndex === index ? 1 : 0,
                scale: imageIndex === index ? 1 : 1.04,
              }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute inset-0 h-full w-full object-center ${
                image.fit === "contain" ? "object-contain p-2 sm:p-3 bg-[#0a0a0a]" : "object-cover"
              }`}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
            />
          ))}

          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/10"
            aria-hidden
          />

          {/* Slider arrows */}
          {totalImages > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous process image"
                data-testid="process-slider-prev"
                className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-brand hover:text-black hover:border-brand"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next process image"
                data-testid="process-slider-next"
                className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-brand hover:text-black hover:border-brand"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </>
          )}

          <div className="absolute bottom-0 left-0 right-0 z-10 p-4 sm:p-5 pr-16">
            <motion.div
              key={activeImage.src}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-brand-light/90 mb-1.5">
                {activeImage.eyebrow}
              </div>
              <p className="font-display text-lg sm:text-xl text-white/95 leading-snug">
                {activeImage.caption}
              </p>
            </motion.div>
          </div>

          <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5" aria-hidden>
            {PROCESS_IMAGES.map((image, index) => (
              <button
                key={image.src}
                type="button"
                aria-label={`Show image ${index + 1}`}
                onClick={() => goTo(index, { userDriven: true })}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  imageIndex === index ? "w-6 bg-brand-light" : "w-1.5 bg-white/35 hover:bg-white/55"
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const FAQ = [
  { q: "Can I buy a pre-designed case without uploading art?", a: "Yes — browse our Shop for ready-made templates. Pick your phone model and checkout in minutes." },
  { q: "How long does shipping take?", a: `${SHIPPING_INFO.deliveryNote} ${SHIPPING_INFO.feeNote}` },
  { q: "What phones do you support?", a: "We support every brand and model listed in our live catalog. Pick your device in Shop or Custom Designer — new brands appear automatically when we add them." },
  { q: "Can I still design my own case?", a: "Absolutely. The custom designer works alongside our template shop — use whichever fits your style." },
];

const STUDIO_PROMO = {
  image: "/images/promo-custom-studio-right.png",
  alt: "Custom colorful abstract art phone case in a dark studio",
  number: "01",
  tag: "Custom studio",
  eyebrow: "Make it personal",
  title: "Designed by you.",
  copy: "Upload a memory, artwork, or idea and make it yours in minutes.",
  meta: "Upload · Preview · Order",
  label: "Start designing",
  to: "/customize",
};

const CURATED_PROMO = {
  image: "/images/promo-curated-right.png",
  alt: "Premium artist mountain landscape phone case",
  number: "02",
  tag: "Artist collection",
  eyebrow: "Ready to ship",
  title: "Curated to stand out.",
  copy: "Explore artist-made cases created for everyday protection.",
  meta: "Fresh designs · Premium finish",
  label: "Shop the collection",
  to: "/shop",
};

function HomePromoCard({ item, className = "" }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6 }}
      className={`home-promo-card group ${className}`.trim()}
    >
      <img
        src={item.image}
        alt={item.alt}
        className="home-promo-card__image"
        loading="lazy"
      />
      <div className="home-promo-card__shade" aria-hidden="true" />
      <div className="home-promo-card__topline">
        <span>{item.number}</span>
        <span className="home-promo-card__tag">{item.tag}</span>
      </div>
      <div className="home-promo-card__content">
        <div className="label-eyebrow mb-3">{item.eyebrow}</div>
        <h2 className="font-display text-3xl sm:text-4xl font-semibold">{item.title}</h2>
        <p className="mt-3 max-w-md text-sm sm:text-base text-white/65">{item.copy}</p>
        <div className="home-promo-card__footer">
          <span>{item.meta}</span>
          <Link to={item.to} className="home-promo-card__cta">
            {item.label} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export default function Home() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div data-testid="home-page">
      <OfferPopup />
      <VideoHero />

      <BrandLogoMarquee />

      <ShopByCategory />

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <HomePromoCard item={STUDIO_PROMO} />
      </section>

      <FeaturedTemplatesSlider
        afterSection={{
          customized: (
            <div className="max-w-5xl mx-auto pt-1">
              <HomePromoCard item={CURATED_PROMO} />
            </div>
          ),
        }}
      />

      {/* About */}
      <section id="about-us" className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="glass rounded-3xl p-10 lg:p-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="label-eyebrow">Custom Designer</div>
            <h3 className="font-display text-3xl lg:text-4xl mt-3">
              Or create your own masterpiece.
            </h3>
            <p className="text-white/60 mt-4 max-w-md">
              Upload your art, position it perfectly on our live canvas, and preview on your exact phone model.
            </p>
            <Link
              to="/customize"
              data-testid="compat-cta"
              className="btn-primary inline-flex items-center gap-2 mt-8"
            >
              Start designing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="w-full flex justify-center lg:justify-end">
            <img
              src="/images/phone_brands_casebox.jpg"
              alt="Supported phone brands"
              className="w-full max-w-md rounded-2xl bg-white object-contain shadow-sm border border-black/[0.06]"
              loading="lazy"
              decoding="async"
              data-testid="brand-logo-grid"
            />
          </div>
        </div>
      </section>

      {/* How it works — vertical timeline */}
      <section
        id="how-it-works"
        className="process-section max-w-7xl mx-auto px-6 lg:px-10 py-24 rounded-[2rem]"
      >
        <div className="label-eyebrow">The Process</div>
        <h2 className="font-display text-4xl lg:text-5xl mt-3 mb-14 lg:mb-16">
          Four steps. Zero compromise.
        </h2>
        <ProcessTimeline />
      </section>

      <CustomerGalleryStrip />

      {/* FAQ */}
      <section id="faq" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-20 sm:py-28 grid lg:grid-cols-[0.75fr_1.25fr] gap-10 lg:gap-20">
        <div>
          <div className="label-eyebrow">Need help?</div>
          <h2 className="font-display text-4xl lg:text-5xl mt-3">
            Frequently asked questions.
          </h2>
          <p className="mt-4 max-w-sm text-white/50 leading-relaxed">
            Everything you need to know before creating your case.
          </p>
          <Link to="/contact" className="btn-secondary inline-flex mt-7 text-sm">Contact us</Link>
        </div>
        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {FAQ.map((item, i) => (
            <div key={i} data-testid={`faq-${i}`}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between py-5 text-left hover:text-brand-light transition-colors"
              >
                <span className="font-medium pr-4">{item.q}</span>
                <ChevronDown className={`w-5 h-5 flex-shrink-0 text-white/40 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && (
                <div className="pb-5 pr-10 text-sm text-white/55 leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features strip */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid md:grid-cols-3 gap-6">
        {[
          { i: Zap, t: "Studio-grade UV print", d: "1200dpi vibrant output" },
          { i: Shield, t: "Drop-tested shell", d: "Military-grade protection" },
          { i: Truck, t: "Pan-India shipping", d: SHIPPING_INFO.bannerNote },
        ].map(({ i: Icon, t, d }, k) => (
          <div key={k} className="glass-2 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-brand/15 border border-brand/30 grid place-items-center">
              <Icon className="w-5 h-5 text-brand-light" />
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
        <Upload className="w-10 h-10 text-brand-light mx-auto" />
        <h2 className="font-display text-4xl lg:text-6xl mt-6 tracking-tighter">
          Your art. Your case.
          <br />
          Forever.
        </h2>
        <div className="flex flex-wrap justify-center gap-4 mt-10">
          <Link
            to="/shop"
            data-testid="footer-shop-cta"
            className="btn-primary inline-flex items-center gap-2"
          >
            Browse templates <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/customize"
            data-testid="footer-cta"
            className="btn-secondary inline-flex items-center gap-2"
          >
            Design your own
          </Link>
        </div>
      </section>
    </div>
  );
}
