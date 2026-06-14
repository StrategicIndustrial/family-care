// Generates PWA icons from public/icons/icon-source.svg
// Run with: node scripts/generate-icons.mjs

import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public", "icons", "icon-source.svg");
const outDir = join(root, "public", "icons");

const targets = [
  { name: "icon-192.png",          size: 192, maskable: false },
  { name: "icon-512.png",          size: 512, maskable: false },
  { name: "icon-192-maskable.png", size: 192, maskable: true  },
  { name: "icon-512-maskable.png", size: 512, maskable: true  },
  { name: "apple-touch-icon.png",  size: 180, maskable: false },
];

await mkdir(outDir, { recursive: true });
const svg = await readFile(src);

for (const { name, size, maskable } of targets) {
  // For maskable, pad the source so the icon sits in the inner 80% safe zone.
  // Sharp renders the SVG at full canvas, then we composite/pad.
  let pipeline = sharp(svg, { density: 384 }).resize(
    maskable ? Math.round(size * 0.8) : size,
    maskable ? Math.round(size * 0.8) : size,
    { fit: "contain", background: { r: 37, g: 99, b: 235, alpha: 1 } } // #2563EB
  );

  if (maskable) {
    const pad = Math.round(size * 0.1);
    pipeline = pipeline.extend({
      top: pad, bottom: pad, left: pad, right: pad,
      background: { r: 37, g: 99, b: 235, alpha: 1 },
    });
  }

  const buf = await pipeline.png().toBuffer();
  await writeFile(join(outDir, name), buf);
  console.log(`✓ ${name} (${size}×${size}${maskable ? ", maskable" : ""})`);
}

// Favicon at 32×32 from the same source
const faviconBuf = await sharp(svg, { density: 384 })
  .resize(32, 32)
  .png()
  .toBuffer();
await writeFile(join(root, "public", "favicon.ico"), faviconBuf);
console.log("✓ favicon.ico (32×32)");
