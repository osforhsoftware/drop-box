const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  cloneTemplateProductMedia,
  templateProductMediaIsShared,
  templateProductMediaReferenceQuery,
  templateProductUploadFilename,
} = require("./templateProducts");

test("duplicating template media copies files and leaves the source product unchanged", () => {
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "tpl-media-"));
  const dir = path.join(uploadDir, "template-products");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "featured.jpg"), "featured-bytes");
  fs.writeFileSync(path.join(dir, "gallery.jpg"), "gallery-bytes");

  const source = {
    id: "parent",
    title: "porsche 911",
    thumbnail: "/api/uploads/template-products/featured.jpg",
    images: [
      "/api/uploads/template-products/featured.jpg",
      "/api/uploads/template-products/gallery.jpg",
    ],
    seo: {
      meta_title: "Porsche 911",
      og_image: "http://localhost:8000/api/uploads/template-products/featured.jpg",
    },
  };
  const snapshot = JSON.parse(JSON.stringify(source));

  let n = 0;
  const media = cloneTemplateProductMedia(source, {
    uploadDir,
    randomUUID: () => `copy${++n}`,
  });

  assert.deepEqual(source, snapshot);
  assert.equal(media.thumbnail, "/api/uploads/template-products/copy1.jpg");
  assert.deepEqual(media.images, [
    "/api/uploads/template-products/copy1.jpg",
    "/api/uploads/template-products/copy2.jpg",
  ]);
  assert.equal(media.seo.og_image, "http://localhost:8000/api/uploads/template-products/copy1.jpg");
  assert.equal(media.seo.meta_title, "Porsche 911");
  assert.equal(fs.readFileSync(path.join(dir, "copy1.jpg"), "utf8"), "featured-bytes");
  assert.equal(fs.readFileSync(path.join(dir, "copy2.jpg"), "utf8"), "gallery-bytes");
  assert.equal(fs.readFileSync(path.join(dir, "featured.jpg"), "utf8"), "featured-bytes");

  const copy = {
    id: "copy",
    thumbnail: media.thumbnail,
    images: media.images,
    seo: media.seo,
  };
  assert.equal(templateProductMediaIsShared(source.thumbnail, [source, copy], copy.id), true);
  assert.equal(templateProductMediaIsShared(source.images[1], [source, copy], copy.id), true);
  assert.equal(templateProductMediaIsShared(media.thumbnail, [source, copy], copy.id), false);
  assert.equal(
    templateProductMediaIsShared(source.thumbnail, [source, copy], [source.id, copy.id]),
    false
  );

  fs.rmSync(uploadDir, { recursive: true, force: true });
});

test("missing and external images stay on their original URLs", () => {
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "tpl-media-"));
  const source = {
    thumbnail: "/api/uploads/template-products/missing.jpg",
    images: [
      "/api/uploads/template-products/missing.jpg",
      "https://cdn.example.com/porsche.jpg",
    ],
    seo: { og_image: "https://cdn.example.com/porsche.jpg" },
  };

  const media = cloneTemplateProductMedia(source, { uploadDir, randomUUID: () => "should-not-run" });

  assert.equal(media.thumbnail, source.thumbnail);
  assert.deepEqual(media.images, source.images);
  assert.equal(media.seo.og_image, source.seo.og_image);
  assert.equal(templateProductUploadFilename("https://cdn.example.com/porsche.jpg"), null);
  assert.equal(templateProductMediaReferenceQuery("https://cdn.example.com/porsche.jpg"), null);

  fs.rmSync(uploadDir, { recursive: true, force: true });
});

test("shared-file lookup matches relative and absolute copies of the same upload", () => {
  const query = templateProductMediaReferenceQuery(
    "/api/uploads/template-products/featured.jpg",
    "copy-id"
  );
  const pattern = query.$and[0].$or[0].thumbnail;
  assert.match("http://localhost:8000/api/uploads/template-products/featured.jpg", pattern);
  assert.match("/api/uploads/template-products/featured.jpg", pattern);
  assert.doesNotMatch("/api/uploads/template-products/featured-other.jpg", pattern);
  assert.deepEqual(query.$and[1], { id: { $nin: ["copy-id"] } });
});

test("upload filenames reject path traversal", () => {
  assert.equal(templateProductUploadFilename("/api/uploads/template-products/../secret.jpg"), null);
  assert.equal(
    templateProductUploadFilename("/api/uploads/template-products/%2e%2e%2fsecret.jpg"),
    null
  );
});
