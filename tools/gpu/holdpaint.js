'use strict';
// holdpaint.js (tools/gpu, first-paint preview): what the FIRST painted frame holds, arm against arm, headless.
//   node tools/gpu/holdpaint.js --out OUT --arm NAME=DIR [--arm NAME=DIR ...] [--runs 7] [--angle d3d11|vulkan]
//        [--cpu 1|4] [--cores N] [--vp 1440x900@1 [--mobile]] [--port 9800] [--shots 2]
// Each run a fresh Chrome profile on the RTX 4090. A CDP screencast runs from before the navigation, so its first
// frame of the page is the page's first paint as composited. Per run: first-contentful-paint, LCP, the world's show
// (canvas.sky on, by a MutationObserver), whether the show came before the first paint (the first paint then holds
// the world: the canvas is shown in the same task that drew it), the long tasks (the hold is the one holding the
// show), and the first screencast frame's time after the navigation. --cores N: navigator.hardwareConcurrency
// reported as N (the page's own class only; ANGLE's compile pool keeps the machine's threads). The first --shots
// runs of each arm save the first painted frame as OUT/NAME_RUN_first.jpg. Writes OUT/holdpaint.json and .md.
const fs = require('fs'), path = require('path'), net = require('net'), { spawn } = require('child_process');
const PW = require('./pw.js');
const A = { arm: [] }; for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i].replace(/^--/, ''), v = process.argv[i + 1]; if (k === 'arm') { A.arm.push(v); i++; } else if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } }
const OUT = path.resolve(A.out || 'holdout'), RUNS = +(A.runs || 7), HERE = __dirname, [W, H, DPR] = (A.vp || '1440x900@1').split(/[x@]/).map(Number), SHOTS = +(A.shots || 2);
delete process.env.GPU_PROFILE_DIR;
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const free = (port) => new Promise((r) => { const s = net.createServer().once('error', () => r(false)).once('listening', () => s.close(() => r(true))).listen(port, '127.0.0.1'); });
async function serve(dir, from) { for (let port = from; port < from + 40; port++) { if (!(await free(port))) continue; const p = spawn(process.execPath, [path.join(HERE, 'cfserve.js'), path.resolve(dir), String(port)], { stdio: 'ignore' }); await sleep(800); return { p, url: 'http://127.0.0.1:' + port + '/', port }; } throw new Error('no free port'); }
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y), n = s.length; return !n ? null : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
async function visit(url, tag, shot) {
  const br = await PW.chromium.launch({ args: ['--use-angle=' + (A.angle || 'd3d11'), '--ignore-gpu-blocklist'] });
  try {
    const ctx = await br.newContext(Object.assign({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, timezoneId: 'UTC' }, A.mobile ? { isMobile: true, hasTouch: true } : {}));
    const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
    if (+A.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: +A.cpu });
    const cores = +A.cores || 0;
    await p.addInitScript((cores) => {
      if (cores) Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => cores, configurable: true });
      window.__lt = []; window.__lcp = null; window.__shown = null;
      try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([+e.startTime.toFixed(1), +e.duration.toFixed(1)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) { /* none */ }
      try { new PerformanceObserver((l) => { const es = l.getEntries(); const e = es[es.length - 1]; window.__lcp = [+e.startTime.toFixed(1), e.element ? e.element.tagName + '.' + e.element.className : '']; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) { /* none */ }
      new MutationObserver(() => { if (window.__shown === null) { const c = document.querySelector('canvas.sky'); if (c && c.classList.contains('on')) window.__shown = performance.now(); } }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
    }, cores);
    await p.goto('about:blank');
    const frames = [];
    cdp.on('Page.screencastFrame', (f) => { frames.push({ t: f.metadata.timestamp, data: frames.length < 3 ? f.data : null }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: 720, everyNthFrame: 1 });
    await sleep(300); const before = frames.length;
    const t0 = Date.now() / 1000;
    await p.goto(url, { waitUntil: 'load', timeout: 120000 });
    await p.waitForFunction(() => performance.getEntriesByName('first-contentful-paint').length, null, { timeout: 60000 });
    await sleep(2500);
    await cdp.send('Page.stopScreencast').catch(() => {});
    const v = await p.evaluate(() => { const fcp = performance.getEntriesByName('first-contentful-paint')[0].startTime, fp = (performance.getEntriesByName('first-paint')[0] || {}).startTime, nav = performance.getEntriesByType('navigation')[0];
      return { fcp: +fcp.toFixed(1), fp: fp == null ? null : +fp.toFixed(1), shown: window.__shown == null ? null : +window.__shown.toFixed(1), lcp: window.__lcp, lt: window.__lt, html: +nav.responseEnd.toFixed(1), dcl: +nav.domContentLoadedEventEnd.toFixed(1), origin: performance.timeOrigin / 1000,
        hold: !!document.querySelector('link[rel="expect"][blocking="render"]') }; });
    // the first screencast frame of the page (after the navigation's start; the blank page's frames come before)
    const pf = frames.slice(before).filter((f) => f.t >= v.origin);
    v.firstShot = pf.length ? +((pf[0].t - v.origin) * 1000).toFixed(1) : null; v.shots = pf.length;
    const fd = frames.slice(before).find((f) => f.t >= v.origin && f.data);
    if (shot && fd) fs.writeFileSync(path.join(OUT, tag + '_first.jpg'), Buffer.from(fd.data, 'base64'));
    v.withWorld = v.shown != null && v.shown <= (v.fp == null ? v.fcp : v.fp);   // (the show before the first paint: the first paint holds the world)
    const lt = v.lt.find((x) => v.shown != null && x[0] <= v.shown && v.shown <= x[0] + x[1]); v.holdTask = lt ? lt[1] : null;
    v.ltSum = +v.lt.reduce((m, x) => m + x[1], 0).toFixed(1); v.ltMax = v.lt.reduce((m, x) => Math.max(m, x[1]), 0);
    delete v.lt; delete v.origin;
    return v;
  } finally { await br.close(); }
}
(async () => {
  const arms = A.arm.map((s) => { const i = s.indexOf('='); return { name: s.slice(0, i), dir: s.slice(i + 1), runs: [] }; });
  let port = +(A.port || 9800); for (const a of arms) { a.srv = await serve(a.dir, port); port = a.srv.port + 1; }
  try {
    for (let r = 0; r < RUNS; r++) for (const a of arms) {
      const v = await visit(a.srv.url, a.name + '_' + (r + 1), r < SHOTS); a.runs.push(v);
      console.log(a.name + ' ' + (r + 1) + ': ' + JSON.stringify(v));
    }
  } finally { for (const a of arms) a.srv.p.kill(); }
  const f0 = (x) => (x == null ? '-' : Math.round(x));
  const md = ['## ' + arms.map((a) => a.name).join(' vs ') + ': ANGLE ' + (A.angle || 'd3d11') + ', CPU ' + (A.cpu || 1) + 'x' + (A.cores ? ', ' + A.cores + ' cores reported' : '') + ', ' + W + 'x' + H + '@' + DPR + ', ' + RUNS + ' runs each (medians)', '',
    '| arm | first paint holds the world | FCP | world shown | first screencast frame | the hold (long task) | LCP | long tasks, sum / max | hold link left |', '|---|---|---:|---:|---:|---:|---:|---:|---|'];
  for (const a of arms) {
    const R = a.runs;
    md.push('| ' + a.name + ' | ' + R.filter((v) => v.withWorld).length + ' of ' + R.length + ' | ' + f0(med(R.map((v) => v.fcp))) + ' | ' + f0(med(R.map((v) => v.shown))) + ' | ' + f0(med(R.map((v) => v.firstShot))) + ' | ' + f0(med(R.map((v) => v.holdTask))) + ' | ' + f0(med(R.map((v) => v.lcp && v.lcp[0]))) + ' | ' + f0(med(R.map((v) => v.ltSum))) + ' / ' + f0(med(R.map((v) => v.ltMax))) + ' | ' + R.filter((v) => v.hold).length + ' of ' + R.length + ' |');
  }
  fs.writeFileSync(path.join(OUT, 'holdpaint.json'), JSON.stringify(arms.map((a) => ({ name: a.name, runs: a.runs })), null, 1)); fs.writeFileSync(path.join(OUT, 'holdpaint.md'), md.join('\n') + '\n');
  console.log(md.join('\n'));
})().catch((e) => { console.error(e.stack || e); process.exit(1); });
