// measure.mjs: the score, rendered offline and measured (the sound lane, 2026-11-07). Not served; CI's "The score is
// opt-in, and measured" (tools/checks/36-sound.sh) runs it on the build.
//
//   node tools/sound/measure.mjs SITE            render every light in every place, and the page's press; exit 1 on a miss
//   node tools/sound/measure.mjs SITE --fit      the same, then print the trims (TRIM, TRIM_P) that put each at -26 LUFS
//   node tools/sound/measure.mjs SITE --secs 60  each render this long (default 50)
//
// SITE is a build (build/site): its score.js and sound.js are the served bytes. Each render is the score as the page
// runs it, on an OfflineAudioContext (48 kHz, stereo) in headless Chromium, the scheduler's tick called at every
// quarter second of audio time (the context suspended there), the world's sky a stand-in that holds one light in one
// place (WORLD.sky(), the shape the world gives). Measured over the steady state (from 20 s, after the press's
// entry):
//   loudness   BS.1770-4 integrated (K-weighted, 400 ms blocks, the -70 LUFS and relative -10 LU gates): -26 +- 1.5 LU
//   peak       the highest sample: under -6 dBFS (the score's soft ceiling rounds off from -14 toward -11.7): no clip
//   level      the score's own slow level (its correction for what the trims miss), reported; --fit solves the trims
//   cpu        the render's speed (audio seconds a wall second, this machine's audio thread) and the scheduler's main-
//              thread time a second of audio with the CPU throttled 4x (a phone's main thread): at least 4x realtime (9-12x alone on a desktop),
//              and at most 50 ms a second
// Then two changes (into the night, through the mist) rendered whole: no sample over -6 dBFS, and no 400 ms block
// louder than the one before by more than 6 LU (nothing starts with a jolt).
// Then the page: the build served from a local folder with its own _headers' Permissions-Policy, opened in Chromium:
// no AudioContext is made and no score fetched before the press (5 s); the icon shows, unpressed; the press makes one
// context and fetches the score once; the icon stays pressed (the device started and the score came); a second press
// unpresses it.
// The browser: playwright-core (PW_CORE names its folder, else node's resolution; CHROME_PATH a Chrome, else the
// runner's channel), as W7's unit test.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const SITE = argv.find((a) => !a.startsWith('--')) || 'build/site';
const FIT = argv.includes('--fit');
const SECS = +(argv[argv.indexOf('--secs') + 1] || 0) || 50;
const FROM = 20;
const LIGHTS = ['firstlight', 'afterglow', 'bluehour', 'moonlit', 'milkyway', 'aurora'], PLACES = { above: 1, dunes: 0 };
let PW;
try { PW = require(process.env.PW_CORE || 'playwright-core'); } catch (e) { PW = require('playwright'); }

function launch() {
  const args = ['--no-sandbox', '--autoplay-policy=user-gesture-required'];
  if (process.env.CHROME_PATH) return PW.chromium.launch({ executablePath: process.env.CHROME_PATH, args });
  return PW.chromium.launch({ channel: 'chrome', args }).catch(() => PW.chromium.launch({ args }));
}

