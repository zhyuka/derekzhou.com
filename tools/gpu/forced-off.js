'use strict';
// forced-off.js (tools/gpu): forced colours that end mid-visit bring the world back (the regression check for a live
// bug, fixed in fast500's deep sweep of 2026-11-05: the page read forced colours from the media query list it listened on, and
// in Chromium that read takes up the change, so the list's change event never fired once the ink birds' forced loop
// read it every frame: when a contrast theme was turned off, the page kept the system's colours, the world never came
// back). The kit's stepped scenarios could not see it: its fake requestAnimationFrame ran no frame while the change was
// taken up. This runs the real clock.
//   node tools/gpu/forced-off.js --site SITE --out OUT [--cases load1440,load393,mid1440,mid393] [--bound 8]
//        [--wait 20] [--retry 1] [--port 9640] [--label TEXT]
// 1. Serves SITE as Cloudflare Pages serves it (cfserve.js), each case in a fresh headless Chrome on the GPU (pw.js:
//    ANGLE D3D11, the RTX 4090 required), the page's own clock and entropy (nothing of the page faked but the canvas's
//    preserveDrawingBuffer, so the canvas can be read back: drawImage into a 2D canvas, every 4th pixel each way).
// 2. Cases, at 1440x900 and 393x852@3 (a phone: mobile, touch):
//    load  forced colours on from the load (the context's forcedColors 'active'); once the canvas shows (the ink
//          birds' forced loop has drawn: canvas.sky on, every read pixel on the line between the system's Canvas and
//          CanvasText, the canvas's computed background and colour), 1 s more, then forced colours end
//    mid   no forced colours at load; once the world shows (canvas.sky on, its pixels of many colours), forced colours
//          begin; once the canvas is on the system's colours, 2 s more, then they end
// 3. After they end the canvas is read every 100 ms: the world is BACK at the first read where canvas.sky is shown,
//    at least half the read pixels lie off that forced line (the world's own colours, not the system's), and the
//    pixels differ from the read before (the world drawing, not a frame left standing); and then the words are in the
//    page's own ink again (.stack's computed colour is not the forced CanvasText). A case PASSES when the world is
//    back within --bound s of forced colours ending (and no page error); it is watched --wait s in all, so a build
//    where it never comes back is measured as such. A case that fails is run again in a fresh browser, up to --retry
//    times (as t2.js visits again a visit that never shows: a GPU other work shares gives its frames late; quiet,
//    the world is back in 0.2-0.7 s, shared 1.1-1.3 s), and passes only if that run does; every run is recorded.
//    The bug this guards is the world never back at all; the bound keeps a slow return from passing for long.
// Writes OUT/forced-off.json and OUT/summary.md (and the job summary under GitHub). Exit 1 unless every case passes,
// or when the renderer is not the RTX 4090.
const fs = require('fs'), path = require('path'), net = require('net'), { spawn } = require('child_process');
const A = {}; for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i].replace(/^--/, ''), v = process.argv[i + 1]; if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } }
const HERE = __dirname, OUT = path.resolve(A.out || 'forcedout'), BOUND = +(A.bound || 8), WAIT = +(A.wait || 20), RETRY = A.retry === undefined ? 1 : +A.retry, LABEL = A.label ? ' (' + A.label + ')' : '';
const CASES = { load1440: ['load', 1440, 900, 1, false], load393: ['load', 393, 852, 3, true], mid1440: ['mid', 1440, 900, 1, false], mid393: ['mid', 393, 852, 3, true] };
const CS = String(A.cases || 'load1440,load393,mid1440,mid393').split(',');
if (!A.site || CS.some((c) => !CASES[c])) { console.error('usage: forced-off.js --site SITE --out OUT [--cases ' + Object.keys(CASES).join(',') + '] [--bound S] [--wait S] [--retry N] [--port P] [--label TEXT]'); process.exit(2); }
const PW = require(path.join(HERE, 'pw.js'));
fs.mkdirSync(OUT, { recursive: true });
const log = (s) => { console.log(s); fs.appendFileSync(path.join(OUT, 'forced-off.log'), s + '\n'); };
const free = (port) => new Promise((r) => { const s = net.createServer().once('error', () => r(false)).once('listening', () => s.close(() => r(true))).listen(port, '127.0.0.1'); });
async function serve(dir, from) {
  for (let port = from; port < from + 40; port++) {
    if (!(await free(port))) continue;
    const lf = fs.openSync(path.join(OUT, 'srv_' + port + '.log'), 'w');
    const p = spawn(process.execPath, [path.join(HERE, 'cfserve.js'), path.resolve(dir), String(port)], { stdio: ['ignore', lf, lf] });
    await new Promise((r) => setTimeout(r, 800));
    return { p, url: 'http://127.0.0.1:' + port + '/' };
  }
  throw new Error('no free port from ' + from);
}
// (the canvas readable: its drawing buffer kept after it is shown)
const PDB = `(() => { const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, o) { if (t === 'webgl2') o = Object.assign({}, o || {}, { preserveDrawingBuffer: true }); return gc.call(this, t, o); }; })();`;
// one read of the canvas: shown or not, the forced line (Canvas, CanvasText: the canvas's computed background and
// colour, or the ones given), the share of read pixels off it, how many of them carry ink, a hash, and the words' ink
function read(page, line) {
  return page.evaluate(async (line) => {
    const c = document.querySelector('canvas.sky'); if (!c) return { none: true };
    const cs = getComputedStyle(c), rgb = (s) => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(s || ''); return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0]; };
    const K = line ? line[0] : rgb(cs.color), P = line ? line[1] : rgb(cs.backgroundColor);
    const st = document.querySelector('.stack'), r = { on: c.classList.contains('on'), disp: cs.display, vis: cs.visibility, w: c.width, h: c.height, ink: K, paper: P, sysInk: rgb(cs.color), sysPaper: rgb(cs.backgroundColor), words: st ? getComputedStyle(st).color : null, n: 0, off: 0, inkPx: 0, colours: 0, hash: 0 };
    if (!c.width || !c.height) return r;
    const oc = new OffscreenCanvas(c.width, c.height), x = oc.getContext('2d'); x.drawImage(c, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data, W = c.width;
    const D = [K[0] - P[0], K[1] - P[1], K[2] - P[2]], ch = D.map((v) => Math.abs(v) > 24), nc = ch.filter(Boolean).length, seen = new Set();
    let h = 2166136261;
    for (let yy = 0; yy < c.height; yy += 4) for (let xx = 0; xx < W; xx += 4) {
      const i = (yy * W + xx) * 4; r.n++;
      let a = 0; if (nc) for (let k = 0; k < 3; k++) if (ch[k]) a += (d[i + k] - P[k]) / D[k] / nc;
      const ok = a > -0.03 && a < 1.03 && [0, 1, 2].every((k) => Math.abs(d[i + k] - (P[k] + a * D[k])) <= 3);
      if (!ok) r.off++; else if (a > 0.5) r.inkPx++;
      seen.add((d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3));
      h = Math.imul(h ^ d[i], 16777619) ^ d[i + 1]; h = Math.imul(h, 16777619) ^ d[i + 2];
    }
    r.colours = seen.size; r.hash = h >>> 0;
    return r;
  }, line || null);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function runCase(name, url) {
  const [mode, w, h, dpr, mobile] = CASES[name], R = { case: name, mode, vp: w + 'x' + h + '@' + dpr, steps: [], errors: [], pass: false };
  const t0 = Date.now(), at = () => +((Date.now() - t0) / 1000).toFixed(2);
  const b = await PW.chromium.launch({ args: [] });
  try {
    const ctx = await b.newContext(Object.assign({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile }, mode === 'load' ? { forcedColors: 'active' } : {}));
    await ctx.addInitScript(PDB);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => R.errors.push('page error: ' + String(e && e.message || e).slice(0, 300)));
    page.on('console', (m) => { if (m.type() === 'error' || /Content Security Policy|Refused to/i.test(m.text())) R.errors.push('console ' + m.type() + ': ' + m.text().slice(0, 300)); });
    R.renderer = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'), e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'none'; }).catch(() => 'unknown');
    await page.goto(url, { waitUntil: 'load' });
    if (mode === 'mid') {   // the world first, in its own colours
      let q = null; const s0 = Date.now();
      while (Date.now() - s0 < 30000) { await sleep(200); q = await read(page); if (q.on && q.disp !== 'none' && q.colours > 40) break; }
      R.steps.push({ at: at(), what: 'the world shown', ok: !!(q && q.on && q.colours > 40), colours: q && q.colours });
      if (!(q && q.on && q.colours > 40)) { R.why = 'the world never showed before forced colours'; return R; }
      await sleep(1000);
      await page.emulateMedia({ forcedColors: 'active' });
      R.steps.push({ at: at(), what: 'forced colours on' });
    }
    // the ink birds alone on the system's colours (the forced loop drawing)
    let q = null; const s1 = Date.now(), lim = mode === 'load' ? 30000 : 10000;
    while (Date.now() - s1 < lim) { await sleep(150); q = await read(page); if (q.on && q.disp !== 'none' && q.n && q.off === 0) break; }
    const forcedOk = !!(q && q.on && q.disp !== 'none' && q.n && q.off === 0);
    R.steps.push({ at: at(), what: 'the canvas on the system\'s colours (the forced loop drawing)', ok: forcedOk, ink: q && q.sysInk, paper: q && q.sysPaper, inkPx: q && q.inkPx, n: q && q.n });
    if (!forcedOk) { R.why = 'forced colours never reached the canvas (' + JSON.stringify(q && [q.on, q.disp, q.off, q.n]) + '): the case cannot judge'; return R; }
    await sleep(mode === 'load' ? 1000 : 2000);
    const line = [q.sysInk, q.paper], forcedInk = q.words;
    await page.emulateMedia({ forcedColors: 'none' });
    const tOff = Date.now(); R.steps.push({ at: at(), what: 'forced colours off' });
    let prev = null, back = -1, last = null;
    while (Date.now() - tOff < WAIT * 1000) {
      await sleep(100); const r = await read(page, line); last = r;
      if (r.on && r.disp !== 'none' && r.vis !== 'hidden' && r.n && r.off >= 0.5 * r.n && prev && prev.hash !== r.hash) { back = (Date.now() - tOff) / 1000; break; }
      prev = r;
    }
    R.back = back >= 0 ? +back.toFixed(2) : null;
    R.last = last && { on: last.on, disp: last.disp, offShare: last.n ? +(last.off / last.n).toFixed(3) : null, colours: last.colours, words: last.words };
    R.wordsForced = forcedInk; R.wordsAfter = last && last.words;
    const inkBack = !!(last && last.words && last.words !== forcedInk);
    R.steps.push({ at: at(), what: back >= 0 ? 'the world back, ' + R.back + ' s after forced colours ended' : 'the world not back ' + WAIT + ' s after forced colours ended', words: last && last.words });
    R.pass = back >= 0 && back <= BOUND && inkBack && !R.errors.length;
    R.why = R.pass ? 'back in ' + R.back + ' s (bound ' + BOUND + ' s)' : back < 0 ? 'the world never came back (' + WAIT + ' s watched; canvas ' + JSON.stringify(R.last) + ')' : back > BOUND ? 'back only after ' + R.back + ' s (bound ' + BOUND + ' s)' : !inkBack ? 'the words not back in the page\'s own ink (' + R.wordsAfter + ')' : 'page errors: ' + R.errors.slice(0, 3).join(' | ');
    return R;
  } finally { await b.close(); R.seconds = at(); }
}
(async () => {
  const S = await serve(A.site, +(A.port || 9640)), res = [];
  try {
    const run = async (c) => { try { return await runCase(c, S.url); } catch (e) { return { case: c, pass: false, why: 'the case failed to run: ' + String(e && e.message || e).slice(0, 300) }; } };
    for (const c of CS) {
      let r = await run(c); const tries = [r];
      for (let k = 0; k < RETRY && !r.pass; k++) { log('RETRY ' + c + ': ' + r.why); r = await run(c); tries.push(r); }   // (a fresh browser: the case passes only if this run does)
      if (tries.length > 1) r.tries = tries.map((x) => ({ pass: !!x.pass, back: x.back === undefined ? null : x.back, why: x.why }));
      res.push(r); log((r.pass ? 'PASS ' : 'FAIL ') + c + ': ' + r.why + (tries.length > 1 ? ' (run ' + tries.length + ' of ' + (RETRY + 1) + ')' : ''));
    }
  } finally { S.p.kill(); }
  const gpuOk = res.every((r) => !r.renderer || /RTX 4090/.test(r.renderer)), ok = res.every((r) => r.pass) && gpuOk;
  fs.writeFileSync(path.join(OUT, 'forced-off.json'), JSON.stringify({ site: path.resolve(A.site), label: A.label || null, bound: BOUND, wait: WAIT, retry: RETRY, ok, gpuOk, cases: res }, null, 1));
  const md = ['## Forced colours off mid-visit: the world back (RTX 4090, D3D11, the real clock)' + LABEL, '', '| case | result | back after | why |', '|---|---|---:|---|']
    .concat(res.map((r) => '| ' + r.case + ' | ' + (r.pass ? 'pass' : 'FAIL') + ' | ' + (r.back == null ? '-' : r.back + ' s') + ' | ' + r.why + (r.tries ? ' (run ' + r.tries.length + '; before: ' + r.tries.slice(0, -1).map((x) => x.why).join('; ') + ')' : '') + ' |'))
    .concat(['', '- bound: ' + BOUND + ' s; watched ' + WAIT + ' s; a failed case run again up to ' + RETRY + ' time(s); renderer: ' + (res.find((r) => r.renderer) || {}).renderer + (gpuOk ? '' : ' (NOT the RTX 4090)')]);
  fs.writeFileSync(path.join(OUT, 'summary.md'), md.join('\n') + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
  log(ok ? 'forced-off: PASS (' + res.length + ' cases)' : 'forced-off: FAIL');
  process.exitCode = ok ? 0 : 1;
})().catch((e) => { console.error(e.stack || e); process.exit(1); });
