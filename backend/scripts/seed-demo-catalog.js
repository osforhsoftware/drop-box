#!/usr/bin/env node
/**
 * Idempotent demo catalog seeder.
 * - Inserts Shop Phone Cases from demo-catalog.json + demo-images/
 * - Clones missing Phone Case Templates for priority models
 *
 * Usage: npm run seed:demo
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const { MongoClient } = require("mongodb");
const { normalizeMaskZones } = require("../lib/cameraZone");

const ROOT_DIR = path.join(__dirname, "..");
const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");
const DEMO_IMAGES_DIR = path.join(__dirname, "demo-images");
const CATALOG_PATH = path.join(__dirname, "demo-catalog.json");

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;

const THUMB_WIDTH = 800;
const THUMB_HEIGHT = 640;

const LEGACY_CASE_TYPE_SLUGS = {
  "silicone-case": "silicone",
  "transparent-case": "transparent",
  "matte-case": "matte",
};

function caseTypeSlugVariants(slug) {
  const variants = new Set([slug]);
  const legacy = LEGACY_CASE_TYPE_SLUGS[slug];
  if (legacy) variants.add(legacy);
  for (const [modern, old] of Object.entries(LEGACY_CASE_TYPE_SLUGS)) {
    if (old === slug) variants.add(modern);
  }
  return [...variants];
}

function defaultCameraZone(width, height) {
  const w = Math.round(width * 0.23);
  const h = Math.round(height * 0.15);
  const x = Math.round((width - w) / 2);
  const y = Math.round(height * 0.12);
  const rx = Math.max(4, Math.round(Math.min(w, h) * 0.22));
  return {
    id: "zone-demo-camera",
    kind: "camera",
    label: "Camera",
    type: "rect",
    x,
    y,
    width: w,
    height: h,
    rx,
    ry: rx,
  };
}

async function imageDimensions(filePath) {
  const meta = await sharp(filePath).metadata();
  return { width: meta.width || 1024, height: meta.height || 1536 };
}

function nowIso() {
  return new Date().toISOString();
}

function publicUrl(filePath) {
  const base = process.env.PUBLIC_BASE_URL || "";
  if (base) return `${base}/api/${filePath}`;
  return `/api/${filePath}`;
}

function loadCatalog() {
  const raw = fs.readFileSync(CATALOG_PATH, "utf8");
  return JSON.parse(raw);
}

async function normalizeDemoImage(srcPath, destPath) {
  await sharp(srcPath)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, {
      fit: "cover",
      position: "centre",
      background: { r: 17, g: 17, b: 17 },
    })
    .jpeg({ quality: 88 })
    .toFile(destPath);
}

async function seedProducts(db, catalog) {
  const col = db.collection("template_products");
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of catalog.products) {
    const slug = product.slug;
    if (!slug || !slug.startsWith("demo-")) {
      console.warn(`  skip invalid slug: ${slug}`);
      errors += 1;
      continue;
    }

    const existing = await col.findOne({ slug });
    if (existing) {
      console.log(`  skip product (exists): ${slug}`);
      skipped += 1;
      continue;
    }

    const imageTypes = ["featured", "gallery1", "gallery2", "gallery3"];
    const imageUrls = [];
    let missingImage = false;

    for (const imgType of imageTypes) {
      const imagePath = path.join(DEMO_IMAGES_DIR, `${slug}-${imgType}.jpg`);
      if (!fs.existsSync(imagePath)) {
        console.error(`  missing image: ${imagePath}`);
        missingImage = true;
        break;
      }

      const filename = `${crypto.randomUUID().replace(/-/g, "")}.jpg`;
      const destPath = path.join(UPLOAD_DIR, "template-products", filename);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      await normalizeDemoImage(imagePath, destPath);

      imageUrls.push(publicUrl(`uploads/template-products/${filename}`));
    }

    if (missingImage) {
      errors += 1;
      continue;
    }

    const ts = nowIso();

    const doc = {
      id: crypto.randomUUID(),
      title: product.title,
      slug: product.slug,
      product_type: product.product_type || "customized",
      description: product.description || "",
      short_description: product.short_description || "",
      phone_brand: product.phone_brand || "",
      phone_models: Array.isArray(product.phone_models) ? product.phone_models : [],
      category: product.category || "Minimal",
      collection: product.collection || "Essentials",
      case_type: product.case_type || "silicone",
      material: product.material || "",
      price: Number(product.price) || 299,
      sale_price: product.sale_price != null ? Number(product.sale_price) : null,
      stock: Math.max(0, Math.floor(Number(product.stock) || 10)),
      sku: product.sku || null,
      tags: Array.isArray(product.tags) ? product.tags : [],
      featured: Boolean(product.featured),
      best_seller: Boolean(product.best_seller),
      new_arrival: product.new_arrival !== false,
      status: product.status === "draft" ? "draft" : "published",
      rating: Math.min(5, Math.max(0, Number(product.rating) || 4.5)),
      review_count: Math.max(0, Math.floor(Number(product.review_count) || 0)),
      seo: {
        meta_title: product.meta_title || null,
        meta_description: product.meta_description || null,
        keywords: product.keywords || null,
        og_image: null,
        canonical_url: null,
      },
      thumbnail: imageUrls[0],
      images: imageUrls,
      order_count: 0,
      created_at: ts,
      updated_at: ts,
    };

    await col.insertOne(doc);
    console.log(`  created product: ${product.title} (${slug})`);
    created += 1;
  }

  return { created, skipped, errors };
}

function resolveSourceFile(source) {
  const rel = source.file_path || "";
  const candidates = [
    path.join(ROOT_DIR, rel),
    path.join(ROOT_DIR, rel.replace(/^uploads\//, "")),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function pickSourceTemplate(templates, caseTypeSlug, brandId) {
  const variants = caseTypeSlugVariants(caseTypeSlug);
  for (const slug of variants) {
    const sameBrand = templates.filter(
      (t) => t.case_type_slug === slug && t.brand_id === brandId && t.enabled !== false
    );
    if (sameBrand.length) return sameBrand[0];
  }
  for (const slug of variants) {
    const any = templates.filter(
      (t) => t.case_type_slug === slug && t.enabled !== false
    );
    if (any.length) return any[0];
  }
  return null;
}

async function bootstrapMissingCaseTypes(db, templates, caseTypes, priorityModels, models) {
  const modelByName = new Map(models.map((m) => [m.name, m]));
  const usedFiles = new Set(
    templates.map((t) => path.basename(t.file_path || "")).filter(Boolean)
  );
  const templatesDir = path.join(UPLOAD_DIR, "templates");
  const orphanPngs = fs.existsSync(templatesDir)
    ? fs.readdirSync(templatesDir).filter((f) => f.endsWith(".png") && !usedFiles.has(f))
    : [];

  const firstModel = priorityModels.map((n) => modelByName.get(n)).find(Boolean);
  if (!firstModel || !orphanPngs.length) return { created: 0 };

  let created = 0;
  let pngIdx = 0;

  for (const caseType of caseTypes) {
    const hasSource = pickSourceTemplate(templates, caseType, firstModel.brand_id);
    if (hasSource) continue;

    const hasAny = templates.some((t) => caseTypeSlugVariants(caseType).includes(t.case_type_slug));
    if (hasAny) continue;

    if (pngIdx >= orphanPngs.length) break;

    const filename = orphanPngs[pngIdx++];
    const filePath = path.join(templatesDir, filename);
    const dims = await imageDimensions(filePath);
    const zone = defaultCameraZone(dims.width, dims.height);
    const ts = nowIso();

    const item = {
      id: crypto.randomUUID(),
      model_id: firstModel.id,
      brand_id: firstModel.brand_id,
      case_type_slug: caseType,
      file_path: `uploads/templates/${filename}`,
      canvas_width: dims.width,
      canvas_height: dims.height,
      camera_zone: zone,
      mask_zones: [zone],
      version: 1,
      archived_paths: [],
      enabled: true,
      created_at: ts,
      updated_at: ts,
    };

    await db.collection("templates").insertOne(item);
    templates.push(item);
    console.log(`  bootstrapped template: ${firstModel.name || "model"} / ${caseType} from ${filename}`);
    created += 1;
  }

  return { created };
}

async function seedTemplates(db, catalog) {
  const priorityNames = catalog.priority_models || [];
  let caseTypes = catalog.case_types;

  const products = await db.collection("products").find({}).toArray();
  const productSlugs = products.map((p) => p.slug).filter(Boolean);
  if (productSlugs.length) {
    const preferred = ["silicone-case", "matte-case", "transparent-case", "glass"];
    caseTypes = preferred.filter((s) => productSlugs.includes(s));
    if (!caseTypes.length) caseTypes = productSlugs.slice(0, 4);
  }

  const models = await db.collection("models").find({}).toArray();
  let templates = await db.collection("templates").find({}).toArray();

  const bootstrap = await bootstrapMissingCaseTypes(
    db,
    templates,
    caseTypes,
    priorityNames,
    models
  );
  if (bootstrap.created) {
    templates = await db.collection("templates").find({}).toArray();
  }

  const modelByName = new Map();
  for (const m of models) {
    modelByName.set(m.name, m);
  }

  let created = bootstrap.created || 0;
  let skipped = 0;
  let errors = 0;

  for (const modelName of priorityNames) {
    const model = modelByName.get(modelName);
    if (!model) {
      console.warn(`  model not found: ${modelName}`);
      errors += 1;
      continue;
    }

    for (const caseType of caseTypes) {
      const variants = caseTypeSlugVariants(caseType);
      const existing = templates.find(
        (t) => t.model_id === model.id && variants.includes(t.case_type_slug)
      );
      if (existing) {
        skipped += 1;
        continue;
      }

      const source = pickSourceTemplate(templates, caseType, model.brand_id);
      if (!source) {
        console.warn(`  no source template for case_type=${caseType}`);
        errors += 1;
        continue;
      }

      const srcFile = resolveSourceFile(source);
      if (!srcFile) {
        console.warn(`  source file missing for template ${source.id}`);
        errors += 1;
        continue;
      }

      const newFilename = `${crypto.randomUUID().replace(/-/g, "")}.png`;
      const destFile = path.join(UPLOAD_DIR, "templates", newFilename);
      fs.mkdirSync(path.dirname(destFile), { recursive: true });
      fs.copyFileSync(srcFile, destFile);

      const ts = nowIso();
      const zones = normalizeMaskZones(source);
      const item = {
        id: crypto.randomUUID(),
        model_id: model.id,
        brand_id: model.brand_id,
        case_type_slug: caseType,
        file_path: `uploads/templates/${newFilename}`,
        canvas_width: source.canvas_width,
        canvas_height: source.canvas_height,
        camera_zone: source.camera_zone || (zones[0] || null),
        mask_zones: zones,
        version: 1,
        archived_paths: [],
        enabled: true,
        created_at: ts,
        updated_at: ts,
      };

      await db.collection("templates").insertOne(item);
      templates.push(item);
      console.log(`  cloned template: ${modelName} / ${caseType}`);
      created += 1;
    }
  }

  return { created, skipped, errors };
}

async function main() {
  if (!MONGO_URL || !DB_NAME) {
    console.error("Missing MONGO_URL or DB_NAME in backend/.env");
    process.exit(1);
  }

  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`Catalog not found: ${CATALOG_PATH}`);
    process.exit(1);
  }

  const catalog = loadCatalog();
  const client = new MongoClient(MONGO_URL);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Connected to MongoDB: ${DB_NAME}\n`);

    console.log("=== Seeding Shop Phone Cases ===");
    const productStats = await seedProducts(db, catalog);
    console.log(
      `Products: ${productStats.created} created, ${productStats.skipped} skipped, ${productStats.errors} errors\n`
    );

    console.log("=== Cloning Phone Case Templates ===");
    const templateStats = await seedTemplates(db, catalog);
    console.log(
      `Templates: ${templateStats.created} created, ${templateStats.skipped} skipped (already exist), ${templateStats.errors} errors\n`
    );

    console.log("Done.");
    if (productStats.errors > 0) {
      process.exitCode = 1;
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
