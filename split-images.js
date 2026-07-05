/**
 * split-images.js
 * Split gambar spread (2 halaman) secara vertikal (kiri & kanan).
 * Gambar single-page (1 halaman) TIDAK displit, tapi di-resize
 * supaya ukurannya sama persis dengan hasil potongan spread —
 * jadi semua output punya dimensi konsisten untuk digabung jadi 1 PDF.
 *
 * Cara pakai:
 *   node split-images.js <folder_input> [folder_output]
 *
 * Opsional — override manual:
 *   Buat file "no-split.txt" di dalam folder_input, isi nama file
 *   (persis seperti nama aslinya, satu per baris) yang TIDAK boleh
 *   displit walau aspect ratio-nya kedeteksi sebagai spread. Contoh isi:
 *     1.jpg
 *     30.jpg
 *     31.jpg
 *     32.jpg
 *     33.jpg
 *     130.png
 *
 * Dependency:
 *   npm install sharp
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// ─── Konfigurasi ────────────────────────────────────────────────────────────
const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".tiff", ".bmp", ".avif"];

// Ambang batas aspect ratio (width/height) untuk deteksi otomatis.
// Gambar spread (2 halaman berdampingan) biasanya jauh lebih landscape
// dibanding gambar single-page. Sesuaikan angka ini kalau deteksi meleset.
const SPREAD_ASPECT_RATIO_THRESHOLD = 1.2;

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

// ─── Baca daftar override manual (no-split.txt) ─────────────────────────────
function loadNoSplitList(folder) {
  const listPath = path.join(folder, "no-split.txt");
  if (!fs.existsSync(listPath)) return new Set();

  const lines = fs
    .readFileSync(listPath, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  console.log(`📋  Memuat ${lines.length} nama file dari no-split.txt (tidak akan displit)\n`);
  return new Set(lines);
}

// ─── Fungsi split (untuk gambar spread) ─────────────────────────────────────
async function splitImage(filePath, index, targetWidth, targetHeight) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);
  const outputExt = ext === ".bmp" ? ".png" : ext;

  const metadata = await sharp(filePath).metadata();
  const { width, height } = metadata;
  const halfWidth = Math.floor(width / 2);

  const seq = String(index).padStart(3, "0");
  const leftPath  = path.join(outputFolder, `${seq}_1_${baseName}_kiri${outputExt}`);
  const rightPath = path.join(outputFolder, `${seq}_2_${baseName}_kanan${outputExt}`);

  // Crop dulu (kiri & kanan), lalu resize ke ukuran target biar seragam
  // dengan gambar single-page. fit "fill" supaya pas persis di target,
  // ganti ke "contain"/"cover" kalau nggak mau aspect ratio berubah.
  await sharp(filePath)
    .extract({ left: 0, top: 0, width: halfWidth, height })
    .resize(targetWidth, targetHeight, { fit: "fill" })
    .toFile(leftPath);

  await sharp(filePath)
    .extract({ left: halfWidth, top: 0, width: width - halfWidth, height })
    .resize(targetWidth, targetHeight, { fit: "fill" })
    .toFile(rightPath);

  return { type: "spread", width, height, halfWidth };
}

// ─── Fungsi resize (untuk gambar single-page) ───────────────────────────────
async function resizeSingleImage(filePath, index, targetWidth, targetHeight) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);
  const outputExt = ext === ".bmp" ? ".png" : ext;

  const metadata = await sharp(filePath).metadata();
  const { width, height } = metadata;

  const seq = String(index).padStart(3, "0");
  const outPath = path.join(outputFolder, `${seq}_1_${baseName}_single${outputExt}`);

  // "contain" = seluruh gambar tetap kelihatan, area sisa diisi background putih
  // Kalau mau full crop tanpa border putih, ganti fit ke "cover"
  await sharp(filePath)
    .resize(targetWidth, targetHeight, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .toFile(outPath);

  return { type: "single", width, height };
}

// Urutkan nama file secara "natural" (2.jpg sebelum 10.jpg, dst)
function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

async function main() {
  const noSplitList = loadNoSplitList(inputFolder);

  const files = fs
    .readdirSync(inputFolder)
    .filter((f) => SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .sort(naturalSort);

  if (files.length === 0) {
    console.warn("⚠️  Tidak ada gambar yang ditemukan di folder:", inputFolder);
    process.exit(0);
  }

  console.log(`🖼️  Ditemukan ${files.length} gambar — menganalisa ukuran target...\n`);

  // ── Tahap 1: tentukan targetWidth & targetHeight dari gambar spread pertama ──
  // Semua output (spread maupun single) akan diseragamkan ke ukuran ini.
  let targetWidth = null;
  let targetHeight = null;

  for (const file of files) {
    if (noSplitList.has(file)) continue;
    const filePath = path.join(inputFolder, file);
    const { width, height } = await sharp(filePath).metadata();
    const ratio = width / height;
    if (ratio >= SPREAD_ASPECT_RATIO_THRESHOLD) {
      targetWidth = Math.floor(width / 2);
      targetHeight = height;
      console.log(`📐  Ukuran target ditentukan dari "${file}": ${targetWidth}x${targetHeight}px\n`);
      break;
    }
  }

  if (!targetWidth) {
    console.error("❌  Tidak ada gambar spread yang terdeteksi untuk menentukan ukuran target.");
    console.error("    Set ukuran manual atau cek SPREAD_ASPECT_RATIO_THRESHOLD.");
    process.exit(1);
  }

  // ── Tahap 2: proses semua file ──────────────────────────────────────────────
  let sukses = 0;
  let gagal = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(inputFolder, file);

    try {
      const metadata = await sharp(filePath).metadata();
      const ratio = metadata.width / metadata.height;
      const forceNoSplit = noSplitList.has(file);
      const isSpread = !forceNoSplit && ratio >= SPREAD_ASPECT_RATIO_THRESHOLD;

      if (isSpread) {
        const info = await splitImage(filePath, i + 1, targetWidth, targetHeight);
        console.log(
          `✅  ${file}  [spread ${info.width}x${info.height}]  →  displit jadi kiri+kanan (${targetWidth}x${targetHeight})`
        );
      } else {
        const info = await resizeSingleImage(filePath, i + 1, targetWidth, targetHeight);
        console.log(
          `✅  ${file}  [single ${info.width}x${info.height}]  →  di-resize (${targetWidth}x${targetHeight})${forceNoSplit ? " [no-split.txt]" : ""}`
        );
      }
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