// ---------------------------------------------------------------- BS.1770-4 on the render
const MEASURE = `self.__measure = function (buf, from) {
  // BS.1770-4's K-weighting at 48 kHz (its own coefficients: the head's shelf, then the high-pass), 400 ms blocks at
  // 75% overlap, and the highest sample
  var S = [[1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]];
  var Hp = [[1, -2, 1], [1, -1.99004745483398, 0.99007225036621]];
  function biq(x, b, a) { var y = new Float64Array(x.length), x1 = 0, x2 = 0, y1 = 0, y2 = 0, i, v, o; for (i = 0; i < x.length; i++) { v = x[i]; o = b[0] * v + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2; x2 = x1; x1 = v; y2 = y1; y1 = o; y[i] = o; } return y; }
  var L = buf.getChannelData(0), R = buf.getChannelData(1), kl = biq(biq(L, S[0], S[1]), Hp[0], Hp[1]), kr = biq(biq(R, S[0], S[1]), Hp[0], Hp[1]);
  var sr = buf.sampleRate, n = Math.round(0.4 * sr), hop = Math.round(0.1 * sr), out = [], i, j, s, p = 0;
  for (i = Math.round(from * sr); i + n <= kl.length; i += hop) { s = 0; for (j = i; j < i + n; j++) s += kl[j] * kl[j] + kr[j] * kr[j]; out.push(-0.691 + 10 * Math.log10(s / n + 1e-20)); }
  for (i = 0; i < L.length; i++) { if (Math.abs(L[i]) > p) p = Math.abs(L[i]); if (Math.abs(R[i]) > p) p = Math.abs(R[i]); }
  return { blocks: out, peak: 20 * Math.log10(p + 1e-12) };
};`;
function integrated(bl) {
  const pw = (l) => Math.pow(10, (l + 0.691) / 10), lu = (p) => -0.691 + 10 * Math.log10(p);
  const abs = bl.filter((l) => l > -70); if (!abs.length) return -99;
  const rel = lu(abs.reduce((a, l) => a + pw(l), 0) / abs.length) - 10;
  const g = abs.filter((l) => l > rel);
  return lu(g.reduce((a, l) => a + pw(l), 0) / g.length);
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

// ---------------------------------------------------------------- the page, served
function serve(dir) {
  const H = fs.readFileSync(path.join(dir, '_headers'), 'utf8'), pp = (H.match(/Permissions-Policy: (.*)/) || [])[1];
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const s = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(dir, p);
    if (!f.startsWith(path.resolve(dir)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, Object.assign({ 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }, pp ? { 'Permissions-Policy': pp } : {}));
    r.end(fs.readFileSync(f));
  });
  return new Promise((ok) => s.listen(0, '127.0.0.1', () => ok(s)));
}
async function pageTest(browser) {
  const srv = await serve(path.resolve(SITE)), port = srv.address().port, bad = [];
  const page = await browser.newPage();
  const fetched = [];
  page.on('request', (q) => { if (/\/score(\.[0-9a-f]{8})?\.js$/.test(q.url())) fetched.push(q.url()); });
  await page.addInitScript(() => {
    const A = window.AudioContext; window.__made = 0;
    window.AudioContext = function (o) { window.__made++; return (window.__ctx = new A(o)); };
    window.AudioContext.prototype = A.prototype;
  });
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.waitForTimeout(5000);
  const before = await page.evaluate(() => ({ made: window.__made, shown: !document.getElementById('sound').hidden, pressed: document.getElementById('sound').getAttribute('aria-pressed') }));
  if (before.made !== 0) bad.push('an audio context was made before the press (' + before.made + ')');
  if (fetched.length) bad.push('the score was fetched before the press');
  if (!before.shown) bad.push('the sound icon is not shown');
  if (before.pressed !== 'false') bad.push('the icon is pressed before the press');
  await page.click('#sound');
  await page.waitForTimeout(4000);
  const after = await page.evaluate(() => ({ made: window.__made, pressed: document.getElementById('sound').getAttribute('aria-pressed'), state: window.__ctx && window.__ctx.state, t: window.__ctx && window.__ctx.currentTime }));
  if (after.made !== 1) bad.push('the press made ' + after.made + ' audio contexts (want 1)');
  if (fetched.length !== 1) bad.push('the press fetched the score ' + fetched.length + ' times (want 1)');
  if (after.pressed !== 'true' || after.state !== 'running') bad.push('after the press the icon is ' + after.pressed + ' and the context ' + after.state);
  await page.click('#sound');
  await page.waitForTimeout(1600);
  const off = await page.evaluate(() => ({ pressed: document.getElementById('sound').getAttribute('aria-pressed'), state: window.__ctx.state }));
  if (off.pressed !== 'false' || off.state !== 'suspended') bad.push('after the second press the icon is ' + off.pressed + ' and the context ' + off.state);
  await page.close(); srv.close();
  return { before, after, off, fetched: fetched.length, bad };
}

