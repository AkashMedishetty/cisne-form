/**
 * Generates favicons and app icons from the CIBC logo's diamond mark.
 *
 * Run with:  node scripts/gen-favicons.cjs
 *
 * Outputs:
 *   app/favicon.ico        (16, 32, 48 multi-size)
 *   app/icon.png           (512, transparent)
 *   app/apple-icon.png     (180, white background)
 *   public/icon.png        (512, transparent — handy for manifests/sharing)
 *
 * Source: public/logo.png (the full CIBC wordmark).
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
// Source wordmark lives in public/ (also used directly in the UI as /logo.png).
const SRC = path.join(ROOT, "public", "logo.png");

async function findDiamondBBox() {
  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const alphaAt = (x, y) => data[(y * width + x) * channels + 3];
  const colHasInk = (x) => {
    for (let y = 0; y < height; y++) if (alphaAt(x, y) > 20) return true;
    return false;
  };

  // The diamond is the rightmost contiguous run of inked columns, separated
  // from the "CIBC" wordmark by a gap of fully transparent columns.
  let right = width - 1;
  while (right > 0 && !colHasInk(right)) right--;
  let left = right;
  while (left > 0 && colHasInk(left - 1)) left--;

  // Tighten vertically within [left, right].
  const rowHasInk = (y) => {
    for (let x = left; x <= right; x++) if (alphaAt(x, y) > 20) return true;
    return false;
  };
  let top = 0;
  while (top < height && !rowHasInk(top)) top++;
  let bottom = height - 1;
  while (bottom > 0 && !rowHasInk(bottom)) bottom--;

  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function main() {
  const bbox = await findDiamondBBox();
  console.log("Diamond bbox:", bbox);

  const diamond = await sharp(SRC).extract(bbox).png().toBuffer();

  // Build a square icon at `size`, with the diamond at ~82% and `bg` behind it.
  async function makeIcon(size, bg) {
    const inner = Math.round(size * 0.82);
    const resized = await sharp(diamond)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    return sharp({
      create: { width: size, height: size, channels: 4, background: bg },
    })
      .composite([{ input: resized, gravity: "center" }])
      .png()
      .toBuffer();
  }

  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  const white = { r: 255, g: 255, b: 255, alpha: 1 };

  // App Router icon conventions.
  const icon512 = await makeIcon(512, transparent);
  fs.writeFileSync(path.join(ROOT, "app", "icon.png"), icon512);
  fs.writeFileSync(path.join(ROOT, "public", "icon.png"), icon512);
  fs.writeFileSync(path.join(ROOT, "app", "apple-icon.png"), await makeIcon(180, white));

  // favicon.ico (PNG-encoded entries: 16, 32, 48).
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const s of sizes) pngs.push({ size: s, buf: await makeIcon(s, transparent) });
  fs.writeFileSync(path.join(ROOT, "app", "favicon.ico"), buildIco(pngs));

  console.log("Wrote app/favicon.ico, app/icon.png, app/apple-icon.png, public/icon.png");
}

function buildIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  const bodies = [];
  entries.forEach((e, i) => {
    const b = e.buf;
    const dim = e.size >= 256 ? 0 : e.size; // 0 means 256 in ICO
    dir.writeUInt8(dim, i * 16 + 0);
    dir.writeUInt8(dim, i * 16 + 1);
    dir.writeUInt8(0, i * 16 + 2); // palette
    dir.writeUInt8(0, i * 16 + 3); // reserved
    dir.writeUInt16LE(1, i * 16 + 4); // color planes
    dir.writeUInt16LE(32, i * 16 + 6); // bits per pixel
    dir.writeUInt32LE(b.length, i * 16 + 8);
    dir.writeUInt32LE(offset, i * 16 + 12);
    offset += b.length;
    bodies.push(b);
  });
  return Buffer.concat([header, dir, ...bodies]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
