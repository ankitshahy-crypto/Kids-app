/**
 * QR Code, byte mode, error correction L, versions 1–6.
 * Drawn in the app. No network service and no image host.
 */

const ECC_L = 1;

const VERSIONS: { version: number; size: number; data: number; ecc: number; blocks: number }[] = [
  { version: 1, size: 21, data: 19, ecc: 7, blocks: 1 },
  { version: 2, size: 25, data: 34, ecc: 10, blocks: 1 },
  { version: 3, size: 29, data: 55, ecc: 15, blocks: 1 },
  { version: 4, size: 33, data: 80, ecc: 20, blocks: 1 },
  { version: 5, size: 37, data: 108, ecc: 26, blocks: 1 },
  { version: 6, size: 41, data: 136, ecc: 18, blocks: 2 },
];

const ALIGN: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
};

const { exp, log } = galois();

export function qrMatrix(text: string): boolean[][] {
  const bytes = [...new TextEncoder().encode(text)];
  const version = VERSIONS.find((item) => item.data >= bytesNeeded(bytes.length));
  if (!version) throw new Error("That link is too long for a QR code.");
  const words = encodeBytes(bytes, version.data);
  const blocks = splitBlocks(words, version.blocks);
  const coded = blocks.map((block) => ({ data: block, ecc: rsRemainder(block, version.ecc) }));
  const stream = interleave(coded);
  const bits: number[] = [];
  for (const word of stream) pushBits(bits, word, 8);
  return draw(version, bits);
}

function bytesNeeded(length: number): number {
  return Math.ceil((4 + 8 + length * 8 + 4) / 8);
}

function encodeBytes(bytes: number[], capacity: number): number[] {
  const bits: number[] = [];
  pushBits(bits, 0b0100, 4);
  pushBits(bits, bytes.length, 8);
  for (const byte of bytes) pushBits(bits, byte, 8);
  const room = capacity * 8 - bits.length;
  pushBits(bits, 0, Math.min(4, Math.max(0, room)));
  while (bits.length % 8 !== 0) bits.push(0);
  const words: number[] = [];
  for (let index = 0; index < bits.length; index += 8) {
    let value = 0;
    for (let bit = 0; bit < 8; bit += 1) value = (value << 1) | (bits[index + bit] ?? 0);
    words.push(value);
  }
  let pad = 0xec;
  while (words.length < capacity) {
    words.push(pad);
    pad = pad === 0xec ? 0x11 : 0xec;
  }
  return words;
}

function splitBlocks(words: number[], blocks: number): number[][] {
  const size = Math.floor(words.length / blocks);
  const out: number[][] = [];
  for (let index = 0; index < blocks; index += 1) out.push(words.slice(index * size, (index + 1) * size));
  return out;
}

function interleave(blocks: { data: number[]; ecc: number[] }[]): number[] {
  const out: number[] = [];
  const dataMax = Math.max(...blocks.map((block) => block.data.length));
  for (let index = 0; index < dataMax; index += 1) {
    for (const block of blocks) if (index < block.data.length) out.push(block.data[index] ?? 0);
  }
  const eccMax = Math.max(...blocks.map((block) => block.ecc.length));
  for (let index = 0; index < eccMax; index += 1) {
    for (const block of blocks) if (index < block.ecc.length) out.push(block.ecc[index] ?? 0);
  }
  return out;
}