// ---------------------------------------------------------------- main
const score = fs.readFileSync(path.join(SITE, 'score.js'), 'utf8');
const browser = await launch();
const ctx = await browser.newContext();
async function fresh() {
  const p = await ctx.newPage();
  await p.goto('about:blank');
  await p.evaluate(() => {
    self.SOUND = { score: (fn) => { self.__make = fn; } };
    self.__skyAt = (plan, t) => { for (const s of plan) if (t < s.until) return s.at(t); return plan[plan.length - 1].at(t); };
  });
  await p.addScriptTag({ content: MEASURE });
  await p.addScriptTag({ content: score });
  return p;
}
const fail = [], rows = [];
const jobs = [];
for (const light of LIGHTS) for (const place in PLACES) jobs.push({ light, place });
async function one(j, throttle) {
  const p = await fresh();
  if (throttle) { const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
  const w = PLACES[j.place];
  const res = await p.evaluate(async ({ light, w, secs, from }) => {
    const SR = 48000, TICK = 0.25;
    const ctx = new OfflineAudioContext(2, Math.round(SR * secs), SR);
    const sky = { sky: light, next: light, k: 0, far: false, w, seed: 20261107 };
    self.WORLD = { sky: () => sky };
    const out = ctx.createGain(); out.connect(ctx.destination);
    const music = self.__make(ctx, out);
    let tickMs = 0; const levels = [];
    const at = (t) => { const a = performance.now(); music.tick(); tickMs += performance.now() - a; if (t >= from) levels.push(music.level().level); };
    at(0);
    for (let t = TICK; t < secs - 0.01; t += TICK) { const tt = t; ctx.suspend(tt).then(() => { at(tt); ctx.resume(); }); }
    const w0 = performance.now(); const buf = await ctx.startRendering(); const wall = (performance.now() - w0) / 1000;
    return Object.assign({ wall, tickMs, levels }, self.__measure(buf, from));
  }, { light: j.light, w, secs: SECS, from: FROM });
  await p.close();
  const lufs = integrated(res.blocks), pk = res.peak, lv = mean(res.levels);
  return { light: j.light, place: j.place, lufs: +lufs.toFixed(2), pre: +(lufs - lv).toFixed(2), level: +lv.toFixed(2), peak: +pk.toFixed(2), speed: +(SECS / Math.max(0.01, res.wall - res.tickMs / 1000)).toFixed(1), tickMsPerS: +(res.tickMs / SECS).toFixed(2) };
}
async function change(name, plan) {
  const p = await fresh();
  const res = await p.evaluate(async ({ plan, secs }) => {
    const SR = 48000, TICK = 0.25, ctx = new OfflineAudioContext(2, Math.round(SR * secs), SR);
    const skyAt = (t) => { const k = Math.max(0, Math.min(1, (t - plan.at) / plan.move)); return { sky: k >= 1 ? plan.b : plan.a, next: plan.b, k: k >= 1 ? 0 : k, far: plan.far, w: plan.w, seed: 7 }; };
    let sky = skyAt(0); self.WORLD = { sky: () => sky };
    const out = ctx.createGain(); out.connect(ctx.destination);
    const music = self.__make(ctx, out);
    const at = (t) => { sky = skyAt(t); music.tick(); };
    at(0);
    for (let t = TICK; t < secs - 0.01; t += TICK) { const tt = t; ctx.suspend(tt).then(() => { at(tt); ctx.resume(); }); }
    const buf = await ctx.startRendering();
    return { all: self.__measure(buf, 0), late: self.__measure(buf, plan.at) };
  }, { plan, secs: plan.at + plan.move + 20 });
  await p.close();
  const bl = res.all.blocks; let jump = 0;
  for (let i = 4 + FROM * 10; i < bl.length; i++) if (bl[i - 4] > -60) jump = Math.max(jump, bl[i] - bl[i - 4]);   // (a block against the one 400 ms before it, after the press's entry)
  return { name, peak: +res.all.peak.toFixed(2), jump: +jump.toFixed(2), lufs: +integrated(res.late.blocks).toFixed(2) };
}
const N = Math.max(1, Math.min(6, (await import('node:os')).cpus().length - 1));
let next = 0;
await Promise.all(Array.from({ length: N }, async () => { while (next < jobs.length) { const j = jobs[next++]; rows.push(await one(j, 0)); } }));
rows.sort((a, b) => LIGHTS.indexOf(a.light) - LIGHTS.indexOf(b.light) || (a.place < b.place ? -1 : 1));
for (const r of rows) {
  console.log(`${r.light.padEnd(11)} ${r.place.padEnd(6)} ${r.lufs.toFixed(2).padStart(7)} LUFS  (before the level ${r.pre.toFixed(2)}, level ${r.level.toFixed(2)} dB)  peak ${r.peak.toFixed(2)} dBFS`);
  if (Math.abs(r.lufs + 26) > 1.5) fail.push(`${r.light} ${r.place}: ${r.lufs} LUFS (want -26 +- 1.5)`);
  if (r.peak > -6) fail.push(`${r.light} ${r.place}: peak ${r.peak} dBFS (want under -6)`);
}
// the cost, on the busiest light (the most notes a minute, a plucked line), each render alone: the audio thread's
// speed unthrottled, the scheduler's main-thread time with the CPU throttled 4x
const busy = { light: 'firstlight', place: 'dunes' }, sp = await one(busy, 0), th = await one(busy, 4);
console.log(`cost (${busy.light}, ${busy.place}): the audio renders at ${sp.speed}x realtime on this machine (so about ${(100 / sp.speed).toFixed(0)}% of one core; a phone's ~4x slower core about ${(400 / sp.speed).toFixed(0)}%); the scheduler takes ${th.tickMsPerS} ms a second of audio at 4x`);
if (sp.speed < 4) fail.push(`the score renders at ${sp.speed}x realtime (want 4x or more: a phone's core; 9-12x measured alone on a desktop, less when the other checks run beside it)`);
if (th.tickMsPerS > 50) fail.push(`the scheduler takes ${th.tickMsPerS} ms a second at 4x (want 50 or less)`);
const changes = await Promise.all([
  change('into the night', { a: 'bluehour', b: 'moonlit', at: 25, move: 57, far: false, w: 1 }),
  change('through the mist', { a: 'firstlight', b: 'aurora', at: 25, move: 57, far: true, w: 0.2 })]);
for (const c of changes) {
  console.log(`change ${c.name.padEnd(17)} peak ${c.peak} dBFS, the largest rise in 400 ms ${c.jump} LU, ${c.lufs} LUFS`);
  if (c.peak > -6) fail.push(`change ${c.name}: peak ${c.peak} dBFS`);
  if (c.jump > 6) fail.push(`change ${c.name}: a rise of ${c.jump} LU in 400 ms (a jolt)`);
}
const pt = await pageTest(browser);
console.log(`page: before the press ${pt.before.made} contexts, the score fetched ${pt.fetched ? 'once' : '0 times'} in all; after it the icon ${pt.after.pressed}, the context ${pt.after.state}; after a second press ${pt.off.pressed}, ${pt.off.state}`);
fail.push(...pt.bad);
await browser.close();
if (FIT) {
  // the trims: each light's the mean of its places' error, each place's the mean of the rest (summing to zero)
  const err = (r) => -26 - r.pre;
  const lt = {}, pt2 = {};
  for (const l of LIGHTS) lt[l] = mean(rows.filter((r) => r.light === l).map(err));
  for (const p in PLACES) pt2[p] = mean(rows.filter((r) => r.place === p).map((r) => err(r) - lt[r.light]));
  console.log('add to the trims (dB): lights ' + JSON.stringify(Object.fromEntries(Object.entries(lt).map(([k, v]) => [k, +v.toFixed(2)]))) + ', places ' + JSON.stringify(Object.fromEntries(Object.entries(pt2).map(([k, v]) => [k, +v.toFixed(2)]))));
}
if (fail.length) { for (const f of fail) console.log('::error::' + f); process.exit(1); }
console.log(`the score: ${rows.length} renders at -26 +- 1.5 LUFS (${Math.min(...rows.map((r) => r.lufs)).toFixed(1)} to ${Math.max(...rows.map((r) => r.lufs)).toFixed(1)}), peaks under ${Math.max(...rows.map((r) => r.peak)).toFixed(1)} dBFS, ${sp.speed}x realtime; silent and unfetched until pressed`);
