'use strict';
// bake-stills.js (tools/gpu): the openings' stills, baked on the 4090 in ONE browser kept open.
//   node tools/gpu/bake-stills.js --url http://127.0.0.1:PORT/ --twin DIR --out stills [--skies dawn,day,...] [--ks 0,1..]
//        [--tiers hi,lo] [--shapes 393x861,...] [--png DIR] [--limit K] [--force] [--soft] [--shard I/N]
// --url serves --twin, a SETTLED TWIN (tools/gpu/twin.js) of the commit's plain build. Each still is that twin's first
// shown frame for one opening (the hour's sky, the opening's index k of N: hour.js turns the harness's entropy k into
// opening k's seed), one window shape (hour.js's bands) and one memory tier, stepped as gstep.js steps (the clock faked
// and frozen in a frame, requestAnimationFrame driven at a fixed interval, fences and parallel compiles reported done,
// the settled twin's hold at 4 s of page time): the canvas's drawing buffer as PNG, then AVIF (Pillow: quality 88,
// 4:4:4, full range, speed 4: sketch A2's settings, byte for byte). Named <sky>-<k>-<tier>-<W>x<H>.avif, the name
// hour.js asks for; the page is checked to have asked for exactly that name (else the bake stops).
// The tiers: hi, the phones the world gives its most memory (an iPhone 390 pt and wider at 3x: 'full', the Apple GPU's
// name) and desktops (the landscape shapes, at 1080 CSS px tall); lo, Android under 8 GB ('lowA', a Mali GPU's name,
// deviceMemory 4), every shape at 393 CSS px on its short side, 3x.
// The cache: each still's key is a sha256 of the world's inputs (every file the twin serves but the stills, by content)
// and the still's own inputs (sky, k, N, tier, shape, the window baked, the encoder's settings); OUT/bake.json keeps
// each still's key and its bytes' sha256 (the build copies a still only when its bytes are these), and a still whose
// key is unchanged and whose file is there is not baked again (--force bakes all). N, the openings per sky, is hour.js's.
// Prints the time per still (the browser's launch apart) and the bytes in all.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawn } = require('child_process');
// (load-perf, 2026-11-26) --soft: on a hosted Linux runner (stills.yml), no GPU: SwiftShader as T1 renders, the gates'
// own flags (.github/ci/harness.mjs SWIFTSHADER) and Playwright found as the gates find it; the 4090's pw.js otherwise
const SOFT = process.argv.includes('--soft');
const PW = SOFT ? null : require('./pw.js');
const A = {};
for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i].replace(/^--/, ''), v = process.argv[i + 1]; if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } }
if (!A.url || !A.twin || !A.out) { console.error('usage: bake-stills.js --url URL --twin DIR --out DIR [--n 16] [--skies ..] [--tiers hi,lo] [--shapes ..]'); process.exit(2); }
const HOURJS = fs.readFileSync(path.join(path.resolve(A.twin), 'hour.js'), 'utf8'), NM = /var N = (\d+),/.exec(HOURJS);
if (!NM) { console.error('bake-stills: no "var N = " in the hour script of the twin (the count of openings)'); process.exit(2); }
const N = +NM[1], OUT = path.resolve(A.out), PNG = path.resolve(A.png || path.join(OUT, '.png'));
const DAYR = { dawn: [5, 8], day: [8, 13], rain: [13, 16], sunset: [16, 19], dusk: [19, 21], night: [21, 29] };   // (hour.js's DAY)
const AT = A.at !== undefined ? +A.at : 0.5, SKYH = {};   // (--at: how far through its time of day each sky is baked; the middle)
for (const k in DAYR) SKYH[k] = DAYR[k][0] + AT * (DAYR[k][1] - DAYR[k][0]);
const SKIES = A.skies ? String(A.skies).split(',') : Object.keys(SKYH);
const TIERS = A.tiers ? String(A.tiers).split(',') : ['hi', 'lo'];
const ALL = ['393x861', '393x817', '393x770', '393x724', '393x676', '393x629', '393x524', '1080x1080', '1350x1080', '1728x1080', '1920x1080', '2268x1080'];
const SHAPES = A.shapes ? String(A.shapes).split(',') : ALL;
const KS = A.ks ? String(A.ks).split(',').map(Number) : Array.from({ length: N }, (_, i) => i);
const ENC = { quality: 88, subsampling: '4:4:4', range: 'full', speed: 4 };
const DT = 68267 / 4096, SETTLE = { t: 4000, extra: 0, quiet: 8, boot: 1 };
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(PNG, { recursive: true });

