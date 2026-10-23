const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const {
  convertToWebp,
  prepareUpload,
  assertOverlayPng,
  ImageInputError,
} = require("./imageService");
const { imageSettingsUpdateFromBody, resolveImageSettings } = require("../lib/imageSettings");

async function pngBuffer(width, height, { alpha = 0 } = {}) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 220;
    pixels[i + 1] = 30;
    pixels[i + 2] = 40;
    pixels[i + 3] = alpha;
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

test("portrait images are limited on the longest edge and keep transparency", async () => {
  const input = await pngBuffer(80, 400, { alpha: 0 });
  const converted = await convertToWebp(input, { maxWidth: 100, targetKb: 150, quality: 85, enabled: true });
  const meta = await sharp(converted.buffer).metadata();
  assert.equal(meta.format, "webp");
  assert.ok(meta.hasAlpha);
  assert.ok(Math.max(meta.width, meta.height) <= 100);
  const raw = await sharp(converted.buffer).ensureAlpha().raw().toBuffer();
  let alphaSum = 0;
  const samples = Math.min(raw.length / 4, 200);
  for (let i = 0; i < samples; i += 1) alphaSum += raw[i * 4 + 3];
  assert.ok(alphaSum / samples < 20, "transparent pixels should stay transparent");
});

test("compression off keeps the original PNG bytes and size", async () => {
  const input = await pngBuffer(400, 800, { alpha: 10 });
  const prepared = await prepareUpload(input, { enabled: false, maxWidth: 100 });
  assert.equal(prepared.compressed, false);
  assert.equal(prepared.ext, "png");
  assert.equal(prepared.width, 400);
  assert.equal(prepared.height, 800);
  assert.equal(prepared.buffer.equals(input), true);
});

test("overlay PNGs are rejected when they are not transparent or the size does not match", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "overlay-"));
  const pngPath = path.join(dir, "frame.png");
  const jpgPath = path.join(dir, "photo.jpg");
  await sharp(await pngBuffer(400, 800, { alpha: 0 })).toFile(pngPath);
  await sharp({
    create: { width: 400, height: 800, channels: 3, background: { r: 10, g: 10, b: 10 } },
  }).jpeg().toFile(jpgPath);

  const ok = await assertOverlayPng(pngPath, { width: 400, height: 800 });
  assert.equal(ok.ok, true);

  const mismatch = await assertOverlayPng(pngPath, { width: 1024, height: 1536 });
  assert.match(mismatch.error, /1024×1536/);

  const photo = await assertOverlayPng(jpgPath, { width: 400, height: 800 });
  assert.match(photo.error, /must stay PNG/);

  await assert.rejects(() => convertToWebp(Buffer.from("not-an-image")), ImageInputError);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("admin image settings are clamped and can disable compression", () => {
  const bad = imageSettingsUpdateFromBody({ image_max_width: 10 });
  assert.match(bad.error, /Max width/);

  const saved = imageSettingsUpdateFromBody({
    image_compress_enabled: false,
    image_max_width: 800,
    image_target_kb: 90,
    image_webp_quality: 70,
  });
  assert.equal(saved.fields.image_compress_enabled, false);
  assert.equal(saved.fields.image_max_width, 800);

  const resolved = resolveImageSettings(saved.fields);
  assert.equal(resolved.image_compress_enabled, false);
  assert.equal(resolved.image_max_width, 800);
  assert.equal(resolved.image_target_kb, 90);
  assert.equal(resolved.image_webp_quality, 70);
});
