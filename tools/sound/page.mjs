// page.mjs: the sound icon, pressed in headless Chromium against a build (2026-11-07). Not served; CI's "The sound
// is opt-in" (tools/checks/38-sound.sh) runs it on build/site.
//
//   node tools/sound/page.mjs SITE        exit 1 on a miss; about 10 s
//
// The build is served from a local folder with its own _headers' Permissions-Policy, and opened with the autoplay
// policy a visitor's browser has (a gesture first). It fails when:
//   - before the press (2 s): an audio context is made, or anything audio is requested, or the icon is hidden or pressed;
//   - the press: it makes other than one context, or requests other than one recording, once, from this site under
//     /assets/sound/; the icon is not pressed and the context not running;
//   - the recording does not loop: its one buffer source not looping, or ended, once the context has played past the
//     buffer's length;
//   - a second press: the icon not unpressed and the context not suspended (after the 1.5 s ramp);
//   - a third press: the icon not pressed and the context not running again, and nothing fetched again.
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
const bad = [], audio = [];
page.on('request', (q) => {
  const u = q.url();
  if (q.resourceType() === 'media' || /\.(mp3|m4a|aac|ogg|opus|wav|flac|webm)(\?|$)/i.test(u) || /\/assets\/sound\//.test(u)) audio.push(u);
});
await page.addInitScript(() => {
  const A = window.AudioContext; window.__made = 0; window.__srcs = [];
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
  const b = document.getElementById('sound'), c = window.__ctx, s = window.__srcs;
  return { made: window.__made, shown: !!b && !b.hidden, pressed: b && b.getAttribute('aria-pressed'), state: c && c.state, t: c ? c.currentTime : 0,
    srcs: s.length, loop: s.length ? s[0].n.loop : null, ended: s.length ? s[0].ended : null, len: s.length && s[0].n.buffer ? s[0].n.buffer.duration : 0 };
});

await page.goto(origin + '/');
await page.waitForTimeout(2000);
const before = await state();
if (before.made !== 0) bad.push(`an audio context was made before the press (${before.made})`);
if (audio.length) bad.push(`audio was requested before the press: ${audio.join(', ')}`);
if (!before.shown) bad.push('the sound icon is not shown');
if (before.pressed !== 'false') bad.push(`the icon is ${before.pressed} before the press (want false)`);

await page.click('#sound');
await page.waitForTimeout(1500);
let on = await state();
// (then past the recording's length, so a buffer that does not loop has ended)
const wait = Math.min(8000, Math.max(0, (on.len - on.t) * 1000) + 800);
await page.waitForTimeout(wait);
on = await state();
if (on.made !== 1) bad.push(`the press made ${on.made} audio contexts (want 1)`);
if (audio.length !== 1) bad.push(`the press requested ${audio.length} recordings (want 1): ${audio.join(', ')}`);
else if (!audio[0].startsWith(origin + '/assets/sound/')) bad.push(`the recording came from ${audio[0]} (want this site's /assets/sound/)`);
if (on.pressed !== 'true' || on.state !== 'running') bad.push(`after the press the icon is ${on.pressed} and the context ${on.state} (want true, running)`);
if (on.srcs !== 1) bad.push(`${on.srcs} buffer sources (want 1)`);
if (on.loop !== true || on.ended) bad.push(`the recording does not loop (loop ${on.loop}, ended ${on.ended})`);
if (!(on.len > 0 && on.t > on.len)) bad.push(`the context played ${on.t.toFixed(2)} s of a ${on.len.toFixed(2)} s recording (want past its end, still playing)`);

await page.click('#sound');
await page.waitForTimeout(2000);
const off = await state();
if (off.pressed !== 'false' || off.state !== 'suspended') bad.push(`after the second press the icon is ${off.pressed} and the context ${off.state} (want false, suspended)`);

await page.click('#sound');
await page.waitForTimeout(800);
const again = await state();
if (again.pressed !== 'true' || again.state !== 'running') bad.push(`after the third press the icon is ${again.pressed} and the context ${again.state} (want true, running)`);
if (again.made !== 1 || again.srcs !== 1 || audio.length !== 1) bad.push(`the third press made more (contexts ${again.made}, sources ${again.srcs}, requests ${audio.length}; want 1 each)`);

console.log(`before: ${before.made} contexts, ${before.shown ? 'shown' : 'hidden'}, pressed ${before.pressed}`);
console.log(`press: ${on.made} context ${on.state}, ${audio.length} request(s), loop ${on.loop}, ${on.t.toFixed(2)} s played of ${on.len.toFixed(2)} s; second: ${off.pressed}, ${off.state}; third: ${again.pressed}, ${again.state}`);
await browser.close(); srv.close();
for (const b of bad) console.log('::error::' + b);
process.exit(bad.length ? 1 : 0);
