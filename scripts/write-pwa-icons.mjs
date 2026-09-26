import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../public/icons");

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([length, body, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc ^ 0xffffffff;
}

function png(size, { pad = 0 } = {}) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const inset = size * pad;
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const i = row + 1 + x * 4;
      const nx = (x - inset) / (size - inset * 2);
      const ny = (y - inset) / (size - inset * 2);
      let r = 0xfb;
      let g = 0xf6;
      let b = 0xee;
      if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
        const cx = 0.5;
        const dx = (nx - cx) / 0.32;
        const nestY = (ny - 0.62) / 0.18;
        if (dx * dx + nestY * nestY < 1) {
          r = 0xe8;
          g = 0xc4;
          b = 0xa0;
        }
        const head = (nx - cx) ** 2 + (ny - 0.4) ** 2;
        if (head < 0.13 ** 2) {
          r = 0xf6;
          g = 0xb4;
          b = 0x8a;
        }
      }
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(root, { recursive: true });
writeFileSync(resolve(root, "icon-192.png"), png(192));
writeFileSync(resolve(root, "icon-512.png"), png(512));
writeFileSync(resolve(root, "icon-maskable-512.png"), png(512, { pad: 0.18 }));
writeFileSync(resolve(root, "apple-touch-icon.png"), png(180));
