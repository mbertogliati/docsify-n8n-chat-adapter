import { defineConfig, Plugin } from 'vite';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Dev plugin to serve library bundle and css from the project root
function serveRootAssets(): Plugin {
  return {
    name: 'serve-root-assets',
    configureServer(server) {
      const projectRoot = path.resolve(__dirname, '..');
      const srcDir = path.join(projectRoot, 'src');
      const distDir = path.join(projectRoot, 'dist');

      // serve /chat-basic.css from src during dev
      server.middlewares.use('/chat-basic.css', (req, res, next) => {
        const file = path.join(srcDir, 'chat-basic.css');
        if (fs.existsSync(file)) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
          fs.createReadStream(file).pipe(res);
          return;
        }
        next();
      });

      // serve /dist/* from project root dist during dev
      server.middlewares.use('/dist', (req, res, next) => {
        const urlPath = req.url || '/';
        const filePath = path.join(distDir, urlPath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          // naive content-type
          const ct = filePath.endsWith('.js')
            ? 'application/javascript; charset=utf-8'
            : filePath.endsWith('.map')
            ? 'application/json; charset=utf-8'
            : 'application/octet-stream';
          res.setHeader('Content-Type', ct);
          fs.createReadStream(filePath).pipe(res);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  root: __dirname,
  server: {
    port: 5173,
  },
  plugins: [serveRootAssets()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
});