// the window a still is baked in: [css w, css h, dpr, mobile, deviceMemory, gpu name]
function win(shape, tier) {
  const [w, h] = shape.split('x').map(Number);
  if (tier === 'lo') { const s = 393 / Math.min(w, h); return [Math.round(w * s), Math.round(h * s), 3, true, 4, 'Mali-G57 MC2']; }
  return h > w ? [w, h, 3, true, 8, 'Apple GPU'] : [w, h, 1, false, 8, null];
}
// the world's inputs: every file the twin serves (but the stills), by content
function worldKey(dir) {
  const hs = crypto.createHash('sha256'), walk = (d, rel) => { for (const n of fs.readdirSync(d).sort()) { const p = path.join(d, n), r = rel ? rel + '/' + n : n; if (r === 'assets/still') continue; if (fs.statSync(p).isDirectory()) walk(p, r); else hs.update(r + '\0').update(fs.readFileSync(p)); } };
  walk(dir, ''); return hs.digest('hex');
}
function sha(f) { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); }
const WK = worldKey(path.resolve(A.twin));
const manPath = path.join(OUT, 'bake.json'), MAN = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : {};
const jobs = [];
let NIDX = -1;   // (each still's place in the whole list, cached or not: --shard splits by it)
for (const sky of SKIES) for (const k of KS) for (const tier of TIERS) for (const shape of SHAPES) {
  NIDX++;
  const name = `${sky}-${k}-${tier}-${shape}.avif`, W = win(shape, tier);
  const key = crypto.createHash('sha256').update(JSON.stringify([WK, sky, k, N, tier, shape, W, ENC, SETTLE, SKYH[sky]])).digest('hex');
  const had = MAN[name], hk = had && (typeof had === 'string' ? had : had.key);
  if (!A.force && hk === key && fs.existsSync(path.join(OUT, name))) { if (typeof had === 'string') MAN[name] = { key, sha: sha(path.join(OUT, name)) }; continue; }
  jobs.push({ sky, k, tier, shape, name, key, W, idx: NIDX });
}
// --shard I/N (stills.yml's matrix): every Nth still of the whole list from the I-th, so each shard bakes its share of
// every sky, tier and shape (the stills cost about the same) and the shards' outputs never overlap
if (A.shard) {
  const m = /^(\d+)\/(\d+)$/.exec(String(A.shard));
  if (!m || +m[1] >= +m[2]) { console.error('bake-stills: --shard I/N with 0 <= I < N'); process.exit(2); }
  const I = +m[1], NS = +m[2], all = jobs.splice(0, jobs.length);
  for (let i = 0; i < all.length; i++) if (all[i].idx % NS === I) jobs.push(all[i]);
}
const lim = A.limit ? +A.limit : jobs.length;
jobs.splice(lim);

