/**
 * split-images.js
 * Split setiap gambar dalam folder secara vertikal (kiri & kanan)
 *
 * Cara pakai:
 *   node split-images.js <folder_input> [folder_output]
 *
 * Contoh:
 *   node split-images.js ./images
 *   node split-images.js ./images ./hasil
 *
 * Dependency:
 *   npm install sharp
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// ─── Konfigurasi ────────────────────────────────────────────────────────────
const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".tiff", ".bmp"];

// ─── Argumen CLI ─────────────────────────────────────────────────────────────
const inputFolder = process.argv[2];
const outputFolder = process.argv[3] || path.join(inputFolder, "output");

if (!inputFolder) {
  console.error("❌  Harap tentukan folder input.");
  console.error("    Contoh: node split-images.js ./images");
  process.exit(1);
}

if (!fs.existsSync(inputFolder)) {
  console.error(`❌  Folder tidak ditemukan: ${inputFolder}`);
  process.exit(1);
}

// Buat folder output jika belum ada
if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder, { recursive: true });
  console.log(`📁  Folder output dibuat: ${outputFolder}`);
}

// ─── Fungsi utama ─────────────────────────────────────────────────────────────
async function splitImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);

  // Baca metadata gambar untuk mendapat ukuran asli
  const metadata = await sharp(filePath).metadata();
  const { width, height } = metadata;

  const halfWidth = Math.floor(width / 2);

  // Tentukan format output berdasarkan ekstensi asli
  const outputExt = ext === ".bmp" ? ".png" : ext; // sharp tidak support BMP output

  const leftPath  = path.join(outputFolder, `${baseName}_kiri${outputExt}`);
  const rightPath = path.join(outputFolder, `${baseName}_kanan${outputExt}`);

  // Crop bagian KIRI: mulai dari x=0, lebar = halfWidth
  await sharp(filePath)
    .extract({ left: 0, top: 0, width: halfWidth, height })
    .toFile(leftPath);

  // Crop bagian KANAN: mulai dari x=halfWidth, lebar = sisa piksel
  await sharp(filePath)
    .extract({ left: halfWidth, top: 0, width: width - halfWidth, height })
    .toFile(rightPath);

  return { baseName, width, height, halfWidth };
}

async function main() {
  // Kumpulkan semua file gambar dalam folder (tidak rekursif)
  const files = fs.readdirSync(inputFolder).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  });

  if (files.length === 0) {
    console.warn("⚠️  Tidak ada gambar yang ditemukan di folder:", inputFolder);
    process.exit(0);
  }

  console.log(`\n🖼️  Ditemukan ${files.length} gambar — mulai proses split...\n`);

  let sukses = 0;
  let gagal  = 0;

  for (const file of files) {
    const filePath = path.join(inputFolder, file);
    try {
      const info = await splitImage(filePath);
      console.log(
        `✅  ${file}  [${info.width}x${info.height}px]  →  kiri (${info.halfWidth}px) + kanan (${info.width - info.halfWidth}px)`
      );
      sukses++;
    } catch (err) {
      console.error(`❌  Gagal memproses ${file}: ${err.message}`);
      gagal++;
    }
  }

  console.log(`\n─────────────────────────────────────`);
  console.log(`✔  Berhasil : ${sukses} gambar`);
  if (gagal > 0) console.log(`✖  Gagal    : ${gagal} gambar`);
  console.log(`📂  Hasil disimpan di: ${path.resolve(outputFolder)}`);
  console.log(`─────────────────────────────────────\n`);
}

main();