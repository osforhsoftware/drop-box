#!/usr/bin/env node
/**
 * Seeds the customer gallery with demo photos from uploads/gallary-tem/.
 *
 * Usage: npm run seed:gallery
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");
const { processGalleryImage, isAllowedGalleryExt } = require("../lib/customerGallery");

const ROOT_DIR = path.join(__dirname, "..");
const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");
const SOURCE_DIR = path.join(UPLOAD_DIR, "gallary-tem");

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;

function nowIso() {
  return new Date().toISOString();
}

function parseDemoLabel(filename) {
  const base = path.basename(filename, path.extname(filename));
  const withoutStamp = base.replace(/_\d{12}$/, "");
  return withoutStamp.replace(/_/g, " ").trim();
}

function listSourceImages() {
  if (!fs.existsSync(SOURCE_DIR)) {
    return [];
  }
  return fs
    .readdirSync(SOURCE_DIR)
    .filter((name) => isAllowedGalleryExt(name))
    .sort((a, b) => a.localeCompare(b));
}

async function seedGallery(db) {
  const col = db.collection("customer_gallery");
  const files = listSourceImages();

  if (!files.length) {
    console.error(`No images found in ${SOURCE_DIR}`);
    return { created: 0, skipped: 0, errors: 1 };
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;
  let sortOrder = 0;

  for (const filename of files) {
    const existing = await col.findOne({ source: "demo", demo_file: filename });
    if (existing) {
      console.log(`  skip (exists): ${filename}`);
      skipped += 1;
      continue;
    }

    const srcPath = path.join(SOURCE_DIR, filename);
    let buffer;
    try {
      buffer = fs.readFileSync(srcPath);
    } catch (err) {
      console.error(`  read failed: ${filename} — ${err.message}`);
      errors += 1;
      continue;
    }

    let image;
    try {
      image = await processGalleryImage(buffer, UPLOAD_DIR);
    } catch (err) {
      console.error(`  process failed: ${filename} — ${err.message}`);
      errors += 1;
      continue;
    }

    const label = parseDemoLabel(filename);
    const entry = {
      id: crypto.randomUUID(),
      order_id: null,
      images: [image],
      status: "approved",
      featured: true,
      hidden: false,
      verified: true,
      source: "demo",
      demo_file: filename,
      product_name: label,
      case_type: label,
      sort_order: sortOrder,
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    await col.insertOne(entry);
    console.log(`  created: ${label}`);
    created += 1;
    sortOrder += 1;
  }

  return { created, skipped, errors };
}

async function main() {
  if (!MONGO_URL || !DB_NAME) {
    console.error("Missing MONGO_URL or DB_NAME in backend/.env");
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URL);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Connected to MongoDB: ${DB_NAME}\n`);
    console.log("=== Seeding Customer Gallery (gallary-tem) ===");

    const stats = await seedGallery(db);
    console.log(
      `\nGallery: ${stats.created} created, ${stats.skipped} skipped, ${stats.errors} errors`
    );

    if (stats.errors > 0) {
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
