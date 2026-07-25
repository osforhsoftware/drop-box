import { Link } from "react-router-dom";
import { ArrowRight, Home, Smartphone } from "lucide-react";

export default function NotFound() {
  return (
    <div
      data-testid="not-found-page"
      className="relative min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-6 py-12 lg:py-16 overflow-hidden"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(900px,120vw)] h-[min(600px,80vh)] bg-[radial-gradient(ellipse_at_center,rgba(109,177,97,0.12)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[min(700px,100vw)] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(132,204,71,0.06)_0%,transparent_70%)]" />
      </div>

      {/* Hero illustration */}
      <div className="relative w-full max-w-[520px] sm:max-w-[580px] lg:max-w-[640px] mb-8 sm:mb-10">
        <img
          src="/images/404-hero.png"
          alt="A sad phone case character shrugging — page not found"
          className="w-full h-auto drop-shadow-[0_20px_60px_rgba(109,177,97,0.15)]"
          width={640}
          height={480}
          loading="eager"
        />
      </div>

      {/* Copy */}
      <div className="text-center max-w-lg mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight leading-[1.1]">
          Looks like this case
          <br />
          <span className="text-brand">fell off the shelf.</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-white/60 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have been
          moved.
        </p>
      </div>

      {/* CTAs */}
      <div className="mt-8 sm:mt-10 w-full max-w-sm flex flex-col gap-3 sm:gap-4">
        <Link
          to="/customize"
          data-testid="not-found-design-btn"
          className="btn-primary flex items-center justify-center gap-3 w-full py-3.5 sm:py-4 rounded-full text-sm sm:text-base font-medium"
        >
          <Smartphone className="w-5 h-5 shrink-0" />
          <span>Design Your Own Case</span>
          <ArrowRight className="w-5 h-5 shrink-0" />
        </Link>
        <Link
          to="/"
          data-testid="not-found-home-btn"
          className="btn-secondary flex items-center justify-center gap-3 w-full py-3.5 sm:py-4 rounded-full text-sm sm:text-base font-medium"
        >
          <Home className="w-5 h-5 shrink-0" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
