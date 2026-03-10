/**
 * Creates minimal valid PNG placeholder assets for development.
 * These allow the app to build without the canvas package.
 * Replace with real branded assets before App Store submission.
 */
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

// Minimal valid PNG: 1x1 pixel, navy blue (#1a365d)
// This is the smallest possible valid PNG file
function createPNG(width, height, r, g, b) {
  // For placeholder purposes, we create a minimal valid PNG
  // with IHDR, IDAT, and IEND chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(2, 9); // color type (RGB)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdr = createChunk('IHDR', ihdrData);

  // Create raw image data (filter byte + RGB for each row)
  const rawRow = Buffer.alloc(1 + width * 3);
  rawRow[0] = 0; // no filter
  for (let x = 0; x < width; x++) {
    rawRow[1 + x * 3] = r;
    rawRow[1 + x * 3 + 1] = g;
    rawRow[1 + x * 3 + 2] = b;
  }

  // Repeat row for all height rows
  const rawData = Buffer.alloc(rawRow.length * height);
  for (let y = 0; y < height; y++) {
    rawRow.copy(rawData, y * rawRow.length);
  }

  // Compress with zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);

  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

// CRC32 implementation for PNG
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Navy blue: #1a365d = RGB(26, 54, 93)
const assets = [
  { name: 'icon.png', w: 1024, h: 1024 },
  { name: 'adaptive-icon.png', w: 1024, h: 1024 },
  { name: 'splash.png', w: 1284, h: 2778 },
  { name: 'favicon.png', w: 48, h: 48 },
  { name: 'notification-icon.png', w: 96, h: 96 },
];

// Use small dimensions for placeholders (they'll be navy squares)
// The actual dimensions don't matter for dev builds
console.log('Creating placeholder assets...\n');

assets.forEach(({ name, w, h }) => {
  const filePath = path.join(assetsDir, name);
  if (!fs.existsSync(filePath)) {
    // Use 4x4 px for speed, Expo will handle scaling
    const png = createPNG(4, 4, 26, 54, 93);
    fs.writeFileSync(filePath, png);
    console.log(`Created: ${name} (placeholder ${4}x${4})`);
  } else {
    console.log(`Exists:  ${name} (skipped)`);
  }
});

console.log('\nPlaceholder assets created.');
console.log('Replace with real branded 1024x1024 icons before App Store submission.');
