function BrandSvg({ viewBox, children, className = "", label, ...props }) {
  return (
    <svg
      viewBox={viewBox}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label={label}
      {...props}
    >
      {children}
    </svg>
  );
}

function WordmarkLogo({
  label,
  text,
  width,
  fontSize = 18,
  letterSpacing = "-0.02em",
  uppercase = false,
  ...props
}) {
  const height = 24;
  const displayText = uppercase ? text.toUpperCase() : text;

  return (
    <BrandSvg viewBox={`0 0 ${width} ${height}`} label={label} {...props}>
      <text
        x={width / 2}
        y="17"
        textAnchor="middle"
        fontFamily="'DM Sans', system-ui, sans-serif"
        fontSize={fontSize}
        fontWeight="700"
        letterSpacing={letterSpacing}
        fill="currentColor"
      >
        {displayText}
      </text>
    </BrandSvg>
  );
}

function BrandLogoMark({
  Logo,
  name,
  scale = 1,
  hoverColor,
  size = "md",
  interactive = false,
}) {
  const boxClass =
    size === "sm"
      ? "h-6 w-[4.5rem] sm:h-7 sm:w-[5rem]"
      : "h-9 w-[4.5rem] sm:h-10 sm:w-[5rem]";
  const colorClass = interactive ? "text-white/65" : "text-white/30";

  return (
    <div className={`group flex shrink-0 items-center justify-center ${boxClass}`} title={name}>
      <div
        className={`flex h-full w-full items-center justify-center ${
          interactive ? "transition-transform duration-300 ease-out group-hover:scale-110" : ""
        }`}
        style={{ transform: scale !== 1 ? `scale(${scale})` : undefined }}
      >
        <Logo
          className={`h-full w-full ${colorClass} ${
            interactive ? "transition-colors duration-300 ease-out group-hover:text-[var(--brand-hover)]" : ""
          }`}
          style={interactive ? { "--brand-hover": hoverColor } : undefined}
        />
      </div>
    </div>
  );
}

export function AppleLogo(props) {
  return (
    <BrandSvg viewBox="0 0 24 24" label="Apple" {...props}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </BrandSvg>
  );
}

export function SamsungLogo(props) {
  return (
    <WordmarkLogo
      label="Samsung"
      text="Samsung"
      width={84}
      fontSize={10.5}
      letterSpacing="0.14em"
      uppercase
      {...props}
    />
  );
}

export function XiaomiLogo(props) {
  return (
    <BrandSvg viewBox="0 0 24 24" label="Xiaomi" {...props}>
      <path d="M12 0C8.016 0 4.756.255 2.493 2.516.23 4.776 0 8.033 0 12.012c0 3.98.23 7.235 2.494 9.497C4.757 23.77 8.017 24 12 24c3.983 0 7.243-.23 9.506-2.491C23.77 19.247 24 15.99 24 12.012c0-3.984-.233-7.243-2.502-9.504C19.234.252 15.978 0 12 0zM4.906 7.405h5.624c1.47 0 3.007.068 3.764.827.746.746.827 2.233.83 3.676v4.54a.15.15 0 0 1-.152.147h-1.947a.15.15 0 0 1-.152-.148V11.83c-.002-.806-.048-1.634-.464-2.051-.358-.36-1.026-.441-1.72-.458H7.158a.15.15 0 0 0-.151.147v6.98a.15.15 0 0 1-.152.148H4.906a.15.15 0 0 1-.15-.148V7.554a.15.15 0 0 1 .15-.149zm12.131 0h1.949a.15.15 0 0 1 .15.15v8.892a.15.15 0 0 1-.15.148h-1.949a.15.15 0 0 1-.151-.148V7.554a.15.15 0 0 1 .151-.149zM8.92 10.948h2.046c.083 0 .15.066.15.147v5.352a.15.15 0 0 1-.15.148H8.92a.15.15 0 0 1-.152-.148v-5.352a.15.15 0 0 1 .152-.147Z" />
    </BrandSvg>
  );
}

export function VivoLogo(props) {
  return <WordmarkLogo label="Vivo" text="vivo" width={38} fontSize={19} letterSpacing="-0.04em" {...props} />;
}

export function OppoLogo(props) {
  return <WordmarkLogo label="Oppo" text="oppo" width={40} fontSize={19} letterSpacing="-0.02em" {...props} />;
}

