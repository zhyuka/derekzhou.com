'use strict';
// t3.js (tools/gpu): the T3 timing report on the RTX 4090, base against head, A B A B ... (a report, not a gate).
//   node tools/gpu/t3.js --base BASE_SITE --head HEAD_SITE --out OUT [--runs 5] [--cases d11,n23] [--port 9700]
// Each visit: a fresh Chrome profile (never a kept one: Chrome's GPU program cache would skip the compiles a first visit
// pays), headless on ANGLE D3D11, the real clock (nothing faked but the hour). It times navigation to the world's first
// shown frame (the canvas gets its class 'on'; a MutationObserver from the first script) and records FCP. Runs
// alternate base and head, RUNS each, per case. Reports each arm's median, min, max and the spread of base's own runs;
// head is flagged SLOWER only when its median is beyond base's slowest run (outside base's own spread), FASTER when below
// base's fastest. The driver's own shader cache (NVIDIA's) is not emptied: these are warm-driver first visits.
// Writes OUT/t3.json and OUT/t3.md (and GITHUB_STEP_SUMMARY).
const fs = require('fs'), path = require('path'), net = require('net'), { spawn } = require('child_process');
const PW = require('./pw.js');
const A = {}; for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i].replace(/^--/, ''), v = process.argv[i + 1]; if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } }
const OUT = path.resolve(A.out || 't3out'), RUNS = +(A.runs || 5), HERE = __dirname;
const CASES = { d11: ['1440x900@1', '2026-10-29T10:30:00Z', false], n23: ['393x852@3', '2026-10-29T23:30:00Z', true], w303: ['1440x900@1', '2026-10-29T06:30:00Z', false], d707: ['393x852@3', '2026-10-29T10:30:00Z', true] };
const CS = String(A.cases || 'd11,n23').split(',');
delete process.env.GPU_PROFILE_DIR;   // (never a kept profile here)
fs.mkdirSync(OUT, { recursive: true });
const free = (port) => new Promise((r) => { const s = net.createServer().once('error', () => r(false)).once('listening', () => s.close(() => r(true))).listen(port, '127.0.0.1'); });
async function serve(dir, from) { for (let port = from; port < from + 40; port++) { if (!(await free(port))) continue; const p = spawn(process.execPath, [path.join(HERE, 'cfserve.js'), path.resolve(dir), String(port)], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 800)); return { p, url: 'http://127.0.0.1:' + port + '/', port }; } throw new Error('no free port'); }
const med = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
async function visit(url, c) {
  const [vp, hour, mob] = CASES[c], [W, H, DPR] = vp.split(/[x@]/).map(Number);
  const br = await PW.chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await br.newContext(Object.assign({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, timezoneId: 'UTC' }, mob ? { isMobile: true, hasTouch: true } : {}));
    const p = await ctx.newPage();
    const ren = await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const d = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(d.UNMASKED_RENDERER_WEBGL); });
    if (!/RTX 4090/.test(ren)) throw new Error('the runner did not get the RTX 4090: ' + ren);
    await p.addInitScript(`(() => { const T = Date.parse(${JSON.stringify(hour)}), t0 = Date.now(), D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [T + (D.now() - t0)])); } static now() { return T + (D.now() - t0); } };
      window.__shown = null; new MutationObserver(() => { if (window.__shown === null) { const c = document.querySelector('canvas.on'); if (c) window.__shown = performance.now(); } }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true }); })();`);
    await p.goto(url, { waitUntil: 'load' });
    await p.waitForFunction(() => window.__shown !== null, null, { timeout: 60000 });
    return await p.evaluate(() => ({ shown: window.__shown, fcp: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || null }));
  } finally { await br.close(); }
}
(async () => {
  const S = { base: await serve(A.base, +(A.port || 9700)) }; S.head = await serve(A.head, S.base.port + 1);
  const R = {};
  try {
    for (const c of CS) {
      R[c] = { base: [], head: [] };
      for (let i = 0; i < RUNS; i++) for (const arm of ['base', 'head']) { const v = await visit(S[arm].url, c); R[c][arm].push(v); console.log(c + ' ' + arm + ' ' + (i + 1) + ': shown ' + v.shown.toFixed(0) + ' ms, FCP ' + (v.fcp || 0).toFixed(0)); }
    }
  } finally { S.base.p.kill(); S.head.p.kill(); }
  const md = ['## T3: timing on the RTX 4090 (a report, not a gate)', '', RUNS + ' runs each, base and head alternated, fresh profiles, warm driver. Shown = navigation to the world\'s first shown frame.', '',
    '| case | base shown median [min-max] | head shown median [min-max] | head | base FCP | head FCP |', '|---|---|---|---|---:|---:|'];
  for (const c of CS) {
    const b = R[c].base.map((x) => x.shown), h = R[c].head.map((x) => x.shown), mb = med(b), mh = med(h);
    const verdict = mh > Math.max(...b) ? 'SLOWER (outside base\'s spread)' : mh < Math.min(...b) ? 'FASTER (outside base\'s spread)' : 'within base\'s spread';
    R[c].summary = { base: mb, head: mh, verdict };
    md.push('| ' + c + ' | ' + mb.toFixed(0) + ' [' + Math.min(...b).toFixed(0) + '-' + Math.max(...b).toFixed(0) + '] | ' + mh.toFixed(0) + ' [' + Math.min(...h).toFixed(0) + '-' + Math.max(...h).toFixed(0) + '] | ' + verdict + ' | ' + med(R[c].base.map((x) => x.fcp || 0)).toFixed(0) + ' | ' + med(R[c].head.map((x) => x.fcp || 0)).toFixed(0) + ' |');
  }
  fs.writeFileSync(path.join(OUT, 't3.json'), JSON.stringify(R, null, 1)); fs.writeFileSync(path.join(OUT, 't3.md'), md.join('\n') + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
  console.log(md.join('\n'));
})().catch((e) => { console.error(e.stack || e); process.exit(1); });
