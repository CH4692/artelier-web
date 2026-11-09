// Serve the production Angular bundle; proxy only the runner-owned loopback API.
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
const root = resolve(process.env.E2E_APP_DIST || 'dist/artelier-web/browser');
const runtime = process.env.E2E_RUNTIME
  ? JSON.parse(readFileSync(process.env.E2E_RUNTIME, 'utf8'))
  : null;
const api = runtime ? new URL(runtime.apiURL) : null;
if (api && (api.protocol !== 'http:' || api.hostname !== '127.0.0.1'))
  throw new Error('Only isolated loopback APIs are allowed');
const types = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.html': 'text/html',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};
http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:4173');
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/i/')) {
      if (!api) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end('{"detail":"UI profile requires explicit request interception"}');
        return;
      }
      const upstream = http.request(
        {
          hostname: api.hostname,
          port: api.port,
          path: req.url,
          method: req.method,
          headers: req.headers,
        },
        (response) => {
          res.writeHead(response.statusCode, response.headers);
          response.pipe(res);
        },
      );
      upstream.on('error', () => {
        res.writeHead(502);
        res.end();
      });
      req.pipe(upstream);
      return;
    }
    const path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const file = existsSync(path) && statSync(path).isFile() ? path : resolve(root, 'index.html');
    res.writeHead(200, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(readFileSync(file));
  })
  .listen(4173, '127.0.0.1');
