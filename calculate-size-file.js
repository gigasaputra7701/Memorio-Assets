const fs = require("fs");
const path = require("path");

function calculateFolderSize(folderPath) {
  let totalSize = 0;

  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      totalSize += stats.size; // size in bytes
    }
  }

  return totalSize;
}

const folder = path.resolve("Assets-1");
const totalBytes = calculateFolderSize(folder);

const totalKB = (totalBytes / 1024).toFixed(2);
const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

console.log(`Total size in bytes: ${totalBytes}`);
console.log(`Total size in KB: ${totalKB} KB`);
console.log(`Total size in MB: ${totalMB} MB`);
