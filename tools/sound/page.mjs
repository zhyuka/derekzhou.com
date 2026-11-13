// page.mjs: the sound icon, pressed in headless Chromium against a build (2026-11-07; the live score, 2026-11-12). Not
// served; CI's "The sound is opt-in" (tools/checks/38-sound.sh) runs it on build/site.
//
//   node tools/sound/page.mjs SITE        exit 1 on a miss; about 25 s
//
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

const SITE = process.argv[2];
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
await page.addInitScript(() => {
  const A = window.AudioContext; window.__made = 0; window.__srcs = [];
  Object.defineProperty(navigator, 'audioSession', { value: { type: 'auto' }, configurable: true });   // (Safari's; Chromium has none)
  window.AudioContext = function (o) { window.__made++; return (window.__ctx = new A(o)); };
  window.AudioContext.prototype = A.prototype;
  const make = A.prototype.createBufferSource;
  A.prototype.createBufferSource = function () {
    const n = make.apply(this, arguments), rec = { n, ended: false };
    n.addEventListener('ended', () => { rec.ended = true; });
    window.__srcs.push(rec); return n;
  };
});
const state = () => page.evaluate(() => {
  const b = document.getElementById('sound'), c = window.__ctx, s = window.__srcs, sheet = s.filter((r) => r.n.buffer && r.n.buffer.duration > 60);
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
await page.waitForTimeout(4000);
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
console.log(`press: session ${on.session}, ${on.made} context ${on.state} at ${on.rate} Hz, ${audio.length} request(s); ${on.notes} notes started by 4 s (${on.looping} sustained), ${later.notes} by 16 s; second: ${off.pressed}, ${off.state}; third: ${again.pressed}, ${again.state}`);
await browser.close(); srv.close();
for (const b of bad) console.log('::error::' + b);
process.exit(bad.length ? 1 : 0);
