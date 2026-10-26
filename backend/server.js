require("dotenv").config();

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const helmet = require("helmet");
const { MongoClient } = require("mongodb");
const {
  parseExclusionZonesInput,
  parsePrintAreaInput,
  enrichTemplate,
  normalizeExclusionZones,
} = require("./lib/cameraZone");
const { compositePrintFile } = require("./lib/printComposite");
const {
  productIsAllowedForBrand,
} = require("./lib/catalogCompatibility");
const {
  normalizeModelCaseTypes,
  modelCaseTypeIsEnabled,
  withModelPrice,
} = require("./lib/modelCaseTypes");
const {
  MAX_IMAGES: GALLERY_MAX_IMAGES,
  MAX_UPLOAD_BYTES: GALLERY_MAX_UPLOAD_BYTES,
  ensureGalleryDirs,
  processGalleryImages,
  deleteGalleryImageFiles,
  isOrderEligibleForGallery,
  buildProductLabel,
  mapOrderForGallery,
  publicGalleryFilter,
  gallerySort,
  isAllowedGalleryExt,
  isAllowedGalleryMime,
  flattenGalleryEntries,
  paginateGalleryImages,
  sanitizePublicImagesList,
} = require("./lib/customerGallery");
const {
  slugify,
  parseFormFields,
  buildListFilter,
  buildAdminListFilter,
  buildSort,
  effectivePrice,
  toRelativeMediaUrl,
  toPublicProduct,
  displayTemplateTitle,
  getUpdatedTemplateTitle,
  stripCopyTitleSuffix,
  stripCopySlugSuffix,
  cloneTemplateProductMedia,
  collectTemplateProductMediaUrls,
  templateProductUploadFilename,
  templateProductMediaReferenceQuery,
  isTrashed,
  notTrashedClause,
  trashedClause,
  publishedShopClause,
  CATEGORIES,
  CASE_TYPES,
  COLLECTIONS,
  PHONE_BRANDS,
  PRODUCT_TYPES,
  CASE_TYPE_ALIASES,
} = require("./lib/templateProducts");
const {
  resolveVariantInventory,
  assertCanPurchaseVariant,
  applyVariantInventoryUpdate,
  consumeVariantStock,
  synthesizeVariantInventory,
  availableStock,
} = require("./lib/variantInventory");
const {
  groupProductsForListing,
  toPublicListingProduct,
  toPublicMaterialVariant,
  paginateList,
  findDuplicateCaseType,
} = require("./lib/designGroup");
const {
  buildCaseTypeLabelMap,
  snapshotOrderMaterial,
} = require("./lib/orderMaterial");
const {
  registerRateLimiter,
  apiRateLimiter,
  uploadRateLimiter,
  orderRateLimiter,
  googleAuthRateLimiter,
  verifyPaymentRateLimiter,
  botProtection,
  getClientIp,
  authDelay,
  validateEmail,
  validatePassword,
  validateIndianPhone,
  clampString,
  validateStartupSecrets,
  parseCorsOrigins,
  productionConfigErrors,
  isValidOrderId,
  isValidUploadUrl,
  ensureSecurityIndexes,
  checkLoginLockout,
  recordLoginFailure,
  clearLoginFailures,
  checkRegisterQuota,
  recordRegisterAttempt,
} = require("./lib/security");
const { SHIPPING_FEE } = require("./lib/shipping");
const {
  normalizeOrderAddress,
  fetchIndiaPostPincode,
} = require("./lib/indianAddress");
const {
  normalizePaymentMethod,
  toPublicSettings,
  sanitizeSettingsUpdate,
  defaultSettings,
  isRazorpayConfigured,
  createRazorpayOrderForAppOrder,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  fetchAndConfirmPayment,
  stripOrderSecrets,
  toPublicTrackingOrder,
  capturedPaymentMatchesOrder,
  getRazorpayKeyId,
  amountToPaise,
} = require("./lib/razorpayPayments");
const { buildAdminOrderPatch } = require("./lib/adminOrderUpdate");
const {
  parseAdminOrderFilters,
  customerOrdersQuery,
  decorateAdminOrder,
  failedPaymentClause,
  pendingPaymentClause,
  MAX_EXPORT_ROWS,
} = require("./lib/adminOrderQuery");
const {
  EXPORT_FORMATS,
  EXPORT_SCOPES,
  buildExportFile,
} = require("./lib/adminOrderExport");
const {
  OAUTH_COOKIE,
  LOGIN_CODE_TTL_MS,
  googleConfigured,
  getGoogleCallbackUrl,
  getFrontendUrl,
  getOAuthClient,
  oauthCookieOpts,
  createOAuthContext,
  readOAuthContext,
  buildGoogleAuthUrl,
  verifyGoogleAuthorizationCode,
  hashLoginCode,
  createLoginCode,
  frontendLoginUrl,
} = require("./lib/googleAuth");
const { findOrCreateGoogleCustomer } = require("./lib/googleCustomer");
const {
  parseFit,
  parseHeroFormFields,
  toPublicHeroSlide,
  seedDefaultHeroSlides,
} = require("./lib/heroSlides");
const {
  ImageInputError,
  createVariants,
  prepareUpload,
  compressDiskImage,
  assertOverlayPng,
} = require("./services/imageService");
const {
  resolveImageSettings,
  imageSettingsUpdateFromBody,
} = require("./lib/imageSettings");

const ROOT_DIR = __dirname;
const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");

for (const sub of ["designs", "payments", "templates", "prints", "popups", "brands", "models", "products", "template-products", "customer-gallery", "hero"]) {
  fs.mkdirSync(path.join(UPLOAD_DIR, sub), { recursive: true });
}
ensureGalleryDirs(UPLOAD_DIR);

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGO = "HS256";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";
const PORT = Number(process.env.PORT) || 8000;
const isProd = process.env.NODE_ENV === "production";

let db;
let client;

const DEFAULT_BRANDS = [
  { name: "Apple", models: ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15", "iPhone 14 Pro", "iPhone 14", "iPhone 13"] },
  { name: "Akkukkaa", models: ["Akkukkaa", "Akkukkaa Pro"] },
  { name: "Samsung", models: ["Galaxy S24 Ultra", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy A54", "Galaxy Note 20"] },
  { name: "Xiaomi", models: ["Xiaomi 14", "Redmi Note 13 Pro", "Poco F5", "Redmi 12"] },
  { name: "Vivo", models: ["Vivo V30 Pro", "Vivo X100", "Vivo Y100"] },
  { name: "Oppo", models: ["Oppo Find X7", "Oppo Reno 11", "Oppo A78"] },
  { name: "OnePlus", models: ["OnePlus 12", "OnePlus 11", "OnePlus Nord 3"] },
  { name: "Google Pixel", models: ["Pixel 8 Pro", "Pixel 8", "Pixel 7a"] },
];

const DEFAULT_PRODUCTS = [
  {
    name: "Silicone Case",
    slug: "silicone",
    price: 299.0,
    description: "Crafted from high-grade liquid silicone with a soft microfiber interior lining. Delivers a secure, velvety grip that absorbs everyday drops and bumps, complete with precision cutouts and responsive button covers.",
    material: "Liquid Silicone",
  },
  {
    name: "Transparent Case",
    slug: "transparent",
    price: 349.0,
    description: "Engineered from optical-grade polycarbonate with anti-yellowing UV resistance and reinforced shock-absorbing edges. Lets your phone's original finish and design show through while guarding against scratches and everyday impact.",
    material: "Polycarbonate",
  },
  {
    name: "Matte Case",
    slug: "matte",
    price: 399.0,
    description: "Finished with a premium satin matte coating that actively resists fingerprints, oils, and surface smudges. Combines a sleek, low-profile silhouette with smooth tactile grip and durable daily edge protection.",
    material: "Matte Polycarbonate",
  },
  {
    name: "Glass Case",
    slug: "glass",
    price: 499.0,
    description: "Constructed with a 9H tempered glass backplate and flexible shock-absorbing TPU borders. Features an ultra-smooth glossy surface with high scratch resistance for a clean, luxury look and premium hand feel.",
    material: "Tempered Glass",
  },
];

function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}

function verifyPassword(pw, hashed) {
  try {
    return bcrypt.compareSync(pw, hashed || "");
  } catch {
    return false;
  }
}

function createToken(userId, email) {
  return jwt.sign(
    { sub: userId, email, type: "access" },
    JWT_SECRET,
    { algorithm: JWT_ALGO, expiresIn: "7d" }
  );
}

function nowIso() {
  return new Date().toISOString();
}

function publicUrl(filePath) {
  // Relative paths — frontend resolves via REACT_APP_BACKEND_URL (works on LAN and localhost).
  return `/api/${filePath}`;
}

function withRelativeMedia(item, fields = ["logo_url", "image_url"]) {
  if (!item) return item;
  const out = { ...item };
  for (const field of fields) {
    if (out[field]) out[field] = toRelativeMediaUrl(out[field]);
  }
  return out;
}

function genOrderId() {
  const d = new Date();
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `FRM-${yy}${mm}${dd}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function normalizePromoCode(code) {
  return String(code || "").trim().toUpperCase();
}

const PROMO_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePromoCodeString() {
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += PROMO_CODE_CHARS[crypto.randomInt(PROMO_CODE_CHARS.length)];
  }
  return `PROMO-${suffix}`;
}

async function generateUniquePromoCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generatePromoCodeString();
    const existing = await db.collection("promo_codes").findOne({ code });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique promo code");
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function computePromoDiscount(subtotal, discountPercent) {
  const sub = Number(subtotal);
  const pct = Number(discountPercent);
  let discountAmount = roundMoney(sub * pct / 100);
  const finalAmount = Math.max(1, roundMoney(sub - discountAmount));
  if (finalAmount === 1 && sub > 1) {
    discountAmount = roundMoney(sub - 1);
  }
  return { discount_amount: discountAmount, final_amount: finalAmount };
}

async function validatePromoCode(code, subtotal) {
  const normalized = normalizePromoCode(code);
  if (!normalized) {
    const err = new Error("Promo code is required");
    err.status = 400;
    throw err;
  }

  const promo = await db.collection("promo_codes").findOne({ code: normalized });
  if (!promo) {
    const err = new Error("Invalid promo code");
    err.status = 400;
    throw err;
  }
  if (!promo.enabled) {
    const err = new Error("This promo code is no longer active");
    err.status = 400;
    throw err;
  }
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    const err = new Error("This promo code has expired");
    err.status = 400;
    throw err;
  }
  if (promo.max_uses != null && promo.used_count >= promo.max_uses) {
    const err = new Error("This promo code has reached its usage limit");
    err.status = 400;
    throw err;
  }
  if (promo.min_amount != null && Number(subtotal) < Number(promo.min_amount)) {
    const err = new Error(`Minimum order amount is ₹${promo.min_amount}`);
    err.status = 400;
    throw err;
  }

  const { discount_amount, final_amount } = computePromoDiscount(subtotal, promo.discount_percent);
  return { promo, discount_amount, final_amount };
}

async function resolveCatalogLine(line) {
  const brandId = String(line?.brand_id || "").trim();
  const modelId = String(line?.model_id || "").trim();
  const productId = String(line?.product_id || "").trim();
  const [brand, model] = await Promise.all([
    db.collection("brands").findOne({ id: brandId }),
    db.collection("models").findOne({ id: modelId, brand_id: brandId }),
  ]);
  if (!brand) {
    const err = new Error("Brand not found");
    err.status = 404;
    throw err;
  }
  if (!model) {
    const err = new Error("Model does not belong to this brand");
    err.status = 400;
    throw err;
  }

  let templateProduct = null;
  if (line.template_product_id) {
    templateProduct = await db.collection("template_products").findOne(
      publishedShopClause({ id: line.template_product_id })
    );
    if (!templateProduct) {
      const err = new Error("Template product not found or unavailable");
      err.status = 404;
      throw err;
    }
  }

  let [product, relation] = await Promise.all([
    db.collection("products").findOne({ id: productId }),
    db.collection("phone_model_case_types").findOne({
      phone_model_id: modelId,
      case_type_id: productId,
    }),
  ]);

  if (!product && templateProduct?.case_type) {
    product = await db.collection("products").findOne({
      $or: [
        { slug: templateProduct.case_type },
        { slug: `${templateProduct.case_type}-case` },
        { slug: templateProduct.case_type.replace(/-case$/, "") },
      ],
    });
  }

  if (!product) {
    if (templateProduct) {
      product = {
        id: templateProduct.case_type || "default",
        name: templateProduct.case_type_label || humanizeCaseType(templateProduct.case_type) || "Phone Case",
        slug: templateProduct.case_type || "custom",
      };
    } else {
      const err = new Error("Case type not found");
      err.status = 404;
      throw err;
    }
  }

  if (!templateProduct && !modelCaseTypeIsEnabled(relation, product)) {
    const err = new Error(`${product.name} is not enabled for ${model.name}`);
    err.status = 400;
    throw err;
  }

  let price = Number(relation?.price) || 0;
  if (line.template_product_id) {
    templateProduct = await db.collection("template_products").findOne(
      publishedShopClause({ id: line.template_product_id })
    );
    if (!templateProduct) {
      const err = new Error("Template product not found or unavailable");
      err.status = 404;
      throw err;
    }

    // 1. Validate brand compatibility
    if (templateProduct.phone_brand && brand.name) {
      if (templateProduct.phone_brand.trim().toLowerCase() !== brand.name.trim().toLowerCase()) {
        const err = new Error(`${templateProduct.title} is not available for ${brand.name}`);
        err.status = 400;
        throw err;
      }
    }

    // 2. Validate model compatibility
    if (Array.isArray(templateProduct.phone_models) && templateProduct.phone_models.length > 0) {
      const isCompat = templateProduct.phone_models.some((m) => {
        const s = String(m).trim().toLowerCase();
        return s === String(model.name).trim().toLowerCase() || s === String(model.id).trim().toLowerCase();
      });
      if (!isCompat) {
        const err = new Error(`${templateProduct.title} is not available for ${model.name}`);
        err.status = 400;
        throw err;
      }
    }

    const pSlug = String(product.slug || "").trim().toLowerCase();
    const tCase = String(templateProduct.case_type || "").trim().toLowerCase();
    const isDirectMatch = tCase === pSlug || Boolean(CASE_TYPE_ALIASES[tCase]?.includes(pSlug));

    // If design has a sibling template product matching the chosen case material, resolve to that sibling
    if (!isDirectMatch && templateProduct.design_id) {
      const sibling = await db.collection("template_products").findOne(
        publishedShopClause({
          design_id: templateProduct.design_id,
          ...caseTypeFilterClause(pSlug),
        })
      );
      if (sibling) {
        templateProduct = sibling;
      }
    }

    const currentCase = String(templateProduct.case_type || "").trim().toLowerCase();
    const isDefaultMaterial = currentCase === pSlug || Boolean(CASE_TYPE_ALIASES[currentCase]?.includes(pSlug));

    // 3. Validate material compatibility
    if (!isDefaultMaterial) {
      const err = new Error(`${product.name} is not available for this design`);
      err.status = 400;
      throw err;
    }

    const stockError = assertCanPurchaseVariant(templateProduct, model.name, line.quantity);
    if (stockError) {
      const err = new Error(stockError);
      err.status = 400;
      throw err;
    }

    price = effectivePrice(templateProduct);
  }

  return { brand, model, product, relation, templateProduct, price };
}

async function priceOrderLines(lines) {
  const priced = [];
  for (const line of lines) {
    const resolved = await resolveCatalogLine(line);
    const quantity = Math.max(1, Math.min(99, parseInt(line.quantity, 10) || 1));
    priced.push({ ...line, ...resolved, quantity });
  }
  return {
    lines: priced,
    subtotal: roundMoney(priced.reduce(
      (sum, line) => sum + (line.price * line.quantity),
      0
    )),
  };
}

function parseOptionalIso(value) {
  if (value == null || value === "" || value === "null") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function validateLinkUrl(url) {
  if (url == null || String(url).trim() === "") return null;
  const v = String(url).trim();
  if (v.startsWith("/")) return v;
  if (/^https?:\/\//i.test(v)) return v;
  return { error: "link_url must be a relative path (e.g. /customize) or http(s) URL" };
}

function isPopupOfferActive(offer, now = new Date()) {
  if (!offer?.enabled) return false;
  if (offer.starts_at && new Date(offer.starts_at) > now) return false;
  if (offer.ends_at && new Date(offer.ends_at) < now) return false;
  return true;
}

function popupImagePathFromUrl(imageUrl) {
  if (!imageUrl) return null;
  const match = String(imageUrl).match(/uploads\/popups\/([^/?#]+)/);
  if (!match) return null;
  return path.join(UPLOAD_DIR, "popups", match[1]);
}

function deletePopupImageFile(imageUrl) {
  const fp = popupImagePathFromUrl(imageUrl);
  if (fp && fs.existsSync(fp)) {
    try {
      fs.unlinkSync(fp);
    } catch {
      /* ignore */
    }
  }
}

function safeUploadFilename(name) {
  const filename = String(name || "");
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return null;
  return filename;
}

function catalogImagePathFromUrl(imageUrl, subdir) {
  if (!imageUrl || !subdir || !/^[a-z0-9-]+$/.test(subdir)) return null;
  const match = String(imageUrl).match(new RegExp(`uploads/${subdir}/([^/?#]+)`));
  const filename = safeUploadFilename(match?.[1]);
  if (!filename) return null;
  return path.join(UPLOAD_DIR, subdir, filename);
}

function deleteCatalogImageFile(imageUrl, subdir) {
  const fp = catalogImagePathFromUrl(imageUrl, subdir);
  if (fp && fs.existsSync(fp)) {
    try {
      fs.unlinkSync(fp);
    } catch {
      /* ignore */
    }
  }
}

function parsePopupFormFields(body) {
  const title = String(body.title || "").trim();
  let linkUrl = null;
  const linkRaw = body.link_url;
  if (linkRaw != null && String(linkRaw).trim() !== "") {
    const v = validateLinkUrl(linkRaw);
    if (v?.error) return { error: v.error };
    linkUrl = v;
  }
  const enabled = body.enabled === undefined || body.enabled === "true" || body.enabled === true;
  const starts_at = parseOptionalIso(body.starts_at);
  const ends_at = parseOptionalIso(body.ends_at);
  return { title, link_url: linkUrl, enabled, starts_at, ends_at };
}

function parseBoolField(value) {
  return value === true || value === "true";
}

function stripUser(user) {
  if (!user) return user;
  const { _id, password_hash, ...rest } = user;
  return rest;
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone || null,
    address: user.address || null,
    formatted_address: user.formatted_address || user.address || null,
    house_no_flat: user.house_no_flat || null,
    building_name: user.building_name || null,
    street: user.street || null,
    landmark: user.landmark || null,
    country: user.country || null,
    state: user.state || null,
    district: user.district || null,
    city_area: user.city_area || null,
    post_office: user.post_office || null,
    pincode: user.pincode || null,
  };
}

async function saveUserShipping(userId, fields) {
  const update = {};
  if (fields.name != null && String(fields.name).trim()) update.name = String(fields.name).trim();
  if (fields.phone != null) update.phone = String(fields.phone).trim();
  for (const key of [
    "address",
    "formatted_address",
    "house_no_flat",
    "building_name",
    "street",
    "landmark",
    "country",
    "state",
    "district",
    "city_area",
    "post_office",
    "pincode",
  ]) {
    if (fields[key] != null) update[key] = String(fields[key]).trim();
  }
  if (!Object.keys(update).length) return;
  update.updated_at = nowIso();
  await db.collection("users").updateOne({ id: userId }, { $set: update });
}

function extractToken(req) {
  let token = req.cookies?.access_token;
  if (!token) {
    const auth = req.headers.authorization || "";
    if (auth.startsWith("Bearer ")) token = auth.slice(7);
  }
  return token;
}

async function attachUserIfPresent(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGO] });
    const user = await db.collection("users").findOne({ id: payload.sub });
    if (user) req.user = stripUser(user);
  } catch {
    /* Guest tracking still works when a stale token is present. */
  }
  next();
}

async function getCurrentUser(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ detail: "Not authenticated" });

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGO] });
    const user = await db.collection("users").findOne({ id: payload.sub });
    if (!user) return res.status(401).json({ detail: "User not found" });
    req.user = stripUser(user);
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ detail: "Token expired" });
    }
    return res.status(401).json({ detail: "Invalid token" });
  }
}

