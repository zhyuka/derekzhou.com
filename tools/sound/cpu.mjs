// cpu.mjs: what the score costs while it plays, the world running beside it (2026-11-25). Not served; CI's "The
// score's CPU" (tools/checks/49-sound-cpu.sh) runs it on build/site.
//
//   node tools/sound/cpu.mjs SITE [--cpu N] [--seconds S] [--check]    about 30 s
//
// The build is served from a local folder and opened in headless Chromium on SwiftShader (software WebGL2) under a
// phone GPU's name, as the gate's harness does (.github/ci/harness.mjs), so the world runs rather than keeping its
// still sky as it does on a CPU renderer; a 180x390 window (a phone's shape, few pixels: the world's own work on the
// main thread runs as on a phone, its governor filling the frame, and its pixels, a phone GPU's work, cost SwiftShader
// little: at 390x844 they took the machine and the world ran at 7-9 frames a second). Once the world shows (its first frame,
// as a visitor sees it: a press in its start-up waits behind it, and the score began as late as the runner was slow, on
// a slow one after the window had closed: 2026-11-26) the sound icon is pressed; 4 s after the score's first tick, the main thread is
// slowed N times (CDP's CPU throttle; 4 unless set: Lighthouse's mobile), and for S seconds (10) it measures:
//   - the audio thread: its own CPU time in each 128-frame render quantum (the trace's
//     RealtimeAudioDestinationHandler::Render, thread time, so the software renderer's threads crowding it are not
//     counted), against the quantum's 5.33 ms at 24 kHz, and each output callback's (AudioOutputDevice). CDP's throttle
//     does not reach this thread: a phone N times slower is about N times these;
//   - the main thread: the score's ticks (each timed where the switch calls it), ms of them a second, and the
//     longest; the main thread's busy share (the world's, mostly) and the frames a second, for scale.
// --check: exit 1 when the audio thread's CPU is over 15% of real time (its quanta's CPU over the seconds traced: a
// context at another rate renders more or fewer of them), or the ticks over 15 ms a second (about 3 times what was
// measured with the world running, 2026-11-25: 7-9%, 0.36-0.50 ms a quantum, about twice and three times), or no quantum
// or no tick was seen. The browser: playwright-core (PW_CORE names its folder, else node's resolution of playwright;
// CHROME_PATH a Chrome).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { WORLD_ARGS, WORLD_VIEWPORT, WORLD_SHOWN, worldStub } from './world.mjs';

const SITE = process.argv[2], arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? +process.argv[i + 1] : d; };
const CPU = arg('cpu', 4), SEC = arg('seconds', 10), CHECK = process.argv.includes('--check');
if (!SITE || !fs.existsSync(path.join(SITE, 'index.html')) || !(CPU >= 1) || !(SEC > 0)) { console.error('usage: node tools/sound/cpu.mjs SITE [--cpu N] [--seconds S] [--check]'); process.exit(2); }
const BAR = { audio: 0.15, ticks: 15 };   // (the audio thread's CPU, a share of real time; ms of the score's ticks a second of main thread)
const req = createRequire(import.meta.url);
const PW = process.env.PW_CORE ? req(process.env.PW_CORE) : req('playwright');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const H = fs.readFileSync(path.join(SITE, '_headers'), 'utf8'), pp = (H.match(/Permissions-Policy: (.*)/) || [])[1], root = path.resolve(SITE);
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, Object.assign({ 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }, pp ? { 'Permissions-Policy': pp } : {}));
  r.end(fs.readFileSync(f));
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const args = ['--no-sandbox', '--autoplay-policy=user-gesture-required', ...WORLD_ARGS];
const browser = await (process.env.CHROME_PATH ? PW.chromium.launch({ executablePath: process.env.CHROME_PATH, args }) : PW.chromium.launch({ args }));
const page = await browser.newPage({ viewport: WORLD_VIEWPORT });
const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
await page.addInitScript(worldStub);
await page.addInitScript(() => {
  let S; window.__ticks = []; window.__frames = 0;
  const raf = window.requestAnimationFrame; window.requestAnimationFrame = function (f) { return raf.call(window, function (t) { window.__frames++; f(t); }); };
  Object.defineProperty(window, 'SCORE', { configurable: true, get() { return S; }, set(v) {   // (each tick timed, as the switch calls it)
    const play = v.play; v.play = function () { const s = play.apply(this, arguments), tick = s.tick; s.tick = function () { const a = performance.now(), r = tick.apply(this, arguments); window.__ticks.push([a, performance.now() - a]); return r; }; return s; };
    S = v; } });
});

