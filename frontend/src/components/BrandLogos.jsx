function BrandSvg({ viewBox, children, className = "", label, ...props }) {
  return (
    <svg
      viewBox={viewBox}
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
  color = "currentColor",
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
        fill={color}
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
  color,
  size = "md",
}) {
  const boxClass =
    size === "sm"
      ? "h-7 w-[4.75rem] sm:h-8 sm:w-[5.25rem]"
      : "h-9 w-[4.75rem] sm:h-11 sm:w-[5.5rem]";

  return (
    <div className={`group flex shrink-0 items-center justify-center ${boxClass}`} title={name}>
      <div
        className="flex h-full w-full items-center justify-center transition-transform duration-300 ease-out group-hover:scale-110"
        style={{ transform: scale !== 1 ? `scale(${scale})` : undefined }}
      >
        <Logo className="h-full w-full" color={color} />
      </div>
    </div>
  );
}

function LogoRow({ items, reverse = false, size = "sm" }) {
  const rowItems = [...items, ...items];

  return (
    <div className={`flex w-max items-center ${reverse ? "animate-marquee-reverse" : "marquee-track"}`}>
      {rowItems.map(({ id, name, Logo, color, scale }, index) => (
        <div
          key={`${id}-${reverse ? "rev" : "fwd"}-${index}`}
          className="flex shrink-0 items-center justify-center px-6 sm:px-8"
        >
          <BrandLogoMark Logo={Logo} name={name} color={color} scale={scale} size={size} />
        </div>
      ))}
    </div>
  );
}

export function AppleLogo({ color = "#111111", ...props }) {
  return (
    <BrandSvg viewBox="0 0 24 24" label="Apple" {...props}>
      <path
        fill={color}
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
      />
    </BrandSvg>
  );
}

export function SamsungLogo({ color = "#1428A0", ...props }) {
  return (
    <WordmarkLogo
      label="Samsung"
      text="Samsung"
      width={84}
      fontSize={10.5}
      letterSpacing="0.14em"
      uppercase
      color={color}
      {...props}
    />
  );
}

export function XiaomiLogo(props) {
  return (
    <BrandSvg viewBox="0 0 24 24" label="Xiaomi" {...props}>
      <rect width="24" height="24" rx="5.5" fill="#FF6900" />
      <path
        fill="#fff"
        d="M4.9 7.4h5.63c1.47 0 3.01.07 3.76.83.75.75.83 2.23.83 3.67v4.54h-2.25v-4.6c0-.81-.05-1.64-.47-2.06-.36-.36-1.02-.44-1.72-.46H7.16v6.98H4.9V7.4zm12.13 0h1.95v9.04h-1.95V7.4zM8.92 10.95h2.05v5.35H8.92v-5.35z"
      />
    </BrandSvg>
  );
}

export function VivoLogo({ color = "#415FFF", ...props }) {
  return <WordmarkLogo label="Vivo" text="vivo" width={38} fontSize={19} letterSpacing="-0.04em" color={color} {...props} />;
}

export function OppoLogo({ color = "#1A6B3C", ...props }) {
  return <WordmarkLogo label="Oppo" text="oppo" width={40} fontSize={19} letterSpacing="-0.02em" color={color} {...props} />;
}

export function OnePlusLogo({ color = "#F5010C", ...props }) {
  return (
    <BrandSvg viewBox="0 0 24 24" label="OnePlus" {...props}>
      <path
        fill={color}
        d="M0 3.74V24h20.26V12.428h-2.256v9.317H2.254V5.995h9.318V3.742zM18.004 0v3.74h-3.758v2.256h3.758v3.758h2.255V5.996H24V3.74h-3.758V0zm-6.45 18.756V8.862H9.562c0 .682-.228 1.189-.577 1.504-.367.297-.91.437-1.556.437h-.245v1.625h2.133v6.31h2.237z"
      />
    </BrandSvg>
  );
}

export function GooglePixelLogo(props) {
  return (
    <BrandSvg viewBox="0 0 24 24" label="Google Pixel" {...props}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </BrandSvg>
  );
}