async function getCurrentAdmin(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ detail: "Not authenticated" });

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGO] });
    const user = await db.collection("users").findOne({ id: payload.sub });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ detail: "Admin only" });
    }
    req.admin = stripUser(user);
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ detail: "Token expired" });
    }
    return res.status(401).json({ detail: "Invalid token" });
  }
}

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const subdir = req.uploadSubdir || "designs";
    const dir = path.join(UPLOAD_DIR, subdir);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = (file.originalname || "file").split(".").pop().toLowerCase();
    cb(null, `${crypto.randomUUID().replace(/-/g, "")}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ext = (file.originalname || "file").split(".").pop().toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new Error("Unsupported file type"));
    }
    cb(null, true);
  },
});

function listUploadedFiles(req) {
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files && typeof req.files === "object") {
    for (const list of Object.values(req.files)) {
      if (Array.isArray(list)) files.push(...list);
    }
  }
  return files;
}

/** Convert a saved upload to WebP. Case overlay PNGs never go through this. */
async function compressIncomingImages(req) {
  const settings = await getImageSettings();
  if (!settings.image_compress_enabled) return;
  for (const file of listUploadedFiles(req)) {
    if (!file?.path) continue;
    const result = await compressDiskImage(file.path, settings);
    file.path = result.filePath;
    file.filename = path.basename(result.filePath);
    file.compressed = Boolean(result.compressed);
    file.imageWidth = result.width || null;
    file.imageHeight = result.height || null;
  }
}

function afterDiskUpload(req, res, next) {
  compressIncomingImages(req)
    .then(() => next())
    .catch(async (err) => {
      await Promise.all(listUploadedFiles(req).map((file) => (
        file?.path ? fs.promises.unlink(file.path).catch(() => {}) : null
      )));
      if (err instanceof ImageInputError) {
        return res.status(400).json({ detail: err.message });
      }
      console.error("Image compression failed");
      return res.status(500).json({ detail: "Could not process image" });
    });
}

function handleUpload(subdir, { compress = true } = {}) {
  return (req, res, next) => {
    req.uploadSubdir = subdir;
    upload.single("file")(req, res, (err) => {
      if (err) {
        const msg = err.message || "Upload failed";
        const status = msg === "Unsupported file type" || msg.includes("File too large") ? 400 : 500;
        return res.status(status).json({ detail: msg });
      }
      // Customer artwork and the edited case preview stay at the original file.
      if (!compress) return next();
      afterDiskUpload(req, res, next);
    });
  };
}

function optionalPopupUpload(req, res, next) {
  const ct = req.headers["content-type"] || "";
  if (ct.includes("multipart/form-data")) {
    return handleUpload("popups")(req, res, next);
  }
  next();
}

function optionalHeroUpload(req, res, next) {
  const ct = req.headers["content-type"] || "";
  if (ct.includes("multipart/form-data")) {
    return handleUpload("hero")(req, res, next);
  }
  next();
}

function deleteHeroImageFile(imageUrl) {
  deleteCatalogImageFile(imageUrl, "hero");
}

async function nextHeroSlideOrder() {
  const last = await db.collection("hero_slides")
    .find({}, { projection: { order: 1 } })
    .sort({ order: -1 })
    .limit(1)
    .toArray();
  return (Number(last[0]?.order) || 0) + 1;
}

function createCatalogUpload(subdir, maxBytes) {
  return multer({
    storage,
    limits: { fileSize: maxBytes },
    fileFilter(req, file, cb) {
      const ext = (file.originalname || "file").split(".").pop().toLowerCase();
      if (!ALLOWED_EXT.has(ext)) {
        return cb(new Error("Unsupported file type"));
      }
      cb(null, true);
    },
  });
}

const brandUpload = createCatalogUpload("brands", 2 * 1024 * 1024);
const modelUpload = createCatalogUpload("models", 4 * 1024 * 1024);
const productUpload = createCatalogUpload("products", 4 * 1024 * 1024);

function optionalCatalogUpload(subdir) {
  const uploader = subdir === "brands"
    ? brandUpload
    : subdir === "products"
      ? productUpload
      : modelUpload;
  return (req, res, next) => {
    const ct = req.headers["content-type"] || "";
    if (ct.includes("multipart/form-data")) {
      req.uploadSubdir = subdir;
      return uploader.single("file")(req, res, (err) => {
        if (err) {
          const msg = err.message || "Upload failed";
          const status = msg === "Unsupported file type" || msg.includes("File too large") ? 400 : 500;
          return res.status(status).json({ detail: msg });
        }
        afterDiskUpload(req, res, next);
      });
    }
    next();
  };
}

const templateUpload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ext = (file.originalname || "file").split(".").pop().toLowerCase();
    if (ext !== "png") {
      return cb(new Error("Unsupported file type"));
    }
    cb(null, true);
  },
});

function handleTemplateUpload(req, res, next) {
  req.uploadSubdir = "templates";
  templateUpload.single("file")(req, res, (err) => {
    if (err) {
      const msg = err.message || "Upload failed";
      const status = msg === "Unsupported file type" || msg.includes("File too large") ? 400 : 500;
      return res.status(status).json({ detail: msg });
    }
    next();
  });
}

const templateProductUpload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ext = (file.originalname || "file").split(".").pop().toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new Error("Unsupported file type"));
    }
    cb(null, true);
  },
});

function handleTemplateProductUpload(req, res, next) {
  req.uploadSubdir = "template-products";
  templateProductUpload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ])(req, res, (err) => {
    if (err) {
      const msg = err.message || "Upload failed";
      const status = msg === "Unsupported file type" || msg.includes("File too large") ? 400 : 500;
      return res.status(status).json({ detail: msg });
    }
    afterDiskUpload(req, res, next);
  });
}

function optionalTemplateProductUpload(req, res, next) {
  const ct = req.headers["content-type"] || "";
  if (ct.includes("multipart/form-data")) {
    return handleTemplateProductUpload(req, res, next);
  }
  next();
}

const galleryMemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: GALLERY_MAX_UPLOAD_BYTES, files: GALLERY_MAX_IMAGES },
  fileFilter(req, file, cb) {
    if (!isAllowedGalleryExt(file.originalname) || !isAllowedGalleryMime(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, and WEBP images are allowed"));
    }
    cb(null, true);
  },
});

const COMPRESSED_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const COMPRESSED_UPLOAD_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const COMPRESSED_UPLOAD_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

const compressedImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: COMPRESSED_UPLOAD_MAX_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    const ext = String(file.originalname || "").split(".").pop().toLowerCase();
    const mime = String(file.mimetype || "").toLowerCase();
    if (!COMPRESSED_UPLOAD_EXT.has(ext) || !COMPRESSED_UPLOAD_MIME.has(mime)) {
      return cb(new ImageInputError("Only JPG, PNG, and WebP images are allowed."));
    }
    cb(null, true);
  },
});

function handleCompressedUpload(req, res, next) {
  compressedImageUpload.single("image")(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}

function kilobytes(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

function publicUploadPath(filename) {
  return `/uploads/${filename}`;
}

function handleGalleryUpload(req, res, next) {
  galleryMemoryUpload.array("images", GALLERY_MAX_IMAGES)(req, res, (err) => {
    if (err) {
      const msg = err.message || "Upload failed";
      const status = msg.includes("allowed") || msg.includes("File too large") || msg.includes("Too many") ? 400 : 500;
      return res.status(status).json({ detail: msg });
    }
    next();
  });
}

function templateProductImagePathFromUrl(imageUrl) {
  if (!imageUrl) return null;
  const match = String(imageUrl).match(/uploads\/template-products\/([^/?#]+)/);
  const filename = safeUploadFilename(match?.[1]);
  if (!filename) return null;
  return path.join(UPLOAD_DIR, "template-products", filename);
}

function deleteTemplateProductImageFile(imageUrl) {
  const fp = templateProductImagePathFromUrl(imageUrl);
  if (fp && fs.existsSync(fp)) {
    try {
      fs.unlinkSync(fp);
    } catch {
      /* ignore */
    }
  }
}

/** Delete an upload only when no other template product still references that file. */
async function releaseTemplateProductImageFile(imageUrl, excludeIds) {
  const query = templateProductMediaReferenceQuery(imageUrl, excludeIds);
  if (query) {
    const shared = await db.collection("template_products").findOne(query, { projection: { _id: 1 } });
    if (shared) return;
  }
  deleteTemplateProductImageFile(imageUrl);
}

async function releaseTemplateProductMedia(item, excludeIds) {
  const seen = new Set();
  for (const url of collectTemplateProductMediaUrls(item)) {
    const key = templateProductUploadFilename(url) || url;
    if (seen.has(key)) continue;
    seen.add(key);
    await releaseTemplateProductImageFile(url, excludeIds);
  }
}

function collectUploadedTemplateImages(req) {
  const urls = [];
  if (req.files?.thumbnail?.[0]) {
    urls.push(publicUrl(`uploads/template-products/${req.files.thumbnail[0].filename}`));
  }
  if (req.files?.gallery) {
    for (const f of req.files.gallery) {
      urls.push(publicUrl(`uploads/template-products/${f.filename}`));
    }
  }
  return urls;
}

async function loadCaseTypeLabelMap() {
  const [cases, products] = await Promise.all([
    db.collection("case_types").find({}, { projection: { slug: 1, name: 1 } }).toArray(),
    db.collection("products").find({}, { projection: { slug: 1, name: 1 } }).toArray(),
  ]);
  const map = {};
  for (const item of products) {
    const slug = String(item.slug || "").trim().toLowerCase();
    if (slug) map[slug] = { label: item.name || slug };
  }
  for (const item of cases) {
    const slug = String(item.slug || "").trim().toLowerCase();
    if (slug) map[slug] = { label: item.name || map[slug]?.label || slug };
  }
  return map;
}

async function groupedPublicListings(filter, sort, { page, limit, maxScan = 2000, expandGroups = true } = {}) {
  const [docs, labelMap] = await Promise.all([
    db.collection("template_products")
      .find(filter, { projection: { _id: 0 } })
      .sort(sort)
      .limit(maxScan)
      .toArray(),
    loadCaseTypeLabelMap(),
  ]);
  const groups = groupProductsForListing(docs);
  if (expandGroups) {
    const designIds = [...new Set(groups.map((group) => group.design_id).filter(Boolean))];
    if (designIds.length) {
      const siblings = await db.collection("template_products")
        .find(publishedShopClause({ design_id: { $in: designIds } }), { projection: { _id: 0 } })
        .toArray();
      const byDesign = new Map();
      for (const sibling of siblings) {
        const list = byDesign.get(sibling.design_id) || [];
        list.push(sibling);
        byDesign.set(sibling.design_id, list);
      }
      for (const group of groups) {
        if (group.design_id && byDesign.has(group.design_id)) {
          group.members = byDesign.get(group.design_id);
        }
      }
    }
  }
  const listings = groups
    .map((group) => toPublicListingProduct(group, labelMap))
    .filter(Boolean);
  return paginateList(listings, page, limit);
}

async function loadDesignSiblings(product, { publishedOnly = false } = {}) {
  const designId = String(product?.design_id || "").trim();
  if (!designId) return product ? [product] : [];
  const filter = publishedOnly
    ? publishedShopClause({ design_id: designId })
    : { design_id: designId, ...notTrashedClause() };
  const siblings = await db.collection("template_products")
    .find(filter, { projection: { _id: 0 } })
    .sort({ created_at: 1 })
    .toArray();
  return siblings.length ? siblings : (product ? [product] : []);
}

async function ensureDesignId(product) {
  const existing = String(product?.design_id || "").trim();
  if (existing) return existing;
  const designId = crypto.randomUUID();
  await db.collection("template_products").updateOne(
    { id: product.id },
    { $set: { design_id: designId, updated_at: nowIso() } }
  );
  product.design_id = designId;
  return designId;
}

function adminProductPayload(doc) {
  if (!doc) return doc;
  return {
    ...doc,
    title: displayTemplateTitle(doc.title),
    variants: resolveVariantInventory(doc),
  };
}

async function ensureUniqueTemplateSlug(baseSlug, excludeId = null) {
  let slug = baseSlug;
  let n = 1;
  while (true) {
    const query = { slug };
    if (excludeId) query.id = { $ne: excludeId };
    const existing = await db.collection("template_products").findOne(query);
    if (!existing) return slug;
    slug = `${baseSlug}-${n++}`;
  }
}

async function duplicateTemplateTitle(sourceTitle) {
  const base = stripCopyTitleSuffix(sourceTitle);
  let candidate = `${base} (Copy)`;
  let n = 2;
  while (await db.collection("template_products").findOne({ title: candidate })) {
    candidate = `${base} (Copy ${n++})`;
    if (n > 200) break;
  }
  return candidate;
}

function parseCanvasDims(body) {
  const canvas_width = Number(body.canvas_width);
  const canvas_height = Number(body.canvas_height);
  if (Number.isNaN(canvas_width) || Number.isNaN(canvas_height) || canvas_width < 1 || canvas_height < 1) {
    return { error: "Invalid canvas dimensions" };
  }
  return { canvas_width, canvas_height };
}

const app = express();
const api = express.Router();

validateStartupSecrets();
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS) || 1);

const corsOrigins = parseCorsOrigins();
// Dev: the site is opened as localhost or 127.0.0.1. Allow both.
if (!isProd && Array.isArray(corsOrigins)) {
  for (const origin of [...corsOrigins]) {
    const swapped = origin.includes("://localhost")
      ? origin.replace("://localhost", "://127.0.0.1")
      : origin.includes("://127.0.0.1")
        ? origin.replace("://127.0.0.1", "://localhost")
        : origin;
    if (swapped !== origin && !corsOrigins.includes(swapped)) corsOrigins.push(swapped);
  }
}
app.use(
  cors({
    origin: corsOrigins || (isProd ? false : true),
    credentials: true,
    exposedHeaders: ["Content-Disposition", "X-Export-Count"],
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: isProd ? undefined : false,
    // HSTS on http://localhost makes browsers force https and the site looks offline.
    hsts: isProd ? undefined : false,
  })
);
app.use(cookieParser());
app.use(
  express.json({
    limit: "256kb",
    verify: (req, _res, buf) => {
      // Preserve raw body for Razorpay webhook HMAC verification
      if (req.originalUrl && req.originalUrl.includes("/webhooks/razorpay")) {
        req.rawBody = buf;
      }
    },
  })
);
app.use("/api/uploads", express.static(UPLOAD_DIR, {
  dotfiles: "deny",
  index: false,
}));
// Long-cache the WebP files written by /api/upload. Names are UUIDs, so they never change.
app.use("/uploads", express.static(UPLOAD_DIR, {
  dotfiles: "deny",
  index: false,
  setHeaders(res) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  },
}));
app.use("/api", apiRateLimiter);

async function getMainSettings() {
  let s = await db.collection("settings").findOne({ id: "main" });
  if (!s) {
    s = defaultSettings();
    await db.collection("settings").insertOne(s);
  }
  return s;
}

async function getImageSettings() {
  return resolveImageSettings(await getMainSettings());
}

async function storePreparedUpload(buffer, settings, destDir) {
  const prepared = await prepareUpload(buffer, settings);
  const filename = `${crypto.randomUUID()}.${prepared.ext}`;
  await fs.promises.mkdir(destDir, { recursive: true });
  await fs.promises.writeFile(path.join(destDir, filename), prepared.buffer);
  return { filename, prepared };
}

async function assertOrderAccess(req, order) {
  if (!order) return { status: 404, detail: "Order not found" };
  if (order.user_id && order.user_id !== req.user.id && req.user.role !== "admin") {
    return { status: 403, detail: "Not authorized for this order" };
  }
  return null;
}

function logPaymentVerifyFailure(orderId, reason, extra = {}) {
  console.warn(
    JSON.stringify({
      type: "payment_verify_failed",
      order_id: orderId,
      reason,
      timestamp: nowIso(),
      ...extra,
    })
  );
}


const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 7 * 24 * 3600 * 1000,
  path: "/",
};

// --- Auth ---
api.post("/auth/login", botProtection, async (req, res) => {
  const ip = getClientIp(req);
  const emailNorm = validateEmail(req.body?.email);
  const password = req.body?.password;

  if (!emailNorm || !password) {
    return res.status(400).json({ detail: "Email and password required" });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ detail: "Invalid email or password" });
  }

  const lockout = await checkLoginLockout(db, emailNorm, ip);
  if (lockout.locked) {
    return res.status(429).json({
      detail: "Too many failed attempts. Please try again in a few minutes.",
      retry_after: lockout.retryAfter,
    });
  }

  const user = await db.collection("users").findOne({ email: emailNorm });
  const valid = user && user.role === "admin" && verifyPassword(password, user.password_hash);
  if (!valid) {
    const failure = await recordLoginFailure(db, emailNorm, ip);
    await authDelay(failure.delayMs);
    return res.status(401).json({ detail: "Invalid email or password" });
  }

  await clearLoginFailures(db, emailNorm, ip);
  const token = createToken(user.id, user.email);
  res.cookie("access_token", token, cookieOpts);
  res.json({
    access_token: token,
    user: toPublicUser(user),
  });
});

api.post("/auth/register", registerRateLimiter, (_req, res) => {
  return res.status(410).json({
    detail: "Customer accounts now use Google Sign-In. Please continue with Google.",
  });
});

function googleFrontendRedirect(res, { next, code, error }) {
  return res.redirect(frontendLoginUrl(getFrontendUrl(), { next, code, error }));
}

async function issueGoogleLogin(res, user, nextPath) {
  const token = createToken(user.id, user.email);
  res.cookie("access_token", token, cookieOpts);

  const { raw, key } = createLoginCode();
  await db.collection("auth_security").updateOne(
    { type: "google_login_code", key },
    {
      $set: {
        user_id: user.id,
        expires_at: new Date(Date.now() + LOGIN_CODE_TTL_MS),
        updated_at: nowIso(),
      },
      $setOnInsert: { type: "google_login_code", key, created_at: nowIso() },
    },
    { upsert: true }
  );

  return googleFrontendRedirect(res, { next: nextPath, code: raw });
}

api.get("/auth/google", googleAuthRateLimiter, (req, res) => {
  if (!googleConfigured()) {
    return googleFrontendRedirect(res, { error: "google_not_configured", next: req.query?.next });
  }

  const callbackUrl = getGoogleCallbackUrl(PORT, PUBLIC_BASE_URL);
  const ctx = createOAuthContext({ next: req.query?.next, jwtSecret: JWT_SECRET });
  const client = getOAuthClient(callbackUrl);
  const url = buildGoogleAuthUrl(client, {
    state: ctx.nonce,
    codeChallenge: ctx.codeChallenge,
  });

  res.cookie(OAUTH_COOKIE, ctx.cookieValue, oauthCookieOpts(isProd));
  return res.redirect(url);
});

api.get("/auth/google/callback", googleAuthRateLimiter, async (req, res) => {
  const clearOauthCookie = () => res.clearCookie(OAUTH_COOKIE, { ...oauthCookieOpts(isProd), maxAge: 0 });

  if (req.query?.error) {
    clearOauthCookie();
    const denied = String(req.query.error) === "access_denied";
    return googleFrontendRedirect(res, { error: denied ? "denied" : "google" });
  }

  const ctx = readOAuthContext(req.cookies?.[OAUTH_COOKIE], req.query?.state, JWT_SECRET);
  clearOauthCookie();
  if (!ctx) {
    return googleFrontendRedirect(res, { error: "google" });
  }

  const code = String(req.query?.code || "");
  if (!code) {
    return googleFrontendRedirect(res, { error: "google", next: ctx.next });
  }

  try {
    if (!googleConfigured()) {
      return googleFrontendRedirect(res, { error: "google_not_configured", next: ctx.next });
    }

    const callbackUrl = getGoogleCallbackUrl(PORT, PUBLIC_BASE_URL);
    const client = getOAuthClient(callbackUrl);
    const identity = await verifyGoogleAuthorizationCode(client, {
      code,
      codeVerifier: ctx.codeVerifier,
      clientId: process.env.GOOGLE_CLIENT_ID,
    });

    const ip = getClientIp(req);
    const result = await findOrCreateGoogleCustomer(db.collection("users"), identity, {
      canCreate: async () => {
        const quota = await checkRegisterQuota(db, ip);
        return quota.allowed;
      },
      onCreated: async () => {
        await recordRegisterAttempt(db, ip);
      },
    });

    if (result.error === "admin_not_allowed") {
      return googleFrontendRedirect(res, { error: "admin", next: ctx.next });
    }
    if (result.error === "rate_limit") {
      return googleFrontendRedirect(res, { error: "rate_limit", next: ctx.next });
    }
    if (result.error === "email_unverified") {
      return googleFrontendRedirect(res, { error: "unverified", next: ctx.next });
    }
    if (result.error || !result.user) {
      return googleFrontendRedirect(res, { error: "google", next: ctx.next });
    }
    if (result.user.role !== "customer") {
      return googleFrontendRedirect(res, { error: "admin", next: ctx.next });
    }

    return issueGoogleLogin(res, result.user, ctx.next);
  } catch (err) {
    console.error("Google sign-in failed:", err?.message || "unknown error");
    return googleFrontendRedirect(res, { error: "google", next: ctx.next });
  }
});

api.post("/auth/google/exchange", googleAuthRateLimiter, async (req, res) => {
  const raw = String(req.body?.code || "").trim();
  if (!raw || raw.length > 128) {
    return res.status(400).json({ detail: "Invalid sign-in code" });
  }

  const key = hashLoginCode(raw);
  const rec = await db.collection("auth_security").findOneAndDelete({
    type: "google_login_code",
    key,
  });
  const ticket = rec?.value || rec;
  if (!ticket?.user_id) {
    return res.status(401).json({ detail: "Sign-in expired. Please try Google again." });
  }
  if (ticket.expires_at && new Date(ticket.expires_at) < new Date()) {
    return res.status(401).json({ detail: "Sign-in expired. Please try Google again." });
  }

  const user = await db.collection("users").findOne({ id: ticket.user_id });
  if (!user || user.role !== "customer") {
    return res.status(401).json({ detail: "Sign-in expired. Please try Google again." });
  }

  const token = createToken(user.id, user.email);
  res.cookie("access_token", token, cookieOpts);
  res.json({
    access_token: token,
    user: toPublicUser(user),
  });
});

api.get("/auth/me", getCurrentUser, (req, res) => {
  res.json(toPublicUser(req.user));
});

api.patch("/profile", getCurrentUser, async (req, res) => {
  if (req.user.role !== "customer") {
    return res.status(403).json({ detail: "Customer account required" });
  }
  const name = req.body?.name != null ? clampString(req.body.name, 100) : undefined;
  const phoneRaw = req.body?.phone != null ? req.body.phone : undefined;
  const phone = phoneRaw != null ? validateIndianPhone(phoneRaw) : undefined;
  if (name !== undefined && !name) {
    return res.status(400).json({ detail: "Name cannot be empty" });
  }
  if (phoneRaw != null && !phone) {
    return res.status(400).json({ detail: "Phone must be a 10-digit mobile number" });
  }

  const addressKeys = [
    "address", "house_no_flat", "building_name", "street", "landmark", "country",
    "state", "district", "city_area", "post_office", "pincode",
  ];
  let shipping = {};
  if (addressKeys.some((key) => req.body?.[key] != null)) {
    const normalized = normalizeOrderAddress({ ...req.user, ...req.body });
    if (normalized.error) {
      return res.status(400).json({ detail: normalized.error });
    }
    shipping = normalized.address;
  }
  await saveUserShipping(req.user.id, { name, phone, ...shipping });
  const updated = await db.collection("users").findOne({ id: req.user.id });
  res.json(toPublicUser(updated));
});

api.post("/auth/logout", (req, res) => {
  res.clearCookie("access_token", {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
  res.json({ ok: true });
});

api.get("/postal/pincode/:pincode", getCurrentUser, async (req, res) => {
  const pincode = String(req.params.pincode || "");
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ detail: "Pincode must be 6 digits" });
  }
  try {
    res.json(await fetchIndiaPostPincode(pincode));
  } catch (error) {
    if (error.code === "PINCODE_NOT_FOUND") {
      return res.status(404).json({ detail: error.message });
    }
    if (error.code === "UPSTREAM_TIMEOUT") {
      return res.status(504).json({ detail: "PIN code lookup timed out. Please try again." });
    }
    console.error("India Post pincode lookup failed:", error.message);
    return res.status(502).json({
      detail: "PIN code lookup is temporarily unavailable. Please try again.",
    });
  }
});

// --- Case Types / Categories ---
api.get("/case-types", async (req, res) => {
  const items = await db.collection("case_types").find({}, { projection: { _id: 0 } }).sort({ order: 1, name: 1 }).toArray();
  res.json(items.map((item) => withRelativeMedia(item, ["image"])));
});

api.post("/admin/case-types", getCurrentAdmin, optionalCatalogUpload("categories"), async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ detail: "Name is required" });

  const slug = req.body?.slug
    ? String(req.body.slug).trim()
    : name.toLowerCase().replace(/\s+/g, "-");

  const item = {
    id: crypto.randomUUID(),
    name,
    slug,
    link: String(req.body?.link || `/shop?case_type=${slug}`).trim(),
    image: req.file ? `/api/uploads/categories/${req.file.filename}` : null,
    order: parseInt(req.body?.order) || 0,
    created_at: new Date().toISOString()
  };
  await db.collection("case_types").insertOne(item);
  res.status(201).json(withRelativeMedia(item, ["image"]));
});

api.patch("/admin/case-types/:id", getCurrentAdmin, optionalCatalogUpload("categories"), async (req, res) => {
  const existing = await db.collection("case_types").findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ detail: "Not found" });

  const update = { updated_at: new Date().toISOString() };
  if (req.body.name !== undefined) update.name = String(req.body.name).trim();
  if (req.body.slug !== undefined) update.slug = String(req.body.slug).trim();
  if (req.body.link !== undefined) update.link = String(req.body.link).trim();
  if (req.body.order !== undefined) update.order = parseInt(req.body.order) || 0;
  if (req.file) {
    update.image = `/api/uploads/categories/${req.file.filename}`;
    if (existing.image) {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, existing.image.replace("/api/uploads/", "")));
      } catch (e) {
        // ignore
      }
    }
  }

  await db.collection("case_types").updateOne({ id: req.params.id }, { $set: update });
  const saved = await db.collection("case_types").findOne({ id: req.params.id }, { projection: { _id: 0 } });
  res.json(withRelativeMedia(saved, ["image"]));
});

api.delete("/admin/case-types/:id", getCurrentAdmin, async (req, res) => {
  const item = await db.collection("case_types").findOne({ id: req.params.id });
  if (item && item.image) {
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, item.image.replace("/api/uploads/", "")));
    } catch (e) {
      // ignore
    }
  }
  await db.collection("case_types").deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

// --- Brands ---
api.get("/brands", async (req, res) => {
  const items = await db.collection("brands").find({}, { projection: { _id: 0 } }).sort({ name: 1 }).limit(200).toArray();
  res.json(items.map((item) => withRelativeMedia(item, ["logo_url"])));
});

api.post("/brands", getCurrentAdmin, optionalCatalogUpload("brands"), async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ detail: "Brand name is required" });
  const slug = req.body?.slug
    ? String(req.body.slug).trim()
    : name.toLowerCase().replace(/\s+/g, "-");
  const item = {
    id: crypto.randomUUID(),
    name,
    slug,
    logo_url: req.file
      ? publicUrl(`uploads/brands/${req.file.filename}`)
      : (req.body?.logo_url ?? null),
    created_at: nowIso(),
  };
  await db.collection("brands").insertOne(item);
  res.json(item);
});

api.patch("/brands/:brand_id", getCurrentAdmin, optionalCatalogUpload("brands"), async (req, res) => {
  const existing = await db.collection("brands").findOne({ id: req.params.brand_id });
  if (!existing) return res.status(404).json({ detail: "Brand not found" });

  const update = {};
  if (req.body?.name != null) {
    const name = String(req.body.name).trim();
    if (!name) return res.status(400).json({ detail: "Brand name is required" });
    update.name = name;
  }
  if (req.file) {
    deleteCatalogImageFile(existing.logo_url, "brands");
    update.logo_url = publicUrl(`uploads/brands/${req.file.filename}`);
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ detail: "No fields to update" });
  }

  await db.collection("brands").updateOne({ id: req.params.brand_id }, { $set: update });
  const saved = await db.collection("brands").findOne(
    { id: req.params.brand_id },
    { projection: { _id: 0 } }
  );
  res.json(saved);
});

api.delete("/brands/:brand_id", getCurrentAdmin, async (req, res) => {
  const brand = await db.collection("brands").findOne({ id: req.params.brand_id });
  if (brand) deleteCatalogImageFile(brand.logo_url, "brands");
  const models = await db.collection("models").find({ brand_id: req.params.brand_id }).toArray();
  for (const m of models) deleteCatalogImageFile(m.image_url, "models");
  await db.collection("phone_model_case_types").deleteMany({
    phone_model_id: { $in: models.map((model) => model.id) },
  });
  await db.collection("brands").deleteOne({ id: req.params.brand_id });
  await db.collection("models").deleteMany({ brand_id: req.params.brand_id });
  res.json({ ok: true });
});

// --- Models ---
async function parseModelCaseTypes(value) {
  const normalized = normalizeModelCaseTypes(value);
  if (normalized.error || normalized.value === undefined) return normalized;
  const ids = normalized.value.map((entry) => entry.case_type_id);
  const count = await db.collection("products").countDocuments({ id: { $in: ids } });
  if (count !== ids.length) {
    return { error: "One or more selected case types do not exist" };
  }
  return normalized;
}

async function replaceModelCaseTypes(modelId, entries) {
  const collection = db.collection("phone_model_case_types");
  const selectedIds = entries.map((entry) => entry.case_type_id);
  const timestamp = nowIso();

  for (const entry of entries) {
    await collection.updateOne(
      { phone_model_id: modelId, case_type_id: entry.case_type_id },
      {
        $set: {
          price: entry.price,
          status: entry.status,
          updated_at: timestamp,
        },
        $setOnInsert: {
          id: crypto.randomUUID(),
          phone_model_id: modelId,
          case_type_id: entry.case_type_id,
          created_at: timestamp,
        },
      },
      { upsert: true }
    );
  }

  await collection.deleteMany({
    phone_model_id: modelId,
    ...(selectedIds.length ? { case_type_id: { $nin: selectedIds } } : {}),
  });
}

api.get("/models", async (req, res) => {
  const q = req.query.brand_id ? { brand_id: req.query.brand_id } : {};
  const items = await db.collection("models").find(q, { projection: { _id: 0 } }).sort({ name: 1 }).limit(500).toArray();
  res.json(items.map((item) => withRelativeMedia(item, ["image_url"])));
});

api.post("/models", getCurrentAdmin, optionalCatalogUpload("models"), async (req, res) => {
  const brand_id = String(req.body?.brand_id || "").trim();
  const name = String(req.body?.name || "").trim();
  if (!brand_id) return res.status(400).json({ detail: "brand_id is required" });
  if (!name) return res.status(400).json({ detail: "Model name is required" });
  const brand = await db.collection("brands").findOne({ id: brand_id });
  if (!brand) return res.status(404).json({ detail: "Brand not found" });
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const duplicate = await db.collection("models").findOne({
    brand_id,
    name: { $regex: new RegExp(`^${escapedName}$`, "i") },
  });
  if (duplicate) {
    return res.status(400).json({ detail: `Model "${name}" already exists for this brand` });
  }
  const caseTypes = await parseModelCaseTypes(req.body?.case_types);
  if (caseTypes.error) return res.status(400).json({ detail: caseTypes.error });
  const item = {
    id: crypto.randomUUID(),
    brand_id,
    name,
    image_url: req.file
      ? publicUrl(`uploads/models/${req.file.filename}`)
      : (req.body?.image_url ?? null),
    created_at: nowIso(),
  };
  await db.collection("models").insertOne(item);
  if (caseTypes.value !== undefined) {
    await replaceModelCaseTypes(item.id, caseTypes.value);
  }
  res.json(item);
});

api.patch("/models/:model_id", getCurrentAdmin, optionalCatalogUpload("models"), async (req, res) => {
  const existing = await db.collection("models").findOne({ id: req.params.model_id });
  if (!existing) return res.status(404).json({ detail: "Model not found" });
  const caseTypes = await parseModelCaseTypes(req.body?.case_types);
  if (caseTypes.error) return res.status(400).json({ detail: caseTypes.error });

  const update = {};
  if (req.body?.name != null) {
    const name = String(req.body.name).trim();
    if (!name) return res.status(400).json({ detail: "Model name is required" });
    const escapedPatchName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const duplicate = await db.collection("models").findOne({
      brand_id: existing.brand_id,
      id: { $ne: existing.id },
      name: { $regex: new RegExp(`^${escapedPatchName}$`, "i") },
    });
    if (duplicate) {
      return res.status(400).json({ detail: `Model "${name}" already exists for this brand` });
    }
    update.name = name;
  }
  if (req.file) {
    deleteCatalogImageFile(existing.image_url, "models");
    update.image_url = publicUrl(`uploads/models/${req.file.filename}`);
  }

  if (Object.keys(update).length === 0 && caseTypes.value === undefined) {
    return res.status(400).json({ detail: "No fields to update" });
  }

  if (Object.keys(update).length > 0) {
    await db.collection("models").updateOne({ id: req.params.model_id }, { $set: update });
  }
  if (caseTypes.value !== undefined) {
    await replaceModelCaseTypes(req.params.model_id, caseTypes.value);
  }
  const saved = await db.collection("models").findOne(
    { id: req.params.model_id },
    { projection: { _id: 0 } }
  );
  res.json(saved);
});

api.delete("/models/:model_id", getCurrentAdmin, async (req, res) => {
  const model = await db.collection("models").findOne({ id: req.params.model_id });
  if (model) deleteCatalogImageFile(model.image_url, "models");
  await db.collection("phone_model_case_types").deleteMany({ phone_model_id: req.params.model_id });
  await db.collection("models").deleteOne({ id: req.params.model_id });
  res.json({ ok: true });
});

api.get("/admin/models/:model_id/case-types", getCurrentAdmin, async (req, res) => {
  const model = await db.collection("models").findOne({ id: req.params.model_id });
  if (!model) return res.status(404).json({ detail: "Model not found" });
  const items = await db.collection("phone_model_case_types")
    .find({ phone_model_id: model.id }, { projection: { _id: 0 } })
    .sort({ created_at: 1 })
    .toArray();
  res.json(items);
});

// --- Products ---
api.get("/products", async (req, res) => {
  const modelId = String(req.query.model_id || "").trim();
  if (!modelId) {
    return res.status(400).json({ detail: "model_id is required" });
  }
  const model = await db.collection("models").findOne({ id: modelId });
  if (!model) return res.status(404).json({ detail: "Model not found" });
  if (req.query.brand_id && model.brand_id !== String(req.query.brand_id)) {
    return res.status(400).json({ detail: "Model does not belong to this brand" });
  }
  const relations = await db.collection("phone_model_case_types")
    .find({ phone_model_id: modelId, status: { $ne: false } }, { projection: { _id: 0 } })
    .toArray();
  const relationByProduct = new Map(relations.map((entry) => [entry.case_type_id, entry]));
  const items = await db.collection("products")
    .find({
      id: { $in: relations.map((entry) => entry.case_type_id) },
      is_active: { $ne: false },
    }, { projection: { _id: 0 } })
    .limit(100)
    .toArray();
  const configured = items
    .map((item) => withModelPrice(item, relationByProduct.get(item.id)))
    .sort((a, b) => a.price - b.price);
  res.json(configured.map((item) => withRelativeMedia(item, ["image_url"])));
});

api.get("/admin/products", getCurrentAdmin, async (req, res) => {
  const items = await db.collection("products")
    .find({}, { projection: { _id: 0 } })
    .sort({ name: 1 })
    .limit(100)
    .toArray();
  res.json(items.map((item) => withRelativeMedia(item, ["image_url"])));
});

api.post("/products", getCurrentAdmin, optionalCatalogUpload("products"), async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ detail: "Case type name is required" });
  const description = String(req.body?.description || "").trim();
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const is_active = req.body?.is_active == null
    ? true
    : String(req.body.is_active).toLowerCase() === "true";
  const item = {
    id: crypto.randomUUID(),
    name,
    slug,
    description,
    is_active,
    image_url: req.file
      ? publicUrl(`uploads/products/${req.file.filename}`)
      : (req.body?.image_url ?? null),
    created_at: nowIso(),
  };
  await db.collection("products").insertOne(item);
  res.json(item);
});

api.patch("/products/:product_id", getCurrentAdmin, optionalCatalogUpload("products"), async (req, res) => {
  const existing = await db.collection("products").findOne({ id: req.params.product_id });
  if (!existing) return res.status(404).json({ detail: "Product not found" });

  const update = {};
  if (req.body?.name != null) {
    const name = String(req.body.name).trim();
    if (!name) return res.status(400).json({ detail: "Case type name is required" });
    update.name = name;
    update.slug = name.toLowerCase().replace(/\s+/g, "-");
  }
  if (req.body?.description != null) {
    update.description = String(req.body.description).trim();
  }
  if (req.body?.is_active != null) {
    update.is_active = String(req.body.is_active).toLowerCase() === "true";
  }
  if (req.file) {
    deleteCatalogImageFile(existing.image_url, "products");
    update.image_url = publicUrl(`uploads/products/${req.file.filename}`);
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ detail: "No fields to update" });
  }

  await db.collection("products").updateOne({ id: req.params.product_id }, { $set: update });
  const saved = await db.collection("products").findOne(
    { id: req.params.product_id },
    { projection: { _id: 0 } }
  );
  res.json(saved);
});

api.delete("/products/:product_id", getCurrentAdmin, async (req, res) => {
  const product = await db.collection("products").findOne({ id: req.params.product_id });
  if (product) deleteCatalogImageFile(product.image_url, "products");
  await db.collection("products").deleteOne({ id: req.params.product_id });
  await db.collection("phone_model_case_types").deleteMany({ case_type_id: req.params.product_id });
  res.json({ ok: true });
});

// --- Uploads ---
api.post("/upload/design", uploadRateLimiter, handleUpload("designs", { compress: false }), (req, res) => {
  if (!req.file) return res.status(400).json({ detail: "No file uploaded" });
  res.json({
    url: publicUrl(`uploads/designs/${req.file.filename}`),
    compressed: false,
  });
});

api.post("/upload/payment", uploadRateLimiter, getCurrentUser, async (req, res, next) => {
  const settings = await getMainSettings();
  if (normalizePaymentMethod(settings.payment_method) !== "manual_upi") {
    return res.status(400).json({
      detail: "Manual UPI uploads are disabled. Please complete payment via Razorpay.",
    });
  }
  return handleUpload("payments")(req, res, next);
}, (req, res) => {
  if (!req.file) return res.status(400).json({ detail: "No file uploaded" });
  res.json({ url: publicUrl(`uploads/payments/${req.file.filename}`) });
});

api.post("/upload/preview", uploadRateLimiter, handleUpload("designs", { compress: false }), (req, res) => {
  if (!req.file) return res.status(400).json({ detail: "No file uploaded" });
  res.json({
    url: publicUrl(`uploads/designs/${req.file.filename}`),
    compressed: false,
  });
});

// Compressed WebP upload. The stored name is always a UUID — never the client filename.
// Browser compression is optional; this route still converts because clients can skip it.
api.post("/upload", uploadRateLimiter, getCurrentUser, handleCompressedUpload, async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: "No image uploaded" });

  try {
    const settings = await getImageSettings();
    const stored = await storePreparedUpload(req.file.buffer, settings, UPLOAD_DIR);
    res.json({
      url: publicUploadPath(stored.filename),
      originalKB: kilobytes(req.file.buffer.length),
      webpKB: stored.prepared.compressed ? kilobytes(stored.prepared.buffer.length) : null,
      compressed: stored.prepared.compressed,
      width: stored.prepared.width,
      height: stored.prepared.height,
      variants: null,
    });
  } catch (err) {
    if (err instanceof ImageInputError) {
      return res.status(400).json({ detail: err.message });
    }
    console.error("Image upload failed");
    return res.status(500).json({ detail: "Could not process image" });
  }
});

// Same pipeline as /upload, plus thumb / medium / large variants.
api.post("/products/:id/image", uploadRateLimiter, getCurrentAdmin, handleCompressedUpload, async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: "No image uploaded" });

  const product = await db.collection("products").findOne({ id: req.params.id }, { projection: { id: 1 } });
  if (!product) return res.status(404).json({ detail: "Product not found" });

  const baseName = crypto.randomUUID();
  try {
    const settings = await getImageSettings();
    if (!settings.image_compress_enabled) {
      const stored = await storePreparedUpload(req.file.buffer, settings, UPLOAD_DIR);
      return res.json({
        url: publicUploadPath(stored.filename),
        originalKB: kilobytes(req.file.buffer.length),
        webpKB: null,
        compressed: false,
        width: stored.prepared.width,
        height: stored.prepared.height,
        variants: null,
      });
    }
    const filenames = await createVariants(req.file.buffer, baseName, UPLOAD_DIR, settings);
    const variants = {
      thumb: publicUploadPath(filenames.thumb),
      medium: publicUploadPath(filenames.medium),
      large: publicUploadPath(filenames.large),
    };
    const largeStat = await fs.promises.stat(path.join(UPLOAD_DIR, filenames.large));

    // Save the paths in the database, for example a product_images table:
    //   id, product_id, thumb, medium, large, created_at
    // INSERT INTO product_images (id, product_id, thumb, medium, large, created_at)
    // VALUES (:id, :product_id, :thumb, :medium, :large, :created_at);

    res.json({
      url: variants.large,
      originalKB: kilobytes(req.file.buffer.length),
      webpKB: kilobytes(largeStat.size),
      variants,
    });
  } catch (err) {
    if (err instanceof ImageInputError) {
      return res.status(400).json({ detail: err.message });
    }
    console.error("Product image upload failed");
    return res.status(500).json({ detail: "Could not process image" });
  }
});

// --- Templates ---
// Legacy overlay slugs from the old hardcoded admin dropdown (silicone/matte/etc.)
// vs real catalog product slugs (silicone-case/matte-case/etc.).
const LEGACY_CASE_TYPE_SLUGS = {
  "silicone-case": "silicone",
  "transparent-case": "transparent",
  "matte-case": "matte",
};
const DEFAULT_TEMPLATE_SLUG = "_default";

/** Parse multipart/json flags such as is_default=true */

function isTruthyFlag(val) {
  return val === true || val === "true" || val === "1" || val === 1;
}

async function findModelOverlayTemplate(model_id, case_type_slug) {
  if (!model_id || !case_type_slug) return null;
  const query = { model_id, enabled: true, is_default: { $ne: true } };
  let tpl = await db.collection("templates").findOne(
    { ...query, case_type_slug },
    { projection: { _id: 0 } }
  );
  if (!tpl) {
    const legacySlug = LEGACY_CASE_TYPE_SLUGS[case_type_slug];
    if (legacySlug) {
      tpl = await db.collection("templates").findOne(
        { ...query, case_type_slug: legacySlug },
        { projection: { _id: 0 } }
      );
    }
  }
  return tpl;
}

async function findDefaultOverlayTemplate() {
  return db.collection("templates").findOne(
    { is_default: true, enabled: true },
    { projection: { _id: 0 } }
  );
}

async function resolvePrintTemplate({ template_id, model_id, case_type_slug } = {}) {
  if (template_id) {
    const byId = await db.collection("templates").findOne(
      { id: template_id, enabled: true },
      { projection: { _id: 0 } }
    );
    if (byId) return byId;
  }
  const specific = await findModelOverlayTemplate(model_id, case_type_slug);
  if (specific) return specific;
  return findDefaultOverlayTemplate();
}

api.get("/templates", async (req, res) => {
  const { model_id, case_type_slug } = req.query;
  if (!model_id || !case_type_slug) {
    return res.status(400).json({ detail: "model_id and case_type_slug required" });
  }
  const tpl = await resolvePrintTemplate({ model_id, case_type_slug });
  if (!tpl) return res.status(404).json({ error: "no_template" });
  res.json(enrichTemplate(tpl));
});

api.get("/admin/templates", getCurrentAdmin, async (req, res) => {
  const templates = await db.collection("templates").find({}, { projection: { _id: 0 } }).toArray();
  const brandIds = [...new Set(templates.map((t) => t.brand_id).filter(Boolean))];
  const modelIds = [...new Set(templates.map((t) => t.model_id).filter(Boolean))];
  const [brands, models] = await Promise.all([
    db.collection("brands").find({ id: { $in: brandIds } }, { projection: { _id: 0, id: 1, name: 1 } }).toArray(),
    db.collection("models").find({ id: { $in: modelIds } }, { projection: { _id: 0, id: 1, name: 1 } }).toArray(),
  ]);
  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.name]));
  const modelMap = Object.fromEntries(models.map((m) => [m.id, m.name]));
  const enriched = templates
    .map((t) => ({
      ...enrichTemplate(t),
      is_default: Boolean(t.is_default),
      brand_name: t.is_default ? "Default" : (brandMap[t.brand_id] || ""),
      model_name: t.is_default ? "All models & case types" : (modelMap[t.model_id] || ""),
    }))
    .sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      const bc = a.brand_name.localeCompare(b.brand_name);
      if (bc !== 0) return bc;
      const mc = a.model_name.localeCompare(b.model_name);
      if (mc !== 0) return mc;
      return String(a.case_type_slug || "").localeCompare(String(b.case_type_slug || ""));
    });
  res.json(enriched);
});

api.post("/admin/templates", getCurrentAdmin, handleTemplateUpload, async (req, res) => {
  const isDefault = isTruthyFlag(req.body?.is_default);
  const { model_id, brand_id, case_type_slug } = req.body || {};
  if (!isDefault && (!model_id || !brand_id || !case_type_slug)) {
    return res.status(400).json({ detail: "model_id, brand_id, and case_type_slug required" });
  }
  if (!isDefault) {
    const [brand, model, product] = await Promise.all([
      db.collection("brands").findOne({ id: brand_id }),
      db.collection("models").findOne({ id: model_id, brand_id }),
      db.collection("products").findOne({ slug: case_type_slug }),
    ]);
    if (!brand) return res.status(404).json({ detail: "Brand not found" });
    if (!model) return res.status(400).json({ detail: "Model does not belong to this brand" });
    const relation = product && await db.collection("phone_model_case_types").findOne({
      phone_model_id: model_id,
      case_type_id: product.id,
    });
    if (!modelCaseTypeIsEnabled(relation, product)) {
      return res.status(400).json({ detail: "This case type is not enabled for the selected model" });
    }
  }
  const dims = parseCanvasDims(req.body);
  if (dims.error) return res.status(400).json({ detail: dims.error });
  const printAreaResult = parsePrintAreaInput(req.body, dims.canvas_width, dims.canvas_height);
  if (printAreaResult.error) return res.status(400).json({ detail: printAreaResult.error });
  const zoneResult = parseExclusionZonesInput(req.body);
  if (zoneResult.error) return res.status(400).json({ detail: zoneResult.error });

  if (req.file) {
    const overlay = await assertOverlayPng(req.file.path, {
      width: dims.canvas_width,
      height: dims.canvas_height,
    });
    if (overlay.error) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ detail: overlay.error });
    }
  }

  const existing = isDefault
    ? await db.collection("templates").findOne({ is_default: true })
    : await db.collection("templates").findOne({
        model_id,
        case_type_slug,
        is_default: { $ne: true },
      });
  const ts = nowIso();
  const zoneFields = {
    print_area: printAreaResult.print_area,
    exclusion_zones: zoneResult.zones,
    mask_zones: zoneResult.zones,
    camera_zone: zoneResult.zones[0] || null,
  };

  if (existing) {
    if (!req.file && !existing.file_path) {
      return res.status(400).json({ detail: "No file uploaded" });
    }
    const filePath = req.file
      ? `uploads/templates/${req.file.filename}`
      : existing.file_path;
    const archived = [...(existing.archived_paths || [])];
    if (req.file && existing.file_path) archived.push(existing.file_path);
    const update = {
      brand_id: isDefault ? null : brand_id,
      model_id: isDefault ? null : model_id,
      case_type_slug: isDefault ? DEFAULT_TEMPLATE_SLUG : case_type_slug,
      is_default: isDefault,
      file_path: filePath,
      canvas_width: dims.canvas_width,
      canvas_height: dims.canvas_height,
      ...zoneFields,
      version: (existing.version || 1) + 1,
      archived_paths: archived,
      enabled: true,
      updated_at: ts,
    };
    await db.collection("templates").updateOne({ id: existing.id }, { $set: update });
    const saved = await db.collection("templates").findOne({ id: existing.id }, { projection: { _id: 0 } });
    return res.json(enrichTemplate(saved));
  }

  if (!req.file) return res.status(400).json({ detail: "No file uploaded" });
  const filePath = `uploads/templates/${req.file.filename}`;
  const item = {
    id: crypto.randomUUID(),
    model_id: isDefault ? null : model_id,
    brand_id: isDefault ? null : brand_id,
    case_type_slug: isDefault ? DEFAULT_TEMPLATE_SLUG : case_type_slug,
    is_default: isDefault,
    file_path: filePath,
    canvas_width: dims.canvas_width,
    canvas_height: dims.canvas_height,
    ...zoneFields,
    version: 1,
    archived_paths: [],
    enabled: true,
    created_at: ts,
    updated_at: ts,
  };
  await db.collection("templates").insertOne(item);
  res.json(enrichTemplate(item));
});

api.post("/admin/templates/:template_id/clone", getCurrentAdmin, async (req, res) => {
  const source = await db.collection("templates").findOne({ id: req.params.template_id });
  if (!source) return res.status(404).json({ detail: "Template not found" });
  if (source.is_default) {
    return res.status(400).json({ detail: "Default templates apply to all models. Upload a model-specific overlay instead of cloning." });
  }
  const { target_model_id, target_brand_id } = req.body || {};
  if (!target_model_id || !target_brand_id) {
    return res.status(400).json({ detail: "target_model_id and target_brand_id required" });
  }
  const [targetBrand, targetModel, product] = await Promise.all([
    db.collection("brands").findOne({ id: target_brand_id }),
    db.collection("models").findOne({ id: target_model_id, brand_id: target_brand_id }),
    db.collection("products").findOne({ slug: source.case_type_slug }),
  ]);
  if (!targetBrand) return res.status(404).json({ detail: "Target brand not found" });
  if (!targetModel) return res.status(400).json({ detail: "Target model does not belong to this brand" });
  const targetRelation = product && await db.collection("phone_model_case_types").findOne({
    phone_model_id: target_model_id,
    case_type_id: product.id,
  });
  if (!modelCaseTypeIsEnabled(targetRelation, product)) {
    return res.status(400).json({ detail: "This case type is not enabled for the target model" });
  }
  const srcFile = path.join(ROOT_DIR, source.file_path);
  if (!fs.existsSync(srcFile)) {
    return res.status(400).json({ detail: "Source template file missing" });
  }
  const newFilename = `${crypto.randomUUID().replace(/-/g, "")}.png`;
  const destFile = path.join(UPLOAD_DIR, "templates", newFilename);
  fs.copyFileSync(srcFile, destFile);
  const ts = nowIso();
  const item = {
    id: crypto.randomUUID(),
    model_id: target_model_id,
    brand_id: target_brand_id,
    case_type_slug: source.case_type_slug,
    file_path: `uploads/templates/${newFilename}`,
    canvas_width: source.canvas_width,
    canvas_height: source.canvas_height,
    print_area: source.print_area || null,
    exclusion_zones: source.exclusion_zones || normalizeExclusionZones(source),
    camera_zone: source.camera_zone || (source.exclusion_zones && source.exclusion_zones[0]) || null,
    mask_zones: source.mask_zones || source.exclusion_zones || normalizeExclusionZones(source),
    version: 1,
    archived_paths: [],
    enabled: true,
    is_default: false,
    created_at: ts,
    updated_at: ts,
  };
  await db.collection("templates").insertOne(item);
  res.json(enrichTemplate(item));
});

api.patch("/admin/templates/:template_id", getCurrentAdmin, async (req, res) => {
  if (req.body.enabled == null) {
    return res.status(400).json({ detail: "enabled field required" });
  }
  const enabled = Boolean(req.body.enabled);
  const result = await db.collection("templates").updateOne(
    { id: req.params.template_id },
    { $set: { enabled, updated_at: nowIso() } }
  );
  if (result.matchedCount === 0) return res.status(404).json({ detail: "Template not found" });
  const tpl = await db.collection("templates").findOne({ id: req.params.template_id }, { projection: { _id: 0 } });
  res.json(tpl);
});

api.delete("/admin/templates/:template_id", getCurrentAdmin, async (req, res) => {
  const result = await db.collection("templates").deleteOne({ id: req.params.template_id });
  if (result.deletedCount === 0) return res.status(404).json({ detail: "Template not found" });
  res.json({ ok: true });
});

// --- Contact ---
api.post("/contact", botProtection, async (req, res) => {
  const name = clampString(req.body?.name, 120);
  const email = validateEmail(req.body?.email);
  const phoneRaw = String(req.body?.phone || "").trim();
  const phone = phoneRaw ? validateIndianPhone(phoneRaw) : null;
  const subject = clampString(req.body?.subject, 200);
  const message = clampString(req.body?.message, 2000);

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ detail: "Name, email, subject, and message are required" });
  }
  if (phoneRaw && !phone) {
    return res.status(400).json({ detail: "Enter a valid 10-digit mobile number" });
  }

  const doc = {
    id: crypto.randomUUID().replace(/-/g, ""),
    name,
    email,
    phone: phone || null,
    subject,
    message,
    read: false,
    ip: getClientIp(req),
    created_at: new Date().toISOString(),
  };
  await db.collection("contact_messages").insertOne(doc);
  res.json({ ok: true, message: "Thanks! We'll get back to you soon." });
});

api.get("/admin/contact-messages", getCurrentAdmin, async (req, res) => {
  const messages = await db.collection("contact_messages")
    .find({}, { projection: { _id: 0, ip: 0 } })
    .sort({ created_at: -1 })
    .limit(500)
    .toArray();
  res.json(messages);
});

api.patch("/admin/contact-messages/:id", getCurrentAdmin, async (req, res) => {
  const { read } = req.body || {};
  if (typeof read !== "boolean") {
    return res.status(400).json({ detail: "read (boolean) is required" });
  }
  const result = await db.collection("contact_messages").findOneAndUpdate(
    { id: req.params.id },
    { $set: { read } },
    { returnDocument: "after", projection: { _id: 0, ip: 0 } }
  );
  if (!result) return res.status(404).json({ detail: "Message not found" });
  res.json(result);
});

// --- Promo codes ---
api.post("/promo-codes/validate", async (req, res) => {
  const { code } = req.body || {};
  const lines = Array.isArray(req.body?.items) && req.body.items.length
    ? req.body.items
    : [req.body];
  if (!code || !lines[0]?.brand_id || !lines[0]?.model_id || !lines[0]?.product_id) {
    return res.status(400).json({
      detail: "code and a valid brand, model, and case type selection are required",
    });
  }

  try {
    const { subtotal } = await priceOrderLines(lines);
    const { promo, discount_amount, final_amount } = await validatePromoCode(code, subtotal);
    res.json({
      valid: true,
      code: promo.code,
      discount_percent: promo.discount_percent,
      subtotal,
      discount_amount,
      final_amount,
    });
  } catch (err) {
    return res.status(err.status || 400).json({ detail: err.message });
  }
});

api.get("/admin/promo-codes", getCurrentAdmin, async (req, res) => {
  const items = await db.collection("promo_codes")
    .find({}, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .limit(500)
    .toArray();
  res.json(items);
});

api.get("/admin/promo-codes/generate", getCurrentAdmin, async (req, res) => {
  try {
    const code = await generateUniquePromoCode();
    res.json({ code });
  } catch (err) {
    res.status(500).json({ detail: err.message || "Could not generate promo code" });
  }
});

api.post("/admin/promo-codes", getCurrentAdmin, async (req, res) => {
  const { code, discount_percent, enabled, expires_at, max_uses, min_amount, auto_generate } = req.body || {};
  let normalized = normalizePromoCode(code);
  if (!normalized && auto_generate) {
    try {
      normalized = await generateUniquePromoCode();
    } catch (err) {
      return res.status(500).json({ detail: err.message || "Could not generate promo code" });
    }
  }
  if (!normalized) return res.status(400).json({ detail: "Code is required" });
  const pct = Number(discount_percent);
  if (Number.isNaN(pct) || pct < 1 || pct > 100) {
    return res.status(400).json({ detail: "discount_percent must be between 1 and 100" });
  }

  const existing = await db.collection("promo_codes").findOne({ code: normalized });
  if (existing) return res.status(400).json({ detail: "Promo code already exists" });

  const ts = nowIso();
  const item = {
    id: crypto.randomUUID(),
    code: normalized,
    discount_percent: pct,
    enabled: enabled !== false,
    expires_at: expires_at || null,
    max_uses: max_uses != null && max_uses !== "" ? Number(max_uses) : null,
    used_count: 0,
    min_amount: min_amount != null && min_amount !== "" ? Number(min_amount) : null,
    created_at: ts,
    updated_at: ts,
  };
  await db.collection("promo_codes").insertOne(item);
  res.json(item);
});

api.patch("/admin/promo-codes/:id", getCurrentAdmin, async (req, res) => {
  const promo = await db.collection("promo_codes").findOne({ id: req.params.id });
  if (!promo) return res.status(404).json({ detail: "Promo code not found" });

  const update = { updated_at: nowIso() };
  if (req.body.code != null) {
    const normalized = normalizePromoCode(req.body.code);
    if (!normalized) return res.status(400).json({ detail: "Code is required" });
    const dup = await db.collection("promo_codes").findOne({ code: normalized, id: { $ne: promo.id } });
    if (dup) return res.status(400).json({ detail: "Promo code already exists" });
    update.code = normalized;
  }
  if (req.body.discount_percent != null) {
    const pct = Number(req.body.discount_percent);
    if (Number.isNaN(pct) || pct < 1 || pct > 100) {
      return res.status(400).json({ detail: "discount_percent must be between 1 and 100" });
    }
    update.discount_percent = pct;
  }
  if (req.body.enabled != null) update.enabled = Boolean(req.body.enabled);
  if (req.body.expires_at !== undefined) update.expires_at = req.body.expires_at || null;
  if (req.body.max_uses !== undefined) {
    update.max_uses = req.body.max_uses != null && req.body.max_uses !== "" ? Number(req.body.max_uses) : null;
  }
  if (req.body.min_amount !== undefined) {
    update.min_amount = req.body.min_amount != null && req.body.min_amount !== "" ? Number(req.body.min_amount) : null;
  }

  if (Object.keys(update).length === 1) {
    return res.status(400).json({ detail: "No fields to update" });
  }

  await db.collection("promo_codes").updateOne({ id: req.params.id }, { $set: update });
  const saved = await db.collection("promo_codes").findOne({ id: req.params.id }, { projection: { _id: 0 } });
  res.json(saved);
});

api.delete("/admin/promo-codes/:id", getCurrentAdmin, async (req, res) => {
  const promo = await db.collection("promo_codes").findOne({ id: req.params.id });
  if (!promo) return res.status(404).json({ detail: "Promo code not found" });
  if (promo.used_count > 0) {
    return res.status(400).json({ detail: "Cannot delete a promo code that has been used. Disable it instead." });
  }
  await db.collection("promo_codes").deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

// --- Popup offers ---
api.get("/popup-offers/active", async (req, res) => {
  const now = new Date();
  const items = await db.collection("popup_offers")
    .find({ enabled: true }, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .limit(50)
    .toArray();
  const offer = items.find((o) => isPopupOfferActive(o, now)) || null;
  res.json({ offer: offer ? withRelativeMedia(offer, ["image_url"]) : null });
});

api.get("/admin/popup-offers", getCurrentAdmin, async (req, res) => {
  const items = await db.collection("popup_offers")
    .find({}, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();
  res.json(items);
});

api.post("/admin/popup-offers", getCurrentAdmin, handleUpload("popups"), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: "Image file is required" });
  const parsed = parsePopupFormFields(req.body);
  if (parsed.error) return res.status(400).json({ detail: parsed.error });
  if (!parsed.title) return res.status(400).json({ detail: "Title is required" });

  const ts = nowIso();
  const item = {
    id: crypto.randomUUID(),
    title: parsed.title,
    image_url: publicUrl(`uploads/popups/${req.file.filename}`),
    link_url: parsed.link_url,
    enabled: parsed.enabled,
    starts_at: parsed.starts_at,
    ends_at: parsed.ends_at,
    created_at: ts,
    updated_at: ts,
  };
  await db.collection("popup_offers").insertOne(item);
  res.json(item);
});

api.patch("/admin/popup-offers/:id", getCurrentAdmin, optionalPopupUpload, async (req, res) => {
  const existing = await db.collection("popup_offers").findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ detail: "Popup offer not found" });

  const update = { updated_at: nowIso() };

  if (req.body.title != null) {
    const title = String(req.body.title).trim();
    if (!title) return res.status(400).json({ detail: "Title is required" });
    update.title = title;
  }
  if (req.body.link_url !== undefined) {
    const v = validateLinkUrl(req.body.link_url);
    if (v?.error) return res.status(400).json({ detail: v.error });
    update.link_url = v;
  }
  if (req.body.enabled !== undefined) {
    update.enabled = parseBoolField(req.body.enabled);
  }
  if (req.body.starts_at !== undefined) update.starts_at = parseOptionalIso(req.body.starts_at);
  if (req.body.ends_at !== undefined) update.ends_at = parseOptionalIso(req.body.ends_at);

  if (req.file) {
    deletePopupImageFile(existing.image_url);
    update.image_url = publicUrl(`uploads/popups/${req.file.filename}`);
  }

  if (Object.keys(update).length === 1) {
    return res.status(400).json({ detail: "No fields to update" });
  }

  await db.collection("popup_offers").updateOne({ id: req.params.id }, { $set: update });
  const saved = await db.collection("popup_offers").findOne({ id: req.params.id }, { projection: { _id: 0 } });
  res.json(saved);
});

api.delete("/admin/popup-offers/:id", getCurrentAdmin, async (req, res) => {
  const offer = await db.collection("popup_offers").findOne({ id: req.params.id });
  if (!offer) return res.status(404).json({ detail: "Popup offer not found" });
  deletePopupImageFile(offer.image_url);
  await db.collection("popup_offers").deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

// --- Homepage hero slides ---
api.get("/hero-slides", async (_req, res) => {
  const items = await db.collection("hero_slides")
    .find({ enabled: true }, { projection: { _id: 0 } })
    .sort({ order: 1, created_at: 1 })
    .limit(20)
    .toArray();
  res.json({
    slides: items.map((item) => withRelativeMedia(toPublicHeroSlide(item), ["image_url"])),
  });
});

api.get("/admin/hero-slides", getCurrentAdmin, async (_req, res) => {
  const items = await db.collection("hero_slides")
    .find({}, { projection: { _id: 0 } })
    .sort({ order: 1, created_at: 1 })
    .limit(50)
    .toArray();
  res.json(items.map((item) => withRelativeMedia(item, ["image_url"])));
});

api.post("/admin/hero-slides", getCurrentAdmin, handleUpload("hero"), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: "Image file is required" });
  const parsed = parseHeroFormFields(req.body);
  if (!parsed.title) return res.status(400).json({ detail: "Title is required" });

  const ts = nowIso();
  const item = {
    id: crypto.randomUUID(),
    title: parsed.title,
    alt: parsed.alt,
    image_url: publicUrl(`uploads/hero/${req.file.filename}`),
    fit: parsed.fit,
    enabled: parsed.enabled,
    order: await nextHeroSlideOrder(),
    created_at: ts,
    updated_at: ts,
  };
  await db.collection("hero_slides").insertOne(item);
  res.json(withRelativeMedia(item, ["image_url"]));
});

api.patch("/admin/hero-slides/:id", getCurrentAdmin, optionalHeroUpload, async (req, res) => {
  const existing = await db.collection("hero_slides").findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ detail: "Hero slide not found" });

  const update = { updated_at: nowIso() };
  if (req.body.title != null) {
    const title = String(req.body.title).trim();
    if (!title) return res.status(400).json({ detail: "Title is required" });
    update.title = title;
  }
  if (req.body.alt !== undefined) {
    update.alt = String(req.body.alt || update.title || existing.title).trim();
  }
  if (req.body.enabled !== undefined) update.enabled = parseBoolField(req.body.enabled);
  if (req.body.fit !== undefined) update.fit = parseFit(req.body.fit);
  if (req.body.order !== undefined) {
    const order = Number(req.body.order);
    if (!Number.isFinite(order) || order < 0) {
      return res.status(400).json({ detail: "order must be a positive number" });
    }
    update.order = order;
  }
  if (req.file) {
    deleteHeroImageFile(existing.image_url);
    update.image_url = publicUrl(`uploads/hero/${req.file.filename}`);
  }
  if (Object.keys(update).length === 1) {
    return res.status(400).json({ detail: "No fields to update" });
  }

  await db.collection("hero_slides").updateOne({ id: req.params.id }, { $set: update });
  const saved = await db.collection("hero_slides").findOne({ id: req.params.id }, { projection: { _id: 0 } });
  res.json(withRelativeMedia(saved, ["image_url"]));
});

api.post("/admin/hero-slides/:id/move", getCurrentAdmin, async (req, res) => {
  const direction = String(req.body?.direction || "").toLowerCase();
  if (direction !== "up" && direction !== "down") {
    return res.status(400).json({ detail: "direction must be up or down" });
  }
  const items = await db.collection("hero_slides")
    .find({}, { projection: { _id: 0, id: 1, order: 1 } })
    .sort({ order: 1, created_at: 1 })
    .toArray();
  const index = items.findIndex((item) => item.id === req.params.id);
  if (index < 0) return res.status(404).json({ detail: "Hero slide not found" });
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= items.length) {
    return res.json({ ok: true });
  }
  const current = items[index];
  const neighbor = items[swapWith];
  await db.collection("hero_slides").updateOne({ id: current.id }, { $set: { order: neighbor.order, updated_at: nowIso() } });
  await db.collection("hero_slides").updateOne({ id: neighbor.id }, { $set: { order: current.order, updated_at: nowIso() } });
  res.json({ ok: true });
});

api.delete("/admin/hero-slides/:id", getCurrentAdmin, async (req, res) => {
  const slide = await db.collection("hero_slides").findOne({ id: req.params.id });
  if (!slide) return res.status(404).json({ detail: "Hero slide not found" });
  deleteHeroImageFile(slide.image_url);
  await db.collection("hero_slides").deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

// --- Template Products (marketplace pre-designed cases) ---
// Public routes use /shop/templates to avoid conflicting with mockup /templates overlay API.

api.get("/shop/templates/meta", async (_req, res) => {
  const caseTypeDocs = await db.collection("case_types")
    .find({}, { projection: { _id: 0, slug: 1, name: 1 } })
    .sort({ order: 1, name: 1 })
    .toArray();
  res.json({
    categories: CATEGORIES,
    collections: COLLECTIONS,
    case_types: caseTypeDocs.length
      ? caseTypeDocs.map((c) => ({ slug: c.slug, label: c.name }))
      : CASE_TYPES.map((slug) => ({ slug, label: slug })),
    phone_brands: PHONE_BRANDS,
    product_types: PRODUCT_TYPES,
  });
});

api.get("/shop/templates/featured", async (req, res) => {
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
  const filter = buildListFilter({ ...req.query, status: "published", featured: "true" });
  const paged = await groupedPublicListings(filter, { created_at: -1 }, { page: 1, limit, expandGroups: true });
  res.set("Cache-Control", "no-store");
  res.json(paged.items);
});

api.get("/shop/templates", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));
  const filter = buildListFilter({ ...req.query, status: "published" });
  const sort = buildSort(req.query);
  const paged = await groupedPublicListings(filter, sort, {
    page,
    limit,
    expandGroups: !req.query.case_type,
  });

  res.set("Cache-Control", "no-store");
  res.json(paged);
});

api.get("/shop/templates/:slug", async (req, res) => {
  const item = await db.collection("template_products").findOne(
    publishedShopClause({ slug: req.params.slug }),
    { projection: { _id: 0 } }
  );
  if (!item) return res.status(404).json({ detail: "Template not found" });

  const [siblings, labelMap, relatedDocs] = await Promise.all([
    loadDesignSiblings(item, { publishedOnly: true }),
    loadCaseTypeLabelMap(),
    db.collection("template_products")
      .find({
        $and: [
          publishedShopClause({ id: { $ne: item.id } }),
          item.design_id ? { $nor: [{ design_id: item.design_id }] } : {},
          {
            $or: [
              { category: item.category },
              { collection: item.collection },
              { phone_brand: item.phone_brand },
            ],
          },
        ],
      }, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .limit(24)
      .toArray(),
  ]);

  const related = groupProductsForListing(relatedDocs)
    .map((group) => toPublicListingProduct(group, labelMap))
    .filter(Boolean)
    .slice(0, 8);

  const publicItem = toPublicProduct(item);
  res.set("Cache-Control", "no-store");
  res.json({
    ...publicItem,
    design_id: item.design_id || null,
    material_variants: siblings
      .map((sibling) => toPublicMaterialVariant(sibling, item, labelMap))
      .filter(Boolean),
    related,
  });
});

api.get("/admin/template-products", getCurrentAdmin, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const filter = buildAdminListFilter(req.query);
  const sort = req.query.trash === "true"
    ? { trashed_at: -1 }
    : buildSort(req.query);

  const [items, total] = await Promise.all([
    db.collection("template_products")
      .find(filter, { projection: { _id: 0 } })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection("template_products").countDocuments(filter),
  ]);

  res.json({
    items: items.map((i) => ({
      ...i,
      title: displayTemplateTitle(i.title),
      variants: resolveVariantInventory(i),
    })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
  });
});

async function loadAllowedCaseTypeSlugs() {
  const [caseTypeDocs, productDocs] = await Promise.all([
    db.collection("case_types").find({}, { projection: { slug: 1 } }).toArray(),
    db.collection("products").find({}, { projection: { slug: 1 } }).toArray(),
  ]);
  return [...new Set([
    ...caseTypeDocs.map((c) => String(c.slug || "").toLowerCase()),
    ...productDocs.map((p) => String(p.slug || "").toLowerCase()),
    ...productDocs.map((p) => String(p.slug || "").replace(/-case$/, "").toLowerCase()),
    "silicone", "matte", "transparent", "glass", "oil-green"
  ])].filter(Boolean);
}

api.post("/admin/template-products", getCurrentAdmin, handleTemplateProductUpload, async (req, res) => {
  const allowedCaseTypes = await loadAllowedCaseTypeSlugs();

  const brandDocs = await db.collection("brands").find({}, { projection: { id: 1, name: 1, slug: 1 } }).toArray();
  const brandName = String(req.body?.phone_brand || "").trim();
  const matchedBrand = brandDocs.find(
    (b) => b.name?.toLowerCase() === brandName.toLowerCase() || b.id === brandName
  );
  let modelDocs = [];
  if (matchedBrand) {
    modelDocs = await db.collection("models").find({ brand_id: matchedBrand.id }, { projection: { id: 1, name: 1 } }).toArray();
  }

  const parsed = parseFormFields(req.body || {}, {
    allowedCaseTypes,
    allowedBrands: brandDocs,
    allowedModels: modelDocs,
  });
  if (parsed.error) return res.status(400).json({ detail: parsed.error });

  const uploaded = collectUploadedTemplateImages(req);
  if (!uploaded.length) {
    return res.status(400).json({ detail: "Thumbnail or gallery image is required" });
  }

  const slug = await ensureUniqueTemplateSlug(parsed.slug);
  const ts = nowIso();
  const item = {
    id: crypto.randomUUID(),
    ...parsed,
    slug,
    thumbnail: uploaded[0],
    images: uploaded,
    order_count: 0,
    created_at: ts,
    updated_at: ts,
  };
  await db.collection("template_products").insertOne(item);
  res.json(item);
});

api.put("/admin/template-products/:id", getCurrentAdmin, optionalTemplateProductUpload, async (req, res) => {
  const existing = await db.collection("template_products").findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ detail: "Template product not found" });
  if (isTrashed(existing)) {
    return res.status(400).json({ detail: "Restore the product from trash before editing" });
  }

  const baseAllowed = await loadAllowedCaseTypeSlugs();
  const allowedCaseTypes = [
    ...new Set([
      ...baseAllowed,
      String(existing.case_type || "").toLowerCase(),
    ].filter(Boolean)),
  ];

  const brandDocs = await db.collection("brands").find({}, { projection: { id: 1, name: 1, slug: 1 } }).toArray();
  const brandName = String(req.body?.phone_brand || existing.phone_brand || "").trim();
  const matchedBrand = brandDocs.find(
    (b) => b.name?.toLowerCase() === brandName.toLowerCase() || b.id === brandName
  );
  let modelDocs = [];
  if (matchedBrand) {
    modelDocs = await db.collection("models").find({ brand_id: matchedBrand.id }, { projection: { id: 1, name: 1 } }).toArray();
  }

  const parsed = parseFormFields(req.body || {}, {
    allowedCaseTypes,
    allowedBrands: brandDocs,
    allowedModels: modelDocs,
  });
  if (parsed.error) return res.status(400).json({ detail: parsed.error });

  const slug = await ensureUniqueTemplateSlug(
    parsed.slug || existing.slug,
    existing.id
  );

  const uploaded = collectUploadedTemplateImages(req);
  let images = existing.images || [];
  let thumbnail = existing.thumbnail;

  if (uploaded.length) {
    if (req.files?.thumbnail?.[0]) {
      await releaseTemplateProductImageFile(existing.thumbnail, existing.id);
      thumbnail = uploaded[0];
      images = [thumbnail, ...images.filter((u) => u !== existing.thumbnail), ...uploaded.slice(1)];
    } else {
      images = [...images, ...uploaded];
    }
  }

  if (req.body.remove_images) {
    try {
      const toRemove = JSON.parse(req.body.remove_images);
      if (Array.isArray(toRemove)) {
        for (const url of toRemove) {
          await releaseTemplateProductImageFile(url, existing.id);
        }
        images = images.filter((u) => !toRemove.includes(u));
        if (!images.includes(thumbnail)) thumbnail = images[0] || null;
      }
    } catch {
      /* ignore */
    }
  }

  const update = {
    ...parsed,
    slug,
    thumbnail,
    images,
    updated_at: nowIso(),
  };

  await db.collection("template_products").updateOne({ id: existing.id }, { $set: update });
  const saved = await db.collection("template_products").findOne(
    { id: existing.id },
    { projection: { _id: 0 } }
  );
  res.json({ ...saved, variants: resolveVariantInventory(saved) });
});

api.patch("/admin/template-products/:id/variants/:variantId", getCurrentAdmin, async (req, res) => {
  const existing = await db.collection("template_products").findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ detail: "Template product not found" });
  if (isTrashed(existing)) {
    return res.status(400).json({ detail: "Restore the product from trash before editing" });
  }

  const result = applyVariantInventoryUpdate(existing, req.params.variantId, {
    stock_quantity: req.body?.stock_quantity,
    is_out_of_stock: req.body?.is_out_of_stock,
  });
  if (result.error) return res.status(400).json({ detail: result.error });

  await db.collection("template_products").updateOne(
    { id: existing.id },
    {
      $set: {
        variant_inventory: result.variant_inventory,
        stock: result.stock,
        updated_at: nowIso(),
      },
    }
  );
  const saved = await db.collection("template_products").findOne(
    { id: existing.id },
    { projection: { _id: 0 } }
  );
  res.json({
    ...saved,
    title: displayTemplateTitle(saved.title),
    variants: resolveVariantInventory(saved),
  });
});

api.get("/admin/template-products/:id/material-variants", getCurrentAdmin, async (req, res) => {
  const existing = await db.collection("template_products").findOne(
    { id: req.params.id },
    { projection: { _id: 0 } }
  );
  if (!existing) return res.status(404).json({ detail: "Template product not found" });
  const siblings = await loadDesignSiblings(existing);
  res.json({
    design_id: existing.design_id || null,
    items: siblings.map(adminProductPayload),
  });
});

api.post("/admin/template-products/:id/material-variants", getCurrentAdmin, async (req, res) => {
  const existing = await db.collection("template_products").findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ detail: "Template product not found" });
  if (isTrashed(existing)) {
    return res.status(400).json({ detail: "Restore the product from trash before adding a material" });
  }

  const allowedCaseTypes = await loadAllowedCaseTypeSlugs();
  const case_type = String(req.body?.case_type || "").trim().toLowerCase();
  if (!case_type) return res.status(400).json({ detail: "Case type is required" });
  if (allowedCaseTypes.length && !allowedCaseTypes.includes(case_type)) {
    return res.status(400).json({ detail: `case_type must be one of: ${allowedCaseTypes.join(", ")}` });
  }

  const siblings = await loadDesignSiblings(existing);
  const duplicate = findDuplicateCaseType(siblings, case_type);
  if (duplicate) {
    return res.status(400).json({ detail: "This design already has that material" });
  }

  let price = Number(req.body?.price);
  if (!Number.isFinite(price) || price <= 0) {
    price = Number(existing.price) || 0;
  }
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ detail: "Valid price is required" });
  }

  const saleRaw = req.body?.sale_price;
  const sale_price = saleRaw == null || saleRaw === "" ? null : Number(saleRaw);
  if (sale_price != null && (!Number.isFinite(sale_price) || sale_price < 0)) {
    return res.status(400).json({ detail: "sale_price must be a number that is 0 or greater" });
  }

  const targetModels = Array.isArray(req.body?.phone_models) && req.body.phone_models.length > 0
    ? req.body.phone_models
    : (Array.isArray(existing.phone_models) ? existing.phone_models : []);

  const stockOverride = req.body?.stock;
  const initialStock = stockOverride != null && stockOverride !== ""
    ? Math.max(0, Math.floor(Number(stockOverride) || 0))
    : Math.max(0, Math.floor(Number(existing.stock) || 0));

  let variant_inventory = synthesizeVariantInventory(targetModels, initialStock);
  let stock = availableStock(variant_inventory) || initialStock;

  const designId = await ensureDesignId(existing);
  const slug = await ensureUniqueTemplateSlug(
    `${existing.slug}-${case_type.replace(/-case$/, "")}`
  );
  const ts = nowIso();
  const defaultMat = String(req.body?.material || "").trim() || (
    case_type.includes("silicone") ? "Liquid Silicone" :
    case_type.includes("transparent") ? "Polycarbonate" :
    case_type.includes("glass") ? "Tempered Glass" :
    case_type.includes("matte") ? "Matte Polycarbonate" : ""
  );
  const item = {
    id: crypto.randomUUID(),
    title: existing.title,
    slug,
    product_type: existing.product_type,
    description: String(req.body?.description || existing.description || "").trim(),
    short_description: String(req.body?.short_description || existing.short_description || "").trim().slice(0, 300),
    phone_brand: existing.phone_brand,
    phone_models: targetModels,
    category: existing.category,
    collection: existing.collection,
    case_type,
    material: defaultMat,
    price,
    sale_price: Number.isFinite(sale_price) && sale_price > 0 ? sale_price : null,
    stock,
    variant_inventory,
    sku: String(req.body?.sku || "").trim().slice(0, 64) || null,
    tags: Array.isArray(existing.tags) ? existing.tags : [],
    featured: false,
    best_seller: Boolean(existing.best_seller),
    new_arrival: Boolean(existing.new_arrival),
    status: req.body?.status === "draft" ? "draft" : "published",
    rating: existing.rating,
    review_count: existing.review_count,
    seo: existing.seo || {},
    thumbnail: req.body?.thumbnail || existing.thumbnail,
    images: Array.isArray(req.body?.images) && req.body.images.length > 0
      ? req.body.images
      : (Array.isArray(existing.images) ? existing.images : []),
    design_id: designId,
    order_count: 0,
    created_at: ts,
    updated_at: ts,
  };
  await db.collection("template_products").insertOne(item);
  const siblingsAfter = await loadDesignSiblings(item);
  res.json({
    item: adminProductPayload(item),
    design_id: designId,
    items: siblingsAfter.map(adminProductPayload),
  });
});

api.post("/admin/template-products/:id/link-design", getCurrentAdmin, async (req, res) => {
  const existing = await db.collection("template_products").findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ detail: "Template product not found" });
  if (isTrashed(existing)) {
    return res.status(400).json({ detail: "Restore the product from trash before linking a material" });
  }

  const targetId = String(req.body?.product_id || "").trim();
  if (!targetId || targetId === existing.id) {
    return res.status(400).json({ detail: "Select a different product to link" });
  }
  const target = await db.collection("template_products").findOne({ id: targetId });
  if (!target) return res.status(404).json({ detail: "Product to link was not found" });
  if (isTrashed(target)) {
    return res.status(400).json({ detail: "Restore the other product from trash before linking it" });
  }
  if (String(target.design_id || "").trim()) {
    return res.status(400).json({ detail: "That product is already part of a design group" });
  }

  const siblings = await loadDesignSiblings(existing);
  const duplicate = findDuplicateCaseType([...siblings, target], target.case_type, target.id);
  if (duplicate) {
    return res.status(400).json({ detail: "This design already has that material" });
  }

  const designId = await ensureDesignId(existing);
  await db.collection("template_products").updateOne(
    { id: target.id },
    { $set: { design_id: designId, updated_at: nowIso() } }
  );
  const saved = await db.collection("template_products").findOne({ id: target.id }, { projection: { _id: 0 } });
  const siblingsAfter = await loadDesignSiblings({ ...existing, design_id: designId });
  res.json({
    item: adminProductPayload(saved),
    design_id: designId,
    items: siblingsAfter.map(adminProductPayload),
  });
});

api.post("/admin/template-products/:id/unlink-design", getCurrentAdmin, async (req, res) => {
  const existing = await db.collection("template_products").findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ detail: "Template product not found" });
  const designId = String(existing.design_id || "").trim();
  if (!designId) return res.json({ ok: true, design_id: null, items: [adminProductPayload(existing)] });

  await db.collection("template_products").updateOne(
    { id: existing.id },
    { $unset: { design_id: "" }, $set: { updated_at: nowIso() } }
  );
  const remaining = await db.collection("template_products").countDocuments({
    design_id: designId,
    ...notTrashedClause(),
  });
  if (remaining <= 1) {
    await db.collection("template_products").updateMany(
      { design_id: designId },
      { $unset: { design_id: "" }, $set: { updated_at: nowIso() } }
    );
  }
  const saved = await db.collection("template_products").findOne(
    { id: existing.id },
    { projection: { _id: 0 } }
  );
  res.json({ ok: true, design_id: null, items: [adminProductPayload(saved)] });
});

api.delete("/admin/template-products/:id", getCurrentAdmin, async (req, res) => {
  const item = await db.collection("template_products").findOne({ id: req.params.id });
  if (!item) return res.status(404).json({ detail: "Template product not found" });
  if (!isTrashed(item)) {
    return res.status(400).json({ detail: "Move the product to trash before permanently deleting it" });
  }
  await releaseTemplateProductMedia(item, item.id);
  const result = await db.collection("template_products").deleteOne({ id: req.params.id });
  if (result.deletedCount === 0) {
    return res.status(404).json({ detail: "Template product not found" });
  }
  res.json({ ok: true, deleted: true });
});

api.patch("/admin/template-products/:id/trash", getCurrentAdmin, async (req, res) => {
  const existing = await db.collection("template_products").findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ detail: "Template product not found" });
  if (isTrashed(existing)) {
    return res.status(400).json({ detail: "Product is already in trash" });
  }
  const ts = nowIso();
  await db.collection("template_products").updateOne(
    { id: existing.id },
    {
      $set: {
        trashed_at: ts,
        trashed_from_status: existing.status,
        status: "draft",
        featured: false,
        updated_at: ts,
      },
    }
  );
  const saved = await db.collection("template_products").findOne(
    { id: existing.id },
    { projection: { _id: 0 } }
  );
  res.json(saved);
});

api.patch("/admin/template-products/:id/restore", getCurrentAdmin, async (req, res) => {
  const existing = await db.collection("template_products").findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ detail: "Template product not found" });
  if (!isTrashed(existing)) {
    return res.status(400).json({ detail: "Product is not in trash" });
  }
  const ts = nowIso();
  const restoreStatus = existing.trashed_from_status === "published" ? "published" : "draft";
  await db.collection("template_products").updateOne(
    { id: existing.id },
    {
      $set: {
        status: restoreStatus,
        updated_at: ts,
      },
      $unset: {
        trashed_at: "",
        trashed_from_status: "",
      },
    }
  );
  const saved = await db.collection("template_products").findOne(
    { id: existing.id },
    { projection: { _id: 0 } }
  );
  res.json(saved);
});

api.post("/admin/template-products/:id/duplicate", getCurrentAdmin, async (req, res) => {
  const source = await db.collection("template_products").findOne({ id: req.params.id });
  if (!source) return res.status(404).json({ detail: "Template product not found" });
  if (isTrashed(source)) {
    return res.status(400).json({ detail: "Restore the product from trash before duplicating" });
  }

  const siblings = await loadDesignSiblings(source, { publishedOnly: false });
  const ts = nowIso();

  if (siblings.length > 1) {
    const newDesignId = crypto.randomUUID();
    const newTitle = await duplicateTemplateTitle(source.title);
    const primaryBaseSlug = `${stripCopySlugSuffix(source.slug)}-copy`;
    const primarySlug = await ensureUniqueTemplateSlug(primaryBaseSlug);

    const {
      _id: _sId,
      id: _sOldId,
      created_at: _sCreated,
      updated_at: _sUpdated,
      order_count: _sOrderCount,
      trashed_at: _sTrash,
      trashed_from_status: _sTrashStatus,
      design_id: _sOldDesignId,
      ...sourceRest
    } = source;

    const sourceMedia = cloneTemplateProductMedia(sourceRest, { uploadDir: UPLOAD_DIR });
    const primaryItem = {
      ...sourceRest,
      thumbnail: sourceMedia.thumbnail,
      images: sourceMedia.images,
      seo: sourceMedia.seo,
      id: crypto.randomUUID(),
      title: newTitle,
      slug: primarySlug,
      design_id: newDesignId,
      status: "draft",
      featured: false,
      order_count: 0,
      created_at: ts,
      updated_at: ts,
    };

    const duplicateSiblings = [primaryItem];

    for (const sib of siblings) {
      if (sib.id === source.id) continue;
      const sibCaseSuffix = String(sib.case_type || "").replace(/-case$/, "").toLowerCase().trim();
      const sibBaseSlug = `${primarySlug}-${sibCaseSuffix || "variant"}`;
      const sibSlug = await ensureUniqueTemplateSlug(sibBaseSlug);

      const {
        _id: _sibMongoId,
        id: _sibOldId,
        created_at: _sibCreated,
        updated_at: _sibUpdated,
        order_count: _sibOrderCount,
        trashed_at: _sibTrash,
        trashed_from_status: _sibTrashStatus,
        design_id: _sibOldDesignId,
        ...sibRest
      } = sib;

      const sibMedia = cloneTemplateProductMedia(sibRest, { uploadDir: UPLOAD_DIR });
      const duplicateSib = {
        ...sibRest,
        thumbnail: sibMedia.thumbnail,
        images: sibMedia.images,
        seo: sibMedia.seo,
        id: crypto.randomUUID(),
        title: newTitle,
        slug: sibSlug,
        design_id: newDesignId,
        status: sib.status || "draft",
        featured: false,
        order_count: 0,
        created_at: ts,
        updated_at: ts,
      };
      duplicateSiblings.push(duplicateSib);
    }

    await db.collection("template_products").insertMany(duplicateSiblings);
    return res.json(primaryItem);
  }

  const baseSlug = `${stripCopySlugSuffix(source.slug)}-copy`;
  const slug = await ensureUniqueTemplateSlug(baseSlug);
  const title = await duplicateTemplateTitle(source.title);
  const {
    _id,
    id,
    created_at,
    updated_at,
    order_count,
    trashed_at,
    trashed_from_status,
    design_id,
    ...rest
  } = source;
  const media = cloneTemplateProductMedia(rest, { uploadDir: UPLOAD_DIR });
  const item = {
    ...rest,
    thumbnail: media.thumbnail,
    images: media.images,
    seo: media.seo,
    id: crypto.randomUUID(),
    title,
    slug,
    status: "draft",
    featured: false,
    order_count: 0,
    created_at: ts,
    updated_at: ts,
  };
  await db.collection("template_products").insertOne(item);
  res.json(item);
});

api.patch("/admin/template-products/:id/status", getCurrentAdmin, async (req, res) => {
  const status = req.body?.status;
  if (!["published", "draft"].includes(status)) {
    return res.status(400).json({ detail: "status must be published or draft" });
  }
  const existing = await db.collection("template_products").findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ detail: "Template product not found" });
  if (isTrashed(existing)) {
    return res.status(400).json({ detail: "Restore the product from trash before changing status" });
  }
  const update = { status, updated_at: nowIso() };
  if (status === "draft") update.featured = false;
  const result = await db.collection("template_products").updateOne(
    { id: req.params.id },
    { $set: update }
  );
  if (result.matchedCount === 0) return res.status(404).json({ detail: "Template product not found" });
  const saved = await db.collection("template_products").findOne(
    { id: req.params.id },
    { projection: { _id: 0 } }
  );
  res.json(saved);
});

api.patch("/admin/template-products/:id/feature", getCurrentAdmin, async (req, res) => {
  if (req.body?.featured == null) {
    return res.status(400).json({ detail: "featured field required" });
  }
  const featured = Boolean(req.body.featured);
  const existing = await db.collection("template_products").findOne({ id: req.params.id });
  if (!existing) return res.status(404).json({ detail: "Template product not found" });
  if (isTrashed(existing)) {
    return res.status(400).json({ detail: "Restore the product from trash before changing featured status" });
  }
  if (featured && existing.status !== "published") {
    return res.status(400).json({ detail: "Only published products can be featured on the homepage" });
  }
  const result = await db.collection("template_products").updateOne(
    { id: req.params.id },
    { $set: { featured, updated_at: nowIso() } }
  );
  if (result.matchedCount === 0) return res.status(404).json({ detail: "Template product not found" });
  const saved = await db.collection("template_products").findOne(
    { id: req.params.id },
    { projection: { _id: 0 } }
  );
  res.json(saved);
});

api.post("/admin/template-products/bulk", getCurrentAdmin, async (req, res) => {
  const { ids, action } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ detail: "ids array required" });
  }
  const validActions = ["trash", "restore", "purge", "publish", "unpublish", "feature", "unfeature"];
  if (!validActions.includes(action)) {
    return res.status(400).json({ detail: `action must be one of: ${validActions.join(", ")}` });
  }

  if (action === "purge") {
    const items = await db.collection("template_products").find({
      id: { $in: ids },
      ...trashedClause(),
    }).toArray();
    const purgeIds = items.map((item) => item.id);
    for (const item of items) {
      await releaseTemplateProductMedia(item, purgeIds);
    }
    const result = await db.collection("template_products").deleteMany({
      id: { $in: items.map((i) => i.id) },
    });
    return res.json({ ok: true, affected: result.deletedCount });
  }

  if (action === "trash") {
    const ts = nowIso();
    const items = await db.collection("template_products").find({
      id: { $in: ids },
      ...notTrashedClause(),
    }).toArray();
    for (const item of items) {
      await db.collection("template_products").updateOne(
        { id: item.id },
        {
          $set: {
            trashed_at: ts,
            trashed_from_status: item.status,
            status: "draft",
            featured: false,
            updated_at: ts,
          },
        }
      );
    }
    return res.json({ ok: true, affected: items.length });
  }

  if (action === "restore") {
    const ts = nowIso();
    const items = await db.collection("template_products").find({
      id: { $in: ids },
      ...trashedClause(),
    }).toArray();
    for (const item of items) {
      const restoreStatus = item.trashed_from_status === "published" ? "published" : "draft";
      await db.collection("template_products").updateOne(
        { id: item.id },
        {
          $set: { status: restoreStatus, updated_at: ts },
          $unset: { trashed_at: "", trashed_from_status: "" },
        }
      );
    }
    return res.json({ ok: true, affected: items.length });
  }

  if (action === "feature") {
    const result = await db.collection("template_products").updateMany(
      publishedShopClause({ id: { $in: ids } }),
      { $set: { featured: true, updated_at: nowIso() } }
    );
    return res.json({ ok: true, affected: result.modifiedCount });
  }

  const updates = {
    publish: { status: "published" },
    unpublish: { status: "draft", featured: false },
    feature: { featured: true },
    unfeature: { featured: false },
  };
  const result = await db.collection("template_products").updateMany(
    { id: { $in: ids }, ...notTrashedClause() },
    { $set: { ...updates[action], updated_at: nowIso() } }
  );
  res.json({ ok: true, affected: result.modifiedCount });
});

// --- Orders ---
api.post("/orders", orderRateLimiter, getCurrentUser, async (req, res) => {
  if (req.user.role !== "customer") {
    return res.status(403).json({ detail: "Customer account required to place orders" });
  }
  const body = { ...req.body };
  delete body.amount;
  delete body.subtotal;
  delete body.discount_amount;
  delete body.discount_percent;
  delete body.promo_id;

  // For multi-item support
  let orderItems = [];
  if (body.items && Array.isArray(body.items) && body.items.length > 0) {
    orderItems = body.items.map(item => ({
      brand_id: item.brand_id,
      brand_name: item.brand_name,
      model_id: item.model_id,
      model_name: item.model_name,
      product_id: item.product_id,
      product_name: item.product_name,
      design_url: item.design_url,
      preview_url: item.preview_url,
      quantity: item.quantity || 1,
      price: item.price,
      template_product_id: item.template_product_id || null,
      template_product_title: item.template_product_title || null,
      template_id: item.template_id || null,
      design_transform: item.design_transform || null,
      case_color: item.case_color || null,
      case_type: item.case_type || null,
      case_type_label: item.case_type_label || null,
      material: item.material || null,
    }));
  }

  let templateProduct = null;
  if (body.template_product_id) {
    templateProduct = await db.collection("template_products").findOne(
      publishedShopClause({ id: body.template_product_id })
    );
    if (!templateProduct) {
      return res.status(404).json({ detail: "Template product not found or unavailable" });
    }
    if (!body.design_url) {
      body.design_url = templateProduct.thumbnail || (templateProduct.images && templateProduct.images[0]);
    }
    if (!body.preview_url) {
      body.preview_url = body.design_url;
    }
    if (!body.product_id && templateProduct.case_type) {
      const caseProduct = await db.collection("products").findOne({ slug: templateProduct.case_type });
      if (caseProduct) body.product_id = caseProduct.id;
    }
  }

  const isMultiItem = orderItems.length > 0;
  let pricedOrder;
  try {
    pricedOrder = await priceOrderLines(
      isMultiItem ? orderItems : [{ ...body, quantity: 1 }]
    );
  } catch (err) {
    return res.status(err.status || 400).json({ detail: err.message });
  }

  const caseTypeDocs = await db.collection("case_types")
    .find({}, { projection: { slug: 1, name: 1 } })
    .toArray();
  const caseTypeLabels = buildCaseTypeLabelMap(caseTypeDocs);

  if (isMultiItem) {
    orderItems = pricedOrder.lines.map((line) => {
      const materialSnap = snapshotOrderMaterial(line, caseTypeLabels);
      const templateTitle = line.template_product_title
        || (line.templateProduct ? getUpdatedTemplateTitle(line.templateProduct, null, line.product) : null)
        || line.templateProduct?.title
        || null;
      return {
        brand_id: line.brand.id,
        brand_name: line.brand.name,
        model_id: line.model.id,
        model_name: line.model.name,
        product_id: line.product.id,
        product_name: line.product.name,
        design_url: line.design_url,
        preview_url: line.preview_url,
        quantity: line.quantity,
        price: line.price,
        template_product_id: line.template_product_id || null,
        template_product_title: templateTitle,
        template_id: line.template_id || null,
        design_transform: line.design_transform || null,
        case_color: line.case_color || null,
        ...materialSnap,
      };
    });
    // Always persist selected device on the order root from the priced line
    // (client-selected Brand/Model from Buy Now / cart — never template defaults alone)
    const first = pricedOrder.lines[0];
    const firstMaterial = snapshotOrderMaterial(first, caseTypeLabels);
    body.brand_id = first.brand.id;
    body.brand_name = first.brand.name;
    body.model_id = first.model.id;
    body.model_name = first.model.name;
    body.product_id = first.product.id;
    body.product_name = first.product.name;
    body.template_product_title = first.template_product_title
      || (first.templateProduct ? getUpdatedTemplateTitle(first.templateProduct, null, first.product) : null)
      || first.templateProduct?.title
      || null;
    Object.assign(body, firstMaterial);
    if (first.template_product_id) body.template_product_id = first.template_product_id;
    if (first.design_url) body.design_url = first.design_url;
    if (first.preview_url) body.preview_url = first.preview_url;
  } else {
    const line = pricedOrder.lines[0];
    templateProduct = line.templateProduct;
    body.brand_id = line.brand.id;
    body.brand_name = line.brand.name;
    body.model_id = line.model.id;
    body.model_name = line.model.name;
    body.product_id = line.product.id;
    body.product_name = line.product.name;
    body.price = line.price;
    body.template_product_title = line.template_product_title
      || (line.templateProduct ? getUpdatedTemplateTitle(line.templateProduct, null, line.product) : null)
      || line.templateProduct?.title
      || body.template_product_title
      || null;
    Object.assign(body, snapshotOrderMaterial(line, caseTypeLabels));
    if (body.case_color == null && line.case_color != null) {
      body.case_color = line.case_color;
    }
  }

  const subtotal = pricedOrder.subtotal;
    
  let amount = subtotal;
  let promoFields = {
    promo_code: null,
    promo_id: null,
    discount_percent: null,
    discount_amount: null,
  };

  if (body.promo_code) {
    try {
      const { promo, discount_amount, final_amount } = await validatePromoCode(body.promo_code, subtotal);
      amount = final_amount;
      promoFields = {
        promo_code: promo.code,
        promo_id: promo.id,
        discount_percent: promo.discount_percent,
        discount_amount,
      };
    } catch (err) {
      return res.status(err.status || 400).json({ detail: err.message });
    }
  }
  amount += SHIPPING_FEE;
  delete body.promo_code;

  body.customer_name = clampString(body.customer_name, 100);
  delete body.items; // Don't save it directly at root level
  const phone = validateIndianPhone(body.phone);
  body.email = validateEmail(body.email) || req.user.email;
  body.notes = body.notes ? clampString(body.notes, 500) : null;

  if (!body.customer_name || !phone) {
    return res.status(400).json({ detail: "Complete all required shipping fields" });
  }
  const normalizedAddress = normalizeOrderAddress(body);
  if (normalizedAddress.error) {
    return res.status(400).json({ detail: normalizedAddress.error });
  }
  Object.assign(body, normalizedAddress.address);
  body.phone = phone;

  const settings = await getMainSettings();
  const paymentMethod = normalizePaymentMethod(settings.payment_method);

  const mediaError = [body.design_url, body.preview_url]
    .concat((orderItems || []).flatMap((item) => [item.design_url, item.preview_url]))
    .map((url) => (url ? (isValidUploadUrl(url) ? null : "Invalid image URL") : null))
    .find(Boolean);
  if (mediaError) {
    return res.status(400).json({ detail: mediaError });
  }

  const clientOrder = {};
  for (const key of [
    "customer_name", "phone", "email", "notes",
    "house_no_flat", "building_name", "street", "landmark", "country",
    "state", "district", "city_area", "post_office", "pincode",
    "address", "formatted_address",
    "brand_id", "brand_name", "model_id", "model_name",
    "product_id", "product_name", "design_url", "preview_url",
    "design_transform", "template_id", "template_product_id", "template_product_title",
    "case_color", "case_type", "case_type_label", "material",
  ]) {
    if (body[key] !== undefined) clientOrder[key] = body[key];
  }

  const order = {
    ...clientOrder,
    id: crypto.randomUUID(),
    order_id: genOrderId(),
    user_id: req.user.id,
    items: isMultiItem ? orderItems : null,
    subtotal,
    shipping_fee: SHIPPING_FEE,
    ...promoFields,
    amount,
    currency: settings.currency || "INR",
    payment_method: paymentMethod,
    payment_status: "pending",
    delivery_status: "pending_payment_verification",
    utr: null,
    payment_screenshot_url: null,
    razorpay_order_id: null,
    razorpay_payment_id: null,
    razorpay_signature: null,
    razorpay_method: null,
    razorpay_amount_paise: null,
    payment_verified_at: null,
    tracking_number: null,
    print_url: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  if (isMultiItem) {
    // Generate print files for all items asynchronously
    // We don't await this to avoid blocking the response
    orderItems.forEach(async (item, index) => {
      if (item.design_url && item.model_id && item.product_id) {
        try {
          const product = await db.collection("products").findOne({ id: item.product_id });
          const caseTypeSlug = product?.slug;
          const template = await resolvePrintTemplate({
            template_id: item.template_id,
            model_id: item.model_id,
            case_type_slug: caseTypeSlug,
          });

          if (template) {
            const printName = `${crypto.randomUUID().replace(/-/g, "")}.png`;
            const printPath = path.join(UPLOAD_DIR, "prints", printName);
            await compositePrintFile({
              uploadDir: UPLOAD_DIR,
              designUrl: item.design_url,
              template: enrichTemplate(template),
              designTransform: item.design_transform,
              outputPath: printPath,
            });
            const print_url = `/uploads/prints/${printName}`;
            
            // Update the specific item in the array
            await db.collection("orders").updateOne(
              { id: order.id },
              { $set: { [`items.${index}.print_url`]: print_url } }
            );
          }
        } catch (err) {
          console.error("Composite error for multi-item", item.product_name, err);
        }
      }
    });
  } else if (order.design_url && order.model_id && order.product_id) {
    try {
      const product = await db.collection("products").findOne({ id: order.product_id });
      const caseTypeSlug = product?.slug;
      const template = await resolvePrintTemplate({
        template_id: order.template_id,
        model_id: order.model_id,
        case_type_slug: caseTypeSlug,
      });

      if (template) {
        const printName = `${crypto.randomUUID().replace(/-/g, "")}.png`;
        const printPath = path.join(UPLOAD_DIR, "prints", printName);
        await compositePrintFile({
          uploadDir: UPLOAD_DIR,
          designUrl: order.design_url,
          template: enrichTemplate(template),
          designTransform: order.design_transform || null,
          outputPath: printPath,
        });
        order.print_url = publicUrl(`uploads/prints/${printName}`);
      }
    } catch (err) {
      console.error("Print composite failed:", err.message);
    }
  }

  await db.collection("orders").insertOne(order);

  const stockLines = pricedOrder.lines.filter((line) => line.templateProduct);
  const linesByProduct = new Map();
  for (const line of stockLines) {
    const bucket = linesByProduct.get(line.templateProduct.id) || [];
    bucket.push(line);
    linesByProduct.set(line.templateProduct.id, bucket);
  }
  for (const [productId, lines] of linesByProduct) {
    let current = await db.collection("template_products").findOne({ id: productId });
    if (!current) continue;
    for (const line of lines) {
      const next = consumeVariantStock(current, line.model.name, line.quantity);
      if (next.error) continue;
      current = {
        ...current,
        stock: next.stock,
        variant_inventory: next.variant_inventory,
      };
    }
    await db.collection("template_products").updateOne(
      { id: productId },
      {
        $set: {
          stock: current.stock,
          variant_inventory: current.variant_inventory,
          updated_at: nowIso(),
        },
        $inc: { order_count: 1 },
      }
    );
  }

  await saveUserShipping(req.user.id, {
    name: body.customer_name,
    phone: body.phone,
    ...normalizedAddress.address,
  });

  if (order.promo_id) {
    await db.collection("promo_codes").updateOne(
      { id: order.promo_id },
      { $inc: { used_count: 1 }, $set: { updated_at: nowIso() } }
    );
  }

  res.json(stripOrderSecrets(order));
});

api.get("/orders/mine", getCurrentUser, async (req, res) => {
  if (req.user.role !== "customer") {
    return res.status(403).json({ detail: "Customer account required" });
  }
  const items = await db
    .collection("orders")
    .find(customerOrdersQuery(req.user.id), { projection: { _id: 0, razorpay_signature: 0 } })
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();
  res.json(items.map((o) => stripOrderSecrets(o)));
});

api.get("/orders/:order_id", attachUserIfPresent, async (req, res) => {
  if (!isValidOrderId(req.params.order_id)) {
    return res.status(400).json({ detail: "Invalid order ID" });
  }
  const o = await db.collection("orders").findOne({ order_id: req.params.order_id }, { projection: { _id: 0 } });
  if (!o) return res.status(404).json({ detail: "Order not found" });
  const full = decorateAdminOrder(o, stripOrderSecrets);
  const canSeePrivate = req.user && (req.user.role === "admin" || (o.user_id && o.user_id === req.user.id));
  res.json(canSeePrivate ? full : toPublicTrackingOrder(full));
});

api.post("/orders/:order_id/payment-proof", getCurrentUser, async (req, res) => {
  if (!isValidOrderId(req.params.order_id)) {
    return res.status(400).json({ detail: "Invalid order ID" });
  }

  const settings = await getMainSettings();
  if (normalizePaymentMethod(settings.payment_method) !== "manual_upi") {
    return res.status(400).json({
      detail: "Manual UPI payment is disabled. Please complete payment via Razorpay.",
    });
  }

  const utr = clampString(req.body?.utr, 50);
  const screenshot_url = req.body?.screenshot_url;
  if (!utr || !screenshot_url) {
    return res.status(400).json({ detail: "UTR and payment screenshot required" });
  }
  if (!isValidUploadUrl(screenshot_url)) {
    return res.status(400).json({ detail: "Invalid screenshot URL" });
  }
  const o = await db.collection("orders").findOne({ order_id: req.params.order_id });
  const accessErr = await assertOrderAccess(req, o);
  if (accessErr) return res.status(accessErr.status).json({ detail: accessErr.detail });

  await db.collection("orders").updateOne(
    { order_id: req.params.order_id },
    {
      $set: {
        utr,
        payment_screenshot_url: screenshot_url,
        payment_method: "manual_upi",
        payment_status: "submitted",
        delivery_status: "pending_payment_verification",
        updated_at: nowIso(),
      },
    }
  );
  const o2 = await db.collection("orders").findOne({ order_id: req.params.order_id }, { projection: { _id: 0 } });
  res.json(stripOrderSecrets(o2));
});

api.post("/orders/:order_id/razorpay-order", getCurrentUser, async (req, res) => {
  if (!isValidOrderId(req.params.order_id)) {
    return res.status(400).json({ detail: "Invalid order ID" });
  }

  const settings = await getMainSettings();
  if (normalizePaymentMethod(settings.payment_method) !== "razorpay") {
    return res.status(400).json({ detail: "Razorpay is not the active payment method" });
  }
  if (!isRazorpayConfigured()) {
    return res.status(503).json({ detail: "Razorpay is not configured on the server" });
  }

  const order = await db.collection("orders").findOne({ order_id: req.params.order_id });
  const accessErr = await assertOrderAccess(req, order);
  if (accessErr) return res.status(accessErr.status).json({ detail: accessErr.detail });

  if (order.payment_status === "approved") {
    return res.status(400).json({ detail: "Order is already paid" });
  }

  if (order.razorpay_order_id) {
    return res.json({
      razorpay_order_id: order.razorpay_order_id,
      amount: amountToPaise(order.amount),
      currency: order.currency || "INR",
      key_id: getRazorpayKeyId(),
      order_id: order.order_id,
    });
  }

  try {
    const rz = await createRazorpayOrderForAppOrder(order);
    await db.collection("orders").updateOne(
      { order_id: order.order_id },
      {
        $set: {
          payment_method: "razorpay",
          razorpay_order_id: rz.razorpay_order_id,
          currency: rz.currency || order.currency || "INR",
          updated_at: nowIso(),
        },
      }
    );
    res.json({
      razorpay_order_id: rz.razorpay_order_id,
      amount: rz.amount,
      currency: rz.currency,
      key_id: rz.key_id || getRazorpayKeyId(),
      order_id: order.order_id,
    });
  } catch (err) {
    console.error("Razorpay order create failed:", err.message);
    return res.status(err.status || 500).json({ detail: err.message || "Could not create Razorpay order" });
  }
});

api.post("/orders/:order_id/verify-payment", verifyPaymentRateLimiter, getCurrentUser, async (req, res) => {
  if (!isValidOrderId(req.params.order_id)) {
    return res.status(400).json({ detail: "Invalid order ID" });
  }

  const razorpay_order_id = clampString(req.body?.razorpay_order_id, 64);
  const razorpay_payment_id = clampString(req.body?.razorpay_payment_id, 64);
  const razorpay_signature = clampString(req.body?.razorpay_signature, 128);

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    logPaymentVerifyFailure(req.params.order_id, "missing_fields");
    return res.status(400).json({ detail: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required" });
  }

  const order = await db.collection("orders").findOne({ order_id: req.params.order_id });
  const accessErr = await assertOrderAccess(req, order);
  if (accessErr) return res.status(accessErr.status).json({ detail: accessErr.detail });

  if (order.payment_status === "approved") {
    return res.json({
      success: true,
      already_approved: true,
      order_id: order.order_id,
      payment_status: "approved",
      razorpay_payment_id: order.razorpay_payment_id || razorpay_payment_id,
    });
  }

  if (order.razorpay_order_id && order.razorpay_order_id !== razorpay_order_id) {
    logPaymentVerifyFailure(order.order_id, "order_id_mismatch", {
      expected: order.razorpay_order_id,
      received: razorpay_order_id,
    });
    return res.status(400).json({ detail: "Payment does not match this order" });
  }

  const valid = verifyCheckoutSignature({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  if (!valid) {
    logPaymentVerifyFailure(order.order_id, "signature_mismatch", {
      razorpay_order_id,
      razorpay_payment_id,
    });
    return res.status(400).json({ detail: "Invalid payment signature" });
  }

  let paymentDetails;
  try {
    paymentDetails = await fetchAndConfirmPayment(razorpay_payment_id, {
      ...order,
      razorpay_order_id: order.razorpay_order_id || razorpay_order_id,
    });
  } catch (err) {
    logPaymentVerifyFailure(order.order_id, err.code || "payment_confirm_failed", {
      razorpay_order_id,
      razorpay_payment_id,
      detail: err.message,
    });
    return res.status(err.status || 400).json({ detail: err.message || "Payment confirmation failed" });
  }

  const verifiedAt = nowIso();
  await db.collection("orders").updateOne(
    { order_id: order.order_id, payment_status: { $ne: "approved" } },
    {
      $set: {
        payment_method: "razorpay",
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        razorpay_method: paymentDetails.method,
        razorpay_amount_paise: paymentDetails.amount,
        razorpay_currency: paymentDetails.currency,
        payment_status: "approved",
        delivery_status: "payment_approved",
        payment_verified_at: verifiedAt,
        payment_verified_via: "checkout_callback",
        updated_at: verifiedAt,
      },
    }
  );

  // Never return razorpay_signature (or any secret) to the client
  res.json({
    success: true,
    order_id: order.order_id,
    payment_status: "approved",
    razorpay_payment_id,
  });
});

api.post("/orders/:order_id/report-payment", getCurrentUser, async (req, res) => {
  if (!isValidOrderId(req.params.order_id)) {
    return res.status(400).json({ detail: "Invalid order ID" });
  }

  const order = await db.collection("orders").findOne({ order_id: req.params.order_id });
  const accessErr = await assertOrderAccess(req, order);
  if (accessErr) return res.status(accessErr.status).json({ detail: accessErr.detail });

  if (order.payment_status === "approved") {
    return res.json({
      ok: true,
      skipped: true,
      order_id: order.order_id,
      payment_status: "approved",
    });
  }

  const outcome = String(req.body?.outcome || "").toLowerCase();
  if (outcome !== "cancelled" && outcome !== "failed") {
    return res.status(400).json({ detail: "outcome must be cancelled or failed" });
  }

  const defaultReason = outcome === "cancelled"
    ? "Customer cancelled or closed checkout"
    : "Payment failed";
  const reason = clampString(req.body?.reason, 200) || defaultReason;
  const failedAt = nowIso();

  await db.collection("orders").updateOne(
    { order_id: order.order_id, payment_status: { $ne: "approved" } },
    {
      $set: {
        payment_status: "failed",
        payment_failure_reason: reason,
        payment_failed_at: failedAt,
        updated_at: failedAt,
      },
    }
  );

  const fresh = await db.collection("orders").findOne(
    { order_id: order.order_id },
    { projection: { _id: 0 } }
  );
  res.json({
    ok: true,
    order_id: order.order_id,
    payment_status: fresh?.payment_status || "failed",
    payment_failure_reason: fresh?.payment_failure_reason || reason,
  });
});

api.post("/webhooks/razorpay", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  if (!signature) {
    return res.status(400).json({ detail: "Missing X-Razorpay-Signature" });
  }

  let valid;
  try {
    valid = verifyWebhookSignature(req.rawBody || Buffer.from(JSON.stringify(req.body || {})), signature);
  } catch (err) {
    console.error("Razorpay webhook config error:", err.message);
    return res.status(err.status || 500).json({ detail: err.message });
  }

  if (!valid) {
    console.warn(
      JSON.stringify({
        type: "razorpay_webhook_invalid_signature",
        timestamp: nowIso(),
      })
    );
    return res.status(400).json({ detail: "Invalid webhook signature" });
  }

  const event = req.body || {};
  const eventId = event.id || event.event_id;
  if (!eventId) {
    return res.status(400).json({ detail: "Missing event id" });
  }

  const events = db.collection("razorpay_webhook_events");
  const already = await events.findOne({ id: eventId });
  if (already) {
    return res.json({ ok: true, duplicate: true });
  }

  const eventName = event.event;
  const paymentEntity = event.payload?.payment?.entity;
  const razorpayOrderId = paymentEntity?.order_id;
  const razorpayPaymentId = paymentEntity?.id;
  const notesOrderId = paymentEntity?.notes?.order_id;

  let order = null;
  if (razorpayOrderId) {
    order = await db.collection("orders").findOne({ razorpay_order_id: razorpayOrderId });
  }
  if (!order && notesOrderId && isValidOrderId(notesOrderId)) {
    order = await db.collection("orders").findOne({ order_id: notesOrderId });
  }

  if (eventName === "payment.captured" && order && order.payment_status !== "approved") {
    const paidAmount = Number(paymentEntity?.amount);
    const paidCurrency = String(paymentEntity?.currency || "").toUpperCase();
    const matches = capturedPaymentMatchesOrder(paymentEntity, order);

    if (!matches) {
      console.warn(
        JSON.stringify({
          type: "razorpay_webhook_amount_mismatch",
          order_id: order.order_id,
          expected_paise: amountToPaise(order.amount),
          received_paise: paidAmount,
          currency: paidCurrency,
          status: paymentEntity?.status || null,
          timestamp: nowIso(),
        })
      );
    } else {
      const verifiedAt = nowIso();
      await db.collection("orders").updateOne(
        { order_id: order.order_id, payment_status: { $ne: "approved" } },
        {
          $set: {
            payment_method: "razorpay",
            razorpay_order_id: razorpayOrderId || order.razorpay_order_id,
            razorpay_payment_id: razorpayPaymentId || order.razorpay_payment_id,
            razorpay_method: paymentEntity?.method || order.razorpay_method || null,
            razorpay_amount_paise: Number.isFinite(paidAmount) ? paidAmount : amountToPaise(order.amount),
            razorpay_currency: paidCurrency || order.currency || "INR",
            payment_status: "approved",
            delivery_status: "payment_approved",
            payment_verified_at: verifiedAt,
            payment_verified_via: "webhook",
            updated_at: verifiedAt,
          },
        }
      );
    }
  } else if (eventName === "payment.failed" && order && order.payment_status !== "approved") {
    await db.collection("orders").updateOne(
      { order_id: order.order_id, payment_status: { $ne: "approved" } },
      {
        $set: {
          payment_method: "razorpay",
          razorpay_order_id: razorpayOrderId || order.razorpay_order_id,
          razorpay_payment_id: razorpayPaymentId || order.razorpay_payment_id,
          payment_status: "failed",
          payment_failure_reason: paymentEntity?.error_description || paymentEntity?.error_code || "payment_failed",
          payment_failed_at: nowIso(),
          updated_at: nowIso(),
        },
      }
    );
  }

  await events.insertOne({
    id: eventId,
    event: eventName,
    order_id: order?.order_id || null,
    razorpay_order_id: razorpayOrderId || null,
    razorpay_payment_id: razorpayPaymentId || null,
    processed_at: nowIso(),
  });

  res.json({ ok: true });
});

async function fetchAdminOrders(parsed, { skip, limit }) {
  const query = parsed.mongoQuery;
  const collection = db.collection("orders");
  const scoped = (extra) => (Object.keys(query).length ? { $and: [query, extra] } : extra);
  const confirmedQuery = scoped({ payment_status: "approved" });
  const pendingQuery = scoped(pendingPaymentClause());
  const failedQuery = scoped(failedPaymentClause());
  const [total, confirmed, unpaid, failed, items] = await Promise.all([
    collection.countDocuments(query),
    collection.countDocuments(confirmedQuery),
    collection.countDocuments(pendingQuery),
    collection.countDocuments(failedQuery),
    collection
      .find(query, { projection: { _id: 0, razorpay_signature: 0 } })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
  ]);
  return {
    items: items.map((o) => decorateAdminOrder(o, stripOrderSecrets)),
    total,
    confirmed,
    unpaid,
    failed,
  };
}

api.get("/admin/orders", getCurrentAdmin, async (req, res) => {
  const parsed = parseAdminOrderFilters(req.query || {});
  const result = await fetchAdminOrders(parsed, { skip: parsed.skip, limit: parsed.pageSize });
  res.json({
    items: result.items,
    total: result.total,
    confirmed: result.confirmed,
    unpaid: result.unpaid,
    failed: result.failed,
    page: parsed.page,
    pageSize: parsed.pageSize,
    applied: parsed.applied,
    filters: parsed.values,
  });
});

api.post("/admin/orders/export", getCurrentAdmin, async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const format = String(body.format || "csv").toLowerCase();
  const scope = String(body.scope || "filtered").toLowerCase();
  if (!EXPORT_FORMATS.includes(format)) {
    return res.status(400).json({ detail: "Export format must be csv, xlsx, or pdf" });
  }
  if (!EXPORT_SCOPES.includes(scope)) {
    return res.status(400).json({ detail: "Export scope must be view, filtered, or all" });
  }

  const parsed = parseAdminOrderFilters(scope === "all" ? {} : body);
  let skip = 0;
  let limit = MAX_EXPORT_ROWS;
  if (scope === "view") {
    skip = parsed.skip;
    limit = parsed.pageSize;
  }

  const collection = db.collection("orders");
  const items = await collection
    .find(parsed.mongoQuery, { projection: { _id: 0, razorpay_signature: 0 } })
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const file = buildExportFile(items, {
    columns: body.columns,
    format,
    scope,
  });
  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
  res.setHeader("X-Export-Count", String(file.count));
  res.send(file.buffer);
});

api.patch("/admin/orders/:order_id", getCurrentAdmin, async (req, res) => {
  if (!isValidOrderId(req.params.order_id)) {
    return res.status(400).json({ detail: "Invalid order ID" });
  }
  const order = await db.collection("orders").findOne({ order_id: req.params.order_id });
  const patch = buildAdminOrderPatch(order, req.body);
  if (patch.error) {
    return res.status(patch.status || 400).json({ detail: patch.error });
  }
  patch.update.updated_at = nowIso();
  await db.collection("orders").updateOne({ order_id: req.params.order_id }, { $set: patch.update });
  const o = await db.collection("orders").findOne({ order_id: req.params.order_id }, { projection: { _id: 0 } });
  res.json(decorateAdminOrder(o, stripOrderSecrets));
});

api.get("/admin/analytics", getCurrentAdmin, async (req, res) => {
  const orders = db.collection("orders");
  const total = await orders.countDocuments({});
  const pending = await orders.countDocuments(pendingPaymentClause());
  const failed = await orders.countDocuments(failedPaymentClause());
  const approved = await orders.countDocuments({ payment_status: "approved" });
  const shipped = await orders.countDocuments({ delivery_status: "shipped" });
  const delivered = await orders.countDocuments({ delivery_status: "delivered" });
  const approvedOrders = await orders.find({ payment_status: "approved" }, { projection: { amount: 1, _id: 0 } }).toArray();
  const revenue = approvedOrders.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const promoOrders = await orders.countDocuments({ promo_code: { $ne: null } });
  const promoOrderDocs = await orders.find(
    { promo_code: { $ne: null } },
    { projection: { discount_amount: 1, _id: 0 } }
  ).toArray();
  const total_discount_given = promoOrderDocs.reduce((sum, d) => sum + Number(d.discount_amount || 0), 0);
  const contactMessages = db.collection("contact_messages");
  const contact_total = await contactMessages.countDocuments({});
  const contact_unread = await contactMessages.countDocuments({ read: { $ne: true } });
  res.json({
    total_orders: total,
    pending,
    failed,
    approved,
    shipped,
    delivered,
    revenue,
    promo_orders: promoOrders,
    total_discount_given,
    contact_total,
    contact_unread,
  });
});

// --- Users (signups) ---
api.get("/admin/users", getCurrentAdmin, async (req, res) => {
  const users = await db.collection("users")
    .find({ role: "customer" }, { projection: { _id: 0, password_hash: 0 } })
    .sort({ created_at: -1 })
    .limit(1000)
    .toArray();

  const orderCounts = await db.collection("orders").aggregate([
    { $group: { _id: "$email", count: { $sum: 1 } } },
  ]).toArray();
  const countByEmail = new Map(orderCounts.map((o) => [o._id, o.count]));

  res.json(users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || null,
    state: u.state || null,
    pincode: u.pincode || null,
    created_at: u.created_at || null,
    order_count: countByEmail.get(u.email) || 0,
  })));
});

// --- Customer Gallery ---
async function galleryOrdersForUser(userId) {
  const orders = await db
    .collection("orders")
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();

  if (!orders.length) return [];

  const orderIds = orders.map((o) => o.order_id);
  const submitted = await db
    .collection("customer_gallery")
    .find(
      { order_id: { $in: orderIds }, status: { $ne: "rejected" } },
      { projection: { order_id: 1 } }
    )
    .toArray();
  const submittedIds = new Set(submitted.map((e) => e.order_id));

  return orders
    .filter((o) => isOrderEligibleForGallery(o) && !submittedIds.has(o.order_id))
    .map(mapOrderForGallery);
}

api.get("/gallery/eligible-orders", getCurrentUser, async (req, res) => {
  if (req.user.role !== "customer") {
    return res.status(403).json({ detail: "Customer account required" });
  }
  const orders = await galleryOrdersForUser(req.user.id);
  res.json(orders);
});

api.post("/gallery/submit", uploadRateLimiter, getCurrentUser, handleGalleryUpload, async (req, res) => {
  if (req.user.role !== "customer") {
    return res.status(403).json({ detail: "Customer account required" });
  }

  const orderId = clampString(req.body?.order_id || req.body?.order_number, 30);

  if (!orderId || !isValidOrderId(orderId)) {
    return res.status(400).json({ detail: "Select a valid order" });
  }
  if (!req.files?.length) {
    return res.status(400).json({ detail: "At least one image is required" });
  }
  if (req.files.length > GALLERY_MAX_IMAGES) {
    return res.status(400).json({ detail: `Maximum ${GALLERY_MAX_IMAGES} images allowed` });
  }

  const order = await db.collection("orders").findOne({ order_id: orderId });
  if (!order) return res.status(404).json({ detail: "Order not found" });
  if (order.user_id !== req.user.id) {
    return res.status(403).json({ detail: "This order is not linked to your account" });
  }
  if (!isOrderEligibleForGallery(order)) {
    return res.status(400).json({
      detail: "Only delivered orders with approved payment can submit photos",
    });
  }

  const existing = await db.collection("customer_gallery").findOne({
    order_id: orderId,
    status: { $ne: "rejected" },
  });
  if (existing) {
    return res.status(400).json({ detail: "Photos already submitted for this order" });
  }

  let images;
  try {
    const imageSettings = await getImageSettings();
    images = await processGalleryImages(req.files, UPLOAD_DIR, {
      maxWidth: imageSettings.image_max_width,
      quality: imageSettings.image_webp_quality,
      targetKb: imageSettings.image_target_kb,
    });
  } catch (err) {
    return res.status(400).json({ detail: err.message || "Image processing failed" });
  }
  if (!images.length) {
    return res.status(400).json({ detail: "No valid images processed" });
  }

  const entry = {
    id: crypto.randomUUID(),
    order_id: orderId,
    images,
    status: "pending",
    featured: false,
    hidden: false,
    verified: true,
    source: "customer",
    sort_order: Date.now(),
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  await db.collection("customer_gallery").insertOne(entry);
  res.status(201).json({
    id: entry.id,
    order_id: entry.order_id,
    images: sanitizePublicImagesList(entry.images),
    status: entry.status,
  });
});

api.get("/gallery", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filter = publicGalleryFilter();
  const sort = gallerySort(req.query);

  const entries = await db.collection("customer_gallery")
    .find(filter, { projection: { _id: 0, id: 1, images: 1, featured: 1, sort_order: 1, created_at: 1 } })
    .sort(sort)
    .limit(2000)
    .toArray();

  const flat = flattenGalleryEntries(entries);
  res.json(paginateGalleryImages(flat, page, limit));
});

api.get("/gallery/entry/:id/images", async (req, res) => {
  const entry = await db.collection("customer_gallery").findOne(
    { id: req.params.id, status: "approved", hidden: { $ne: true } },
    { projection: { _id: 0, images: 1 } }
  );
  if (!entry) return res.status(404).json({ detail: "Gallery entry not found" });
  res.json(sanitizePublicImagesList(entry.images));
});

api.get("/gallery/featured", async (req, res) => {
  const limit = Math.min(24, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const entries = await db.collection("customer_gallery")
    .find(publicGalleryFilter(), { projection: { _id: 0, id: 1, images: 1, featured: 1, sort_order: 1, created_at: 1 } })
    .sort({ featured: -1, sort_order: 1, created_at: -1 })
    .limit(200)
    .toArray();
  const flat = flattenGalleryEntries(entries);
  res.json(flat.slice(0, limit));
});

api.get("/gallery/filters", async (_req, res) => {
  res.json({ phone_brands: [], phone_models: [], case_types: [] });
});

api.post("/admin/gallery", getCurrentAdmin, handleGalleryUpload, async (req, res) => {
  if (!req.files?.length) {
    return res.status(400).json({ detail: "At least one image is required" });
  }
  if (req.files.length > GALLERY_MAX_IMAGES) {
    return res.status(400).json({ detail: `Maximum ${GALLERY_MAX_IMAGES} images allowed` });
  }

  let images;
  try {
    const imageSettings = await getImageSettings();
    images = await processGalleryImages(req.files, UPLOAD_DIR, {
      maxWidth: imageSettings.image_max_width,
      quality: imageSettings.image_webp_quality,
      targetKb: imageSettings.image_target_kb,
    });
  } catch (err) {
    return res.status(400).json({ detail: err.message || "Image processing failed" });
  }
  if (!images.length) {
    return res.status(400).json({ detail: "No valid images processed" });
  }

  const entry = {
    id: crypto.randomUUID(),
    order_id: null,
    images,
    status: "approved",
    featured: req.body?.featured === true || req.body?.featured === "true",
    hidden: false,
    verified: true,
    source: "admin",
    sort_order: Date.now(),
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  await db.collection("customer_gallery").insertOne(entry);
  res.status(201).json(entry);
});

api.get("/admin/gallery", getCurrentAdmin, async (req, res) => {
  const status = req.query.status;
  const filter = {};
  if (status && status !== "all") filter.status = status;
  if (req.query.hidden === "true") filter.hidden = true;
  if (req.query.featured === "true") filter.featured = true;

  const items = await db.collection("customer_gallery")
    .find(filter, { projection: { _id: 0 } })
    .sort({ status: 1, created_at: -1 })
    .limit(500)
    .toArray();
  res.json(items);
});

api.patch("/admin/gallery/:id", getCurrentAdmin, async (req, res) => {
  const item = await db.collection("customer_gallery").findOne({ id: req.params.id });
  if (!item) return res.status(404).json({ detail: "Gallery entry not found" });

  const update = { updated_at: nowIso() };
  const allowed = ["status", "featured", "hidden", "sort_order"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (key === "sort_order") {
        update[key] = Number(req.body[key]) || 0;
      } else {
        update[key] = req.body[key];
      }
    }
  }

  if (update.status && !["pending", "approved", "rejected"].includes(update.status)) {
    return res.status(400).json({ detail: "Invalid status" });
  }

  await db.collection("customer_gallery").updateOne({ id: req.params.id }, { $set: update });
  const out = await db.collection("customer_gallery").findOne(
    { id: req.params.id },
    { projection: { _id: 0 } }
  );
  res.json(out);
});

api.post("/admin/gallery/reorder", getCurrentAdmin, async (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ detail: "ids array required" });
  }
  const ts = nowIso();
  await Promise.all(
    ids.map((id, index) =>
      db.collection("customer_gallery").updateOne(
        { id },
        { $set: { sort_order: index, updated_at: ts } }
      )
    )
  );
  res.json({ ok: true });
});

api.delete("/admin/gallery/:id", getCurrentAdmin, async (req, res) => {
  const item = await db.collection("customer_gallery").findOne({ id: req.params.id });
  if (!item) return res.status(404).json({ detail: "Gallery entry not found" });

  for (const img of item.images || []) {
    deleteGalleryImageFiles(UPLOAD_DIR, img);
  }
  await db.collection("customer_gallery").deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

// --- Settings ---
api.get("/settings", async (req, res) => {
  const s = await getMainSettings();
  const { _id, ...rest } = s;
  res.json(toPublicSettings(rest));
});

api.put("/settings", getCurrentAdmin, async (req, res) => {
  try {
    const imageUpdate = imageSettingsUpdateFromBody(req.body || {});
    if (imageUpdate.error) return res.status(400).json({ detail: imageUpdate.error });
    const update = { ...sanitizeSettingsUpdate(req.body || {}), ...imageUpdate.fields };
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ detail: "No fields to update" });
    }
    if (update.payment_method === "razorpay" && !isRazorpayConfigured()) {
      return res.status(400).json({
        detail: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server env before enabling Razorpay",
      });
    }
    await db.collection("settings").updateOne({ id: "main" }, { $set: update }, { upsert: true });
    const s = await db.collection("settings").findOne({ id: "main" }, { projection: { _id: 0 } });
    res.json(toPublicSettings(s));
  } catch (err) {
    console.error("Settings save failed:", err.message);
    if (!res.headersSent) res.status(500).json({ detail: "Could not save settings" });
  }
});

// --- Health ---
api.get("/", (req, res) => {
  res.json({ status: "ok", service: "CASEBOX" });
});

app.use("/api", api);

// Multer errors from the compressed-image routes. Other errors keep the default handler.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ detail: "Image is too large. Maximum size is 10 MB." });
    }
    return res.status(400).json({ detail: "Invalid upload" });
  }

  if (err instanceof ImageInputError) {
    return res.status(400).json({ detail: err.message });
  }

  return next(err);
});

async function ensureGoogleIdIndex(users) {
  const options = {
    unique: true,
    partialFilterExpression: { google_id: { $type: "string" } },
  };
  const existing = (await users.indexes()).find((idx) => idx.name === "google_id_1");
  const matches =
    existing &&
    existing.unique === true &&
    !existing.sparse &&
    existing.partialFilterExpression?.google_id?.$type === "string";
  if (existing && !matches) {
    await users.dropIndex("google_id_1");
    console.log("Replaced users.google_id_1 index (sparse unique → partial unique)");
  }
  await users.createIndex({ google_id: 1 }, options);
}

async function seed() {
  await ensureSecurityIndexes(db);
  await db.collection("users").createIndex("email", { unique: true });
  await ensureGoogleIdIndex(db.collection("users"));
  await db.collection("brands").createIndex("id", { unique: true });
  await db.collection("models").createIndex("id", { unique: true });
  await db.collection("products").createIndex("id", { unique: true });
  await db.collection("phone_model_case_types").createIndex("id", { unique: true });
  await db.collection("phone_model_case_types").createIndex(
    { phone_model_id: 1, case_type_id: 1 },
    { unique: true }
  );
  await db.collection("orders").createIndex("order_id", { unique: true });
  await db.collection("orders").createIndex("user_id");
  await db.collection("orders").createIndex({ created_at: -1 });
  await db.collection("orders").createIndex({ payment_status: 1, created_at: -1 });
  await db.collection("orders").createIndex({ delivery_status: 1, created_at: -1 });
  await db.collection("orders").createIndex({ user_id: 1, payment_status: 1, created_at: -1 });
  await db.collection("orders").createIndex("razorpay_order_id");
  await db.collection("orders").createIndex("razorpay_payment_id");
  await db.collection("razorpay_webhook_events").createIndex("id", { unique: true });
  await db.collection("templates").createIndex("id", { unique: true });
  await db.collection("templates").createIndex({ model_id: 1, case_type_slug: 1 });
  await db.collection("templates").createIndex(
    { is_default: 1 },
    { unique: true, partialFilterExpression: { is_default: true }, name: "templates_default_unique" }
  );
  await db.collection("promo_codes").createIndex("id", { unique: true });
  await db.collection("promo_codes").createIndex("code", { unique: true });
  await db.collection("hero_slides").createIndex("id", { unique: true });
  await db.collection("hero_slides").createIndex({ enabled: 1, order: 1 });
  const seededHero = await seedDefaultHeroSlides(db, {
    uploadDir: UPLOAD_DIR,
    frontendHeroDir: path.join(ROOT_DIR, "..", "frontend", "public", "images", "hero"),
    publicUrl,
    nowIso,
  });
  if (seededHero) console.log(`Seeded ${seededHero} homepage hero slides`);
  await db.collection("template_products").createIndex("id", { unique: true });
  await db.collection("template_products").createIndex("slug", { unique: true });
  await db.collection("template_products").createIndex({ status: 1, featured: 1 });
  await db.collection("template_products").createIndex({ status: 1, category: 1 });
  await db.collection("template_products").createIndex({ status: 1, phone_brand: 1 });
  await db.collection("template_products").createIndex({ status: 1, created_at: -1 });
  await db.collection("template_products").createIndex({ trashed_at: 1, created_at: -1 });
  await db.collection("template_products").createIndex({ design_id: 1, status: 1 });
  await db.collection("customer_gallery").createIndex("id", { unique: true });
  await db.collection("customer_gallery").createIndex({ status: 1, hidden: 1, created_at: -1 });
  await db.collection("customer_gallery").createIndex({ order_id: 1 });
  await db.collection("customer_gallery").createIndex({ featured: -1, sort_order: 1 });
  await db.collection("customer_gallery").createIndex({ phone_brand: 1, phone_model: 1, case_type: 1 });

  const adminEmail = process.env.ADMIN_EMAIL.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const existing = await db.collection("users").findOne({ email: adminEmail });
  if (!existing) {
    await db.collection("users").insertOne({
      id: crypto.randomUUID(),
      email: adminEmail,
      password_hash: hashPassword(adminPassword),
      name: "Admin",
      role: "admin",
      created_at: nowIso(),
    });
    console.log(`Seeded admin: ${adminEmail}`);
  } else if (!verifyPassword(adminPassword, existing.password_hash)) {
    await db.collection("users").updateOne(
      { email: adminEmail },
      { $set: { password_hash: hashPassword(adminPassword) } }
    );
  }

  if ((await db.collection("brands").countDocuments({})) === 0) {
    for (const b of DEFAULT_BRANDS) {
      const brandId = crypto.randomUUID();
      await db.collection("brands").insertOne({
        id: brandId,
        name: b.name,
        slug: b.name.toLowerCase().replace(/\s+/g, "-"),
        logo_url: null,
        created_at: nowIso(),
      });
      for (const m of b.models) {
        await db.collection("models").insertOne({
          id: crypto.randomUUID(),
          brand_id: brandId,
          name: m,
          image_url: null,
          created_at: nowIso(),
        });
      }
    }
    console.log("Seeded default brands and models");
  }

  if ((await db.collection("products").countDocuments({})) === 0) {
    for (const p of DEFAULT_PRODUCTS) {
      await db.collection("products").insertOne({
        id: crypto.randomUUID(),
        ...p,
        is_active: true,
        image_url: null,
        created_at: nowIso(),
      });
    }
    console.log("Seeded default products");
  }

  const standardProductDescriptions = {
    silicone: {
      description: "Crafted from high-grade liquid silicone with a soft microfiber interior lining. Delivers a secure, velvety grip that absorbs everyday drops and bumps, complete with precision cutouts and responsive button covers.",
      material: "Liquid Silicone",
    },
    transparent: {
      description: "Engineered from optical-grade polycarbonate with anti-yellowing UV resistance and reinforced shock-absorbing edges. Lets your phone's original finish and design show through while guarding against scratches and everyday impact.",
      material: "Polycarbonate",
    },
    matte: {
      description: "Finished with a premium satin matte coating that actively resists fingerprints, oils, and surface smudges. Combines a sleek, low-profile silhouette with smooth tactile grip and durable daily edge protection.",
      material: "Matte Polycarbonate",
    },
    glass: {
      description: "Constructed with a 9H tempered glass backplate and flexible shock-absorbing TPU borders. Features an ultra-smooth glossy surface with high scratch resistance for a clean, luxury look and premium hand feel.",
      material: "Tempered Glass",
    },
    "oil-green": {
      description: "Crafted in a distinctive deep oil-green tone with a tactile soft-touch matte finish. Combines impact-absorbing corner protection with a smudge-resistant surface tailored for comfortable everyday handling.",
      material: "Tactile Matte Polymer",
    },
  };

  const existingProducts = await db.collection("products").find({}).toArray();
  for (const prod of existingProducts) {
    const slugKey = String(prod.slug || "").replace(/-case$/i, "").toLowerCase();
    const config = standardProductDescriptions[slugKey];
    if (config) {
      const curDesc = String(prod.description || "").trim();
      const needsDesc = !curDesc || curDesc.length < 90 || curDesc === "963" || curDesc === "oky";
      const needsMat = !prod.material;
      if (needsDesc || needsMat) {
        const setPatch = {};
        if (needsDesc) setPatch.description = config.description;
        if (needsMat) setPatch.material = config.material;
        await db.collection("products").updateOne({ id: prod.id }, { $set: setPatch });
      }
    }
  }

  const legacyProducts = await db.collection("products")
    .find({ price: { $type: "number" } })
    .toArray();
  if (legacyProducts.length > 0) {
    const [brands, models] = await Promise.all([
      db.collection("brands").find({}).toArray(),
      db.collection("models").find({}).toArray(),
    ]);
    const brandById = new Map(brands.map((brand) => [brand.id, brand]));
    const timestamp = nowIso();
    for (const model of models) {
      const brand = brandById.get(model.brand_id);
      for (const product of legacyProducts) {
        if (!productIsAllowedForBrand(brand, product)) continue;
        await db.collection("phone_model_case_types").updateOne(
          { phone_model_id: model.id, case_type_id: product.id },
          {
            $setOnInsert: {
              id: crypto.randomUUID(),
              phone_model_id: model.id,
              case_type_id: product.id,
              price: Number(product.price),
              status: true,
              created_at: timestamp,
              updated_at: timestamp,
            },
          },
          { upsert: true }
        );
      }
    }
    await db.collection("products").updateMany({}, { $unset: { price: "" } });
    await db.collection("brands").updateMany({}, { $unset: { allowed_product_ids: "" } });
    console.log("Migrated global case type prices to phone model pricing");
  }

  if (!(await db.collection("settings").findOne({ id: "main" }))) {
    await db.collection("settings").insertOne(defaultSettings());
  } else {
    // Backfill payment_method without overwriting existing admin choices
    await db.collection("settings").updateOne(
      { id: "main", payment_method: { $exists: false } },
      { $set: { payment_method: "manual_upi" } }
    );
    // Never leave secrets that may have been stored by mistake
    await db.collection("settings").updateOne(
      { id: "main" },
      {
        $unset: {
          razorpay_key_secret: "",
          razorpay_webhook_secret: "",
          razorpay_secret: "",
          key_secret: "",
          webhook_secret: "",
        },
      }
    );
  }

  // Ensure standard case types exist and are synchronized
  const standardCaseTypes = [
    { name: "Silicone", slug: "silicone", order: 1, image: "/api/uploads/categories/silicone-case.png" },
    { name: "Transparent", slug: "transparent", order: 2 },
    { name: "Matte", slug: "matte", order: 3 },
    { name: "Glass", slug: "glass", order: 4, image: "/api/uploads/categories/glass-case.png" },
    { name: "Oil green", slug: "oil-green", order: 5, image: "/api/uploads/categories/oil-green-case.png" },
  ];
  for (const ct of standardCaseTypes) {
    const existingCt = await db.collection("case_types").findOne({
      $or: [{ slug: ct.slug }, { name: ct.name }],
    });
    if (!existingCt) {
      await db.collection("case_types").insertOne({
        id: crypto.randomUUID(),
        name: ct.name,
        slug: ct.slug,
        link: `/shop?case_type=${ct.slug}`,
        image: ct.image || null,
        order: ct.order,
        created_at: nowIso(),
      });
    } else {
      const updates = {};
      if (existingCt.slug === "test-case-type" && ct.slug === "matte") {
        updates.slug = "matte";
        updates.name = "Matte";
      }
      if (!existingCt.image && ct.image) {
        updates.image = ct.image;
      }
      if (Object.keys(updates).length > 0) {
        await db.collection("case_types").updateOne(
          { id: existingCt.id },
          { $set: updates }
        );
      }
    }
  }

  // Ensure iphone template has design_id and active material variants (Matte, Transparent, Silicone, Glass)
  const iphoneTemplate = await db.collection("template_products").findOne({ slug: "iphone" });
  if (iphoneTemplate) {
    let designId = iphoneTemplate.design_id;
    if (!designId) {
      designId = crypto.randomUUID();
      await db.collection("template_products").updateOne(
        { id: iphoneTemplate.id },
        { $set: { design_id: designId, case_type: "matte", material: "Matte Polycarbonate" } }
      );
    }
    const iphoneVariants = [
      {
        slug: "iphone-transparent",
        case_type: "transparent",
        material: "Polycarbonate",
        price: 349,
        description: "Engineered from optical-grade polycarbonate with anti-yellowing UV resistance and reinforced shock-absorbing edges. Lets your phone's original finish show through.",
        stock: 50,
      },
      {
        slug: "iphone-silicone",
        case_type: "silicone",
        material: "Liquid Silicone",
        price: 299,
        description: "Crafted from high-grade liquid silicone with a soft microfiber interior lining. Delivers a secure, velvety grip that absorbs everyday drops and bumps.",
        stock: 50,
      },
      {
        slug: "iphone-glass",
        case_type: "glass",
        material: "Tempered Glass",
        price: 499,
        description: "Constructed with a 9H tempered glass backplate and flexible shock-absorbing TPU borders. Ultra-smooth glossy surface with high scratch resistance.",
        stock: 30,
      },
    ];
    for (const v of iphoneVariants) {
      const existingVariant = await db.collection("template_products").findOne({
        $or: [{ slug: v.slug }, { design_id: designId, case_type: v.case_type }],
      });
      if (!existingVariant) {
        const ts = nowIso();
        await db.collection("template_products").insertOne({
          id: crypto.randomUUID(),
          title: iphoneTemplate.title,
          slug: v.slug,
          product_type: iphoneTemplate.product_type || "original",
          description: v.description,
          short_description: v.description.slice(0, 120),
          phone_brand: iphoneTemplate.phone_brand || "Apple",
          phone_models: Array.isArray(iphoneTemplate.phone_models) ? iphoneTemplate.phone_models : [],
          category: iphoneTemplate.category || "Minimal",
          collection: iphoneTemplate.collection || "Essentials",
          case_type: v.case_type,
          material: v.material,
          price: v.price,
          sale_price: null,
          stock: v.stock,
          variant_inventory: [],
          sku: null,
          tags: Array.isArray(iphoneTemplate.tags) ? iphoneTemplate.tags : [],
          featured: false,
          best_seller: false,
          new_arrival: true,
          status: "published",
          rating: iphoneTemplate.rating || 4.5,
          review_count: 0,
          seo: iphoneTemplate.seo || {},
          thumbnail: iphoneTemplate.thumbnail,
          images: Array.isArray(iphoneTemplate.images) ? iphoneTemplate.images : [],
          design_id: designId,
          order_count: 0,
          created_at: ts,
          updated_at: ts,
        });
      }
    }
  }

  // Ensure iphone-copy has its own design_id and full material group
  const iphoneCopy = await db.collection("template_products").findOne({ slug: "iphone-copy" });
  if (iphoneCopy) {
    let copyDesignId = iphoneCopy.design_id;
    if (!copyDesignId) {
      copyDesignId = crypto.randomUUID();
      await db.collection("template_products").updateOne(
        { id: iphoneCopy.id },
        { $set: { design_id: copyDesignId, case_type: "matte", material: "Matte Polycarbonate" } }
      );
    }
    const copyVariants = [
      {
        slug: "iphone-copy-transparent",
        case_type: "transparent",
        material: "Polycarbonate",
        price: 349,
        description: "Engineered from optical-grade polycarbonate with anti-yellowing UV resistance and reinforced shock-absorbing edges. Lets your phone's original finish show through.",
        stock: 50,
      },
      {
        slug: "iphone-copy-silicone",
        case_type: "silicone",
        material: "Liquid Silicone",
        price: 299,
        description: "Crafted from high-grade liquid silicone with a soft microfiber interior lining. Delivers a secure, velvety grip that absorbs everyday drops and bumps.",
        stock: 50,
      },
      {
        slug: "iphone-copy-glass",
        case_type: "glass",
        material: "Tempered Glass",
        price: 499,
        description: "Constructed with a 9H tempered glass backplate and flexible shock-absorbing TPU borders. Ultra-smooth glossy surface with high scratch resistance.",
        stock: 30,
      },
    ];
    for (const v of copyVariants) {
      const existingVariant = await db.collection("template_products").findOne({
        $or: [{ slug: v.slug }, { design_id: copyDesignId, case_type: v.case_type }],
      });
      if (!existingVariant) {
        const ts = nowIso();
        await db.collection("template_products").insertOne({
          id: crypto.randomUUID(),
          title: iphoneCopy.title,
          slug: v.slug,
          product_type: iphoneCopy.product_type || "original",
          description: v.description,
          short_description: v.description.slice(0, 120),
          phone_brand: iphoneCopy.phone_brand || "Apple",
          phone_models: Array.isArray(iphoneCopy.phone_models) ? iphoneCopy.phone_models : [],
          category: iphoneCopy.category || "Minimal",
          collection: iphoneCopy.collection || "Essentials",
          case_type: v.case_type,
          material: v.material,
          price: v.price,
          sale_price: null,
          stock: v.stock,
          variant_inventory: [],
          sku: null,
          tags: Array.isArray(iphoneCopy.tags) ? iphoneCopy.tags : [],
          featured: false,
          best_seller: false,
          new_arrival: false,
          status: "published",
          rating: iphoneCopy.rating || 4.5,
          review_count: 0,
          seo: iphoneCopy.seo || {},
          thumbnail: iphoneCopy.thumbnail,
          images: Array.isArray(iphoneCopy.images) ? iphoneCopy.images : [],
          design_id: copyDesignId,
          order_count: 0,
          created_at: ts,
          updated_at: ts,
        });
      }
    }
  }
}


async function main() {
  if (!MONGO_URL || !DB_NAME || !JWT_SECRET || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error("Missing required env vars: MONGO_URL, DB_NAME, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD");
    process.exit(1);
  }
  const configErrors = productionConfigErrors();
  if (configErrors.length) {
    console.error(`[security] Refusing to start in production:\n- ${configErrors.join("\n- ")}`);
    process.exit(1);
  }

  client = new MongoClient(MONGO_URL);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`Connected to MongoDB: ${DB_NAME}`);

  await seed();

  // On Windows, "localhost" is both 127.0.0.1 and ::1. Binding only one of
  // them makes the browser report that the backend is not connected.
  const requestedHost = process.env.HOST || "0.0.0.0";
  const bindAll = ["0.0.0.0", "::", "localhost", "::1"].includes(requestedHost);

  function logListening() {
    console.log(`CASEBOX API running on http://localhost:${PORT}`);
    const os = require("os");
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          console.log(`  LAN: http://${net.address}:${PORT}`);
        }
      }
    }
  }

  if (bindAll) {
    const ipv4 = app.listen(PORT, "0.0.0.0", logListening);
    ipv4.on("error", (err) => {
      console.error("Failed to bind IPv4:", err.message);
      process.exit(1);
    });
    const ipv6 = app.listen(PORT, "::");
    ipv6.on("error", (err) => {
      console.warn("IPv6 bind skipped:", err.message);
    });
  } else {
    app.listen(PORT, requestedHost, () => {
      console.log(`CASEBOX API running on http://${requestedHost}:${PORT}`);
    });
  }
}

main().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});

process.on("SIGINT", async () => {
  if (client) await client.close();
  process.exit(0);
});
