// Serveur statique minimal pour essayer le site en local : node outils/serveur.mjs [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('../site/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2',
};
const port = Number(process.argv[2] ?? process.env.PORT ?? 8741);

createServer(async (req, res) => {
  const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const fichier = normalize(join(RACINE, chemin.endsWith('/') ? chemin + 'index.html' : chemin));
  if (!fichier.startsWith(RACINE)) { res.writeHead(403).end(); return; }
  try {
    const contenu = await readFile(fichier);
    res.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(contenu);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('introuvable');
  }
}).listen(port, '127.0.0.1', () => console.log(`http://localhost:${port}/`));
