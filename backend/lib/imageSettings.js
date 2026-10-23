const DEFAULT_MAX_WIDTH = 1200;
const DEFAULT_TARGET_KB = 150;
const DEFAULT_QUALITY = 85;
const MIN_QUALITY = 40;
const MIN_WIDTH = 320;
const MAX_WIDTH = 4096;
const MIN_TARGET_KB = 20;
const MAX_TARGET_KB = 2000;

function readPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.round(parsed);
}

function clampInt(value, min, max, fallback) {
  const parsed = readPositiveInt(value, fallback);
  return Math.min(max, Math.max(min, parsed));
}

function envFlagEnabled() {
  const raw = String(process.env.IMAGE_COMPRESS_ENABLED ?? "true").trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "off" && raw !== "no";
}

function isEnabledFlag(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const raw = String(value).trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "on" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "off" || raw === "no") return false;
  return fallback;
}

/** Defaults from server env. Admin settings override these when saved. */
function envImageSettings() {
  return {
    image_compress_enabled: envFlagEnabled(),
    image_max_width: clampInt(process.env.IMAGE_MAX_WIDTH, MIN_WIDTH, MAX_WIDTH, DEFAULT_MAX_WIDTH),
    image_target_kb: clampInt(process.env.IMAGE_TARGET_KB, MIN_TARGET_KB, MAX_TARGET_KB, DEFAULT_TARGET_KB),
    image_webp_quality: clampInt(process.env.IMAGE_WEBP_QUALITY, MIN_QUALITY, 100, DEFAULT_QUALITY),
  };
}

/**
 * Merge a settings document over env defaults.
 * Phone-case overlay PNGs never use these values — they stay original pixels.
 */
function resolveImageSettings(doc = {}) {
  const env = envImageSettings();
  const enabled = isEnabledFlag(doc.image_compress_enabled, env.image_compress_enabled);
  const maxWidth = clampInt(doc.image_max_width, MIN_WIDTH, MAX_WIDTH, env.image_max_width);
  const targetKb = clampInt(doc.image_target_kb, MIN_TARGET_KB, MAX_TARGET_KB, env.image_target_kb);
  const quality = clampInt(doc.image_webp_quality, MIN_QUALITY, 100, env.image_webp_quality);
  return {
    image_compress_enabled: enabled,
    image_max_width: maxWidth,
    image_target_kb: targetKb,
    image_webp_quality: quality,
  };
}

/** Fields an admin may save. Omitted keys are left unchanged. */
function imageSettingsUpdateFromBody(body = {}) {
  const fields = {};
  if (body.image_compress_enabled != null) {
    fields.image_compress_enabled = isEnabledFlag(body.image_compress_enabled, true);
  }

  if (body.image_max_width != null && body.image_max_width !== "") {
    const width = Number(body.image_max_width);
    if (!Number.isFinite(width) || width < MIN_WIDTH || width > MAX_WIDTH) {
      return { error: `Max width must be between ${MIN_WIDTH} and ${MAX_WIDTH} px.` };
    }
    fields.image_max_width = Math.round(width);
  }

  if (body.image_target_kb != null && body.image_target_kb !== "") {
    const kb = Number(body.image_target_kb);
    if (!Number.isFinite(kb) || kb < MIN_TARGET_KB || kb > MAX_TARGET_KB) {
      return { error: `Target size must be between ${MIN_TARGET_KB} and ${MAX_TARGET_KB} KB.` };
    }
    fields.image_target_kb = Math.round(kb);
  }

  if (body.image_webp_quality != null && body.image_webp_quality !== "") {
    const quality = Number(body.image_webp_quality);
    if (!Number.isFinite(quality) || quality < MIN_QUALITY || quality > 100) {
      return { error: `WebP quality must be between ${MIN_QUALITY} and 100.` };
    }
    fields.image_webp_quality = Math.round(quality);
  }

  return { fields };
}

module.exports = {
  MIN_QUALITY,
  resolveImageSettings,
  imageSettingsUpdateFromBody,
  envImageSettings,
};
