const MAX_EDGE = 1200;
const WEBP_QUALITY = 0.85;

function scaledSize(width, height, maxEdge) {
  const longest = Math.max(width, height);
  const scale = Math.min(1, maxEdge / longest);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function openBitmap(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(file);
  }
}

/**
 * Shrink an image in the browser before upload.
 * The server still converts to WebP — this step can be skipped or altered by the client.
 * @returns {Promise<{ file: File, width: number, height: number, originalBytes: number, compressedBytes: number }>}
 */
export async function compressImageInBrowser(file, options = {}) {
  if (!file) throw new Error("No image selected");
  if (options.enabled === false) {
    return {
      file,
      width: null,
      height: null,
      originalBytes: file.size,
      compressedBytes: null,
      skipped: true,
    };
  }

  const maxEdge = Number(options.maxEdge) > 0 ? Number(options.maxEdge) : MAX_EDGE;
  const quality = Number(options.quality) > 0 && Number(options.quality) <= 1
    ? Number(options.quality)
    : WEBP_QUALITY;

  const bitmap = await openBitmap(file);
  try {
    const { width, height } = scaledSize(bitmap.width, bitmap.height, maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Could not compress image");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Could not compress image"))),
        "image/webp",
        quality
      );
    });

    const compressed = new File([blob], "upload.webp", {
      type: "image/webp",
      lastModified: Date.now(),
    });

    if (compressed.size >= file.size && width === bitmap.width && height === bitmap.height) {
      return {
        file,
        width: bitmap.width,
        height: bitmap.height,
        originalBytes: file.size,
        compressedBytes: file.size,
        skipped: true,
      };
    }

    return {
      file: compressed,
      width,
      height,
      originalBytes: file.size,
      compressedBytes: compressed.size,
    };
  } finally {
    bitmap.close();
  }
}

export function formatImageKB(bytes) {
  if (bytes == null || !Number.isFinite(bytes)) return "";
  return `${(bytes / 1024).toFixed(1)} KB`;
}
