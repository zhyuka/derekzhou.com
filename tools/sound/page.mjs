// page.mjs: the sound icon, pressed in headless Chromium against a build (2026-11-07; the live score, 2026-11-12). Not
// served; CI's "The sound is opt-in" (tools/checks/38-sound.sh) runs it on build/site.
//
//   node tools/sound/page.mjs SITE [--net MBPS,RTT] [--first MS]    exit 1 on a miss; about 25 s
//
// It prints the press to the first sound: when the score's first note begins (its scheduled start, the earliest of
// the notes it starts), and when the output first passes -60 and -40 dBFS (an analyser on the way out), ms after the
// press, cold (a fresh profile: nothing cached). --net throttles the page's network (Chromium's own emulation: MBPS
// down, RTT ms; 10,70 the slow profile of docs/sound.md, 1.44,562.5 Chrome's Slow 4G); the checks below still hold,
// timed from the first sound (heard over -40 dBFS, waited for up to a minute) where it comes after 4 s. --first MS: a
// miss too when the first note begins later than MS after the press, or never (38-sound: 1200 on the slow profile).
// The build is served from a local folder with its own _headers' Permissions-Policy, and opened with the autoplay
// policy a visitor's browser has (a gesture first). It fails when:
//   - before the press (2 s): an audio context is made, or anything audio is requested, or the audio session is touched,
//     or the icon is hidden or pressed, or the score (score.js, loaded deferred) has not registered;
//   - the press: it does not set the audio session to playback (Safari's navigator.audioSession, stood in for here: the
//     owner's "yes switch it to playback", heard with the ringer off), or makes other than one context, or requests
//     other than one sheet of notes, once, from this site under /assets/sound/; the icon is not pressed and the context not running; the score starts no notes (buffer
//     sources from the one sheet, sustained ones looping), or the page throws;
//   - the score stops planning: no new notes started between 4 s and 16 s after the press (it plans ten seconds ahead);
//   - a second press: the icon not unpressed and the context not suspended (after the 1.5 s ramp);
//   - a third press: the icon not pressed and the context not running again, and nothing fetched or made again.
// The browser: playwright-core (PW_CORE names its folder, else node's resolution of playwright; CHROME_PATH a Chrome).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const SITE = process.argv[2], NET = (process.argv[process.argv.indexOf('--net') + 1] || '').split(',').map(Number), FIRST = process.argv.includes('--first') ? +process.argv[process.argv.indexOf('--first') + 1] : 0;
if (process.argv.includes('--first') && !(FIRST > 0)) { console.error('--first MS (e.g. 1200)'); process.exit(2); }
if (process.argv.includes('--net') && !(NET.length === 2 && NET[0] > 0 && NET[1] >= 0)) { console.error('--net MBPS,RTT (e.g. 10,70)'); process.exit(2); }
if (!SITE || !fs.existsSync(path.join(SITE, 'index.html'))) { console.error('usage: node tools/sound/page.mjs SITE (a build: build/site)'); process.exit(2); }
const req = createRequire(import.meta.url);
const PW = process.env.PW_CORE ? req(process.env.PW_CORE) : req('playwright');

function serve(dir) {
  const H = fs.readFileSync(path.join(dir, '_headers'), 'utf8'), pp = (H.match(/Permissions-Policy: (.*)/) || [])[1];
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg' };
  const root = path.resolve(dir);
  const s = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, Object.assign({ 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }, pp ? { 'Permissions-Policy': pp } : {}));
    r.end(fs.readFileSync(f));
  });
  return new Promise((ok) => s.listen(0, '127.0.0.1', () => ok(s)));
}
function launch() {
  const args = ['--no-sandbox', '--autoplay-policy=user-gesture-required'];
  if (process.env.CHROME_PATH) return PW.chromium.launch({ executablePath: process.env.CHROME_PATH, args });
  return PW.chromium.launch({ args });
}

