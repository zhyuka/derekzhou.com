// serve.mjs: a static server for site/ that answers as Cloudflare Pages would for what the gates read: the rules of
// site/_headers applied (every matching rule's headers combined, as Pages does), / and /index.html the home page,
// any other missing path 404 with 404.html. Node built-ins only. Never part of the site.
//   import { serve } from './serve.mjs'; const s = await serve('site'); ... s.url ... await s.close();
//   node .github/ci/serve.mjs site 8080        (by hand)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2', '.png': 'image/png', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };

export function parseHeaders(text) {   // [{ pattern, headers: [[name, value]] }] in file order
  const rules = []; let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = { pattern: line.trim(), headers: [] }; rules.push(cur); continue; }
    const i = line.indexOf(':'); if (cur && i > 0) cur.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
  }
  return rules;
}

export function matches(pattern, p) {   // Pages' rule syntax: a literal path, * a splat, :name one segment
  const re = '^' + pattern.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:[A-Za-z]\w*/g, '[^/]+')).join('.*') + '$';
  return new RegExp(re).test(p);
}

export function headersFor(rules, p) {
  const out = [];
  for (const r of rules) if (matches(r.pattern, p)) out.push(...r.headers);
  return out;
}

export function serve(dir, { port = 0, host = '127.0.0.1' } = {}) {
  const root = path.resolve(dir);
  const hf = path.join(root, '_headers');
  const rules = fs.existsSync(hf) ? parseHeaders(fs.readFileSync(hf, 'utf8')) : [];
  const server = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); res.end(); return; }
    let file = p === '/' ? path.join(root, 'index.html') : path.join(root, p);
    let status = 200;
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile() || path.basename(file).startsWith('_')) {
      status = 404; file = path.join(root, '404.html');
    }
    const h = headersFor(rules, status === 404 ? '/__missing__' : p);
    const body = fs.readFileSync(file);
    const headers = {};
    for (const [k, v] of h) headers[k] = headers[k] ? [].concat(headers[k], v) : v;
    headers['Content-Type'] = TYPES[path.extname(file)] || 'application/octet-stream';
    headers['Content-Length'] = body.length;
    res.writeHead(status, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  });
  return new Promise((ok) => server.listen(port, host, () => ok({
    url: `http://${host}:${server.address().port}/`, rules,
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
  })));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const s = await serve(process.argv[2] || 'site', { port: +(process.argv[3] || 8080) });
  console.log('serving ' + (process.argv[2] || 'site') + ' at ' + s.url);
}
