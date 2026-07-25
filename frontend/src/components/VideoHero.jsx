import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const HERO_CONTENT = {
  videoSrc: "/videos/06254.mp4",
  posterSrc: "/images/frame-tum.jpg",
  eyebrow: "Studio · Print · India · Shipped in 72h",
  title: (
    <>
      The case that
      <br />
      <span className="text-brand-gradient">looks like you</span>.
    </>
  ),
  subtitle:
    "Upload a photo, an illustration, a memory. We turn it into a precision-printed phone case — engineered to outlast trends.",
  primaryCta: { label: "Start designing", to: "/customize" },
  secondaryCta: { label: "How it works", href: "#how-it-works" },
  tags: ["UV print 1200dpi", "Scratch resistant", "Lifetime art"],
};

export default function VideoHero({ content = HERO_CONTENT }) {
  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const showPoster = !videoReady || videoFailed;

  return (
    <section className="p-0 sm:p-[30px]" data-testid="video-hero">
      <div className="relative w-full min-h-[100svh] sm:min-h-[min(82vh,860px)] rounded-none sm:rounded-2xl overflow-hidden border-0 sm:border sm:border-white/[0.08] shadow-none sm:shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        {/* Poster / thumbnail — always rendered; visible when video hasn't loaded or failed */}
        <img
          src={content.posterSrc}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            showPoster ? "opacity-100" : "opacity-0"
          }`}
        />

        {!videoFailed && (
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              videoReady ? "opacity-100" : "opacity-0"
            }`}
            autoPlay
            muted
            loop
            playsInline
            poster={content.posterSrc}
            onCanPlay={() => setVideoReady(true)}
            onError={() => {
              setVideoFailed(true);
              setVideoReady(false);
            }}
          >
            <source src={content.videoSrc} type="video/mp4" />
          </video>
        )}

        {/* Stripe-style overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/50 to-[#0d0d0d]/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d]/80 via-transparent to-transparent" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.35] mix-blend-overlay bg-[radial-gradient(circle_at_70%_20%,rgba(109,177,97,0.22),transparent_55%)]" />

        {/* Bottom-left copy */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-10 lg:p-14">
          <div className="max-w-2xl">
            <div className="label-eyebrow mb-5 sm:mb-6">{content.eyebrow}</div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-medium tracking-tighter leading-[0.95]">
              {content.title}
            </h1>
            <p className="mt-5 sm:mt-6 text-base sm:text-lg text-white/75 max-w-xl leading-relaxed">
              {content.subtitle}
            </p>
            <div className="mt-8 sm:mt-10 flex flex-wrap gap-3 sm:gap-4">
              <Link
                to={content.primaryCta.to}
                data-testid="hero-start-btn"
                className="btn-primary flex items-center gap-2"
              >
                {content.primaryCta.label}{" "}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href={content.secondaryCta.href} className="btn-secondary">
                {content.secondaryCta.label}
              </a>
            </div>
            <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-4 sm:gap-6 text-[10px] sm:text-xs text-white/40 font-mono uppercase tracking-widest">
              {content.tags.map((tag, i) => (
                <span key={tag} className="flex items-center gap-4 sm:gap-6">
                  {i > 0 && <span className="hidden sm:inline">·</span>}
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Subtle frame highlight */}
        <div className="absolute inset-0 rounded-none sm:rounded-2xl ring-1 ring-inset ring-white/[0.06] pointer-events-none" />
      </div>
    </section>
  );
}
