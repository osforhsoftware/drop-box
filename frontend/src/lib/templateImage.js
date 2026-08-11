import { BACKEND_URL } from "./api";

/** Recommended case-overlay PNG size (matches current catalog assets). */
export const TEMPLATE_RECOMMENDED = { width: 1024, height: 1536 };

/** Hard minimum — below this, print quality is too soft. */
export const TEMPLATE_MIN = { width: 360, height: 720 };

/** Soft maximum — larger files are fine but rarely needed for overlays. */
export const TEMPLATE_MAX = { width: 1200, height: 2400 };

/** Print composite scales screen canvas by PRINT_DPI / 96. */
export const TEMPLATE_PRINT_DPI = 300;
export const TEMPLATE_SCREEN_DPI = 96;

/** Resolve a stored template file_path to a loadable URL. */
export function getTemplateImageUrl(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith("data:") || filePath.startsWith("blob:")) return filePath;
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  const normalized = filePath.replace(/^\/+/, "");
  if (normalized.startsWith("api/")) return `${BACKEND_URL}/${normalized}`;
  return `${BACKEND_URL}/api/${normalized}`;
}

/** Print pixel size + physical inches for a template canvas. */
export function templatePrintSize(width, height) {
  const factor = TEMPLATE_PRINT_DPI / TEMPLATE_SCREEN_DPI;
  const printW = Math.round(width * factor);
  const printH = Math.round(height * factor);
  const inchesW = +(width / TEMPLATE_SCREEN_DPI).toFixed(2);
  const inchesH = +(height / TEMPLATE_SCREEN_DPI).toFixed(2);
  return { printW, printH, inchesW, inchesH, dpi: TEMPLATE_PRINT_DPI, factor };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image file"));
    img.src = src;
  });
}

/**
 * Validate an admin template PNG before upload.
 * Rejects images with almost no transparency; accepts frame overlays.
 */
export async function validateTemplatePng(file) {
  if (!file) return { ok: false, error: "No file selected." };
  if (file.type !== "image/png") {
    return {
      ok: false,
      error: "PNG only. Export as .png with a transparent background (not JPG or WebP).",
    };
  }
  if (file.size > 12 * 1024 * 1024) {
    return { ok: false, error: "File too large (max 12 MB)." };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const width = img.naturalWidth;
    const height = img.naturalHeight;

    if (width < TEMPLATE_MIN.width || height < TEMPLATE_MIN.height) {
      return {
        ok: false,
        error: `Image too small (${width}×${height} px). Use at least ${TEMPLATE_MIN.width}×${TEMPLATE_MIN.height} px (recommended ${TEMPLATE_RECOMMENDED.width}×${TEMPLATE_RECOMMENDED.height}).`,
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, width, height);

    let transparentSamples = 0;
    let opaqueSamples = 0;

    const stepX = Math.max(1, Math.floor(width / 40));
    const stepY = Math.max(1, Math.floor(height / 40));

    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const i = (y * width + x) * 4;
        const alpha = data[i + 3];
        if (alpha < 128) transparentSamples += 1;
        else opaqueSamples += 1;
      }
    }

    const totalSamples = transparentSamples + opaqueSamples || 1;
    const transparentRatio = transparentSamples / totalSamples;

    if (transparentRatio < 0.08) {
      return {
        ok: false,
        error:
          "This PNG has almost no transparency. Use a flat frame overlay on a transparent background — not a studio mockup or photo.",
      };
    }

    const warnings = [];
    const aspect = width / height;
    if (aspect < 0.42 || aspect > 0.58) {
      warnings.push(`Unusual aspect ratio (${width}×${height}). Phone templates are usually ~9:19 portrait.`);
    }
    if (width < TEMPLATE_RECOMMENDED.width || height < TEMPLATE_RECOMMENDED.height) {
      warnings.push(
        `Below recommended size (${TEMPLATE_RECOMMENDED.width}×${TEMPLATE_RECOMMENDED.height} px). Print may look soft.`
      );
    }
    if (width > TEMPLATE_MAX.width || height > TEMPLATE_MAX.height) {
      warnings.push(
        `Larger than needed (${width}×${height}). ${TEMPLATE_RECOMMENDED.width}×${TEMPLATE_RECOMMENDED.height} px is enough for print.`
      );
    }

    const print = templatePrintSize(width, height);
    return { ok: true, width, height, print, warnings };
  } catch {
    return { ok: false, error: "Could not read PNG. Try re-exporting from your editor." };
  } finally {
    URL.revokeObjectURL(url);
  }
}
