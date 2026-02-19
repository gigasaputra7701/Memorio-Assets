const fs = require("fs").promises;
const path = require("path");
const { PDFDocument } = require("pdf-lib");

// ===== ARGUMENT =====
const INPUT_DIR = process.argv[2];
const OUTPUT_FILE = process.argv[3] || "merged.pdf";

if (!INPUT_DIR) {
  console.error("Usage: node merge-pdf.js <pdf-folder> [output.pdf]");
  process.exit(1);
}

const absDir = path.resolve(INPUT_DIR);

// ===== HELPER: AMBIL ANGKA DARI NAMA FILE =====
function extractNumber(filename) {
  const match = filename.match(/\d+/);
  return match ? parseInt(match[0], 10) : Infinity;
}

// ===== MAIN =====
async function mergePDFs() {
  const files = await fs.readdir(absDir);

  const pdfFiles = files
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .sort((a, b) => extractNumber(a) - extractNumber(b));

  if (!pdfFiles.length) {
    console.log("No PDF files found.");
    return;
  }

  console.log(`Found ${pdfFiles.length} PDF(s). Merging...`);

  const mergedPdf = await PDFDocument.create();

  for (const file of pdfFiles) {
    console.log("Merging:", file);
    const filePath = path.join(absDir, file);
    const pdfBytes = await fs.readFile(filePath);

    const pdf = await PDFDocument.load(pdfBytes);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();
  const outputPath = path.join(absDir, OUTPUT_FILE);

  await fs.writeFile(outputPath, mergedBytes);

  console.log("\n✅ DONE");
  console.log("Output file:", outputPath);
}

// ===== RUN =====
mergePDFs().catch((err) => {
  console.error("Error merging PDFs:", err);
});
