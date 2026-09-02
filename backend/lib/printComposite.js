const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const {
  normalizeMaskZones,
  normalizePrintArea,
  normalizeExclusionZones,
  printAreaCornerRadius,
  normalizeCornerRadii,
  roundedRectPathD,
} = require("./cameraZone");

const PRINT_DPI = 300;
const SCREEN_DPI = 96;

function urlToLocalPath(urlOrPath, uploadDir) {
  if (!urlOrPath) return null;
  const s = String(urlOrPath);
  const marker = "/api/uploads/";
  const idx = s.indexOf(marker);
  const rel = idx >= 0 ? s.slice(idx + marker.length) : s.replace(/^\/+/, "");
  const full = path.join(uploadDir, rel);
  return fs.existsSync(full) ? full : null;
}

function scaleForPrint(canvasWidth, canvasHeight) {
  const factor = PRINT_DPI / SCREEN_DPI;
  return {
    width: Math.round(canvasWidth * factor),
    height: Math.round(canvasHeight * factor),
    factor,
  };
}

async function renderDesignLayer(designPath, transform, outW, outH, screenW, screenH) {
  const scale = outW / screenW;
  const meta = await sharp(designPath).metadata();
  const imgW = meta.width || 1;
  const imgH = meta.height || 1;

  const t = transform || {};
  const scaleX = Number(t.scaleX) || 1;
  const scaleY = Number(t.scaleY) || 1;
  const angle = Number(t.angle) || 0;
  const left = Number(t.left) ?? screenW / 2;
  const top = Number(t.top) ?? screenH / 2;
  const originX = t.originX || "center";
  const originY = t.originY || "center";

  const dispW = imgW * scaleX * scale;
  const dispH = imgH * scaleY * scale;

  let ox = dispW / 2;
  let oy = dispH / 2;
  if (originX === "left") ox = 0;
  if (originX === "right") ox = dispW;
  if (originY === "top") oy = 0;
  if (originY === "bottom") oy = dispH;

  const cx = left * scale;
  const cy = top * scale;

  let resized = await sharp(designPath)
    .resize(Math.round(imgW * scaleX * scale), Math.round(imgH * scaleY * scale), {
      fit: "fill",
    })
    .png()
    .toBuffer();

  if (angle) {
    resized = await sharp(resized).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const rMeta = await sharp(resized).metadata();
    ox = (rMeta.width || dispW) / 2;
    oy = (rMeta.height || dispH) / 2;
    if (originX === "left") ox = 0;
    if (originX === "right") ox = rMeta.width || dispW;
    if (originY === "top") oy = 0;
    if (originY === "bottom") oy = rMeta.height || dispH;
  }

  const rMeta = await sharp(resized).metadata();
  const pasteLeft = Math.round(cx - ox);
  const pasteTop = Math.round(cy - oy);

  const base = await sharp({
    create: {
      width: outW,
      height: outH,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  return sharp(base)
    .composite([{ input: resized, left: pasteLeft, top: pasteTop }])
    .png()
    .toBuffer();
}

function circlePath(cx, cy, r) {
  return [
    `M ${cx - r} ${cy}`,
    `a ${r} ${r} 0 1 0 ${r * 2} 0`,
    `a ${r} ${r} 0 1 0 ${-r * 2} 0`,
    "Z",
  ].join(" ");
}

/**
 * Alpha mask: white = keep artwork, black = discard.
 * Print area minus exclusion holes (camera / flash / sensor).
 * Does NOT include overlay PNG or print guide.
 */
function buildPrintAlphaMaskSvg(outW, outH, printArea, zones, scale) {
  const pa = printArea || { x: 0, y: 0, width: outW / scale, height: outH / scale };
  const x = Math.round(pa.x * scale);
  const y = Math.round(pa.y * scale);
  const w = Math.round(pa.width * scale);
  const h = Math.round(pa.height * scale);
  const corners = normalizeCornerRadii(
    pa,
    pa.width,
    pa.height,
    printAreaCornerRadius(pa.width, pa.height, pa.rx ?? pa.ry)
  );
  const scaledCorners = {
    rtl: Math.round(corners.rtl * scale),
    rtr: Math.round(corners.rtr * scale),
    rbr: Math.round(corners.rbr * scale),
    rbl: Math.round(corners.rbl * scale),
  };

  let holes = "";
  for (const zone of zones || []) {
    if ((zone.shape === "circle" || zone.type === "circle") && zone.r > 0) {
      holes += ` ${circlePath(Math.round(zone.x * scale), Math.round(zone.y * scale), Math.round(zone.r * scale))}`;
    } else if ((zone.shape === "rect" || zone.type === "rect") && zone.width > 0 && zone.height > 0) {
      const zx = Math.round(zone.x * scale);
      const zy = Math.round(zone.y * scale);
      const zw = Math.round(zone.width * scale);
      const zh = Math.round(zone.height * scale);
      const zc = normalizeCornerRadii(
        zone,
        zone.width,
        zone.height,
        zone.rx ?? zone.ry ?? Math.min(zone.width, zone.height) * 0.22
      );
      holes += ` ${roundedRectPathD(zx, zy, zw, zh, {
        rtl: Math.round(zc.rtl * scale),
        rtr: Math.round(zc.rtr * scale),
        rbr: Math.round(zc.rbr * scale),
        rbl: Math.round(zc.rbl * scale),
      })}`;
    }
  }

  const d = `${roundedRectPathD(x, y, w, h, scaledCorners)}${holes}`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}">` +
      `<rect width="100%" height="100%" fill="black"/>` +
      `<path d="${d}" fill="white" fill-rule="evenodd"/>` +
      `</svg>`
  );
}

/**
 * Build 300 DPI print PNG from original artwork + template coords.
 * Applies print area + mask clipping. Excludes overlay PNG and edit guide.
 */
async function compositePrintFile({
  uploadDir,
  designUrl,
  template,
  designTransform,
  outputPath,
}) {
  const designPath = urlToLocalPath(designUrl, uploadDir);
  if (!designPath) throw new Error("Design file not found");

  const screenW = Number(template.canvas_width) || 800;
  const screenH = Number(template.canvas_height) || 900;
  const printArea = normalizePrintArea(template, screenW, screenH);
  const exclusionZones =
    (typeof normalizeExclusionZones === "function"
      ? normalizeExclusionZones(template)
      : normalizeMaskZones(template)) || [];

  const { width: outW, height: outH, factor } = scaleForPrint(screenW, screenH);

  let composed = await renderDesignLayer(
    designPath,
    designTransform,
    outW,
    outH,
    screenW,
    screenH
  );

  const maskSvg = buildPrintAlphaMaskSvg(outW, outH, printArea, exclusionZones, factor);
  const maskPng = await sharp(maskSvg).png().toBuffer();

  composed = await sharp(composed)
    .composite([{ input: maskPng, blend: "dest-in" }])
    .png()
    .toBuffer();

  // Flatten onto white for print shops that expect opaque PNG
  const white = await sharp({
    create: {
      width: outW,
      height: outH,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();

  await sharp(white)
    .composite([{ input: composed, blend: "over" }])
    .withMetadata({ density: PRINT_DPI })
    .png()
    .toFile(outputPath);

  return { width: outW, height: outH, dpi: PRINT_DPI };
}

module.exports = {
  compositePrintFile,
  urlToLocalPath,
  PRINT_DPI,
};