function init(j) {
  const [, , , , mem, gpu] = j.W, h = SKYH[j.sky], epoch = Date.UTC(2026, 9, 29, 0, 0, 0) + Math.round(h * 3600000);
  return `(() => {
  const EPOCH = ${epoch}, ENT = ${j.k}, GPUNAME = ${JSON.stringify(gpu)};
  window.__SETTLE = ${JSON.stringify(SETTLE)};
  Object.defineProperty(Navigator.prototype, 'deviceMemory', { get: () => ${mem} });
  new MutationObserver((m, ob) => { const l = document.querySelector('link[rel="expect"][blocking="render"]'); if (l) { l.remove(); ob.disconnect(); } }).observe(document, { childList: true, subtree: true });
  let NOW = 0; const Q = []; let QID = 0;
  crypto.getRandomValues = function (a) { for (let i = 0; i < a.length; i++) a[i] = (ENT + i * 0x9e3779b9) >>> 0; return a; };
  const RD = Date;
  function FD(...a) { if (!new.target) return new RD(EPOCH + NOW).toString(); return a.length ? new RD(...a) : new RD(EPOCH + NOW); }
  FD.prototype = RD.prototype; FD.now = () => EPOCH + NOW; FD.parse = RD.parse; FD.UTC = RD.UTC; window.Date = FD;
  const pnow = () => NOW; Performance.prototype.now = pnow; try { performance.now = pnow; } catch (e) {}
  const realRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { Q.push([++QID, cb]); return QID; };
  window.cancelAnimationFrame = (id) => { for (let i = 0; i < Q.length; i++) if (Q[i][0] === id) { Q.splice(i, 1); return; } };
  const G = WebGL2RenderingContext.prototype, gp = G.getParameter, gpp = G.getProgramParameter, gsp = G.getShaderParameter;
  G.getParameter = function (p) { if (GPUNAME && p === 0x9246) return GPUNAME; if (p === 0x9246 || p === 0x1F01) return 'Harness GPU'; return gp.call(this, p); };
  G.clientWaitSync = function () { return 0x911A; };
  const gsy = G.getSyncParameter; G.getSyncParameter = function (s, p) { return p === 0x9114 ? 0x9119 : gsy.call(this, s, p); };
  G.getProgramParameter = function (pr, p) { return p === 0x91B1 ? true : gpp.call(this, pr, p); };
  G.getShaderParameter = function (sh, p) { return p === 0x91B1 ? true : gsp.call(this, sh, p); };
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, o) { if (t === 'webgl2') o = Object.assign({}, o || {}, { preserveDrawingBuffer: true }); return gc.call(this, t, o); };
  window.__B = {
    until: async (maxf, dt) => {
      const c = document.querySelector('canvas.sky');
      for (let f = 0; f < maxf; f++) {
        if (c.classList.contains('on')) return f;
        NOW += dt; const cur = Q.splice(0, Q.length);
        for (const [, cb] of cur) { try { cb(NOW); } catch (e) { console.error('frame: ' + (e && e.stack || e)); } }
        await new Promise((r) => realRAF(() => r()));
      }
      return -1;
    },
    shot: () => { const c = document.querySelector('canvas.sky'), r = document.documentElement;
      return { png: c.toDataURL('image/png'), cw: c.width, ch: c.height, sky: r.getAttribute('data-sky'), seed: r.getAttribute('data-seed') }; }
  };
})();`;
}

// the encode: a python process for each batch of 32 stills, run while the browser draws the next (Pillow's AVIF)
const PY = `import json,sys,os
from PIL import Image
for a, b in json.load(open(sys.argv[1])):
    Image.open(a).convert('RGB').save(b + '.tmp', format='AVIF', quality=${ENC.quality}, subsampling='${ENC.subsampling}', range='${ENC.range}', speed=${ENC.speed})
    os.replace(b + '.tmp', b)`;
let encN = 0;
function encode(batch) {
  const list = path.join(PNG, 'encode-' + (encN++) + '.json');
  fs.writeFileSync(list, JSON.stringify(batch.map((j) => [path.join(PNG, j.name.replace(/\.avif$/, '.png')), path.join(OUT, j.name)])));
  return new Promise((ok, no) => spawn('python', ['-c', PY, list], { stdio: 'inherit' }).on('close', (c) => {
    if (c !== 0) return no(new Error('the encode exited ' + c));
    for (const j of batch) MAN[j.name] = { key: j.key, sha: sha(path.join(OUT, j.name)) };   // (its key, and its bytes' hash: the build copies only stills whose bytes are these)
    const tmp = manPath + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(MAN, null, 1)); fs.renameSync(tmp, manPath); ok();
  }));
}

