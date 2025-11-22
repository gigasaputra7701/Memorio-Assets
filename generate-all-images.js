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
const quality = { avif: 50, webp: 75 };

async function ensureOutDir() {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (err) {
    console.error("Cannot create output dir", err);
    process.exit(1);
  }
}

function isImageFile(name) {
  const ext = path.extname(name).toLowerCase();
  return [".jpg", ".jpeg", ".png"].includes(ext);
}

async function processFile(fileName) {
  const info = path.parse(fileName);
  const basename = info.name; // without ext
  const inputAbs = path.join(INPUT_DIR, info.base);

  // validate image
  const image = sharp(inputAbs);
  try {
    await image.metadata();
  } catch (e) {
    console.warn(`Skipping ${info.base} — not a valid image or corrupted.`);
    return;
  }

  for (const w of sizes) {
    const resized = sharp(inputAbs).rotate().resize({ width: w });

    const outAvif = path.join(OUTPUT_DIR, `${basename}-${w}.avif`);
    const outWebp = path.join(OUTPUT_DIR, `${basename}-${w}.webp`);

    try {
      await resized.clone().avif({ quality: quality.avif }).toFile(outAvif);
      await resized.clone().webp({ quality: quality.webp }).toFile(outWebp);
      console.log(`Generated ${basename}-${w}.avif and ${basename}-${w}.webp`);
    } catch (err) {
      console.error(`Error generating ${basename}-${w}:`, err.message || err);
    }
  }
}

async function main() {
  try {
    // check input dir exists
    const stat = await fs.stat(INPUT_DIR).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      console.error(
        "Input folder does not exist or is not a directory:",
        INPUT_DIR
      );
      process.exit(1);
    }

    await ensureOutDir();

    const files = await fs.readdir(INPUT_DIR);
    const imageFiles = files.filter((f) => isImageFile(f));

    if (imageFiles.length === 0) {
      console.log(
        `No image files (jpg/png) found in ${INPUT_DIR}. Place your masters there and rerun.`
      );
      return;
    }

    console.log(`Found ${imageFiles.length} image(s). Processing...`);

    for (const f of imageFiles) {
      if (f === "optimized") continue; // safety
      console.log("Processing", f);
      await processFile(f);
    }

    console.log("\nAll done. Generated files are in:", OUTPUT_DIR);
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

main();
