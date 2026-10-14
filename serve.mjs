// Tiny preview server for dist/. Run `npm run dev` and open the address it prints.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, sep } from 'node:path';
import { ROOT } from './src/lib.mjs';

const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

createServer(async (req, res) => {
  try {
    // Work with the URL path first (always forward slashes), then turn it into a file path.
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const full = join(DIST, path);
    if (!full.startsWith(DIST + sep)) throw new Error('outside dist');
    if (!(await stat(full)).isFile()) throw new Error('not a file');
    res.writeHead(200, { 'Content-Type': TYPES[extname(full).toLowerCase()] || 'application/octet-stream' });
    res.end(await readFile(full));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`Preview: http://localhost:${PORT}  (run "npm run build" again after editing data/)`));
