// paint-trend.mjs: is the head's first paint slower than the base's? (load-perf, 2026-11-25; the gate's paint job)
//   node tools/paint-trend.mjs BASE_DIR HEAD_DIR [--runs 9] [--json OUT]
//   node tools/paint-trend.mjs BASE_DIR HEAD_DIR --runs 3 --samples OUT   (one runner's loads, written, not judged)
//   node tools/paint-trend.mjs --judge S1 S2 S3 [--json OUT]             (the runners' samples pooled and judged)
// (CI lane, 2026-11-25, the hub's gate p90: the paint job's 18 cold loads, about 10 s each, took 231-292 s, the gate's
// pole in 38% of its runs. Now three runners load 3 an arm each, side by side, and a judge pools them. Each runner's
// loads are centred on that runner's own median, both arms together, before they are pooled: a faster or slower runner
// moves base and head alike, so it adds nothing to the noise, and the head's difference from the base is kept. On one
// runner the centring takes one constant off both arms: the medians' difference and the noise are as before.)
// BASE_DIR and HEAD_DIR are two plain builds (the plan job's hand-off: base/ and head/). Each is served as Pages
// would (.github/ci/serve.mjs) and opened in the gates' headless Chromium (SwiftShader, .github/ci/harness.mjs), on
// the real clock, cold (a fresh context each load), base and head taking turns so a busy runner slows both alike.
// Like the gates, the page is told a GPU's name and its fences and parallel compiles report done (else the world
// rightly keeps the still sky on a CPU renderer), and its one entropy read is fixed, so both arms boot the same visit.
// Each load times, from navigation start:
//   - words: the first contentful paint (the name and the words over the hour's still sky);
//   - world: the world's first shown frame (canvas.sky gains "on": the cut from the still sky to the world).
//   - main: the main thread's own work up to that frame (Chromium's TaskDuration, thread ticks).
// Medians over the runs. The noise is measured, not assumed: each arm's loads about its own median (1.4826 x the
// median absolute deviation, pooled over both arms). It fails when either median of the head is slower than the
// base's by more than max(50 ms, 3 x that noise). A byte-identical head can only fail by chance beyond 3 sigma.
// Measured on a 4-core machine (2026-11-25, 7 loads an arm, base against itself): words 80-92 ms, noise 6-18 ms (the
// limit 50 ms); world about 8.3-9.5 s (SwiftShader's boot: the GL is software, on the main thread), noise 94-308 ms
// (the limit 0.3-0.9 s); main the same as world. So a 200 ms stall before the first paint fails on words (hour.js:
// +192 ms against 50), while one in the world's boot moves world and main by +240-300 ms but stays inside their
// software renderer's noise: that limit catches a boot made slower by about half a second or more.
// Exit 1 on a regression (or a load that never showed the world), 0 otherwise.
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../.github/ci/serve.mjs';
import { launch, PERSONAS } from '../.github/ci/harness.mjs';

const argv = process.argv.slice(2), val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const JUDGE = argv.includes('--judge'), pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && argv[i - 1] !== '--judge'));
const [BASE, HEAD] = JUDGE ? [] : pos;
if (JUDGE ? !argv.slice(argv.indexOf('--judge') + 1).some((a) => !a.startsWith('--')) : !BASE || !HEAD) { console.error('usage: node tools/paint-trend.mjs BASE_DIR HEAD_DIR [--runs N] [--json OUT] [--samples OUT] | --judge S1 S2 ... [--json OUT]'); process.exit(2); }
const RUNS = +val('--runs', 9), FLOOR = 50, K = 3, SHOW_MS = 60000;
const VP = { width: 393, height: 852 }, SEED = 44;

// the gates' stubs (harness.mjs INIT), the clock left alone, and the show timed by the page's own clock
const INIT = `(() => {
  const S = ${SEED} >>> 0;
  crypto.getRandomValues = function (a) { const u = new Uint32Array(a.buffer, a.byteOffset, a.byteLength >> 2);
    for (let i = 0; i < u.length; i++) u[i] = (S + i * 0x9e3779b9) >>> 0;
    const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); for (let i = u.length * 4; i < b.length; i++) b[i] = (S >>> (8 * (i & 3))) & 255; return a; };
  const G = WebGL2RenderingContext.prototype, gp = G.getParameter, gpp = G.getProgramParameter, gsp = G.getShaderParameter, gsy = G.getSyncParameter;
  G.getParameter = function (p) { if (p === 0x9246) return ${JSON.stringify(PERSONAS.generic.renderer)}; if (p === 0x9245) return 'Google Inc.'; return gp.call(this, p); };
  G.clientWaitSync = function () { return 0x911A; };
  G.getSyncParameter = function (s, p) { return p === 0x9114 ? 0x9119 : gsy.call(this, s, p); };
  G.getProgramParameter = function (pr, p) { return p === 0x91B1 ? true : gpp.call(this, pr, p); };
  G.getShaderParameter = function (sh, p) { return p === 0x91B1 ? true : gsp.call(this, sh, p); };
  const PAR = { COMPLETION_STATUS_KHR: 0x91B1, maxShaderCompilerThreadsKHR() {} }, ge = G.getExtension, gse = G.getSupportedExtensions;
  G.getExtension = function (n) { return n === 'KHR_parallel_shader_compile' ? PAR : ge.call(this, n); };
  G.getSupportedExtensions = function () { const l = gse.call(this); return l && l.concat(['KHR_parallel_shader_compile']); };
  const T = window.__paint = { world: null };
  new MutationObserver(() => { const c = document.querySelector('canvas.sky');
    if (T.world === null && c && c.classList.contains('on')) T.world = performance.now(); })
    .observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
})();`;

