const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT_DIR = path.join(process.cwd(), "public", "icons");
const PURPLE = "#6d28d9";

function svgIcon(size) {
  const fontSize = Math.round(size * 0.62);
  const y = Math.round(size * 0.72);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="${PURPLE}" />
  <text x="50%" y="${y}" text-anchor="middle" fill="#ffffff"
        font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
        font-size="${fontSize}" font-weight="800">O</text>
</svg>`;
}

async function writeIcon(size, filename) {
  const svg = svgIcon(size);
  const outPath = path.join(OUT_DIR, filename);
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await writeIcon(192, "icon-192.png");
  await writeIcon(512, "icon-512.png");

  console.log("Generated:");
  console.log(path.join("public", "icons", "icon-192.png"));
  console.log(path.join("public", "icons", "icon-512.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
