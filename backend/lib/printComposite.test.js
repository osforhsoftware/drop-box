const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { urlToLocalPath } = require("./printComposite");

test("urlToLocalPath reads uploads and blocks paths outside that folder", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "casebox-uploads-"));
  const designs = path.join(root, "designs");
  fs.mkdirSync(designs);
  fs.writeFileSync(path.join(designs, "ok.png"), "png");
  const outside = path.join(path.dirname(root), "secret.txt");
  fs.writeFileSync(outside, "secret");

  try {
    const ok = urlToLocalPath("/api/uploads/designs/ok.png", root);
    assert.equal(path.basename(ok), "ok.png");
    assert.equal(urlToLocalPath("/api/uploads/../../secret.txt", root), null);
    assert.equal(urlToLocalPath("/api/uploads/designs/../../secret.txt", root), null);
    assert.equal(path.basename(urlToLocalPath("/api/uploads/designs/ok.png?x=1", root)), "ok.png");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { force: true });
  }
});