export function OnePlusLogo(props) {
  return (
    <BrandSvg viewBox="0 0 24 24" label="OnePlus" {...props}>
      <path d="M0 3.74V24h20.26V12.428h-2.256v9.317H2.254V5.995h9.318V3.742zM18.004 0v3.74h-3.758v2.256h3.758v3.758h2.255V5.996H24V3.74h-3.758V0zm-6.45 18.756V8.862H9.562c0 .682-.228 1.189-.577 1.504-.367.297-.91.437-1.556.437h-.245v1.625h2.133v6.31h2.237z" />
    </BrandSvg>
  );
}

export function GooglePixelLogo(props) {
  return (
    <BrandSvg viewBox="0 0 24 24" label="Google Pixel" {...props}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </BrandSvg>
  );
}

export function MotorolaLogo(props) {
  return (
    <BrandSvg viewBox="0 0 24 24" label="Motorola" {...props}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12C24.002 5.375 18.632.002 12.007 0H12zm7.327 18.065s-.581-2.627-1.528-4.197c-.514-.857-1.308-1.553-2.368-1.532-.745 0-1.399.423-2.2 1.553-.469.77-.882 1.573-1.235 2.403 0 0-.29-.675-.63-1.343a8.038 8.038 0 0 0-.605-1.049c-.804-1.13-1.455-1.539-2.2-1.553-1.049-.021-1.854.675-2.364 1.528-.948 1.574-1.528 4.197-1.528 4.197h-.864l4.606-15.12 3.56 11.804.024.021.024-.021 3.56-11.804 4.61 15.113h-.862z" />
    </BrandSvg>
  );
}

export function NokiaLogo(props) {
  return (
    <WordmarkLogo label="Nokia" text="Nokia" width={54} fontSize={11.5} letterSpacing="0.12em" uppercase {...props} />
  );
}

export function SonyLogo(props) {
  return (
    <WordmarkLogo label="Sony" text="Sony" width={48} fontSize={12} letterSpacing="0.1em" uppercase {...props} />
  );
}

export function HuaweiLogo(props) {
  return (
    <BrandSvg viewBox="0 0 24 24" label="Huawei" {...props}>
      <path d="M3.67 6.14S1.82 7.91 1.72 9.78v.35c.08 1.51 1.22 2.4 1.22 2.4 1.83 1.79 6.26 4.04 7.3 4.55 0 0 .06.03.1-.01l.02-.04v-.04C7.52 10.8 3.67 6.14 3.67 6.14zM9.65 18.6c-.02-.08-.1-.08-.1-.08l-7.38.26c.8 1.43 2.15 2.53 3.56 2.2.96-.25 3.16-1.78 3.88-2.3.06-.05.04-.09.04-.09zm.08-.78C6.49 15.63.21 12.28.21 12.28c-.15.46-.2.9-.21 1.3v.07c0 1.07.4 1.82.4 1.82.8 1.69 2.34 2.2 2.34 2.2.7.3 1.4.31 1.4.31.12.02 4.4 0 5.54 0 .05 0 .08-.05.08-.05v-.06c0-.03-.03-.05-.03-.05zM9.06 3.19a3.42 3.42 0 00-2.57 3.15v.41c.03.6.16 1.05.16 1.05.66 2.9 3.86 7.65 4.55 8.65.05.05.1.03.1.03a.1.1 0 00.06-.1c1.06-10.6-1.11-13.42-1.11-13.42-.32.02-1.19.23-1.19.23zm8.299 2.27s-.49-1.8-2.44-2.28c0 0-.57-.14-1.17-.22 0 0-2.18 2.81-1.12 13.43.01.07.06.08.06.08.07.03.1-.03.1-.03.72-1.03 3.9-5.76 4.55-8.64 0 0 .36-1.4.02-2.34zm-2.92 13.07s-.07 0-.09.05c0 0-.01.07.03.1.7.51 2.85 2 3.88 2.3 0 0 .16.05.43.06h.14c.69-.02 1.9-.37 3-2.26l-7.4-.25zm7.83-8.41c.14-2.06-1.94-3.97-1.94-3.98 0 0-3.85 4.66-6.67 10.8 0 0-.03.08.02.13l.04.01h.06c1.06-.53 5.46-2.77 7.28-4.54 0 0 1.15-.93 1.21-2.42zm1.52 2.14s-6.28 3.37-9.52 5.55c0 0-.05.04-.03.11 0 0 .03.06.07.06 1.16 0 5.56 0 5.67-.02 0 0 .57-.02 1.27-.29 0 0 1.56-.5 2.37-2.27 0 0 .73-1.45.17-3.14z" />
    </BrandSvg>
  );
}