function draw(version: (typeof VERSIONS)[number], dataBits: number[]): boolean[][] {
  const size = version.size;
  const matrix = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const mark = (x: number, y: number, dark: boolean) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const row = matrix[y];
    const hold = reserved[y];
    if (!row || !hold) return;
    row[x] = dark;
    hold[x] = true;
  };
  drawFinder(mark, 0, 0);
  drawFinder(mark, size - 7, 0);
  drawFinder(mark, 0, size - 7);
  for (let index = 0; index < 8; index += 1) {
    if (index !== 6) {
      mark(index, 7, false);
      mark(7, index, false);
      mark(size - 8 + index, 7, false);
      mark(7, size - 8 + index, false);
    }
  }
  mark(8, 7, false);
  mark(7, 8, false);
  mark(8, size - 8, true);
  for (let index = 0; index < size; index += 1) {
    if (!reserved[6]?.[index]) mark(index, 6, index % 2 === 0);
    if (!reserved[index]?.[6]) mark(6, index, index % 2 === 0);
  }
  for (const row of ALIGN[version.version] ?? []) {
    for (const col of ALIGN[version.version] ?? []) {
      if (finderOverlap(size, col, row)) continue;
      drawAlign(mark, col, row);
    }
  }
  for (const [x, y] of formatSpots(size)) {
    const row = reserved[y];
    if (row) row[x] = true;
  }
  const darkRow = reserved[size - 8];
  if (darkRow) darkRow[8] = true;

  let cursor = 0;
  let upward = true;
  for (let x = size - 1; x > 0; x -= 2) {
    if (x === 6) x = 5;
    for (let step = 0; step < size; step += 1) {
      const y = upward ? size - 1 - step : step;
      for (const dx of [0, 1]) {
        const xx = x - dx;
        if (reserved[y]?.[xx]) continue;
        matrix[y][xx] = dataBits[cursor] === 1;
        cursor += 1;
      }
    }
    upward = !upward;
  }

  let best = matrix;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < 8; mask += 1) {
    const masked = applyMask(matrix, reserved, mask);
    paintFormat(masked, size, formatBits(ECC_L, mask));
    const score = penalty(masked);
    if (score < bestScore) {
      best = masked;
      bestScore = score;
    }
  }
  return best;
}

function drawFinder(mark: (x: number, y: number, dark: boolean) => void, left: number, top: number) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const px = left + x;
      const py = top + y;
      if (px < 0 || py < 0) continue;
      const edge = x < 0 || y < 0 || x > 6 || y > 6;
      const ring = x === 0 || y === 0 || x === 6 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      mark(px, py, !edge && (ring || core));
    }
  }
}

function drawAlign(mark: (x: number, y: number, dark: boolean) => void, cx: number, cy: number) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const edge = Math.max(Math.abs(x), Math.abs(y)) === 2;
      mark(cx + x, cy + y, edge || (x === 0 && y === 0));
    }
  }
}

function finderOverlap(size: number, x: number, y: number): boolean {
  const corners = [
    [6, 6],
    [size - 7, 6],
    [6, size - 7],
  ];
  return corners.some(([cx, cy]) => Math.abs(x - cx) < 8 && Math.abs(y - cy) < 8);
}

function formatSpots(size: number): [number, number][] {
  const spots: [number, number][] = [];
  for (let bit = 0; bit < 15; bit += 1) {
    if (bit < 6) spots.push([8, bit]);
    else if (bit < 8) spots.push([8, bit + 1]);
    else spots.push([8, size - 15 + bit]);
    if (bit < 8) spots.push([size - bit - 1, 8]);
    else if (bit < 9) spots.push([7, 8]);
    else spots.push([14 - bit, 8]);
  }
  return spots;
}

function paintFormat(matrix: boolean[][], size: number, bits: number) {
  let index = 0;
  for (let bit = 0; bit < 15; bit += 1) {
    const dark = ((bits >> bit) & 1) === 1;
    const vertical = formatSpots(size)[index];
    const horizontal = formatSpots(size)[index + 1];
    index += 2;
    if (vertical) {
      const row = matrix[vertical[1]];
      if (row) row[vertical[0]] = dark;
    }
    if (horizontal) {
      const row = matrix[horizontal[1]];
      if (row) row[horizontal[0]] = dark;
    }
  }
  const fixed = matrix[size - 8];
  if (fixed) fixed[8] = true;
}

function formatBits(ecc: number, mask: number): number {
  const data = (ecc << 3) | mask;
  let rem = data << 10;
  for (let bit = 14; bit >= 10; bit -= 1) {
    if ((rem >>> bit) & 1) rem ^= 0x537 << (bit - 10);
  }
  return ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
}

function applyMask(matrix: boolean[][], reserved: boolean[][], mask: number): boolean[][] {
  return matrix.map((row, y) =>
    row.map((dark, x) => {
      if (reserved[y]?.[x] && !isFormat(matrix.length, x, y)) return dark;
      if (isFormat(matrix.length, x, y)) return false;
      return masked(mask, y, x) ? !dark : dark;
    }),
  );
}

function isFormat(size: number, x: number, y: number): boolean {
  return formatSpots(size).some(([sx, sy]) => sx === x && sy === y);
}

function masked(mask: number, row: number, col: number): boolean {
  if (mask === 0) return (row + col) % 2 === 0;
  if (mask === 1) return row % 2 === 0;
  if (mask === 2) return col % 3 === 0;
  if (mask === 3) return (row + col) % 3 === 0;
  if (mask === 4) return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
  if (mask === 5) return ((row * col) % 2) + ((row * col) % 3) === 0;
  if (mask === 6) return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
  return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
}

