// loadperf.mjs: how fast the page loads, measured in headless Chromium (the load-perf lane's measure, 2026-11-07).
//   node tools/loadperf.mjs [DIR|URL] [--profiles desktop,mobile,slow4g] [--runs 5] [--cold-only] [--br Q] [--net socket] [--json OUT] [--md OUT]
// DIR (default dist): a build (node tools/build.mjs dist), served on 127.0.0.1 as Cloudflare Pages serves it
// (tools/gpu/cfserve.js: _headers, the stored Brotli passed through; --br Q: what it compresses itself at quality Q, 11
// for a plain build to be sent as the deploy build stores it) with a 103 Early Hints answer made from the
// root's Link headers, as Cloudflare sends one. URL: a deployed site, measured as it is.
// Profiles: desktop (no throttling); mobile (Lighthouse's: 150 ms RTT, 1.6 Mbps down, 750 kbps up, CPU 4x);
// slow4g (Chrome DevTools' Slow 4G: 562.5 ms, 1.44 Mbps, 675 kbps, CPU 1x). Cold: a fresh profile (no cache, no
// connection); warm: the same page loaded again in the same profile (the HTML revalidated, the rest from cache).
// Per run: the first contentful paint (the words and the lettered name paint in one frame: the head's
// rel=expect hold), whether both fonts were in before it (font-display: optional: else the fallback stays),
// the world shown (the canvas's class "on", seen by a MutationObserver this harness adds, not the page),
// (a software GL, as headless Chromium has, makes the world stand down: 520-start.js, so 'shown' is n/a there and
// the world's scripts in, the last of the world's and the kits' responses, stands for it),
// load, and every resource's transfer and decoded bytes and timing. Medians over the runs.
// Playwright: PW_CORE names a playwright-core folder, else `playwright` resolves; CHROME_PATH a Chrome binary.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import net from 'node:net'; import { spawn } from 'node:child_process';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; }, has = (f) => argv.includes(f);
const target = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'dist';
const RUNS = +val('--runs', 5);
// The two phone profiles load as a phone (an Android Chrome's user agent): hour.js takes the first-paint hold out for
// every Android, as on a real phone, whatever the measuring machine's cores and memory (a runner with more than 4 cores
// and 8 GB kept the hold, and its first paint waited for the world's scripts: 1,580 ms, 2026-11-07).
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
export const PROFILES = {
  desktop: { net: null, cpu: 1, view: { width: 1440, height: 900 }, mobile: false },
  mobile: { net: { latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 }, cpu: 4, view: { width: 412, height: 823 }, mobile: true, ua: PHONE_UA },
  slow4g: { net: { latency: 562.5, downloadThroughput: 1.6e6 / 8 * 0.9, uploadThroughput: 750e3 / 8 * 0.9 }, cpu: 1, view: { width: 412, height: 823 }, mobile: true, ua: PHONE_UA },
};
const profiles = val('--profiles', 'desktop,mobile,slow4g').split(',');
const med = (a) => { const s = a.filter((x) => x != null && isFinite(x)).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// a local build served as Cloudflare serves it, with the 103 it sends: cfserve.js behind a small front that answers
// the document's request with 103 + its Link headers first, then passes the request through
export async function serveBuild(dir, brq) {
  const port = 18000 + Math.floor(Math.random() * 2000);
  const cf = spawn(process.execPath, [path.join(ROOT, 'tools/gpu/cfserve.js'), dir, String(port)].concat(brq ? ['--br', String(brq)] : []), { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((res, rej) => { cf.stdout.once('data', res); cf.once('exit', () => rej(new Error('cfserve exited'))); });
  cf.stdout.resume();
  const front = http.createServer((req, res) => {
    const up = http.request({ host: '127.0.0.1', port, path: req.url, method: req.method, headers: req.headers }, (u) => {
      res.writeHead(u.statusCode, u.headers); u.pipe(res);
    });
    // (a request still open when the run ends meets cfserve gone: ECONNRESET, unheard, threw and took the whole check
    // down with it under a busy machine's parallel checks; that one response is dropped instead)
    up.on('error', () => res.destroy()); req.on('error', () => up.destroy());
    // the 103: only the root document carries Link headers (site/_headers), so ask for them on any navigation
    if (req.method === 'GET' && (req.headers.accept || '').includes('text/html')) {
      const h = http.request({ host: '127.0.0.1', port, path: req.url, method: 'HEAD', headers: req.headers }, (hr) => {
        hr.resume(); if (hr.headers.link) res.writeEarlyHints({ link: hr.headers.link.split(/,\s*(?=<)/) });
        req.pipe(up);
      }); h.on('error', () => { up.destroy(); res.destroy(); }); h.end();
    } else req.pipe(up);
  });
  const fport = port + 1; await new Promise((r) => front.listen(fport, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${fport}/`, close: () => { front.close(); cf.kill(); } };
}

// --net socket: the link throttled at the socket, not per request (CDP's emulation slows each request on its own and
// shares the bandwidth evenly between them, so the server's priorities never show and the largest file always ends
// last). A local CONNECT proxy in front of Chrome: every tunnel's bytes pass one shared downlink and one uplink, each
// paced at its rate in 1,400-byte packets, delivered RTT/2 after they leave, behind a bottleneck buffer of about one
// bandwidth-delay product (a source that fills it is paused: TCP's backpressure reaches the server, so a server that
// schedules by priority is seen doing so). Chained to HTTPS_PROXY where one is set (this container's egress proxy:
// it re-terminates TLS, so what is measured through it is its scheduling, not Cloudflare's); direct elsewhere. A local
// build (http://) works too: its requests pass the same paced link, so a branch is A/B'd with no deploy.
export async function throttleProxy() {
  const L = { rtt: 0, down: Infinity, up: Infinity };
  const dir = () => ({ free: 0, queued: 0, waiting: [] });
  let D = dir(), U = dir();
  const reset = (p) => { L.rtt = p.latency; L.down = p.downloadThroughput; L.up = p.uploadThroughput; D = dir(); U = dir(); };
  const BUF = () => Math.max(16384, L.down * L.rtt / 1000);
  function send(d, rate, src, dst, buf) {
    for (let i = 0; i < buf.length; i += 1400) {
      const pkt = buf.subarray(i, i + 1400), now = performance.now();
      d.free = Math.max(now, d.free) + (rate === Infinity ? 0 : pkt.length / rate * 1000); d.queued += pkt.length;
      const leave = d.free, at = leave + L.rtt / 2;
      setTimeout(() => { d.queued -= pkt.length; if (d.queued < BUF() / 2) for (const s of d.waiting.splice(0)) s.resume(); }, Math.max(0, leave - now));
      setTimeout(() => { if (!dst.destroyed) dst.write(pkt); }, Math.max(0, at - now));
    }
    if (d.queued > BUF()) { src.pause(); d.waiting.push(src); }
  }
  const up = process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
  // a plain http:// request (a local build: Chrome asks the proxy for it with the whole URL, no tunnel): sent on after
  // RTT/2, and its answer (a 103 first, then the headers, then the body in packets) through the same shared, paced
  // downlink as the tunnels' bytes
  const srv = http.createServer((q, r) => {
    let u; try { u = new URL(q.url); } catch (e) { r.writeHead(400); r.end(); return; }
    if (u.protocol !== 'http:') { r.writeHead(405); r.end(); return; }
    const d0 = D, later = (f) => setTimeout(f, L.rtt / 2);
    later(() => {
      const up = http.request({ host: u.hostname, port: u.port || 80, path: u.pathname + u.search, method: q.method, headers: q.headers }, (a) => {
        later(() => { if (!r.headersSent) r.writeHead(a.statusCode, a.headers); });
        a.on('data', (b) => send(d0, L.down, a, r, b));
        a.on('end', () => { const at = Math.max(performance.now(), d0.free) + L.rtt / 2 + 1; setTimeout(() => r.end(), at - performance.now()); });
      });
      up.on('information', (i) => { if (i.statusCode === 103 && i.headers.link) later(() => r.writeEarlyHints({ link: [].concat(i.headers.link).join(', ').split(/,\s*(?=<)/) })); });
      up.on('error', () => { if (!r.headersSent) r.writeHead(502); r.end(); });
      q.pipe(up);
    });
  });
  const open = new Set();
  srv.on('connect', (req, client, head) => {
    open.add(client); client.on('close', () => open.delete(client));
    const [host, port] = req.url.split(':');
    const go = (sock) => {
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      const d0 = D, u0 = U;
      if (head && head.length) send(u0, L.up, client, sock, head);
      client.on('data', (b) => send(u0, L.up, client, sock, b));
      sock.on('data', (b) => send(d0, L.down, sock, client, b));
      const end = () => { client.destroy(); sock.destroy(); };
      client.on('close', end); sock.on('close', end); client.on('error', end); sock.on('error', end);
    };
    const track = (x) => { open.add(x); x.on('close', () => open.delete(x)); return x; };
    if (!up) { const s = track(net.connect(+port || 443, host, () => go(s))); s.on('error', () => client.destroy()); return; }
    const s = track(net.connect(+up.port || 80, up.hostname, () => s.write(`CONNECT ${host}:${port || 443} HTTP/1.1\r\nHost: ${host}:${port || 443}\r\n\r\n`)));
    let hdr = Buffer.alloc(0);
    const onData = (b) => {
      hdr = Buffer.concat([hdr, b]); const i = hdr.indexOf('\r\n\r\n'); if (i < 0) return;
      s.removeListener('data', onData);
      if (!/^HTTP\/1\.[01] 200/.test(hdr.toString('latin1', 0, 16))) { client.destroy(); s.destroy(); return; }
      go(s); const rest = hdr.subarray(i + 4); if (rest.length) s.emit('data', rest);
    };
    s.on('data', onData); s.on('error', () => client.destroy());
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { server: 'http://127.0.0.1:' + srv.address().port, reset, close: () => { for (const x of open) x.destroy(); srv.close(); } };
}

export async function launch(remote, via) {
  const req = createRequire(import.meta.url);
  let PW, core = true;
  if (process.env.PW_CORE) PW = req(process.env.PW_CORE);
  else { try { PW = req('playwright'); core = false; } catch (e) { PW = req('playwright-core'); } }
  const args = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const proxy = via ? { proxy: { server: via, bypass: '<-loopback>' } } : remote && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {};
  // (as test/shaders.mjs launches: CHROME_PATH's Chrome, else playwright's own Chromium, else the installed Chrome)
  return PW.chromium.launch(Object.assign({ args }, proxy, process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : core ? { channel: 'chrome' } : {}));
}

// the harness's own observer (never the page's): when the canvas first carries "on"; whether the first-paint hold's
// link is still in the head when the body begins (hour.js, in the head, takes it out where there is no hold); the paint entries
const OBSERVE = `(() => { const W = window.__lp = { shown: null, holdAtBody: null };
  new MutationObserver(() => { const c = document.querySelector('canvas.on'); if (c && W.shown == null) W.shown = performance.now();
    if (W.holdAtBody == null && document.body) W.holdAtBody = !!document.querySelector('link[rel="expect"][blocking="render"]'); })
    .observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true }); })();`;

async function one(browser, url, prof, warm, tp) {
  const ctx = await browser.newContext(Object.assign({ viewport: prof.view, isMobile: prof.mobile, hasTouch: prof.mobile, deviceScaleFactor: 1, reducedMotion: 'no-preference' }, prof.ua ? { userAgent: prof.ua } : {}));
  await ctx.addInitScript(OBSERVE);
  if (process.env.LP_BIG) await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => 16 }); Object.defineProperty(Navigator.prototype, 'deviceMemory', { get: () => 8 }); });   // (a test of the measure: a big machine, as the CI runners are)
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  if (prof.net && !tp) await cdp.send('Network.emulateNetworkConditions', Object.assign({ offline: false }, prof.net));
  if (tp) tp.reset(prof.net || { latency: 0, downloadThroughput: Infinity, uploadThroughput: Infinity });
  if (prof.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu });
  const go = async () => {
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.__lp.shown != null, null, { timeout: +(process.env.LP_SHOWN_WAIT || 2500), polling: 100 }).catch(() => {});
    await page.waitForTimeout(300);
    return page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime ?? null;
      const res = performance.getEntriesByType('resource').map((e) => ({ name: new URL(e.name).origin === location.origin ? new URL(e.name).pathname : e.name, type: e.initiatorType, start: e.startTime, first: e.responseStart, end: e.responseEnd, transfer: e.transferSize, encoded: e.encodedBodySize, decoded: e.decodedBodySize, blocking: e.renderBlockingStatus }));
      const fonts = [...document.fonts].map((f) => ({ family: f.family, status: f.status }));
      const worldIn = Math.max(...res.filter((x) => /^\/(world|realm-)/.test(x.name)).map((x) => x.end));
      return { fcp, holdLink: window.__lp.holdAtBody, shown: window.__lp.shown, worldIn: isFinite(worldIn) ? worldIn : null, load: nav.loadEventEnd, dcl: nav.domContentLoadedEventEnd, ttfb: nav.responseStart,
        doc: { transfer: nav.transferSize, encoded: nav.encodedBodySize, decoded: nav.decodedBodySize }, res, fonts };
    });
  };
  let r = await go();
  if (warm) r = await go();
  await ctx.close();
  // the fonts in before the first paint: their response ended before it (else optional keeps the fallback)
  const fontRes = r.res.filter((x) => /\.woff2$/.test(x.name));
  r.fontsBeforePaint = fontRes.length > 0 && fontRes.every((x) => x.end <= r.fcp);
  r.total = { transfer: r.doc.transfer + r.res.reduce((s, x) => s + x.transfer, 0), decoded: r.doc.decoded + r.res.reduce((s, x) => s + x.decoded, 0) };
  return r;
}

export async function measure(url, names, runs, opts = {}) {
  const tp = opts.socket ? await throttleProxy() : null;
  const browser = await launch(/^https:/.test(url), tp && tp.server); const out = {};
  try {
    await one(browser, url, PROFILES.desktop, false, tp);   // a warm-up visit, not counted (the browser's own first start)
    for (const n of names) for (const warm of opts.coldOnly ? [false] : [false, true]) {
      const key = n + (warm ? ' warm' : ' cold'), rs = [];
      for (let i = 0; i < runs; i++) rs.push(await one(browser, url, PROFILES[n], warm, tp));
      const byName = {};
      for (const r of rs) for (const x of r.res) (byName[x.name] = byName[x.name] || []).push(x);
      out[key] = {
        runs: rs.length, fcp: med(rs.map((r) => r.fcp)), shown: med(rs.map((r) => r.shown)), worldIn: med(rs.map((r) => r.worldIn)), load: med(rs.map((r) => r.load)), ttfb: med(rs.map((r) => r.ttfb)),
        fontsBeforePaint: rs.filter((r) => r.fontsBeforePaint).length + '/' + rs.length,
        transfer: med(rs.map((r) => r.total.transfer)), decoded: med(rs.map((r) => r.total.decoded)), doc: rs[0].doc,
        res: Object.entries(byName).map(([name, xs]) => ({ name, type: xs[0].type, blocking: xs[0].blocking, transfer: med(xs.map((x) => x.transfer)), encoded: med(xs.map((x) => x.encoded)), decoded: med(xs.map((x) => x.decoded)), start: med(xs.map((x) => x.start)), first: med(xs.map((x) => x.first)), end: med(xs.map((x) => x.end)) })).sort((a, b) => a.start - b.start),
        fcpAll: rs.map((r) => r.fcp == null ? null : +r.fcp.toFixed(0)),
        holdAll: rs.map((r) => r.holdLink),
      };
    }
  } finally { await browser.close(); if (tp) tp.close(); }
  return out;
}

export function markdown(title, m) {
  const f = (x) => x == null ? '–' : Math.round(x), kb = (x) => x == null ? '–' : (x / 1024).toFixed(1);
  let s = `## ${title}\n\n| profile | first paint (words, name) ms | world's scripts in ms | world shown ms | load ms | TTFB ms | fonts before paint | transfer KB | decoded KB | first paints, each run |\n|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const [k, v] of Object.entries(m)) s += `| ${k} | ${f(v.fcp)} | ${f(v.worldIn)} | ${f(v.shown)} | ${f(v.load)} | ${f(v.ttfb)} | ${v.fontsBeforePaint} | ${kb(v.transfer)} | ${kb(v.decoded)} | ${v.fcpAll.join(', ')} |\n`;
  for (const [k, v] of Object.entries(m)) {
    s += `\n### ${title}, ${k}: every request (medians)\n\n| start ms | end ms | file | type | render-blocking | transfer B | decoded B |\n|---|---|---|---|---|---|---|\n`;
    s += `| 0 | ${f(v.ttfb)} | (the document) | navigation | | ${v.doc.transfer} | ${v.doc.decoded} |\n`;
    for (const x of v.res) s += `| ${f(x.start)} | ${f(x.end)} | ${x.name} | ${x.type} | ${x.blocking || ''} | ${f(x.transfer)} | ${f(x.decoded)} |\n`;
  }
  return s;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  let srv = null, url = target;
  if (!/^https?:/.test(target)) { srv = await serveBuild(path.resolve(target), val('--br')); url = srv.url; }
  try {
    const m = await measure(url, profiles, RUNS, { coldOnly: has('--cold-only'), socket: val('--net') === 'socket' });
    for (const [k, v] of Object.entries(m)) console.log(`${k.padEnd(14)} first paint ${String(Math.round(v.fcp)).padStart(5)} ms  world's scripts ${String(Math.round(v.worldIn)).padStart(5)} ms  shown ${v.shown == null ? '  n/a' : String(Math.round(v.shown)).padStart(5)}  load ${String(Math.round(v.load)).padStart(5)} ms  fonts ${v.fontsBeforePaint}  ${(v.transfer / 1024).toFixed(1)} KB over the wire  (runs: ${v.fcpAll.join(' ')})`);
    if (val('--json')) fs.writeFileSync(val('--json'), JSON.stringify(m, null, 1));
    if (val('--md')) fs.writeFileSync(val('--md'), markdown(/^https?:/.test(target) ? target : 'local build (' + target + ')', m));
  } finally { if (srv) srv.close(); }
  console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
