#!/usr/bin/env node
/**
 * Generates premium realistic eCommerce product photos for each product in demo-catalog.json.
 * Uses pollinations.ai to generate 4 images per product (Featured, Gallery 1, Gallery 2, Gallery 3).
 * Run before seed:demo if demo-images/ is empty.
 */
const fs = require("fs");
const path = require("path");

const CATALOG_PATH = path.join(__dirname, "demo-catalog.json");
const OUT_DIR = path.join(__dirname, "demo-images");

const BACKGROUNDS = [
  "White studio",
  "Light gray studio",
  "Concrete surface",
  "Marble table",
  "Soft gradient",
  "Premium desktop",
  "Minimal lifestyle setup",
  "Luxury product photography scene"
];

const ANGLES = [
  "Front 3/4 view",
  "Slight top angle",
  "Standing perspective",
  "Hero product shot",
  "Close-up angle",
  "Angled perspective"
];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function downloadImage(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let created = 0;
  
  // Run image generation in parallel
  const tasks = [];

  for (const product of catalog.products) {
    const phoneModel = product.phone_models[0] || "iPhone 16 Pro Max";
    const design = product.design || product.category;

    const imageTypes = ["featured", "gallery1", "gallery2", "gallery3"];

    for (const imgType of imageTypes) {
      const outPath = path.join(OUT_DIR, `${product.slug}-${imgType}.jpg`);
      if (fs.existsSync(outPath)) {
        console.log(`  skip (exists): ${product.slug}-${imgType}.jpg`);
        continue;
      }

      const background = getRandom(BACKGROUNDS);
      const angle = getRandom(ANGLES);

      const prompt = `Premium eCommerce photography of a phone case with a realistic ${design} design on a ${phoneModel}. Ultra realistic, modern luxury appearance, 4K quality, soft studio lighting, natural reflections, professional shadows. High-detail TPU/Silicone texture, matte black case edges, slight rounded corners. Correct camera cutout. Printed design perfectly aligned on the case, wrapping naturally around the curved edges. Realistic depth, high contrast, clean minimal composition. ${angle} on a ${background} background.`;

      const encodedPrompt = encodeURIComponent(prompt);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=640&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;

      tasks.push((async () => {
        console.log(`  generating: ${product.slug}-${imgType}.jpg`);
        let success = false;
        let retries = 3;
        while (!success && retries > 0) {
          try {
            await downloadImage(url, outPath);
            created += 1;
            success = true;
          } catch (err) {
            retries -= 1;
            console.error(`  error generating ${product.slug}-${imgType}.jpg, retries left: ${retries}`);
            if (retries === 0) {
              console.error(`  failed to generate ${product.slug}-${imgType}.jpg:`, err.message);
            } else {
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        }
      })());
    }
  }
  
  await Promise.all(tasks);
  console.log(`\nGenerated ${created} image(s) in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