function penalty(matrix: boolean[][]): number {
  const size = matrix.length;
  let score = 0;
  const run = (dark: boolean, length: number) => {
    if (length >= 5) score += 3 + (length - 5);
    return dark;
  };
  for (let y = 0; y < size; y += 1) {
    let length = 1;
    for (let x = 1; x < size; x += 1) {
      if (matrix[y][x] === matrix[y][x - 1]) length += 1;
      else {
        run(Boolean(matrix[y][x - 1]), length);
        length = 1;
      }
    }
    run(Boolean(matrix[y][size - 1]), length);
  }
  for (let x = 0; x < size; x += 1) {
    let length = 1;
    for (let y = 1; y < size; y += 1) {
      if (matrix[y][x] === matrix[y - 1][x]) length += 1;
      else {
        run(Boolean(matrix[y - 1][x]), length);
        length = 1;
      }
    }
    run(Boolean(matrix[size - 1][x]), length);
  }
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const bit = matrix[y][x];
      if (bit === matrix[y][x + 1] && bit === matrix[y + 1][x] && bit === matrix[y + 1][x + 1]) score += 3;
    }
  }
  const pattern = [true, false, true, true, true, false, true];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x <= size - 7; x += 1) {
      if (pattern.every((bit, index) => matrix[y][x + index] === bit)) {
        const before = x >= 4 && [0, 1, 2, 3].every((index) => matrix[y][x - 1 - index] === false);
        const after = x + 11 <= size && [0, 1, 2, 3].every((index) => matrix[y][x + 7 + index] === false);
        if (before || after) score += 40;
      }
    }
  }
  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y <= size - 7; y += 1) {
      if (pattern.every((bit, index) => matrix[y + index][x] === bit)) {
        const before = y >= 4 && [0, 1, 2, 3].every((index) => matrix[y - 1 - index][x] === false);
        const after = y + 11 <= size && [0, 1, 2, 3].every((index) => matrix[y + 7 + index][x] === false);
        if (before || after) score += 40;
      }
    }
  }
  let dark = 0;
  for (const row of matrix) for (const bit of row) if (bit) dark += 1;
  score += Math.floor(Math.abs(dark / (size * size) - 0.5) * 20) * 10;
  return score;
}

function pushBits(bits: number[], value: number, count: number) {
  for (let index = count - 1; index >= 0; index -= 1) bits.push((value >>> index) & 1);
}

function galois(): { exp: number[]; log: number[] } {
  const exp = new Array<number>(512).fill(0);
  const log = new Array<number>(256).fill(0);
  let value = 1;
  for (let index = 0; index < 255; index += 1) {
    exp[index] = value;
    log[value] = index;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let index = 255; index < 512; index += 1) exp[index] = exp[index - 255] ?? 0;
  return { exp, log };
}

function rsRemainder(data: number[], degree: number): number[] {
  const gen = rsGenerator(degree);
  const result = new Array<number>(data.length + degree).fill(0);
  data.forEach((value, index) => {
    result[index] = value;
  });
  for (let index = 0; index < data.length; index += 1) {
    const coef = result[index] ?? 0;
    if (coef === 0) continue;
    const logCoef = log[coef] ?? 0;
    for (let term = 0; term < gen.length; term += 1) {
      result[index + term] = (result[index + term] ?? 0) ^ (exp[(logCoef + (log[gen[term] ?? 0] ?? 0)) % 255] ?? 0);
    }
  }
  return result.slice(data.length);
}

function rsGenerator(degree: number): number[] {
  let poly = [1];
  for (let index = 0; index < degree; index += 1) poly = polyMul(poly, [1, exp[index] ?? 0]);
  return poly;
}

function polyMul(left: number[], right: number[]): number[] {
  const out = new Array<number>(left.length + right.length - 1).fill(0);
  for (let i = 0; i < left.length; i += 1) {
    for (let j = 0; j < right.length; j += 1) {
      const a = left[i] ?? 0;
      const b = right[j] ?? 0;
      if (a === 0 || b === 0) continue;
      out[i + j] = (out[i + j] ?? 0) ^ (exp[((log[a] ?? 0) + (log[b] ?? 0)) % 255] ?? 0);
    }
  }
  return out;
}
