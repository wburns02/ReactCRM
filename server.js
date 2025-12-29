const http = require('http');
const fs = require('fs');
const path = require('path');

// Railway networking is configured for port 5000, so use that directly
const PORT = 5000;
const DIST_DIR = path.join(__dirname, 'dist');

// Startup verification
console.log('Starting server...');
console.log('PORT:', PORT);
console.log('DIST_DIR:', DIST_DIR);
console.log('DIST_DIR exists:', fs.existsSync(DIST_DIR));

if (fs.existsSync(DIST_DIR)) {
  console.log('DIST_DIR contents:', fs.readdirSync(DIST_DIR));
  const indexPath = path.join(DIST_DIR, 'index.html');
  console.log('index.html exists:', fs.existsSync(indexPath));
}

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
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Health check endpoint
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', port: PORT }));
    return;
  }

  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

  // Handle SPA routing - if file doesn't exist, serve index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      console.error('Error reading file:', filePath, err.message);
      if (err.code === 'ENOENT') {
        // Serve index.html for SPA routing
        fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, content2) => {
          if (err2) {
            console.error('Error reading index.html:', err2.message);
            res.writeHead(500);
            res.end('Server Error - index.html not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content2);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      // Add cache headers for static assets
      const headers = { 'Content-Type': contentType };
      if (ext !== '.html') {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      }
      res.writeHead(200, headers);
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('Server ready to accept connections');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
