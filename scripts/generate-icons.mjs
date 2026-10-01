/**
 * Generates the extension icons.
 *
 * Commit the generated PNGs; run this script only when the mark changes. Keeping
 * the source of truth as code means the icons are diffable and reproducible, and
 * that no one has to hand-tune four separate raster files.
 *
 * Usage: node scripts/generate-icons.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const SIZES = [16, 32, 48, 128];
/** Supersampling factor: rendered 4x then box-downsampled for clean edges. */
const SUPERSAMPLE = 4;

const GRADIENT_TOP = [99, 102, 241];
const GRADIENT_BOTTOM = [139, 92, 246];
/** Darker than the background gradient so the glyph reads against the white page. */
const MARK = [67, 56, 202];

// WXT copies `<rootDir>/public` into the build. Note that this is the project
// root and not `srcDir`, which is why the output lives at `public/icon`.
const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icon');

/** Signed distance to a rounded rectangle; negative is inside. */
function roundedRectDistance(x, y, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(x - cx) - (halfW - radius);
  const dy = Math.abs(y - cy) - (halfH - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

function renderIcon(size) {
  const canvas = size * SUPERSAMPLE;
  /*
   * All geometry below is expressed in a 0-1000 square and mapped to the canvas
   * through `px`/`py`. Keeping one coordinate system is what stops a shape from
   * silently shrinking to a sliver when the size changes.
   */
  const pageHalfW = 275;
  const pageHalfH = 320;
  // Rules are deliberately thick: at 16px they are barely two pixels tall, and
  // anything thinner blurs away entirely.
  const barHeight = 100;
  const bars = [
    { y: 345, x: 320, width: 360 },
    { y: 500, x: 320, width: 360 },
    { y: 655, x: 320, width: 215 },
  ];

  // Premultiplied accumulation so downsampling never darkens soft edges.
  const sums = new Float64Array(size * size * 4);

  for (let y = 0; y < canvas; y += 1) {
    for (let x = 0; x < canvas; x += 1) {
      const px = ((x + 0.5) * 1000) / canvas;
      const py = ((y + 0.5) * 1000) / canvas;

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      const background = roundedRectDistance(px, py, 500, 500, 500, 500, 200);
      if (background <= 0) {
        const t = (y + 0.5) / canvas;
        r = GRADIENT_TOP[0] + (GRADIENT_BOTTOM[0] - GRADIENT_TOP[0]) * t;
        g = GRADIENT_TOP[1] + (GRADIENT_BOTTOM[1] - GRADIENT_TOP[1]) * t;
        b = GRADIENT_TOP[2] + (GRADIENT_BOTTOM[2] - GRADIENT_TOP[2]) * t;
        a = 255;

        const page = roundedRectDistance(px, py, 500, 500, pageHalfW, pageHalfH, 110);
        if (page <= 0) {
          r = 255;
          g = 255;
          b = 255;

          for (const bar of bars) {
            const cx = bar.x + bar.width / 2;
            const halfWidth = bar.width / 2;
            const distance = roundedRectDistance(
              px,
              py,
              cx,
              bar.y,
              halfWidth,
              barHeight / 2,
              barHeight / 2,
            );
            if (distance <= 0) {
              r = MARK[0];
              g = MARK[1];
              b = MARK[2];
            }
          }
        }
      }

      const targetX = Math.floor(x / SUPERSAMPLE);
      const targetY = Math.floor(y / SUPERSAMPLE);
      const index = (targetY * size + targetX) * 4;
      sums[index] += r * a;
      sums[index + 1] += g * a;
      sums[index + 2] += b * a;
      sums[index + 3] += a;
    }
  }

  const samples = SUPERSAMPLE * SUPERSAMPLE;
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    const alphaSum = sums[i * 4 + 3];
    const alpha = alphaSum / samples;
    rgba[i * 4 + 3] = Math.round(alpha);
    if (alphaSum > 0) {
      rgba[i * 4] = Math.round(sums[i * 4] / alphaSum);
      rgba[i * 4 + 1] = Math.round(sums[i * 4 + 1] / alphaSum);
      rgba[i * 4 + 2] = Math.round(sums[i * 4 + 2] / alphaSum);
    }
  }
  return rgba;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = resolve(OUT_DIR, `${size}.png`);
  writeFileSync(file, encodePng(size, renderIcon(size)));
  console.log(`wrote ${file}`);
}
