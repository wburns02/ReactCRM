import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use Railway's PORT environment variable (they inject it internally)
// Fallback to 5000 for local development
const PORT = process.env.PORT || 5000;
const DIST_DIR = path.join(__dirname, 'dist');

// App is deployed at root - no path prefix

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  // Health check - responds immediately
  if (req.url === '/health' || req.url === '/healthz' || req.url === '/') {
    if (req.url === '/health' || req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
      return;
    }
  }

  let urlPath = req.url;

  // Serve static files
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);

  // SPA routing - serve index.html for non-file routes
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
    } else {
      const headers = { 'Content-Type': contentType };
      const basename = path.basename(filePath);
      if (basename === 'sw.js' || basename === 'registerSW.js') {
        // Service worker files must never be cached — Chrome needs fresh SW on every load
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      } else if (ext !== '.html') {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      }
      res.writeHead(200, headers);
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port ' + PORT);
});
