const rateLimit = require("express-rate-limit");

const isTest = process.env.NODE_ENV === "test";
const isProd = process.env.NODE_ENV === "production";
const skipLimits = isTest || process.env.DISABLE_RATE_LIMIT === "true";
const skipBotCheck = isTest || process.env.DISABLE_BOT_PROTECTION === "true";

const LOGIN_MAX_FAILURES = Number(process.env.LOGIN_MAX_FAILURES) || 10;
const LOGIN_LOCKOUT_MS = Number(process.env.LOGIN_LOCKOUT_MS) || 5 * 60 * 1000;
const LOGIN_PAIR_WINDOW_MS = Number(process.env.LOGIN_PAIR_WINDOW_MS) || 15 * 60 * 1000;
const MIN_FORM_MS = Number(process.env.MIN_FORM_SUBMIT_MS) || 2000;
const MAX_FORM_MS = Number(process.env.MAX_FORM_AGE_MS) || 60 * 60 * 1000;

const noop = (_req, _res, next) => next();

function getClientIp(req) {
  return req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
}

function authDelay(ms = 600) {
  const base = ms ?? 600;
  return new Promise((resolve) => setTimeout(resolve, base + Math.floor(Math.random() * 400)));
}

function loginPairKey(email, ip) {
  return `${email.toLowerCase()}|${ip}`;
}

function isAdminEmail(email) {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(admin && email.toLowerCase() === admin);
}

function getProgressiveDelayMs(failures) {
  if (failures <= 1) return 600;
  if (failures === 2) return 1000;
  if (failures === 3) return 2000;
  if (failures === 4) return 4000;
  return 8000;
}

function validateEmail(email) {
  const norm = String(email || "").trim().toLowerCase();
  if (!norm || norm.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) return null;
  return norm;
}

function validatePassword(password) {
  const pw = String(password || "");
  if (pw.length < 8 || pw.length > 128) return false;
  return true;
}

function clampString(value, maxLen) {
  if (value == null) return "";
  return String(value).trim().slice(0, maxLen);
}

function validateIndianPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return digits;
}

function botProtection(req, res, next) {
  if (skipBotCheck) return next();

  const { _honeypot, _formLoadedAt } = req.body || {};
  if (_honeypot) {
    return res.status(400).json({ detail: "Invalid request" });
  }
  const loadedAt = Number(_formLoadedAt);
  if (!loadedAt || Number.isNaN(loadedAt)) {
    return res.status(400).json({ detail: "Invalid request" });
  }
  const elapsed = Date.now() - loadedAt;
  if (elapsed < MIN_FORM_MS) {
    return res.status(429).json({ detail: "Please wait a moment before submitting" });
  }
  if (elapsed > MAX_FORM_MS) {
    return res.status(400).json({ detail: "Session expired. Please refresh and try again" });
  }
  next();
}

function createRateLimiter({ windowMs, max, message }) {
  if (skipLimits) return noop;
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { detail: message },
    keyGenerator: (req) => getClientIp(req),
  });
}

const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.REGISTER_RATE_LIMIT) || 5,
  message: "Too many sign-up attempts. Please try again later.",
});

const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT) || (isProd ? 120 : 600),
  message: "Too many requests. Please slow down.",
});

const uploadRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.UPLOAD_RATE_LIMIT) || 30,
  message: "Too many uploads. Please try again later.",
});

const orderRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.ORDER_RATE_LIMIT) || 10,
  message: "Too many orders placed. Please try again later.",
});

const googleAuthRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.GOOGLE_AUTH_RATE_LIMIT) || 20,
  message: "Too many sign-in attempts. Please try again later.",
});

function validateStartupSecrets() {
  const secret = process.env.JWT_SECRET || "";
  if (!secret || secret.length < 32) {
    console.warn("[security] JWT_SECRET should be at least 32 random characters.");
  }
  if (secret === "drop_box" || secret === "changeme" || secret === "secret") {
    console.warn("[security] JWT_SECRET is a known weak default — change it in production.");
  }
  if (isProd && !process.env.CORS_ORIGINS) {
    console.warn("[security] Set CORS_ORIGINS in production to restrict API access.");
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("[security] GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for customer Google Sign-In.");
  }
  const rzpKey = process.env.RAZORPAY_KEY_ID || "";
  const rzpSecret = process.env.RAZORPAY_KEY_SECRET || "";
  if (rzpKey && (!rzpSecret || /^change_me/i.test(rzpSecret))) {
    console.warn("[security] RAZORPAY_KEY_ID is set but RAZORPAY_KEY_SECRET is missing or still a placeholder.");
  }
}

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS || "";
  const origins = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return origins.length ? origins : null;
}

const ORDER_ID_RE = /^FRM-\d{6}-[A-F0-9]{6}$/;

function isValidOrderId(orderId) {
  return ORDER_ID_RE.test(String(orderId || ""));
}

function isValidUploadUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (url.length > 512) return false;
  return /uploads\/(designs|payments|templates|prints|popups|brands|models|products|template-products|customer-gallery(?:\/thumbs)?)\/[a-zA-Z0-9._-]+$/.test(url)
    || url.includes("/api/uploads/");
}

