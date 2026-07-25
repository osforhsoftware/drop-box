const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const sharp = require("sharp");

const GALLERY_SUBDIR = "customer-gallery";
const THUMB_SUBDIR = "customer-gallery/thumbs";
const MAX_IMAGES = 10;
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_WIDTH = 800;
const WEBP_QUALITY = 78;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const COMPLETED_DELIVERY = new Set(["delivered"]);

function ensureGalleryDirs(uploadDir) {
  fs.mkdirSync(path.join(uploadDir, GALLERY_SUBDIR), { recursive: true });
}

function isAllowedGalleryExt(filename) {
  const ext = (filename || "").split(".").pop().toLowerCase();
  return ALLOWED_EXT.has(ext);
}

function isAllowedGalleryMime(mimetype) {
  return ALLOWED_MIME.has(String(mimetype || "").toLowerCase());
}

async function processGalleryImage(buffer, uploadDir) {
  ensureGalleryDirs(uploadDir);

  const meta = await sharp(buffer).rotate().metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Invalid image file");
  }

  const id = crypto.randomUUID().replace(/-/g, "");
  const filename = `${id}.webp`;
  const filePath = path.join(uploadDir, GALLERY_SUBDIR, filename);

  const output = await sharp(buffer)
    .rotate()
    .resize({
      width: MAX_WIDTH,
      height: MAX_WIDTH,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toFile(filePath);

  const apiPath = `/api/uploads/${GALLERY_SUBDIR}/${filename}`;
  return {
    id,
    url: apiPath,
    thumbnail_url: apiPath,
    width: output.width,
    height: output.height,
  };
}

async function processGalleryImages(files, uploadDir) {
  const results = [];
  for (const file of files.slice(0, MAX_IMAGES)) {
    if (!file?.buffer) continue;
    if (!isAllowedGalleryExt(file.originalname) || !isAllowedGalleryMime(file.mimetype)) {
      throw new Error(`Only JPG, PNG, and WEBP images are allowed`);
    }
    if (file.buffer.length > MAX_UPLOAD_BYTES) {
      throw new Error(`Each image must be under ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`);
    }
    results.push(await processGalleryImage(file.buffer, uploadDir));
  }
  return results;
}

function deleteGalleryImageFiles(uploadDir, image) {
  if (!image) return;
  const paths = new Set();
  for (const rel of [image.url, image.thumbnail_url]) {
    if (!rel) continue;
    const match = rel.match(/uploads\/customer-gallery(?:\/thumbs)?\/([^/?#]+)/);
    if (!match) continue;
    const sub = rel.includes("/thumbs/") ? THUMB_SUBDIR : GALLERY_SUBDIR;
    paths.add(path.join(uploadDir, sub, match[1]));
  }
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }
}

function isOrderEligibleForGallery(order) {
  if (!order) return false;
  if (order.payment_status !== "approved") return false;
  return COMPLETED_DELIVERY.has(order.delivery_status);
}

function buildProductLabel(order) {
  const parts = [order.brand_name, order.model_name, order.product_name].filter(Boolean);
  return parts.join(" ") || order.product_name || "Custom Case";
}

function mapOrderForGallery(order) {
  return {
    order_id: order.order_id,
    product_name: buildProductLabel(order),
    phone_model: order.model_name || null,
    phone_brand: order.brand_name || null,
    case_type: order.product_name || null,
    purchase_date: order.created_at,
    customer_name: order.customer_name || null,
    state: order.state || null,
  };
}

function publicGalleryFilter() {
  return {
    status: "approved",
    hidden: { $ne: true },
  };
}

function gallerySort(query = {}) {
  if (query.sort === "featured") {
    return { featured: -1, sort_order: 1, created_at: -1 };
  }
  return { featured: -1, sort_order: 1, created_at: -1 };
}

function sanitizePublicImage(img, entry, index) {
  return {
    id: `${entry.id}_${img.id || index}`,
    url: img.url,
    thumbnail_url: img.thumbnail_url || img.url,
    entry_id: entry.id,
    image_index: index,
  };
}

function flattenGalleryEntries(entries) {
  const flat = [];
  for (const entry of entries) {
    for (let i = 0; i < (entry.images || []).length; i++) {
      flat.push(sanitizePublicImage(entry.images[i], entry, i));
    }
  }
  return flat;
}

function paginateGalleryImages(flatItems, page, limit) {
  const total = flatItems.length;
  const skip = (page - 1) * limit;
  const items = flatItems.slice(skip, skip + limit);
  return {
    items,
    page,
    limit,
    total,
    total_pages: Math.max(1, Math.ceil(total / limit) || 1),
    has_more: skip + items.length < total,
  };
}

function sanitizePublicImagesList(images) {
  return (images || []).map((img, i) => ({
    id: img.id || String(i),
    url: img.url,
    thumbnail_url: img.thumbnail_url || img.url,
  }));
}

module.exports = {
  GALLERY_SUBDIR,
  MAX_IMAGES,
  MAX_UPLOAD_BYTES,
  ALLOWED_EXT,
  ALLOWED_MIME,
  ensureGalleryDirs,
  isAllowedGalleryExt,
  isAllowedGalleryMime,
  processGalleryImage,
  processGalleryImages,
  deleteGalleryImageFiles,
  isOrderEligibleForGallery,
  buildProductLabel,
  mapOrderForGallery,
  publicGalleryFilter,
  gallerySort,
  flattenGalleryEntries,
  paginateGalleryImages,
  sanitizePublicImagesList,
};
