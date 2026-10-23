/**
 * Import JSON backup created by export-local-backup.js
 * Usage: node scripts/import-local-backup.js [backupDir]
 * Optional: --drop  (drop each collection before insert)
 */
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { EJSON } = require("bson");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "drop_box";
const DROP = process.argv.includes("--drop");
const BACKUP_ROOT =
  process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ||
  path.join(__dirname, "..", "..", "casebox-backup");

async function main() {
  const mongoDir = path.join(BACKUP_ROOT, "mongo", DB_NAME);
  if (!fs.existsSync(mongoDir)) {
    console.error(`Missing: ${mongoDir}`);
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);

  const files = fs.readdirSync(mongoDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const name = path.basename(file, ".json");
    const docs = EJSON.parse(fs.readFileSync(path.join(mongoDir, file), "utf8"));
    const col = db.collection(name);
    if (DROP) await col.drop().catch(() => {});
    if (!docs.length) {
      console.log(`Skipped empty ${name}`);
      continue;
    }
    // upsert by _id to avoid duplicate key errors on re-run
    let inserted = 0;
    for (const doc of docs) {
      const r = await col.replaceOne({ _id: doc._id }, doc, { upsert: true });
      if (r.upsertedCount || r.modifiedCount) inserted += 1;
    }
    console.log(`Imported ${name}: ${docs.length} docs (${inserted} written)`);
  }

  await client.close();
  console.log("\nDone. Also copy backup/uploads -> backend/uploads if not done yet.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
