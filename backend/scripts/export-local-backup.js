/**
 * Export MongoDB drop_box + note for uploads folder.
 * Usage: node scripts/export-local-backup.js [outDir]
 */
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { EJSON } = require("bson");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "drop_box";
const OUT_ROOT =
  process.argv[2] ||
  path.join(__dirname, "..", "..", "casebox-backup");

async function main() {
  const mongoOut = path.join(OUT_ROOT, "mongo", DB_NAME);
  fs.mkdirSync(mongoOut, { recursive: true });

  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);
  const collections = await db.listCollections().toArray();

  const summary = [];
  for (const { name } of collections) {
    const docs = await db.collection(name).find({}).toArray();
    const file = path.join(mongoOut, `${name}.json`);
    // Extended JSON keeps ObjectId / Date types for restore
    fs.writeFileSync(file, EJSON.stringify(docs, { relaxed: false }, 2), "utf8");
    summary.push({ collection: name, count: docs.length, file: path.basename(file) });
    console.log(`Exported ${name}: ${docs.length} docs`);
  }

  fs.writeFileSync(
    path.join(OUT_ROOT, "manifest.json"),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        mongoUrl: MONGO_URL.replace(/\/\/.*@/, "//***@"),
        dbName: DB_NAME,
        collections: summary,
        uploadsSource: path.join(__dirname, "..", "uploads"),
        uploadsTargetOnOtherPC: "backend/uploads",
      },
      null,
      2
    ),
    "utf8"
  );

  fs.writeFileSync(
    path.join(OUT_ROOT, "RESTORE.txt"),
    [
      "CASEBOX local backup",
      "===================",
      "",
      "1) Restore MongoDB (on the other PC, with Mongo running):",
      "   node backend/scripts/import-local-backup.js path/to/casebox-backup",
      "",
      "   Or manually with mongosh / a script that reads mongo/" + DB_NAME + "/*.json",
      "",
      "2) Copy uploads folder into the project:",
      "   casebox-backup/uploads  -->  backend/uploads",
      "",
      "3) Set backend/.env:",
      "   MONGO_URL=mongodb://localhost:27017",
      "   DB_NAME=" + DB_NAME,
      "   PUBLIC_BASE_URL=http://localhost:8000",
      "",
    ].join("\n"),
    "utf8"
  );

  await client.close();
  console.log(`\nMongo export done -> ${mongoOut}`);
  console.log(`Manifest -> ${path.join(OUT_ROOT, "manifest.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