async function load(browser, url) {
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1, isMobile: true, hasTouch: true, timezoneId: 'UTC', locale: 'en-US' });
  try {
    const page = await ctx.newPage();
    await page.addInitScript(INIT);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable', { timeMetric: 'threadTicks' });
    await page.goto(url, { waitUntil: 'load', timeout: SHOW_MS });
    // polled from here: the page's CSP has no unsafe-eval, so Playwright's waitForFunction cannot run in it
    const read = () => page.evaluate(() => {
      const f = performance.getEntriesByName('first-contentful-paint')[0];
      return { words: f ? f.startTime : null, world: window.__paint.world };
    });
    const t0 = Date.now(); let r = await read();
    while ((r.world === null || r.words === null) && Date.now() - t0 < SHOW_MS) { await new Promise((ok) => setTimeout(ok, 25)); r = await read(); }
    // the main thread's own work up to the show (its tasks' duration, the thread's CPU ticks): a stall in the boot
    // adds to it in full, while the wall clock also carries the runner's scheduling and SwiftShader's threads
    const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    r.main = r.world === null ? null : m.TaskDuration * 1000;
    return r;
  } finally { await ctx.close(); }
}

const med = (a) => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const noise = (arms) => 1.4826 * med(arms.flatMap((a) => { const m = med(a); return a.map((x) => Math.abs(x - m)); }));

// the runners' samples, each { runs: { base: [..], head: [..] }, bad: [..] }: centred on their own median (both arms), pooled
export function judge(sets) {
  const out = { runs: sets.reduce((n, x) => n + x.runs.base.length, 0), runners: sets.length, viewport: VP, floor_ms: FLOOR, k: K, metrics: {}, fail: [] };
  for (const m of ['words', 'world', 'main']) {
    const B = [], H = [], rawB = [], rawH = [];
    for (const x of sets) {
      const b = x.runs.base.map((r) => r[m]).filter((v) => v != null), h = x.runs.head.map((r) => r[m]).filter((v) => v != null);
      if (!b.length || !h.length) continue;
      const c = med(b.concat(h)); B.push(...b.map((v) => v - c)); H.push(...h.map((v) => v - c)); rawB.push(...b); rawH.push(...h);
    }
    if (!B.length) continue;
    const n = noise([B, H]), limit = Math.max(FLOOR, K * n), d = med(H) - med(B);
    out.metrics[m] = { base_ms: Math.round(med(rawB)), head_ms: Math.round(med(rawH)), delta_ms: Math.round(d), noise_ms: Math.round(n), limit_ms: Math.round(limit), base: rawB.map(Math.round), head: rawH.map(Math.round) };
    if (d > limit) out.fail.push(`${m}: the head is ${Math.round(d)} ms slower than the base (medians ${Math.round(med(rawH))} and ${Math.round(med(rawB))} ms), over the limit ${Math.round(limit)} ms (max(${FLOOR} ms, ${K} x the noise ${Math.round(n)} ms))`);
  }
  for (const x of sets) out.fail.push(...(x.bad || []));
  return out;
}

let out;
if (JUDGE) { const rest = argv.slice(argv.indexOf('--judge') + 1), end = rest.findIndex((a) => a.startsWith('--'));
  out = judge((end < 0 ? rest : rest.slice(0, end)).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')))); }
else {
const sb = await serve(path.resolve(BASE)), sh = await serve(path.resolve(HEAD)), browser = await launch();
const runs = { base: [], head: [] }, bad = [];
try {
  await load(browser, sb.url); await load(browser, sh.url);   // (a warm-up of each: the browser's own first-load costs)
  for (let i = 0; i < RUNS; i++) for (const [arm, s] of i % 2 ? [['head', sh], ['base', sb]] : [['base', sb], ['head', sh]]) {
    const r = await load(browser, s.url);
    if (r.words == null || r.world == null) bad.push(`${arm} load ${i + 1}: ${r.words == null ? 'no first contentful paint' : 'the world never shown'} within ${SHOW_MS} ms`);
    runs[arm].push(r);
  }
} finally { await browser.close(); await sb.close(); await sh.close(); }
if (A('samples')) {   // (one runner's share: its loads written for the judge, nothing judged here)
  fs.mkdirSync(path.dirname(path.resolve(A('samples'))), { recursive: true });
  fs.writeFileSync(A('samples'), JSON.stringify({ runs, bad }));
  console.log(`paint trend: ${RUNS} cold loads an arm written to ${A('samples')}` + (bad.length ? `; ${bad.length} load(s) never showed` : ''));
  process.exit(0);
}
out = judge([{ runs, bad }]);
}
if (A('json')) fs.writeFileSync(A('json'), JSON.stringify(out, null, 1));
function A(k) { return val('--' + k, null); }

const lines = Object.entries(out.metrics).map(([m, x]) => `${m.padEnd(5)}  base ${x.base_ms} ms  head ${x.head_ms} ms  delta ${x.delta_ms >= 0 ? '+' : ''}${x.delta_ms} ms  noise ${x.noise_ms} ms  limit ${x.limit_ms} ms   (base ${x.base.join(' ')} | head ${x.head.join(' ')})`);
console.log(`paint trend: ${out.runs} cold loads an arm over ${out.runners} runner(s), ${VP.width}x${VP.height}, base and head in turn\n` + lines.join('\n'));
for (const f of out.fail) console.log('FAIL ' + f);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## First paint, base against head: ${out.fail.length ? '**slower**' : 'no regression'}\n\n` + lines.map((l) => '- `' + l + '`\n').join('') + out.fail.map((f) => `- **${f}**\n`).join(''));
console.log(out.fail.length ? `paint trend: ${out.fail.length} regression(s)` : 'paint trend: ok');
process.exit(out.fail.length ? 1 : 0);
