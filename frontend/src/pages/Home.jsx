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
import CollectionCard from "../components/CollectionCard";
import { TEMPLATE_COLLECTIONS } from "../constants/templateProducts";
import { BrandLogoMarquee } from "../components/BrandLogos";

const STEPS = [
  { n: "01", t: "Choose your phone", d: "Pick brand and exact model.", icon: Smartphone },
  { n: "02", t: "Upload your art", d: "JPG/PNG/WEBP. Drag, zoom, rotate.", icon: ImagePlus },
  { n: "03", t: "Preview & order", d: "Live 3D preview, pay via UPI.", icon: Eye },
  { n: "04", t: "We print & ship", d: "Studio-grade UV printing.", icon: Printer },
];

const PROCESS_IMAGES = [
  {
    src: "/images/process-step-choose.jpg",
    alt: "Choosing a phone model from the selection screen",
    eyebrow: "Choose your phone",
    caption: "Pick brand and exact model.",
  },
  {
    src: "/images/process-step-upload.jpg",
    alt: "Uploading and positioning custom artwork on a phone case",
    eyebrow: "Upload your art",
    caption: "Turn any idea into a case.",
  },
  {
    src: "/images/process-step-preview.jpg",
    alt: "3D preview of a custom printed phone case",
    eyebrow: "Preview & order",
    caption: "See the finish before ordering.",
  },
  {
    src: "/images/process-step-ship.jpg",
    alt: "Premium phone case unboxing experience",
    eyebrow: "We print & ship",
    caption: "Studio-grade UV printing, delivered.",
  },
];

function ProcessTimeline() {
  const trackRef = useRef(null);
  const [activeCount, setActiveCount] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    if (activeCount > 0) {
      setImageIndex(Math.min(activeCount - 1, PROCESS_IMAGES.length - 1));
      return;
    }
    const timer = window.setInterval(() => {
      setImageIndex((current) => (current + 1) % PROCESS_IMAGES.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [activeCount]);

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
        <div className="relative overflow-hidden rounded-2xl aspect-[1/1] sm:aspect-[10/11] lg:aspect-[1/1] bg-[#121212] ring-1 ring-white/[0.06]">
          {PROCESS_IMAGES.map((image, index) => (
            <motion.img
              key={image.src}
              src={image.src}
              alt={image.alt}
              animate={{
                opacity: imageIndex === index ? 1 : 0,
                scale: imageIndex === index ? 1 : 1.04,
              }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ))}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d0d0d]/70 via-transparent to-[#0d0d0d]/20"
            aria-hidden
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <motion.div
              key={imageIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-brand-light/90 mb-1.5">
                {PROCESS_IMAGES[imageIndex].eyebrow}
              </div>
              <p className="font-display text-lg sm:text-xl text-white/90 leading-snug">
                {PROCESS_IMAGES[imageIndex].caption}
              </p>
            </motion.div>
          </div>
          <div className="absolute top-5 right-5 flex gap-1.5" aria-hidden>
            {PROCESS_IMAGES.map((image, index) => (
              <span
                key={image.src}
                className={`h-1 rounded-full transition-all duration-500 ${
                  imageIndex === index ? "w-6 bg-brand-light" : "w-1.5 bg-white/35"
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
  { q: "How long does shipping take?", a: "Most orders ship within 24–48 hours and arrive in 3–5 business days across India. Flat ₹80 shipping on all orders." },
  { q: "What phones do you support?", a: "Apple, Samsung, Xiaomi, OnePlus, Vivo, Oppo, Google Pixel, Motorola, Nokia, Sony, Huawei, Honor, ASUS, Lenovo, Realme, Nothing, iQOO, and more flagship models." },
  { q: "Can I still design my own case?", a: "Absolutely. The custom designer works alongside our template shop — use whichever fits your style." },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div data-testid="home-page">
      <OfferPopup />
      <VideoHero />

      <ShopByCategory />

      <BrandLogoMarquee />

      <FeaturedTemplatesSlider />

      {/* Collections */}
      <section id="collections" className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TEMPLATE_COLLECTIONS.map((col) => (
            <CollectionCard key={col} collection={col} />
          ))}
        </div>
      </section>

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
              src="/images/phone_brands_casebox.webp"
              alt="Supported phone brands including Apple, Samsung, Xiaomi, and more"
              className="w-full max-w-sm sm:max-w-md lg:max-w-full h-auto object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      {/* How it works — vertical timeline */}
      <section
        id="how-it-works"
        className="max-w-7xl mx-auto px-6 lg:px-10 py-24"
      >
        <div className="label-eyebrow">The Process</div>
        <h2 className="font-display text-4xl lg:text-5xl mt-3 mb-14 lg:mb-16">
          Four steps. Zero compromise.
        </h2>
        <ProcessTimeline />
      </section>

      <CustomerGalleryStrip />

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 lg:px-10 py-24">
        <div className="label-eyebrow text-center">FAQ</div>
        <h2 className="font-display text-4xl lg:text-5xl mt-3 mb-12 text-center">
          Questions? Answered.
        </h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div key={i} className="glass rounded-xl overflow-hidden" data-testid={`faq-${i}`}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-medium pr-4">{item.q}</span>
                <ChevronDown className={`w-5 h-5 flex-shrink-0 text-white/40 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-sm text-white/60 leading-relaxed border-t border-white/[0.06] pt-4">
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
          { i: Truck, t: "Pan-India shipping", d: "Flat ₹80 · delivered in 3–5 days" },
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
