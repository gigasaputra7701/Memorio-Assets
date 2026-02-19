// generate-from-folder.js
const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node generate-from-folder.js <folder-path>");
  process.exit(1);
}

const INPUT_DIR = path.resolve(args[0]);
const OUTPUT_DIR = path.join(INPUT_DIR, "optimized");
const sizes = [400, 800, 1200, 1600];
const avifQuality = 50;

async function ensureOutDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

function isImageFile(name) {
  const ext = path.extname(name).toLowerCase();
  return [".jpg", ".jpeg", ".png"].includes(ext);
}

async function processFile(fileName) {
  const info = path.parse(fileName);
  const basename = info.name;
  const inputAbs = path.join(INPUT_DIR, info.base);

  // validate image
  try {
    await sharp(inputAbs).metadata();
  } catch {
    console.warn(`Skipping ${info.base} — invalid or corrupted image.`);
    return;
  }

  for (const w of sizes) {
    const outAvif = path.join(OUTPUT_DIR, `${basename}-${w}.avif`);

    try {
      await sharp(inputAbs)
        .rotate()
        .resize({ width: w })
        .avif({ quality: avifQuality })
        .toFile(outAvif);

      console.log(`Generated ${basename}-${w}.avif`);
    } catch (err) {
      console.error(`Error generating ${basename}-${w}:`, err.message || err);
    }
  }
}

async function main() {
  const stat = await fs.stat(INPUT_DIR).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    console.error("Invalid input folder:", INPUT_DIR);
    process.exit(1);
  }

  await ensureOutDir();

  const files = await fs.readdir(INPUT_DIR);
  const imageFiles = files.filter(isImageFile);

  if (imageFiles.length === 0) {
    console.log("No jpg/png images found.");
    return;
  }

  console.log(`Found ${imageFiles.length} image(s).`);

  for (const file of imageFiles) {
    if (file === "optimized") continue;
    await processFile(file);
  }

  console.log("\nDone. AVIF files generated in:", OUTPUT_DIR);
}

main();
