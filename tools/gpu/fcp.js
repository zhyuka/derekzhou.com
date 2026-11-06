'use strict';
// fcp.js (tools/gpu): first paint, arm against arm, under a network or CPU throttle (a report, for finding causes).
//   node tools/gpu/fcp.js --out OUT --arm NAME=DIR [--arm NAME=DIR ...] [--runs 11] [--net cable|none] [--cpu 1|4]
//        [--vp 393x852@3 --mobile] [--port 9750]
// Each run a fresh Chrome profile, headless on the RTX 4090 (ANGLE D3D11), the arms alternated run by run. --net cable:
// 5 Mbps down, 28 ms RTT (CDP Network.emulateNetworkConditions), as fast500's timing arms. --cpu 4: the page's CPU
// slowed 4x (Emulation.setCPUThrottlingRate). Per run: first-contentful-paint, every resource's start and end and bytes
// (which ones finished before the paint), the main thread's long tasks before the paint, the world's show (canvas.sky on).
// Writes OUT/fcp.json and OUT/fcp.md.
const fs = require('fs'), path = require('path'), net = require('net'), { spawn } = require('child_process');
const PW = require('./pw.js');
const A = { arm: [] }; for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i].replace(/^--/, ''), v = process.argv[i + 1]; if (k === 'arm') { A.arm.push(v); i++; } else if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } }
const OUT = path.resolve(A.out || 'fcpout'), RUNS = +(A.runs || 11), HERE = __dirname, [W, H, DPR] = (A.vp || '1440x900@1').split(/[x@]/).map(Number);
delete process.env.GPU_PROFILE_DIR;
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const free = (port) => new Promise((r) => { const s = net.createServer().once('error', () => r(false)).once('listening', () => s.close(() => r(true))).listen(port, '127.0.0.1'); });
async function serve(dir, from) { for (let port = from; port < from + 40; port++) { if (!(await free(port))) continue; const p = spawn(process.execPath, [path.join(HERE, 'cfserve.js'), path.resolve(dir), String(port)], { stdio: 'ignore' }); await sleep(800); return { p, url: 'http://127.0.0.1:' + port + '/' }; } throw new Error('no free port'); }
const med = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
async function visit(url, block) {
  const br = await PW.chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await br.newContext(Object.assign({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, timezoneId: 'UTC' }, A.mobile ? { isMobile: true, hasTouch: true } : {}));
    const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
    if (A.net === 'cable') { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 28, downloadThroughput: 5e6 / 8, uploadThroughput: 1e6 / 8 }); }
    if (+A.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: +A.cpu });
    if (block) { const re = new RegExp(block); await p.route((u) => re.test(u.pathname), (r) => r.abort()); }   // (an arm's blocked requests: the live site 'with no world')
    await p.addInitScript(() => { window.__lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([+e.startTime.toFixed(1), +e.duration.toFixed(1), (e.attribution && e.attribution[0] && e.attribution[0].containerSrc) || '']); }).observe({ type: 'longtask', buffered: true }); } catch (e) { /* none */ }
      window.__shown = null; new MutationObserver(() => { if (window.__shown === null) { const c = document.querySelector('canvas.sky'); if (c && c.classList.contains('on')) window.__shown = performance.now(); } }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true }); });
    await p.goto(url, { waitUntil: 'load', timeout: 120000 });
    await p.waitForFunction(() => performance.getEntriesByName('first-contentful-paint').length, null, { timeout: 60000 });
    await sleep(1500);
    return await p.evaluate(() => { const fcp = performance.getEntriesByName('first-contentful-paint')[0].startTime, nav = performance.getEntriesByType('navigation')[0];
      return { fcp, shown: window.__shown, html: [nav.responseStart, nav.responseEnd], res: performance.getEntriesByType('resource').map((r) => [r.name.replace(/^https?:\/\/[^/]+/, ''), +r.startTime.toFixed(1), +r.responseEnd.toFixed(1), r.transferSize, r.renderBlockingStatus || '']),
        lt: window.__lt.filter((x) => x[0] < fcp) }; });
  } finally { await br.close(); }
}
(async () => {
  const arms = A.arm.map((s) => { const i = s.indexOf('='); return { name: s.slice(0, i), dir: s.slice(i + 1) }; });
  // an arm is NAME=DIR (served here) or NAME=URL, optionally |BLOCK (a regular expression of paths aborted)
  let port = +(A.port || 9750); for (const a of arms) { const k = a.dir.indexOf('|'), d = k < 0 ? a.dir : a.dir.slice(0, k); a.block = k < 0 ? null : a.dir.slice(k + 1); if (/^https?:/.test(d)) a.srv = { url: d, p: { kill() {} } }; else { a.srv = await serve(d, port); port = +a.srv.url.split(':')[2].replace('/', '') + 1; } a.runs = []; }
  try {
    for (let r = 0; r < RUNS; r++) for (const a of arms) { const v = await visit(a.srv.url, a.block); a.runs.push(v); console.log(a.name + ' ' + (r + 1) + ': FCP ' + v.fcp.toFixed(0) + ' ms' + (v.shown ? ', shown ' + v.shown.toFixed(0) : '') + ', ' + v.res.filter((x) => x[2] <= v.fcp).length + ' resources done before it, long tasks before it ' + v.lt.map((x) => x[1]).join('+')); }
  } finally { for (const a of arms) a.srv.p.kill(); }
  const md = ['## first paint: ' + arms.map((a) => a.name).join(' vs ') + ' (' + (A.net || 'none') + ', CPU ' + (A.cpu || 1) + 'x, ' + W + 'x' + H + '@' + DPR + ', ' + RUNS + ' runs each, alternated)', '', '| arm | FCP median [min-max] | world shown median | KB done before FCP (median) | long tasks before FCP (median ms) |', '|---|---|---:|---:|---:|'];
  for (const a of arms) {
    const f = a.runs.map((v) => v.fcp), s = a.runs.map((v) => v.shown).filter((x) => x), kb = a.runs.map((v) => v.res.filter((x) => x[2] <= v.fcp).reduce((m, x) => m + x[3], 0) / 1024), lt = a.runs.map((v) => v.lt.reduce((m, x) => m + x[1], 0));
    md.push('| ' + a.name + ' | ' + med(f).toFixed(0) + ' [' + Math.min(...f).toFixed(0) + '-' + Math.max(...f).toFixed(0) + '] | ' + (s.length ? med(s).toFixed(0) : '-') + ' | ' + med(kb).toFixed(0) + ' | ' + med(lt).toFixed(0) + ' |');
  }
  fs.writeFileSync(path.join(OUT, 'fcp.json'), JSON.stringify(arms.map((a) => ({ name: a.name, runs: a.runs })), null, 1)); fs.writeFileSync(path.join(OUT, 'fcp.md'), md.join('\n') + '\n');
  console.log(md.join('\n'));
})().catch((e) => { console.error(e.stack || e); process.exit(1); });