const bad = [];
await page.goto('http://127.0.0.1:' + srv.address().port + '/');
await page.waitForTimeout(2000);
if (!(await page.waitForFunction(WORLD_SHOWN, null, { timeout: 60000 }).then(() => 1, () => 0))) bad.push('the world did not show in a minute');   // (pressed once the world shows, as a visitor sees it: a press in its start-up waits behind it)
await page.click('#sound');
if (!(await page.waitForFunction(() => window.__ticks.length > 0, null, { timeout: 30000 }).then(() => 1, () => 0))) bad.push('the score did not begin within 30 s of the press');
await page.waitForTimeout(4000);   // (4 s on from its first tick, as the level rises, and then measured: the window never opens before it plays)
const cdp = await page.context().newCDPSession(page), ev = [];
if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
cdp.on('Tracing.dataCollected', (d) => { for (const e of d.value) ev.push(e); });
const traced = new Promise((ok) => cdp.once('Tracing.tracingComplete', ok));
const t0 = await page.evaluate(() => [performance.now(), window.__frames]);
await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['webaudio', 'audio', 'toplevel'], enableThreadTiming: true }, transferMode: 'ReportEvents' });
await page.waitForTimeout(SEC * 1000);
await cdp.send('Tracing.end'); await traced;
const t1 = await page.evaluate(() => [performance.now(), window.__frames, window.SCORE ? 1 : 0, window.__ticks]);
await browser.close(); srv.close();

const tid = {}; for (const e of ev) if (e.name === 'thread_name') tid[e.args.name] = e.tid;
const of = (name, k, th) => ev.filter((e) => e.name === name && e.ph === 'X' && (th === undefined || e.tid === th) && e[k] !== undefined).map((e) => e[k] / 1000);
const Q = ev.filter((e) => e.name === 'RealtimeAudioDestinationHandler::Render' && e.ph === 'X'), qspan = Q.length > 1 ? (Q[Q.length - 1].ts - Q[0].ts) / 1e6 : NaN;   // (the trace's own seconds)
const q = of('RealtimeAudioDestinationHandler::Render', 'tdur'), cb = of('AudioOutputDevice::FireRenderCallback', 'tdur'), main = of('ThreadControllerImpl::RunTask', 'dur', tid.CrRendererMain);
const span = (t1[0] - t0[0]) / 1000, ticks = t1[3].filter((x) => x[0] >= t0[0] && x[0] <= t1[0]).map((x) => x[1]);
const sum = (a) => a.reduce((x, y) => x + y, 0), mean = (a) => (a.length ? sum(a) / a.length : NaN), pc = (a, f) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const perS = sum(ticks) / span, load = sum(q) / 1000 / qspan, rate = q.length * 128 / qspan;
console.log(`the audio thread: ${(100 * load).toFixed(1)}% of real time, ${mean(q).toFixed(3)} ms of CPU a render quantum (p99 ${pc(q, 0.99).toFixed(2)}, longest ${pc(q, 1).toFixed(2)}; ${q.length} quanta, about ${(rate / 1000).toFixed(0)} kHz: ${(128 / rate * 1000).toFixed(2)} ms each); an output callback ${mean(cb).toFixed(2)} ms (p99 ${pc(cb, 0.99).toFixed(2)}, ${cb.length})`);
console.log(`the main thread, ${CPU}x slower: the score's ticks ${perS.toFixed(2)} ms a second (${(perS / 10).toFixed(2)}% of it; ${ticks.length} ticks, ${mean(ticks).toFixed(2)} ms each, the longest ${pc(ticks, 1).toFixed(1)}); the thread ${(100 * sum(main) / 1000 / span).toFixed(0)}% busy, the world at ${((t1[1] - t0[1]) / span).toFixed(1)} frames a second; ${span.toFixed(1)} s`);

if (!t1[2]) bad.push('the score never registered');
if (!q.length) bad.push('no audio render quantum was traced (the score did not play)');
else if (!(load <= BAR.audio)) bad.push(`the audio thread takes ${(100 * load).toFixed(1)}% of real time (want ${100 * BAR.audio}% or less)`);
if (!ticks.length) bad.push('no tick of the score was seen');
else if (!(perS <= BAR.ticks)) bad.push(`the score's ticks take ${perS.toFixed(2)} ms a second of the main thread at ${CPU}x (want ${BAR.ticks} or less)`);
if (errs.length) bad.push('the page threw: ' + errs.join(' | '));
for (const b of bad) console.log('::error::' + b);
process.exit(CHECK && bad.length ? 1 : 0);
