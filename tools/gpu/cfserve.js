// cfserve.js ROOT PORT [--br Q] [--gz L]: ROOT served as Cloudflare Pages serves it (ship1/verify/tools/cfserve.py's rules:
// _headers combined per matching rule, _redirects first match, pretty URLs, nearest 404.html), with the text types
// compressed as Cloudflare compressed the live files on 2026-11-03 (brotli quality 4 matched every file within 0.2%:
// world.v1.js 252,995 B here against 252,627 B from derekzhou.com; gzip level 6 for clients without br). Each file
// compressed once and kept; a file the deploy build stored compressed (Content-Encoding in its _headers block) passed
// through, or decoded for a client without that encoding, as Cloudflare does. Logs one JSON line a request.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = fs.realpathSync(process.argv[2]), PORT = +process.argv[3];
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BRQ = +arg('br', 4), GZL = +arg('gz', 6);
const MIME = { '.js': 'application/javascript', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8' };
function patRe(p) { let o = ''; for (let i = 0; i < p.length; i++) { const c = p[i]; if (c === '*') o += '(.*)'; else if (c === ':' && /[A-Za-z]/.test(p[i + 1] || '')) { const m = /^:([A-Za-z]\w*)/.exec(p.slice(i)); o += '([^/]+)'; i += m[0].length - 1; } else o += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); } return new RegExp('^' + o + '$'); }
function loadHeaders() { const rules = []; let cur = null; let t; try { t = fs.readFileSync(path.join(ROOT, '_headers'), 'utf8'); } catch (e) { return rules; }
  for (const line of t.split(/\r?\n/)) { if (!line.trim() || line.trimStart().startsWith('#')) continue; if (!/^\s/.test(line)) { cur = [line.trim(), []]; rules.push(cur); } else if (cur) { const i = line.indexOf(':'); cur[1].push([line.slice(0, i).trim(), line.slice(i + 1).trim()]); } }
  return rules.filter((r) => r[0].startsWith('/')).map((r) => [patRe(r[0]), r[1]]); }
function loadRedirects() { let t; try { t = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8'); } catch (e) { return []; }
  return t.split(/\r?\n/).map((l) => l.split('#')[0].trim()).filter(Boolean).map((l) => { const p = l.split(/\s+/); return [p[0], p[1], +(p[2] || 302)]; }).filter((r) => !r[0].startsWith('http')); }
const HEAD = loadHeaders(), REDIR = loadRedirects(), CACHE = new Map();
function hdrs(p) { const h = {}; for (const [rx, lst] of HEAD) if (rx.test(p)) for (const [k, v] of lst) { const key = k.toLowerCase(); if (key === 'link') { h.link = (h.link ? h.link + ', ' : '') + v; } else h[key] = h[key] ? h[key] + ', ' + v : v; } return h; }
function send(req, res, code, body, ctype, p, extra) {
  const h = Object.assign(hdrs(p), extra || {}); h['content-type'] = ctype;
  const ae = req.headers['accept-encoding'] || '';
  // a file stored compressed (its _headers block says Content-Encoding: the deploy build's Brotli 11), as Cloudflare
  // serves it: as it is to a client that accepts that encoding, else decoded first (and then compressed as any other)
  if (h['content-encoding'] && body.length) {
    if (new RegExp('\\b' + h['content-encoding'] + '\\b').test(ae)) { h['content-length'] = body.length; res.writeHead(code, h); res.end(req.method === 'HEAD' ? undefined : body); console.log(JSON.stringify({ t: Date.now(), m: req.method, p: req.url, code, len: body.length, enc: h['content-encoding'], stored: true })); return; }
    body = h['content-encoding'] === 'br' ? zlib.brotliDecompressSync(body) : h['content-encoding'] === 'gzip' ? zlib.gunzipSync(body) : body; delete h['content-encoding'];
  }
  if (body.length && /^(text\/|application\/(javascript|json)|image\/svg)/.test(ctype)) {
    const enc = /\bbr\b/.test(ae) ? 'br' : /gzip/.test(ae) ? 'gzip' : null;
    if (enc) { const key = enc + ':' + p + ':' + body.length; let c = CACHE.get(key); if (!c) { c = enc === 'br' ? zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: BRQ, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: body.length } }) : zlib.gzipSync(body, { level: GZL }); CACHE.set(key, c); } body = c; h['content-encoding'] = enc; h.vary = 'Accept-Encoding'; }
  }
  h['content-length'] = body.length; res.writeHead(code, h); res.end(req.method === 'HEAD' ? undefined : body);
  console.log(JSON.stringify({ t: Date.now(), m: req.method, p: req.url, code, len: body.length, enc: h['content-encoding'] || null }));
}
function serveFile(req, res, fsP, p, code) { send(req, res, code || 200, fs.readFileSync(fsP), MIME[path.extname(fsP).toLowerCase()] || 'application/octet-stream', p); }
function notFound(req, res, p) { const nf = path.join(ROOT, '404.html'); if (fs.existsSync(nf)) return serveFile(req, res, nf, p, 404); send(req, res, 404, Buffer.from('not found'), 'text/plain', p); }
http.createServer((req, res) => {
  const raw = req.url.split('?')[0];
  for (const [src, dst, code] of REDIR) { if (patRe(src).test(raw)) return send(req, res, code, Buffer.alloc(0), 'text/plain', raw, { location: dst }); }
  const p = decodeURIComponent(raw), f = path.resolve(path.join(ROOT, p));
  if (!(f === ROOT || f.startsWith(ROOT + path.sep))) return notFound(req, res, raw);
  if (p.endsWith('/index.html')) return send(req, res, 308, Buffer.alloc(0), 'text/plain', raw, { location: p.slice(0, -10) });
  if (p.endsWith('.html') && fs.existsSync(f)) return send(req, res, 308, Buffer.alloc(0), 'text/plain', raw, { location: p.slice(0, -5) });
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) { const idx = path.join(f, 'index.html'); if (fs.existsSync(idx)) { if (!p.endsWith('/')) return send(req, res, 308, Buffer.alloc(0), 'text/plain', raw, { location: p + '/' }); return serveFile(req, res, idx, raw); } return notFound(req, res, raw); }
  if (fs.existsSync(f)) return serveFile(req, res, f, raw);
  if (fs.existsSync(f + '.html')) return serveFile(req, res, f + '.html', raw);
  return notFound(req, res, raw);
}).listen(PORT, '127.0.0.1', () => console.log(JSON.stringify({ listening: PORT, root: ROOT, br: BRQ })));
