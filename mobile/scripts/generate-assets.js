/**
 * Asset Generation Script for Mac Septic Field App
 *
 * Generates placeholder app icons and splash screens using Node.js canvas.
 * For production, replace these with actual branded assets.
 *
 * Requirements:
 *   npm install canvas
 *
 * Usage:
 *   node scripts/generate-assets.js
 *
 * Required assets for App Store:
 *   - icon.png: 1024x1024 (App Store icon)
 *   - splash.png: 1284x2778 (Splash screen)
 *   - adaptive-icon.png: 1024x1024 (Android adaptive icon)
 *   - favicon.png: 48x48 (Web favicon)
 *   - notification-icon.png: 96x96 (Push notification icon)
 */

const fs = require('fs');
const path = require('path');

// Check if canvas is available
let createCanvas;
try {
  createCanvas = require('canvas').createCanvas;
} catch {
  console.log('=== Mac Septic Field App - Asset Requirements ===\n');
  console.log('The `canvas` package is not installed. You can either:\n');
  console.log('1. Install it: npm install canvas');
  console.log('   Then re-run: node scripts/generate-assets.js\n');
  console.log('2. Create the assets manually with these specs:\n');
  console.log('   assets/icon.png          - 1024x1024px - App icon (no transparency, no alpha)');
  console.log('   assets/splash.png        - 1284x2778px - Splash screen');
  console.log('   assets/adaptive-icon.png - 1024x1024px - Android adaptive icon (with padding)');
  console.log('   assets/favicon.png       - 48x48px     - Web favicon');
  console.log('   assets/notification-icon.png - 96x96px - Notification icon (white on transparent)\n');
  console.log('Brand colors:');
  console.log('   Primary: #1a365d (dark navy)');
  console.log('   Light:   #2c5282');
  console.log('   Text:    white\n');
  console.log('Logo text: "MAC" (large) + "SEPTIC" (smaller below)');
  process.exit(0);
}

const assetsDir = path.join(__dirname, '..', 'assets');

function generateIcon(size, filename, options = {}) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1a365d';
  if (options.rounded) {
    const radius = size * 0.2;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, size, size);
  }

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (size >= 96) {
    // Main text "MAC"
    ctx.font = `bold ${size * 0.3}px Arial, sans-serif`;
    ctx.fillText('MAC', size / 2, size * 0.38);

    // Sub text "SEPTIC"
    ctx.font = `${size * 0.12}px Arial, sans-serif`;
    ctx.fillText('SEPTIC', size / 2, size * 0.58);

    // Divider line
    ctx.strokeStyle = '#4299e1';
    ctx.lineWidth = size * 0.01;
    ctx.beginPath();
    ctx.moveTo(size * 0.25, size * 0.48);
    ctx.lineTo(size * 0.75, size * 0.48);
    ctx.stroke();
  } else {
    // Small icon - just "MS"
    ctx.font = `bold ${size * 0.45}px Arial, sans-serif`;
    ctx.fillText('MS', size / 2, size / 2);
  }

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(assetsDir, filename), buffer);
  console.log(`Generated: ${filename} (${size}x${size})`);
}

function generateSplash() {
  const width = 1284;
  const height = 2778;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background gradient (simulated)
  ctx.fillStyle = '#1a365d';
  ctx.fillRect(0, 0, width, height);

  // Lighter overlay in center
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, height / 2
  );
  gradient.addColorStop(0, 'rgba(44, 82, 130, 0.3)');
  gradient.addColorStop(1, 'rgba(26, 54, 93, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Logo
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 180px Arial, sans-serif';
  ctx.fillText('MAC', width / 2, height / 2 - 60);

  // Divider
  ctx.strokeStyle = '#4299e1';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(width * 0.3, height / 2 + 10);
  ctx.lineTo(width * 0.7, height / 2 + 10);
  ctx.stroke();

  ctx.font = '80px Arial, sans-serif';
  ctx.fillText('SEPTIC', width / 2, height / 2 + 80);

  // Tagline
  ctx.font = '36px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('Field Service', width / 2, height / 2 + 200);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(assetsDir, 'splash.png'), buffer);
  console.log(`Generated: splash.png (${width}x${height})`);
}

function generateNotificationIcon() {
  const size = 96;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, size, size);

  // White icon only (Android requirement)
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${size * 0.45}px Arial, sans-serif`;
  ctx.fillText('MS', size / 2, size / 2);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(assetsDir, 'notification-icon.png'), buffer);
  console.log(`Generated: notification-icon.png (${size}x${size})`);
}

// Generate all assets
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

console.log('Generating Mac Septic Field app assets...\n');

generateIcon(1024, 'icon.png');
generateIcon(1024, 'adaptive-icon.png');
generateIcon(48, 'favicon.png');
generateSplash();
generateNotificationIcon();

console.log('\nAll assets generated successfully!');
console.log('\nFor production, replace these with your actual branded assets:');
console.log('  - Use the Mac Septic logo (MAC Septic Horiz WHITE-BLUE.png)');
console.log('  - Ensure icon.png has NO transparency (App Store requirement)');
console.log('  - Test splash screen on multiple device sizes');
