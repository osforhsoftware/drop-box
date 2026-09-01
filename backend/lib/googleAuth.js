const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { parseCorsOrigins } = require("./security");

const OAUTH_COOKIE = "oauth_ctx";
const OAUTH_MAX_MS = 10 * 60 * 1000;
const LOGIN_CODE_TTL_MS = 60 * 1000;

function googleConfigured() {
  return Boolean(
    String(process.env.GOOGLE_CLIENT_ID || "").trim() &&
    String(process.env.GOOGLE_CLIENT_SECRET || "").trim()
  );
}

function getGoogleCallbackUrl(port, publicBaseUrl) {
  const explicit = String(process.env.GOOGLE_CALLBACK_URL || "").trim();
  if (explicit) return explicit;
  const base = String(publicBaseUrl || `http://localhost:${port || 8000}`).replace(/\/$/, "");
  return `${base}/api/auth/google/callback`;
}

function getFrontendUrl() {
  const explicit = String(process.env.FRONTEND_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const origins = parseCorsOrigins();
  if (origins?.[0]) return origins[0].replace(/\/$/, "");
  return "http://localhost:3000";
}

function getOAuthClient(callbackUrl) {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl
  );
}

function safeNextPath(raw) {
  let next = String(raw == null ? "/" : raw).trim();
  if (!next) return "/";
  try {
    next = decodeURIComponent(next);
  } catch {
    return "/";
  }
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  if (next.includes("://")) return "/";
  if (next.includes("\\")) return "/";
  if (/[\u0000-\u001f]/.test(next)) return "/";
  if (next === "/admin" || next.startsWith("/admin/")) return "/";
  return next;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function createPkcePair() {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

function oauthCookieOpts(isProd) {
  return {
    httpOnly: true,
    secure: Boolean(isProd),
    sameSite: "lax",
    maxAge: OAUTH_MAX_MS,
    path: "/api/auth",
  };
}

function createOAuthContext({ next, jwtSecret }) {
  const nonce = crypto.randomBytes(32).toString("hex");
  const { codeVerifier, codeChallenge } = createPkcePair();
  const safeNext = safeNextPath(next);
  const cookieValue = jwt.sign(
    { typ: "oauth_ctx", nonce, next: safeNext, cv: codeVerifier },
    jwtSecret,
    { algorithm: "HS256", expiresIn: "10m" }
  );
  return { nonce, codeChallenge, cookieValue, next: safeNext };
}

function readOAuthContext(cookieValue, queryState, jwtSecret) {
  if (!cookieValue || !queryState) return null;
  let payload;
  try {
    payload = jwt.verify(cookieValue, jwtSecret, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
  if (payload.typ !== "oauth_ctx" || !payload.nonce || !payload.cv) return null;
  if (!safeEqual(payload.nonce, queryState)) return null;
  return {
    next: safeNextPath(payload.next),
    codeVerifier: payload.cv,
  };
}

function buildGoogleAuthUrl(client, { state, codeChallenge }) {
  return client.generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
}

async function verifyGoogleAuthorizationCode(client, { code, codeVerifier, clientId }) {
  const { tokens } = await client.getToken({ code, codeVerifier });
  if (!tokens?.id_token) {
    const err = new Error("missing_id_token");
    err.code = "missing_id_token";
    throw err;
  }
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: clientId,
  });
  const payload = ticket.getPayload() || {};
  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified === true,
    name: payload.name || "",
    picture: payload.picture || null,
  };
}

function hashLoginCode(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}

function createLoginCode() {
  const raw = crypto.randomBytes(32).toString("hex");
  return { raw, key: hashLoginCode(raw) };
}

function frontendLoginUrl(frontendUrl, { next, code, error } = {}) {
  const url = new URL("/login", frontendUrl);
  if (error) url.searchParams.set("error", error);
  const safeNext = safeNextPath(next);
  if (safeNext && safeNext !== "/") url.searchParams.set("next", safeNext);
  if (code) url.searchParams.set("code", code);
  return url.toString();
}

module.exports = {
  OAUTH_COOKIE,
  LOGIN_CODE_TTL_MS,
  googleConfigured,
  getGoogleCallbackUrl,
  getFrontendUrl,
  getOAuthClient,
  safeNextPath,
  oauthCookieOpts,
  createOAuthContext,
  readOAuthContext,
  buildGoogleAuthUrl,
  verifyGoogleAuthorizationCode,
  hashLoginCode,
  createLoginCode,
  frontendLoginUrl,
};