export function HonorLogo(props) {
  return (
    <WordmarkLogo label="Honor" text="Honor" width={56} fontSize={11} letterSpacing="0.12em" uppercase {...props} />
  );
}

export function AsusLogo(props) {
  return (
    <WordmarkLogo label="ASUS" text="ASUS" width={50} fontSize={12} letterSpacing="0.08em" uppercase {...props} />
  );
}

export function LenovoLogo(props) {
  return <WordmarkLogo label="Lenovo" text="Lenovo" width={62} fontSize={17} letterSpacing="-0.03em" {...props} />;
}

export function RealmeLogo(props) {
  return <WordmarkLogo label="Realme" text="realme" width={54} fontSize={19} letterSpacing="-0.02em" {...props} />;
}

export function NothingLogo(props) {
  return <WordmarkLogo label="Nothing" text="Nothing" width={68} fontSize={16} letterSpacing="-0.02em" {...props} />;
}

export function IqooLogo(props) {
  return <WordmarkLogo label="iQOO" text="iQOO" width={44} fontSize={19} letterSpacing="0.02em" {...props} />;
}

export const BRAND_LOGOS = [
  { id: "apple", name: "Apple", Logo: AppleLogo, hoverColor: "#ffffff", scale: 0.9 },
  { id: "samsung", name: "Samsung", Logo: SamsungLogo, hoverColor: "#1428a0" },
  { id: "xiaomi", name: "Xiaomi", Logo: XiaomiLogo, hoverColor: "#ff6900", scale: 0.88 },
  { id: "vivo", name: "Vivo", Logo: VivoLogo, hoverColor: "#415fff" },
  { id: "oppo", name: "Oppo", Logo: OppoLogo, hoverColor: "#1a6b3c" },
  { id: "oneplus", name: "OnePlus", Logo: OnePlusLogo, hoverColor: "#f5010c", scale: 0.92 },
  { id: "google-pixel", name: "Google Pixel", Logo: GooglePixelLogo, hoverColor: "#4285f4", scale: 0.9 },
  { id: "motorola", name: "Motorola", Logo: MotorolaLogo, hoverColor: "#e1140a", scale: 0.92 },
  { id: "nokia", name: "Nokia", Logo: NokiaLogo, hoverColor: "#124191" },
  { id: "sony", name: "Sony", Logo: SonyLogo, hoverColor: "#ffffff" },
  { id: "huawei", name: "Huawei", Logo: HuaweiLogo, hoverColor: "#cf0a2c", scale: 0.92 },
  { id: "honor", name: "Honor", Logo: HonorLogo, hoverColor: "#00a0e9" },
  { id: "asus", name: "ASUS", Logo: AsusLogo, hoverColor: "#00d1b2" },
  { id: "lenovo", name: "Lenovo", Logo: LenovoLogo, hoverColor: "#e2231a" },
  { id: "realme", name: "Realme", Logo: RealmeLogo, hoverColor: "#ffc915" },
  { id: "nothing", name: "Nothing", Logo: NothingLogo, hoverColor: "#ffffff" },
  { id: "iqoo", name: "iQOO", Logo: IqooLogo, hoverColor: "#ff5500" },
];

export const SUPPORTED_BRAND_NAMES = BRAND_LOGOS.map((brand) => brand.name);

export default function BrandLogoGrid({ className = "" }) {
  return (
    <div
      className={`grid grid-cols-4 sm:grid-cols-5 gap-x-1 gap-y-5 sm:gap-x-2 sm:gap-y-6 items-center justify-items-center ${className}`}
      aria-label="Supported phone brands"
    >
      {BRAND_LOGOS.map(({ id, name, Logo, hoverColor, scale }) => (
        <BrandLogoMark
          key={id}
          Logo={Logo}
          name={name}
          scale={scale}
          hoverColor={hoverColor}
          interactive
        />
      ))}
    </div>
  );
}

export function BrandLogoMarquee({ className = "" }) {
  const marqueeItems = [...BRAND_LOGOS, ...BRAND_LOGOS];

  return (
    <section
      className={`border-y border-white/[0.06] py-5 sm:py-6 overflow-hidden ${className}`}
      aria-label="Supported phone brands"
    >
      <div className="flex w-max items-center marquee-track">
        {marqueeItems.map(({ id, name, Logo, scale }, index) => (
          <div
            key={`${id}-${index}`}
            className="flex shrink-0 items-center justify-center px-7 sm:px-10"
          >
            <BrandLogoMark Logo={Logo} name={name} scale={scale} size="sm" />
          </div>
        ))}
      </div>
    </section>
  );
}
