const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_HERO_SLIDES = [
  {
    file: "botanical.png",
    title: "Botanical studio cases",
    alt: "Three premium matte phone cases with botanical and geometric prints in a dark studio",
    fit: "cover",
  },
  {
    file: "couple.jpg",
    title: "Couple cases",
    alt: "Matching couple phone cases with illustrated characters",
    fit: "contain",
  },
  {
    file: "custom.jpg",
    title: "Custom photo cases",
    alt: "Custom photo phone cases with personal portraits",
    fit: "contain",
  },
  {
    file: "name.jpg",
    title: "Name cases",
    alt: "Personalized name phone cases with carpet and floral prints",
    fit: "contain",
  },
];

function parseFit(value) {
  return String(value || "").trim().toLowerCase() === "contain" ? "contain" : "cover";
}

function parseHeroFormFields(body) {
  const title = String(body?.title || "").trim();
  const alt = String(body?.alt || body?.title || "").trim();
  const enabled = body?.enabled === undefined || body.enabled === "true" || body.enabled === true;
  const fit = parseFit(body?.fit);
  return { title, alt: alt || title, enabled, fit };
}

function toPublicHeroSlide(item) {
  if (!item) return null;
  return {
    id: item.id,
    title: item.title,
    alt: item.alt || item.title,
    image_url: item.image_url,
    fit: parseFit(item.fit),
    order: Number(item.order) || 0,
    enabled: Boolean(item.enabled),
  };
}

function copyDefaultHeroFiles(uploadDir, frontendHeroDir) {
  const destDir = path.join(uploadDir, "hero");
  fs.mkdirSync(destDir, { recursive: true });
  return DEFAULT_HERO_SLIDES.map((slide) => {
    const destName = `default-${slide.file}`;
    const destPath = path.join(destDir, destName);
    const srcPath = path.join(frontendHeroDir, slide.file);
    if (!fs.existsSync(destPath) && fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
    return {
      ...slide,
      destName,
      exists: fs.existsSync(destPath),
    };
  });
}

async function seedDefaultHeroSlides(db, { uploadDir, frontendHeroDir, publicUrl, nowIso }) {
  const count = await db.collection("hero_slides").countDocuments({});
  if (count > 0) return 0;

  const files = copyDefaultHeroFiles(uploadDir, frontendHeroDir);
  const ts = nowIso();
  const docs = files
    .filter((slide) => slide.exists)
    .map((slide, index) => ({
      id: crypto.randomUUID(),
      title: slide.title,
      alt: slide.alt,
      image_url: publicUrl(`uploads/hero/${slide.destName}`),
      fit: slide.fit,
      enabled: true,
      order: index,
      created_at: ts,
      updated_at: ts,
    }));

  if (!docs.length) return 0;
  await db.collection("hero_slides").insertMany(docs);
  return docs.length;
}

module.exports = {
  DEFAULT_HERO_SLIDES,
  parseFit,
  parseHeroFormFields,
  toPublicHeroSlide,
  copyDefaultHeroFiles,
  seedDefaultHeroSlides,
};