export function MotorolaLogo(props) {
  return (
    <BrandSvg viewBox="0 0 24 24" label="Motorola" {...props}>
      <circle cx="12" cy="12" r="12" fill="#1C69D4" />
      <path
        fill="#fff"
        d="M6.4 16.9 9.15 7.4h1.85L12 13.7l1-6.3h1.85l2.75 9.5h-1.7l-1.55-5.7-1.35 5.7h-1.7L9.65 11.2 8.1 16.9H6.4z"
      />
    </BrandSvg>
  );
}

export function NokiaLogo({ color = "#124191", ...props }) {
  return (
    <WordmarkLogo label="Nokia" text="Nokia" width={54} fontSize={11.5} letterSpacing="0.12em" uppercase color={color} {...props} />
  );
}

export function SonyLogo({ color = "#111111", ...props }) {
  return (
    <WordmarkLogo label="Sony" text="Sony" width={48} fontSize={12} letterSpacing="0.1em" uppercase color={color} {...props} />
  );
}

export function HuaweiLogo({ color = "#CF0A2C", ...props }) {
  return (
    <BrandSvg viewBox="0 0 24 24" label="Huawei" {...props}>
      <path
        fill={color}
        d="M3.67 6.14S1.82 7.91 1.72 9.78v.35c.08 1.51 1.22 2.4 1.22 2.4 1.83 1.79 6.26 4.04 7.3 4.55 0 0 .06.03.1-.01l.02-.04v-.04C7.52 10.8 3.67 6.14 3.67 6.14zM9.65 18.6c-.02-.08-.1-.08-.1-.08l-7.38.26c.8 1.43 2.15 2.53 3.56 2.2.96-.25 3.16-1.78 3.88-2.3.06-.05.04-.09.04-.09zm.08-.78C6.49 15.63.21 12.28.21 12.28c-.15.46-.2.9-.21 1.3v.07c0 1.07.4 1.82.4 1.82.8 1.69 2.34 2.2 2.34 2.2.7.3 1.4.31 1.4.31.12.02 4.4 0 5.54 0 .05 0 .08-.05.08-.05v-.06c0-.03-.03-.05-.03-.05zM9.06 3.19a3.42 3.42 0 00-2.57 3.15v.41c.03.6.16 1.05.16 1.05.66 2.9 3.86 7.65 4.55 8.65.05.05.1.03.1.03a.1.1 0 00.06-.1c1.06-10.6-1.11-13.42-1.11-13.42-.32.02-1.19.23-1.19.23zm8.299 2.27s-.49-1.8-2.44-2.28c0 0-.57-.14-1.17-.22 0 0-2.18 2.81-1.12 13.43.01.07.06.08.06.08.07.03.1-.03.1-.03.72-1.03 3.9-5.76 4.55-8.64 0 0 .36-1.4.02-2.34zm-2.92 13.07s-.07 0-.09.05c0 0-.01.07.03.1.7.51 2.85 2 3.88 2.3 0 0 .16.05.43.06h.14c.69-.02 1.9-.37 3-2.26l-7.4-.25zm7.83-8.41c.14-2.06-1.94-3.97-1.94-3.98 0 0-3.85 4.66-6.67 10.8 0 0-.03.08.02.13l.04.01h.06c1.06-.53 5.46-2.77 7.28-4.54 0 0 1.15-.93 1.21-2.42zm1.52 2.14s-6.28 3.37-9.52 5.55c0 0-.05.04-.03.11 0 0 .03.06.07.06 1.16 0 5.56 0 5.67-.02 0 0 .57-.02 1.27-.29 0 0 1.56-.5 2.37-2.27 0 0 .73-1.45.17-3.14z"
      />
    </BrandSvg>
  );
}

export function HonorLogo({ color = "#111111", ...props }) {
  return (
    <WordmarkLogo label="Honor" text="Honor" width={56} fontSize={11} letterSpacing="0.12em" uppercase color={color} {...props} />
  );
}

export function AsusLogo({ color = "#111111", ...props }) {
  return (
    <WordmarkLogo label="ASUS" text="ASUS" width={50} fontSize={12} letterSpacing="0.08em" uppercase color={color} {...props} />
  );
}

export function LenovoLogo({ color = "#E2231A", ...props }) {
  return <WordmarkLogo label="Lenovo" text="Lenovo" width={62} fontSize={17} letterSpacing="-0.03em" color={color} {...props} />;
}

export function RealmeLogo({ color = "#FFC915", ...props }) {
  return <WordmarkLogo label="Realme" text="realme" width={54} fontSize={19} letterSpacing="-0.02em" color={color} {...props} />;
}

