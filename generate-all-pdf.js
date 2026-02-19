const sharp = require("sharp");
const PDFDocument = require("pdfkit");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");

const INPUT_DIR = process.argv[2];

if (!INPUT_DIR) {
  console.error("Usage: node generate-all-pdf.js <folder>");
  process.exit(1);
}

const absDir = path.resolve(INPUT_DIR);

// 🔧 QUALITY JPEG (60–80 recommended)
const JPEG_QUALITY = 75;

async function convertFile(file) {
  const inputPath = path.join(absDir, file);
  const outputPath = inputPath.replace(/\.avif$/i, ".pdf");

  const image = sharp(inputPath);
  const metadata = await image.metadata();

  // ✅ AVIF → JPEG (COMPRESSED)
  const buffer = await image
    .jpeg({
      quality: JPEG_QUALITY,
      chromaSubsampling: "4:2:0",
      mozjpeg: true,
    })
    .toBuffer();

  const doc = new PDFDocument({
    size: [metadata.width, metadata.height],
    margin: 0,
  });

  const stream = fsSync.createWriteStream(outputPath);
  doc.pipe(stream);

  doc.image(buffer, 0, 0, {
    width: metadata.width,
    height: metadata.height,
  });

  doc.end();

  return new Promise((resolve) => stream.on("finish", resolve));
}

async function main() {
  const files = await fs.readdir(absDir);
  const avifs = files.filter((f) => f.toLowerCase().endsWith(".avif"));

  if (!avifs.length) {
    console.log("No AVIF files found.");
    return;
  }

  for (const file of avifs) {
    console.log("Converting:", file);
    await convertFile(file);
  }

  console.log("✅ Done. PDF compressed successfully.");
}

main().catch(console.error);
