'use strict';
// stall.js (tools/gpu): T2's stall visits, the fast500 kit's first-draw guard (GUARD.md) on base and head.
//   node tools/gpu/stall.js --base BASE --head HEAD --out OUT [--secs 30] [--par 3] [--known FILE] [--port 9640]
// BASE / HEAD: the plain builds, the bytes visitors get (served.sh's OUT/base, OUT/head). Each visit:
// a fresh Chrome profile (Chrome's shader cache cold), headless on the RTX 4090 through ANGLE D3D11, the REAL clock (only
// the hour and the visit's entropy fixed), glwatch.js put on the page before its scripts (WebGL wrapped in the harness: no
// dev build, no change to the site), the whole boot and SECS s after the show with three drags that turn the view (a
// mouse on the desktop, touch on the phone). glwatch times the first use of every pipeline key (program, output layout
// with formats, input layout, primitive class) to a getError after the draw: a variant ANGLE compiles inside a draw
// shows as that key's time.
// 12 visits, PAR at once: cases d11 (1440x900 day), n23 (393x852 night, a phone), d11late (d11 with the ink birds'
// script answered 4.5 s late: they register and draw after the show), each twice on head and twice on base.
// STALL: a key over 30 ms in BOTH head visits of a case, not over 30 ms in either base visit, and not in the known list
// (known keys fail over their maxMs). Running visits side by side slows them alike, so head is judged against base under
// the same load. Also FAIL on head: the world never shown (its WebGL trail kept), a page error, a drag that did not
// steer, no script held in d11late, the wrong renderer. Base's problems are reported, not judged.
// Writes OUT/stall.json, OUT/stall.md (and GITHUB_STEP_SUMMARY), GITHUB_OUTPUT stall_ok=true|false. Exit 0 always but
// on a harness failure (a visit with no result).
const fs = require('fs'), path = require('path'), net = require('net'), { spawn } = require('child_process');
const PW = require('./pw.js'), GLW = require('./glwatch.js');
const A = {}; for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i].replace(/^--/, ''), v = process.argv[i + 1]; if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } }
const HERE = __dirname, OUT = path.resolve(A.out || 'stallout'), SECS = +(A.secs || 30), PAR = +(A.par || 3), TH = 30;
const KNOWN = JSON.parse(fs.readFileSync(A.known || path.join(HERE, 'stall_known.json'), 'utf8')).known.map((k) => Object.assign({}, k, { re: new RegExp(k.key) }));
const CASES = { d11: ['1440x900@1', '2026-10-29T10:30:00Z', 11, false, null], n23: ['393x852@3', '2026-10-29T23:30:00Z', 23, true, null], d11late: ['1440x900@1', '2026-10-29T10:30:00Z', 11, false, 'inkbirds:4500'] };
delete process.env.GPU_PROFILE_DIR;   // (fresh profiles: a kept GPU cache would hide a first-use compile)
fs.mkdirSync(OUT, { recursive: true });
const log = (s) => { console.log(s); fs.appendFileSync(path.join(OUT, 'stall.log'), s + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const free = (port) => new Promise((r) => { const s = net.createServer().once('error', () => r(false)).once('listening', () => s.close(() => r(true))).listen(port, '127.0.0.1'); });
async function serve(dir, from) { for (let port = from; port < from + 40; port++) { if (!(await free(port))) continue; const p = spawn(process.execPath, [path.join(HERE, 'cfserve.js'), path.resolve(dir), String(port)], { stdio: 'ignore' }); await sleep(800); return { p, url: 'http://127.0.0.1:' + port + '/', port }; } throw new Error('no free port'); }

async function visit(url, c) {   // one visit (the kit's gguard run, without its lock and re-time)
  const [vp, hour, seed, MOB, delay] = CASES[c], [W, H, DPR] = vp.split(/[x@]/).map(Number), EPOCH = Date.parse(hour), SEED = seed >>> 0;
  const out = { case: c, problems: [], drags: [] };
  const b = await PW.chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const p0 = await b.newPage();
    out.renderer = await p0.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const d = g && g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'none'; });
    await p0.context().close();
    if (!/RTX 4090/.test(out.renderer) || !/D3D11/.test(out.renderer)) { out.problems.push('the runner did not get the RTX 4090: ' + out.renderer); return out; }
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, isMobile: MOB, hasTouch: MOB, timezoneId: 'UTC' });
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 300)));
    await p.addInitScript(GLW);
    await p.addInitScript(`(() => { const EPOCH = ${EPOCH}, SEED = ${SEED}, RD = Date, T0 = RD.now(), now = () => EPOCH + (RD.now() - T0);
      crypto.getRandomValues = function (a) { for (let i = 0; i < a.length; i++) a[i] = (SEED + i * 0x9e3779b9) >>> 0; return a; };
      function FD(...a) { if (!new.target) return new RD(now()).toString(); return a.length ? new RD(...a) : new RD(now()); }
      FD.prototype = RD.prototype; FD.now = now; FD.parse = RD.parse; FD.UTC = RD.UTC; window.Date = FD; })();`);
    if (delay) {
      const [stem, ms] = delay.split(':'); out.delay = { stem, ms: +ms, held: [] };
      await p.route((u) => u.pathname.replace(/^.*\//, '').split('.')[0] === stem && /\.js$/.test(u.pathname), async (r) => { out.delay.held.push(r.request().url().replace(/^https?:\/\/[^/]+/, '')); await sleep(+ms); await r.continue(); });
    }
    const t0 = Date.now();
    await p.goto(url, { waitUntil: 'load', timeout: 120000 });
    let shown = -1;
    while (Date.now() - t0 < 120000) { if (await p.evaluate(() => { const c = document.querySelector('canvas.sky'); return !!c && c.classList.contains('on'); })) { shown = await p.evaluate(() => Math.round(performance.now())); break; } await sleep(50); }
    out.shownMs = shown;
    if (shown < 0) out.problems.push('the world never showed in 120 s');
    else {
      const cdp = MOB ? await ctx.newCDPSession(p) : null, ts = Date.now();
      for (const [at, x0, y0, x1, y1] of [[6, 0.25, 0.5, 0.85, 0.55], [14, 0.8, 0.45, 0.15, 0.62], [22, 0.5, 0.7, 0.62, 0.3]]) {
        if (at + 2 > SECS) break;
        await sleep(ts + at * 1000 - Date.now());
        const pt = (k) => ({ x: Math.round((x0 + (x1 - x0) * k / 40) * W), y: Math.round((y0 + (y1 - y0) * k / 40) * H) });
        if (MOB) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(0)] }); for (let k = 1; k <= 40; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pt(k)] }); await sleep(25); } }
        else { await p.mouse.move(pt(0).x, pt(0).y); await p.mouse.down(); for (let k = 1; k <= 40; k++) { await p.mouse.move(pt(k).x, pt(k).y); await sleep(25); } }
        const steer = await p.evaluate(() => document.documentElement.hasAttribute('data-steer'));
        if (MOB) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await p.mouse.up();
        out.drags.push({ at, steered: steer });
        if (!steer) out.problems.push('the drag at ' + at + ' s did not steer');
      }
      await sleep(ts + SECS * 1000 - Date.now());
    }
    const R = await p.evaluate(() => (window.__glw ? window.__glw() : null));
    if (!R) out.problems.push('no WebGL watch (glwatch.js)');
    else { out.keys = R.keys; out.links = R.links; out.frames = R.frames; out.lost = R.lost; if (shown < 0) out.trail = R.trail; if (R.lost) out.problems.push('the WebGL context was lost ' + R.lost + ' times'); }
    if (out.delay && !out.delay.held.length) out.problems.push('the late case held no script named ' + out.delay.stem);
    out.pageErrors = errs; if (errs.length) out.problems.push(errs.length + ' page errors: ' + errs[0]);
    return out;
  } finally { await b.close(); }
}
async function pool(jobs, n) { const res = new Array(jobs.length); let next = 0; await Promise.all(Array.from({ length: Math.min(n, jobs.length) }, async () => { while (next < jobs.length) { const i = next++; res[i] = await jobs[i](); } })); return res; }
const bound = (key) => { const k = KNOWN.find((x) => x.re.test(key)); return k ? (k.maxMs || Infinity) : TH; };
const over = (V) => new Map((V.keys || []).filter((e) => e[1] > bound(e[0])).map((e) => [e[0], e[1]]));
// A key names its program by link order and its sources' hashes (glwatch: p3:<vs>/<fs>|...). Base and head are paired by
// the program's place and the rest of the key, not by its sources: a change that only rewrites the text (#65 minified
// every shader) would otherwise leave every head key with no base and call a stall base has too "new".
const pair = (k) => k.replace(/^(p\d+):[0-9a-f]+\/[0-9a-f]+/, '$1');
const paired = (m) => { const o = new Map(); for (const [k, ms] of m) o.set(pair(k), Math.max(ms, o.get(pair(k)) || 0)); return o; };