async function ensureSecurityIndexes(db) {
  await db.collection("auth_security").createIndex({ type: 1, key: 1 }, { unique: true });
  await db.collection("auth_security").createIndex(
    { locked_until: 1 },
    { expireAfterSeconds: 0, partialFilterExpression: { locked_until: { $type: "date" } } }
  );
  await db.collection("auth_security").createIndex(
    { expires_at: 1 },
    { expireAfterSeconds: 0, partialFilterExpression: { expires_at: { $type: "date" } } }
  );
}

async function getLockRecord(db, type, key) {
  return db.collection("auth_security").findOne({ type, key });
}

async function checkLoginLockout(db, email, ip) {
  if (skipLimits || isAdminEmail(email)) {
    return { locked: false, failures: 0, delayMs: 0 };
  }

  const key = loginPairKey(email, ip);
  const rec = await getLockRecord(db, "login_pair", key);
  const now = new Date();

  if (rec?.locked_until && new Date(rec.locked_until) > now) {
    return {
      locked: true,
      retryAfter: rec.locked_until,
      failures: rec.failures || 0,
    };
  }

  if (
    !rec ||
    (rec.window_start && now - new Date(rec.window_start) > LOGIN_PAIR_WINDOW_MS) ||
    (rec.locked_until && new Date(rec.locked_until) <= now)
  ) {
    return { locked: false, failures: 0, delayMs: 0 };
  }

  const failures = rec.failures || 0;
  return { locked: false, failures, delayMs: getProgressiveDelayMs(failures) };
}

async function recordLoginFailure(db, email, ip) {
  if (skipLimits || isAdminEmail(email)) {
    return { failures: 0, delayMs: 0 };
  }

  const now = new Date();
  const key = loginPairKey(email, ip);
  let rec = await getLockRecord(db, "login_pair", key);

  if (rec?.locked_until && new Date(rec.locked_until) <= now) {
    await clearLoginFailures(db, email, ip);
    rec = null;
  }

  const windowStart = rec?.window_start ? new Date(rec.window_start) : null;
  const windowExpired = !windowStart || now - windowStart > LOGIN_PAIR_WINDOW_MS;
  const failures = !rec || windowExpired ? 1 : (rec.failures || 0) + 1;
  const locked_until =
    failures >= LOGIN_MAX_FAILURES ? new Date(now.getTime() + LOGIN_LOCKOUT_MS) : null;

  await db.collection("auth_security").updateOne(
    { type: "login_pair", key },
    {
      $set: {
        failures,
        locked_until,
        window_start: windowExpired ? now : windowStart,
        updated_at: nowIso(),
      },
      $setOnInsert: { type: "login_pair", key, created_at: nowIso() },
    },
    { upsert: true }
  );

  return { failures, delayMs: getProgressiveDelayMs(failures), locked_until };
}

async function clearLoginFailures(db, email, ip) {
  await db.collection("auth_security").deleteMany({
    type: "login_pair",
    key: loginPairKey(email, ip),
  });
}

async function checkRegisterQuota(db, ip) {
  const rec = await getLockRecord(db, "register_ip", ip);
  const maxPerHour = Number(process.env.REGISTER_IP_LIMIT) || 3;
  const windowStart = rec?.window_start ? new Date(rec.window_start) : null;
  const now = new Date();
  if (!windowStart || now - windowStart > 60 * 60 * 1000) {
    return { allowed: true, count: 0 };
  }
  if ((rec?.count || 0) >= maxPerHour) {
    return { allowed: false };
  }
  return { allowed: true, count: rec?.count || 0 };
}

async function recordRegisterAttempt(db, ip) {
  const now = new Date();
  const rec = await getLockRecord(db, "register_ip", ip);
  const windowStart = rec?.window_start ? new Date(rec.window_start) : null;
  const expired = !windowStart || now - windowStart > 60 * 60 * 1000;
  await db.collection("auth_security").updateOne(
    { type: "register_ip", key: ip },
    expired
      ? {
          $set: { count: 1, window_start: now, updated_at: now },
          $setOnInsert: { type: "register_ip", key: ip, created_at: now },
        }
      : {
          $inc: { count: 1 },
          $set: { updated_at: now },
          $setOnInsert: { type: "register_ip", key: ip, window_start: now, created_at: now },
        },
    { upsert: true }
  );
}

function nowIso() {
  return new Date().toISOString();
}

module.exports = {
  registerRateLimiter,
  apiRateLimiter,
  uploadRateLimiter,
  orderRateLimiter,
  googleAuthRateLimiter,
  botProtection,
  getClientIp,
  authDelay,
  validateEmail,
  validatePassword,
  validateIndianPhone,
  clampString,
  validateStartupSecrets,
  parseCorsOrigins,
  isValidOrderId,
  isValidUploadUrl,
  ensureSecurityIndexes,
  checkLoginLockout,
  recordLoginFailure,
  clearLoginFailures,
  checkRegisterQuota,
  recordRegisterAttempt,
};
