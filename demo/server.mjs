// Minimal static server + mock n8n webhook for manual testing
// Usage:
// 1) npm run build
// 2) node demo/server.mjs
// 3) Open http://localhost:5173

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const demoDir = path.join(root, 'demo');
const distDir = path.join(root, 'dist');
const srcDir = path.join(root, 'src');
const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function serveFile(res, filePath, contentType = 'text/plain') {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, 'Not Found');
      return;
    }
    send(res, 200, data, { 'Content-Type': contentType });
  });
}

function contentTypeFor(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.map')) return 'application/json; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const method = req.method || 'GET';

  // CORS for webhook testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') return send(res, 200, 'ok');

  if (parsed.pathname === '/') {
    return serveFile(res, path.join(demoDir, 'index.html'), 'text/html; charset=utf-8');
  }

  if (parsed.pathname === '/webhook' && method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};
        const message = typeof data.message === 'string' ? data.message : '';
        const echo = `Echo: ${message}`;
        const payload = { text: echo, received: data };
        send(res, 200, JSON.stringify(payload), { 'Content-Type': 'application/json' });
      } catch (e) {
        send(res, 400, JSON.stringify({ error: 'bad json' }), { 'Content-Type': 'application/json' });
      }
    });
    return;
  }

  // Serve dist bundle
  if (parsed.pathname && parsed.pathname.startsWith('/dist/')) {
    const file = path.join(root, parsed.pathname);
    return serveFile(res, file, contentTypeFor(file));
  }

  // Serve CSS from src (for quick iteration)
  if (parsed.pathname === '/docsify-themable.css') {
    const file = path.join(srcDir, 'docsify-themable.css');
    return serveFile(res, file, 'text/css; charset=utf-8');
  }
  if (parsed.pathname === '/chat-basic.css') {
    const file = path.join(srcDir, 'chat-basic.css');
    return serveFile(res, file, 'text/css; charset=utf-8');
  }

  // 404 fallback
  send(res, 404, 'Not Found');
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Demo server running at http://localhost:${PORT}`);
  if (!fs.existsSync(distDir)) {
    console.warn('[demo] dist/ not found. Run "npm run build" first to generate dist/index.umd.js');
  }
});