(async () => {
  const t0 = Date.now(), S = { base: await serve(A.base, +(A.port || 9640)) }; S.head = await serve(A.head, S.base.port + 1);
  let V;
  try {
    const jobs = [];
    for (const c of Object.keys(CASES)) for (const arm of ['head', 'base']) for (const r of [1, 2]) jobs.push({ c, arm, r });
    V = await pool(jobs.map((j) => async () => { const v = await visit(S[j.arm].url, j.c).catch((e) => ({ case: j.c, problems: ['visit failed: ' + String(e.message || e).slice(0, 300)] })); Object.assign(v, j); log('visit ' + j.c + ' ' + j.arm + ' ' + j.r + ': shown ' + v.shownMs + ' ms, ' + (v.keys || []).length + ' keys, over 30 ms: ' + [...over(v).entries()].map((e) => e[0].slice(0, 60) + ' ' + e[1]).join('; ') + (v.problems.length ? '; PROBLEMS ' + v.problems.join('; ') : '')); return v; }), PAR);
  } finally { S.base.p.kill(); S.head.p.kill(); }
  const fails = [], notes = [], rows = [];
  for (const c of Object.keys(CASES)) {
    const H = V.filter((v) => v.c === c && v.arm === 'head'), B = V.filter((v) => v.c === c && v.arm === 'base');
    for (const v of H) for (const pr of v.problems) fails.push(c + ' head ' + v.r + ': ' + pr);
    for (const v of B) for (const pr of v.problems) notes.push(c + ' base ' + v.r + ': ' + pr);
    const ho = H.map(over), bo = B.map(over).map(paired);
    const keys = [...new Set(ho.flatMap((m) => [...m.keys()]))];
    for (const k of keys) {
      const inAll = ho.every((m) => m.has(k)), inBase = bo.some((m) => m.has(pair(k))), ms = ho.map((m) => m.get(k) || 0);
      rows.push([c, k, ms.map((x) => Math.round(x)).join(' / '), bo.map((m) => Math.round(m.get(pair(k)) || 0)).join(' / '), inAll && !inBase ? 'STALL' : inAll ? 'also in base' : 'once (not repeated)']);
      if (inAll && !inBase) fails.push(c + ': ' + k + ' took ' + ms.map((x) => Math.round(x)).join(' and ') + ' ms on its first use in both head visits (base: under ' + TH + ' ms)');
    }
  }
  const ok = !fails.length, secs = Math.round((Date.now() - t0) / 1000);
  const md = ['## T2 stall visits (first use of every pipeline key, real clock, fresh profiles)', '', '12 visits: d11, n23, d11late x head 2 + base 2. A stall is a key over ' + TH + ' ms in both head visits and in neither base visit.', '',
    rows.length ? '| case | key | head ms | base ms | verdict |\n|---|---|---|---|---|\n' + rows.map((r) => '| ' + r.map((x) => String(x).replace(/\|/g, '\\|')).join(' | ') + ' |').join('\n') : 'No key over ' + TH + ' ms in any head visit.', '',
    '- stall_ok: **' + ok + '**', fails.length ? '- failures: ' + fails.join('; ') : '', notes.length ? '- base (not judged): ' + notes.join('; ') : '', '- ' + secs + ' s'].filter(Boolean);
  fs.writeFileSync(path.join(OUT, 'stall.json'), JSON.stringify({ ok, fails, notes, rows, visits: V.map((v) => ({ c: v.c, arm: v.arm, r: v.r, shownMs: v.shownMs, renderer: v.renderer, problems: v.problems, keys: v.keys })) }, null, 1));
  fs.writeFileSync(path.join(OUT, 'stall.md'), md.join('\n') + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'stall_ok=' + ok + '\n');
  log(md.join('\n'));
  process.exitCode = V.some((v) => v.problems.some((p) => /^visit failed/.test(p))) ? 1 : 0;
})().catch((e) => { console.error(e.stack || e); process.exit(1); });