export function NothingLogo({ color = "#111111", ...props }) {
  return <WordmarkLogo label="Nothing" text="Nothing" width={68} fontSize={16} letterSpacing="-0.02em" color={color} {...props} />;
}

export function IqooLogo({ color = "#F5C400", ...props }) {
  return <WordmarkLogo label="iQOO" text="iQOO" width={44} fontSize={19} letterSpacing="0.02em" color={color} {...props} />;
}

export function AkkukkaaLogo({ color = "#111111", ...props }) {
  return (
    <WordmarkLogo
      label="Akkukkaa"
      text="Akkukkaa"
      width={92}
      fontSize={14}
      letterSpacing="-0.03em"
      color={color}
      {...props}
    />
  );
}

export const BRAND_LOGOS = [
  { id: "apple", name: "Apple", Logo: AppleLogo, color: "#111111", scale: 0.9 },
  { id: "akkukkaa", name: "Akkukkaa", Logo: AkkukkaaLogo, color: "#111111", scale: 0.92 },
  { id: "samsung", name: "Samsung", Logo: SamsungLogo, color: "#1428A0" },
  { id: "xiaomi", name: "Xiaomi", Logo: XiaomiLogo, scale: 0.82 },
  { id: "vivo", name: "Vivo", Logo: VivoLogo, color: "#415FFF" },
  { id: "oppo", name: "Oppo", Logo: OppoLogo, color: "#1A6B3C" },
  { id: "oneplus", name: "OnePlus", Logo: OnePlusLogo, color: "#F5010C", scale: 0.88 },
  { id: "google-pixel", name: "Google Pixel", Logo: GooglePixelLogo, scale: 0.9 },
  { id: "motorola", name: "Motorola", Logo: MotorolaLogo, scale: 0.86 },
  { id: "nokia", name: "Nokia", Logo: NokiaLogo, color: "#124191" },
  { id: "sony", name: "Sony", Logo: SonyLogo, color: "#111111" },
  { id: "huawei", name: "Huawei", Logo: HuaweiLogo, color: "#CF0A2C", scale: 0.9 },
  { id: "honor", name: "Honor", Logo: HonorLogo, color: "#111111" },
  { id: "asus", name: "ASUS", Logo: AsusLogo, color: "#111111" },
  { id: "lenovo", name: "Lenovo", Logo: LenovoLogo, color: "#E2231A" },
  { id: "realme", name: "Realme", Logo: RealmeLogo, color: "#FFC915" },
  { id: "nothing", name: "Nothing", Logo: NothingLogo, color: "#111111" },
  { id: "iqoo", name: "iQOO", Logo: IqooLogo, color: "#F5C400" },
];

export const SUPPORTED_BRAND_NAMES = BRAND_LOGOS.map((brand) => brand.name);

export default function BrandLogoGrid({ className = "" }) {
  return (
    <div
      className={`grid grid-cols-4 sm:grid-cols-5 gap-x-1 gap-y-5 sm:gap-x-2 sm:gap-y-6 items-center justify-items-center ${className}`}
      aria-label="Supported phone brands"
    >
      {BRAND_LOGOS.map(({ id, name, Logo, color, scale }) => (
        <BrandLogoMark
          key={id}
          Logo={Logo}
          name={name}
          scale={scale}
          color={color}
        />
      ))}
    </div>
  );
}

export function BrandLogoMarquee({ className = "" }) {
  return (
    <section
      className={`brand-logo-marquee border-y border-black/[0.06] py-5 sm:py-6 overflow-hidden ${className}`}
      aria-label="Supported phone brands"
    >
      <LogoRow items={BRAND_LOGOS} />
    </section>
  );
}

export function BrandLogoSlider({ className = "" }) {
  const topRow = BRAND_LOGOS;
  const bottomRow = [...BRAND_LOGOS].reverse();

  return (
    <div
      className={`brand-logo-slide relative overflow-hidden rounded-2xl bg-white py-5 sm:py-6 ${className}`}
      aria-label="Supported phone brands sliding showcase"
    >
      <div className="flex flex-col gap-5 sm:gap-6">
        <LogoRow items={topRow} size="md" />
        <LogoRow items={bottomRow} reverse size="md" />
      </div>
    </div>
  );
}