(async () => {
  if (!jobs.length) { const tmp = manPath + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(MAN, null, 1)); fs.renameSync(tmp, manPath); console.log('bake-stills: nothing to bake (every key unchanged)'); report(); return; }
  const t0 = Date.now();
  const b = SOFT ? await (await import('../../.github/ci/harness.mjs')).launch() : await PW.chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const tL = Date.now(), ctxs = new Map(), times = [], encs = []; let batch = [];
  try {
    for (const j of jobs) {
      const [w, h, dpr, mobile] = j.W, ck = j.W.join(',');
      let ctx = ctxs.get(ck);
      if (!ctx) { ctx = await b.newContext(Object.assign({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, timezoneId: 'UTC' }, mobile ? { isMobile: true, hasTouch: true } : {})); ctxs.set(ck, ctx); }
      const ts = Date.now(), p = await ctx.newPage(), logs = [];
      p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
      p.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) logs.push(m.text().slice(0, 200)); });
      await p.addInitScript(init(j));
      await p.goto(A.url, { waitUntil: 'load', timeout: 600000 });
      const asked = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--still'));   // (before the show: the world clears it then)
      let f = -1, tot = 0;
      while (f < 0 && tot < 6000) { f = await p.evaluate(([m, dt]) => window.__B.until(m, dt), [200, DT]); tot += 200; }
      if (f < 0) throw new Error(j.name + ': never shown in 6000 frames ' + logs.join(' | '));
      const s = await p.evaluate(() => window.__B.shot());
      await p.close();
      if (s.sky !== j.sky || asked.indexOf('/assets/still/' + j.name) < 0) throw new Error(j.name + ': the page asked for ' + asked + ' (sky ' + s.sky + ')');
      fs.writeFileSync(path.join(PNG, j.name.replace(/\.avif$/, '.png')), Buffer.from(s.png.split(',')[1], 'base64'));
      j.ms = Date.now() - ts; times.push(j.ms);
      if (logs.length) console.log(j.name + ': ' + logs.slice(0, 3).join(' | '));
      batch.push(j);
      if (batch.length === 32) { encs.push(encode(batch)); batch = []; }
      if (times.length % 96 === 0) console.log(`bake-stills: ${times.length} of ${jobs.length} drawn, ${((Date.now() - tL) / times.length / 1000).toFixed(2)} s a still`);
    }
  } finally { await b.close(); }
  const tB = Date.now();
  if (batch.length) encs.push(encode(batch));
  await Promise.all(encs);
  const tE = Date.now(), med = times.slice().sort((a, b) => a - b)[times.length >> 1];
  console.log(`bake-stills: ${jobs.length} stills in ${((tE - t0) / 1000).toFixed(1)} s (${((tE - t0) / jobs.length / 1000).toFixed(2)} s a still in all): the launch ${((tL - t0) / 1000).toFixed(1)} s, ` +
    `the frames ${((tB - tL) / 1000).toFixed(1)} s (${((tB - tL) / jobs.length / 1000).toFixed(2)} s a still, median ${(med / 1000).toFixed(2)} s), the last encodes ${((tE - tB) / 1000).toFixed(1)} s after`);
  report();
})().catch((e) => { console.error('bake-stills: ' + (e && e.stack || e)); process.exit(1); });

function report() {
  let n = 0, bytes = 0; const by = {};
  for (const f of fs.readdirSync(OUT).filter((x) => x.endsWith('.avif'))) { const s = fs.statSync(path.join(OUT, f)).size, sh = f.replace(/^.*-(\d+x\d+)\.avif$/, '$1'); n++; bytes += s; (by[sh] = by[sh] || []).push(s); }
  console.log(`bake-stills: ${OUT}: ${n} stills, ${bytes} B in all` + Object.keys(by).sort().map((k) => `\n  ${k.padEnd(10)} ${String(by[k].length).padStart(5)}  largest ${Math.max(...by[k])} B  mean ${Math.round(by[k].reduce((a, b) => a + b, 0) / by[k].length)} B`).join(''));
}
