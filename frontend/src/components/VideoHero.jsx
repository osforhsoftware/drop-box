import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { api, resolveMediaUrl } from "../lib/api";

export const DEFAULT_HERO_SLIDES = [
  {
    src: "/images/hero/botanical.png",
    alt: "Three premium matte phone cases with botanical and geometric prints in a dark studio",
    fit: "cover",
  },
  {
    src: "/images/hero/couple.jpg",
    alt: "Matching couple phone cases with illustrated characters",
    fit: "contain",
  },
  {
    src: "/images/hero/custom.jpg",
    alt: "Custom photo phone cases with personal portraits",
    fit: "contain",
  },
  {
    src: "/images/hero/name.jpg",
    alt: "Personalized name phone cases with carpet and floral prints",
    fit: "contain",
  },
];

export const HERO_SLIDES = DEFAULT_HERO_SLIDES;

export const HERO_CONTENT = {
  posterSrc: HERO_SLIDES[0].src,
  eyebrow: "Shop premium phone cases",
  title: (
    <>
      Protection that fits.
      <br />
      <span className="text-brand-gradient">Style that stands out.</span>
    </>
  ),
  mobileTitle: (
    <>
      Find your
      <br />
      <span className="text-brand-gradient">perfect case.</span>
    </>
  ),
  subtitle:
    "Discover artist-designed phone cases in botanical, minimal, abstract, and statement styles. Choose your exact model and find your perfect match.",
  mobileSubtitle: "Shop premium designs made for your exact phone model.",
  primaryCta: { label: "Shop all cases", mobileLabel: "Shop cases", to: "/shop" },
  secondaryCta: { label: "Explore new arrivals", mobileLabel: "New arrivals", to: "/shop?sort=newest" },
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function HeroMediaSlider({ slides, interval = 4200 }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [enableTransition, setEnableTransition] = useState(true);
  const indexRef = useRef(0);
  const touchStartX = useRef(0);
  const looping = slides.length > 1;
  const trackSlides = looping ? [...slides, slides[0]] : slides;

  indexRef.current = index;

  useEffect(() => {
    if (paused || !looping || prefersReducedMotion()) return undefined;
    const timer = window.setInterval(() => {
      setEnableTransition(true);
      setIndex((current) => current + 1);
    }, interval);
    return () => window.clearInterval(timer);
  }, [paused, looping, interval]);

  const goTo = (next) => {
    if (!looping) return;
    setEnableTransition(true);
    setIndex(next);
  };

  const onTransitionEnd = (event) => {
    if (event.target !== event.currentTarget) return;
    if (!looping || index < slides.length) return;
    setEnableTransition(false);
    setIndex(0);
  };

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    touchStartX.current = event.clientX;
    setPaused(true);
  };

  const onPointerUp = (event) => {
    setPaused(false);
    const delta = event.clientX - touchStartX.current;
    if (Math.abs(delta) < 36) return;
    const current = indexRef.current;
    if (delta < 0) {
      goTo(current + 1);
      return;
    }
    if (current === 0) {
      setEnableTransition(false);
      setIndex(slides.length);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => goTo(slides.length - 1));
      });
      return;
    }
    goTo(current - 1);
  };

  return (
    <div
      className="hero-banner__slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      aria-roledescription="carousel"
      aria-label="Featured phone case photography"
    >
      <div
        className={`hero-banner__track${enableTransition ? "" : " is-instant"}`}
        style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        onTransitionEnd={onTransitionEnd}
      >
        {trackSlides.map((slide, slideIndex) => (
          <div className="hero-banner__slide" key={`${slide.src}-${slideIndex}`} aria-hidden={slideIndex !== index}>
            <img
              src={slide.src}
              alt={slideIndex === index ? slide.alt : ""}
              className={`hero-banner__slide-image${slide.fit === "contain" ? " is-contain" : ""}`}
              draggable="false"
              {...(slideIndex === 0 ? { fetchPriority: "high" } : { loading: "lazy" })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VideoHero({ content = HERO_CONTENT, slides: slidesProp }) {
  const [slides, setSlides] = useState(slidesProp || DEFAULT_HERO_SLIDES);

  useEffect(() => {
    if (slidesProp) {
      setSlides(slidesProp);
      return undefined;
    }
    let cancelled = false;
    api.get("/hero-slides")
      .then((response) => {
        const items = Array.isArray(response.data?.slides) ? response.data.slides : [];
        const next = items
          .map((item) => ({
            src: resolveMediaUrl(item.image_url),
            alt: item.alt || item.title || "Featured phone case",
            fit: item.fit === "contain" ? "contain" : "cover",
          }))
          .filter((item) => item.src);
        if (!cancelled && next.length) setSlides(next);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slidesProp]);

  const sliderKey = slides.map((slide) => slide.src).join("|");
  return (
    <section className="hero-shell" data-testid="video-hero">
      <div className="hero-banner">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="hero-banner__content"
        >
          <div className="max-w-[38rem]">
            <div className="hero-offer-pill">
              <span>New</span>
              <span className="hero-offer-pill__desktop">Fresh designs for 15+ phone brands</span>
              <span className="hero-offer-pill__mobile">15+ phone brands</span>
            </div>
            <div className="label-eyebrow mb-4 sm:mb-5 hidden sm:block">{content.eyebrow}</div>
            <h1 className="hidden sm:block text-[2.65rem] sm:text-6xl lg:text-[4.5rem] font-display font-semibold tracking-[-0.055em] leading-[0.94]">
              {content.title}
            </h1>
            <h1 className="sm:hidden font-display font-semibold tracking-[-0.055em] leading-[0.94]">
              {content.mobileTitle}
            </h1>
            <p className="hidden sm:block mt-5 sm:mt-6 text-sm sm:text-lg text-white/70 max-w-lg leading-relaxed">
              {content.subtitle}
            </p>
            <p className="sm:hidden mt-4 text-sm text-white/70 max-w-[17rem] leading-relaxed">
              {content.mobileSubtitle}
            </p>
            <div className="mt-7 sm:mt-9 flex flex-wrap gap-3">
              <Link
                to={content.primaryCta.to}
                data-testid="hero-start-btn"
                className="btn-primary inline-flex items-center gap-2"
              >
                <span className="hidden sm:inline">{content.primaryCta.label}</span>
                <span className="sm:hidden">{content.primaryCta.mobileLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to={content.secondaryCta.to} className="hero-secondary-cta btn-secondary">
                <span className="hidden sm:inline">{content.secondaryCta.label}</span>
                <span className="sm:hidden">{content.secondaryCta.mobileLabel}</span>
              </Link>
            </div>
            <div className="hero-trust-line" aria-label="Store benefits">
              {["Precision fit", "Secure checkout", "Made in India"].map((item) => (
                <span key={item}><Check aria-hidden="true" />{item}</span>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="hero-banner__media">
          <HeroMediaSlider key={sliderKey} slides={slides} />
        </div>
      </div>

      <div className="hero-benefits" aria-label="Shopping benefits">
        {[
          { icon: Sparkles, title: "Premium print", copy: "Vibrant 1200dpi UV finish" },
          { icon: ShieldCheck, title: "Everyday protection", copy: "Durable, scratch-resistant shell" },
          { icon: Truck, title: "Pan-India delivery", copy: "Tracked shipping in 3–5 days" },
        ].map(({ icon: Icon, title, copy }) => (
          <div key={title} className="hero-benefit">
            <span className="hero-benefit__icon"><Icon aria-hidden="true" /></span>
            <span>
              <strong>{title}</strong>
              <small>{copy}</small>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