const srv = await serve(SITE), origin = 'http://127.0.0.1:' + srv.address().port;
const browser = await launch();
const page = await browser.newPage();
const bad = [], audio = [], errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('request', (q) => {
  const u = q.url();
  if (q.resourceType() === 'media' || /\.(mp3|m4a|aac|ogg|opus|wav|flac|webm)(\?|$)/i.test(u) || /\/assets\/sound\//.test(u)) audio.push(u);
});
if (NET.length === 2) { const c = await page.context().newCDPSession(page); await c.send('Network.enable'); await c.send('Network.emulateNetworkConditions', { offline: false, latency: NET[1], downloadThroughput: NET[0] * 125000, uploadThroughput: 5 * 125000 }); }
await page.addInitScript(() => {
  const A = window.AudioContext, T = (window.__T = {}), ms = () => performance.now(); window.__made = 0; window.__srcs = [];
  document.addEventListener('click', () => { if (!T.press) T.press = ms(); }, true);   // (the first press, before the icon's own handler)
  Object.defineProperty(navigator, 'audioSession', { value: { type: 'auto' }, configurable: true });   // (Safari's; Chromium has none)
  window.AudioContext = function (o) {
    window.__made++; const c = (window.__ctx = new A(o)), an = (window.__an = c.createAnalyser()), buf = new Float32Array((an.fftSize = 512));
    const iv = setInterval(() => { an.getFloatTimeDomainData(buf); let e = 0; for (const v of buf) e += v * v; const db = 10 * Math.log10(e / buf.length + 1e-20);
      for (const th of [-60, -40]) if (db > th && !T['heard' + th]) T['heard' + th] = ms(); if (T['heard-40']) clearInterval(iv); }, 4);
    return c;
  };
  window.AudioContext.prototype = A.prototype;
  const con = AudioNode.prototype.connect;   // (whatever reaches the speakers, the analyser hears too)
  AudioNode.prototype.connect = function (n) { if (window.__ctx && n === window.__ctx.destination && this !== window.__an) con.call(this, window.__an); return con.apply(this, arguments); };
  const go = AudioBufferSourceNode.prototype.start;   // (a note: a source on the sheet, whole or a first part; its start in ms on the page's clock)
  AudioBufferSourceNode.prototype.start = function (w) { const c = window.__ctx; if (c && this.buffer && this.buffer.duration > 20) { const t = ms() + Math.max(0, ((w || 0) - c.currentTime) * 1000); if (!(T.note <= t)) T.note = t; } return go.apply(this, arguments); };
  const make = A.prototype.createBufferSource;
  A.prototype.createBufferSource = function () {
    const n = make.apply(this, arguments), rec = { n, ended: false };
    n.addEventListener('ended', () => { rec.ended = true; });
    window.__srcs.push(rec); return n;
  };
});
const state = () => page.evaluate(() => {
  const b = document.getElementById('sound'), c = window.__ctx, s = window.__srcs, sheet = s.filter((r) => r.n.buffer && r.n.buffer.duration > 20);   // (a decode of the sheet, whole or its first part (29 s and more), never the air's own noise (13.7 and 17.9 s))
  return { session: navigator.audioSession.type, made: window.__made, shown: !!b && !b.hidden, pressed: b && b.getAttribute('aria-pressed'), state: c && c.state, t: c ? c.currentTime : 0, rate: c ? c.sampleRate : 0,
    score: !!(window.SCORE && typeof window.SCORE.play === 'function'), notes: sheet.length, playing: sheet.filter((r) => !r.ended).length, looping: sheet.filter((r) => r.n.loop && !r.ended).length };
});

await page.goto(origin + '/');
await page.waitForTimeout(2000);
const before = await state();
if (before.made !== 0) bad.push(`an audio context was made before the press (${before.made})`);
if (before.session !== 'auto') bad.push(`the audio session was set before the press (${before.session})`);
if (audio.length) bad.push(`audio was requested before the press: ${audio.join(', ')}`);
if (!before.shown) bad.push('the sound icon is not shown');
if (before.pressed !== 'false') bad.push(`the icon is ${before.pressed} before the press (want false)`);
if (!before.score) bad.push('the score (score.js) has not registered');

await page.click('#sound');
const pressed = Date.now();   // (throttled, the checks below wait for the first sound, up to a minute: a slow sheet's)
await page.waitForFunction(() => window.__T['heard-40'], null, { timeout: NET.length ? 60000 : 4000 }).catch(() => {});
const when = await page.evaluate(() => { const T = window.__T, o = {}; for (const k of ['note', 'heard-60', 'heard-40']) o[k] = T[k] ? Math.round(T[k] - T.press) : null; return o; });
await page.waitForTimeout(Math.max(0, 4000 - (Date.now() - pressed)));
const on = await state();
await page.waitForTimeout(12000);
const later = await state();
if (on.made !== 1) bad.push(`the press made ${on.made} audio contexts (want 1)`);
if (on.session !== 'playback') bad.push(`the press set the audio session to ${on.session} (want playback: heard with the ringer off)`);
if (audio.length !== 1) bad.push(`the press requested ${audio.length} files (want 1, the sheet of notes): ${audio.join(', ')}`);
else if (!audio[0].startsWith(origin + '/assets/sound/')) bad.push(`the sheet came from ${audio[0]} (want this site's /assets/sound/)`);
if (on.pressed !== 'true' || on.state !== 'running') bad.push(`after the press the icon is ${on.pressed} and the context ${on.state} (want true, running)`);
if (!(on.notes >= 3 && on.looping >= 3)) bad.push(`the score started ${on.notes} notes, ${on.looping} sustained and playing (want 3 or more: the first voices and the deep end)`);
if (!(later.notes > on.notes)) bad.push(`no new notes between 4 s and 16 s after the press (${on.notes}, then ${later.notes}): the score stopped planning`);
if (FIRST && !(when.note <= FIRST)) bad.push(`the first note began ${when.note ?? 'never'}${when.note ? ' ms' : ''} after the press (want ${FIRST} ms or sooner${NET.length === 2 ? ` at ${NET[0]} Mbps, ${NET[1]} ms` : ''})`);
if (errs.length) bad.push('the page threw: ' + errs.join(' | '));

await page.click('#sound');
await page.waitForTimeout(2000);
const off = await state();
if (off.pressed !== 'false' || off.state !== 'suspended') bad.push(`after the second press the icon is ${off.pressed} and the context ${off.state} (want false, suspended)`);

await page.click('#sound');
await page.waitForTimeout(800);
const again = await state();
if (again.pressed !== 'true' || again.state !== 'running') bad.push(`after the third press the icon is ${again.pressed} and the context ${again.state} (want true, running)`);
if (again.made !== 1 || audio.length !== 1) bad.push(`the third press made or fetched more (contexts ${again.made}, requests ${audio.length}; want 1 each)`);

console.log(`before: ${before.made} contexts, ${before.shown ? 'shown' : 'hidden'}, pressed ${before.pressed}, score ${before.score ? 'registered' : 'missing'}`);
console.log(`first sound${NET.length === 2 ? ` (${NET[0]} Mbps, ${NET[1]} ms)` : ''}: the first note begins ${when.note ?? '-'} ms after the press; heard over -60 dBFS at ${when['heard-60'] ?? '-'} ms, over -40 at ${when['heard-40'] ?? '-'} ms`);
console.log(`press: session ${on.session}, ${on.made} context ${on.state} at ${on.rate} Hz, ${audio.length} request(s); ${on.notes} notes started by 4 s (${on.looping} sustained), ${later.notes} by 16 s; second: ${off.pressed}, ${off.state}; third: ${again.pressed}, ${again.state}`);
await browser.close(); srv.close();
for (const b of bad) console.log('::error::' + b);
process.exit(bad.length ? 1 : 0);
