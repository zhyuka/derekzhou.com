// tools/visit/looks.mjs: how an opening's first frame looks on a given first heading, measured in the frames themselves
// (the hub's review of #312: a heading the ruler likes can stand a cumulus over the night's Milky Way, a cloud mass
// over the low sun, or a bright cloud right behind the name). Each heading is drawn as T1 draws (the gate's harness:
// SwiftShader, the clock paused and stepped, the visit's entropy fixed) on three of T1's skies and windows: the
// laptop at night, the laptop at sunset and the phone at dawn, each twice, with the cloud bodies and without them (a
// local copy of the build, its world script patched: the land's heading in airHeading0's table, and the cloud
// volumes not pushed). The two frames' difference is the cloud's own mask; the frame without clouds shows the sky's
// feature (the Milky Way at night, the sun and its glow at dawn and sunset) as its light over the sky's floor.
//   wordCloud  the share of the words' boxes (the page's own: the name, the line, the credit, the links) under cloud,
//              the worst of the three frames; nameCloud the same for the name's box alone
//   topCloud   the share of the top band (the frame's top 30%) under cloud, the worst of the three
//   galaxy     at night: the share of the feature's light (the clear frame's, over its 20th percentile, in the top
//              60%) that the clouds leave visible; galaxyIn its mean over the frame (how much of it is in frame)
//   sun        the same for the low sun's light, the worse of sunset and dawn; sunIn its mean
//   discs      at sunset and dawn: the low sun's disc in the clear frame (a small round spot well over its ring), and
//              whether the clouds' mask or the words' boxes cover it (shown: neither)
// The phone is drawn at 3x, as T1 draws it (the disc is a few pixels). --png DIR keeps each frame as the page shows it,
// the words on (a screenshot). The record keeps look-rule.mjs's worldKey; a record of another world is started afresh.
// Local only (a plain build: node tools/build.mjs --plain build/site); the record it writes is what headings.mjs
// reads and test/unit/ruler.mjs checks the table against.
//   node tools/visit/looks.mjs --build build/site --cands FILE.json [--out tools/visit/looks.json] [--jobs 2]
//   node tools/visit/looks.mjs --build build/site --table   (the table's headings and each land's own only)
// FILE.json: { "<k>": [deg, ...] } (null: the land's own draw from its stream)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serve } from '../../.github/ci/serve.mjs';
import * as H from '../../.github/ci/harness.mjs';
import { worldKey } from './look-rule.mjs';

const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const BUILD = path.resolve(arg('--build', 'build/site')), OUT = arg('--out', 'tools/visit/looks.json'), JOBS = +arg('--jobs', 2);
// --table: only the table's 16 headings and each land's own (no sweep): the record re-measured after the world moved
// (test/unit/ruler.mjs's "re-run looks.mjs --table"; about 30 minutes at --jobs 2, a heading's six frames a minute)
const TABLE_T = /function airHeading0\(\) \{ var T = (\[[^\]]*\])/.exec(fs.readFileSync(new URL('../../src/world/215-air.js', import.meta.url), 'utf8'));
const CANDS = process.argv.includes('--table') ? Object.fromEntries(JSON.parse(TABLE_T[1]).map((d, k) => [k, d === null ? [null] : [d, null]]))
  : JSON.parse(fs.readFileSync(arg('--cands'), 'utf8'));
// T1's skies and windows (its cases laptop-night, phone-dawn and laptop-sunset-split), the laptop at T1's 1440x900
export const VIEWS = [
  { name: 'laptop-night', vp: [1440, 900, 1], at: '2026-11-05T22:30:00Z', feature: 'galaxy' },
  { name: 'laptop-sunset', vp: [1440, 900, 1], at: '2026-11-05T17:30:00Z', feature: 'sun' },
  { name: 'phone-dawn', vp: [393, 852, 3], mobile: true, at: '2026-11-05T06:30:00Z', feature: 'sun' },
];
const MASK = 8, TOP = 0.3, SKY = 0.6, FLOOR = 0.2;   // (a cloud pixel: any channel 8 or more apart; the bands; the feature's floor, a percentile)

const WORLD = fs.readFileSync(path.join(BUILD, 'world.js'), 'utf8');
const TABLE = /\[(?:-?\d+|null)(?:,(?:-?\d+|null)){15}\]/.exec(WORLD);
const VOLS = WORLD.match(/\b\w+\.vols\.push\(\w+\)/g);
if (!TABLE || !VOLS || VOLS.length !== 1) throw new Error('looks: the heading table (airHeading0) or the one cloud-volume push not found in ' + BUILD + '/world.js');
const T0 = JSON.parse(TABLE[0]);

// a copy of the build with its world script patched (the rest linked)
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'looks-'));
function variant(k, deg, clouds) {
  const dir = path.join(TMP, `k${k}-${deg}-${clouds ? 'on' : 'off'}`);
  if (fs.existsSync(dir)) return dir;
  fs.mkdirSync(dir);
  for (const e of fs.readdirSync(BUILD)) if (e !== 'world.js') fs.symlinkSync(path.join(BUILD, e), path.join(dir, e));
  const T = T0.slice(); T[k] = deg;
  let w = WORLD.replace(TABLE[0], JSON.stringify(T));
  if (!clouds) w = w.replace(VOLS[0], '0');
  fs.writeFileSync(path.join(dir, 'world.js'), w);
  return dir;
}

// one frame: its pixels (top row first) and the words' boxes in its pixels
async function frame(dir, view, k) {
  const s = await serve(dir), b = await H.launch();
  try {
    const arm = await H.openPage(b, s.url, { vp: view.vp, mobile: !!view.mobile, epoch: Date.parse(view.at), seeds: [k] });
    if ((await H.stepToShow(arm)) < 0) throw new Error('never shown');
    const r = await H.capture(arm, { pixels: true }), shot = (await arm.page.screenshot()).toString('base64');
    const boxes = await arm.page.evaluate(() => {
      const q = ['.name svg', '.words span', '.credit', 'footer a'], out = [];
      for (const sel of q) for (const e of document.querySelectorAll(sel)) { const b = e.getBoundingClientRect(); if (b.width && b.height) out.push([b.left, b.top, b.right, b.bottom]); }
      return { boxes: out, w: innerWidth, h: innerHeight };
    });
    const raw = Buffer.from(r.rgba, 'base64'), W = r.w, Hh = r.h, px = Buffer.alloc(raw.length);
    for (let y = 0; y < Hh; y++) raw.copy(px, y * W * 4, (Hh - 1 - y) * W * 4, (Hh - y) * W * 4);   // (readPixels: bottom row first)
    const sx = W / boxes.w, sy = Hh / boxes.h;
    return { W, H: Hh, px, png: 'data:image/png;base64,' + shot, boxes: boxes.boxes.map(([a, b2, c, d]) => [Math.max(0, Math.floor(a * sx)), Math.max(0, Math.floor(b2 * sy)), Math.min(W, Math.ceil(c * sx)), Math.min(Hh, Math.ceil(d * sy))]) };
  } finally { await b.close(); s.server ? s.server.close() : s.close && s.close(); }
}

// the low sun's disc in the clear frame: a small round spot DISC_C over its ring (12 px off), as bright as DISC_L; the ink
// birds' chevrons are wider than tall and are not taken. shown: in frame, not under the clouds' mask, outside the words
const DISC_L = 150, DISC_C = 35, RING = 12;
function sunDisc(off, m, boxes) {
  const { W, H: Hh, px } = off, L = (x, y) => lum(px, (y * W + x) * 4), seen = new Uint8Array(W * Hh);
  const ringMed = (x, y) => { const v = []; for (let a = 0; a < 24; a++) { const u = Math.round(x + RING * Math.cos(a * Math.PI / 12)), w = Math.round(y + RING * Math.sin(a * Math.PI / 12)); if (u >= 0 && w >= 0 && u < W && w < Hh) v.push(L(u, w)); } v.sort((p, q) => p - q); return v[v.length >> 1] || 0; };
  let best = null;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    if (seen[y * W + x] || L(x, y) < DISC_L) continue;
    const q = [[x, y]], c = []; seen[y * W + x] = 1;
    while (q.length && c.length < 400) { const [u, w] = q.pop(); c.push([u, w]); for (const [du, dw] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = u + du, b = w + dw; if (a >= 0 && b >= 0 && a < W && b < Hh && !seen[b * W + a] && L(a, b) >= DISC_L) { seen[b * W + a] = 1; q.push([a, b]); } } }
    const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]), bw = Math.max(...xs) - Math.min(...xs) + 1, bh = Math.max(...ys) - Math.min(...ys) + 1;
    if (c.length > 300 || bw > 1.6 * bh || bh > 1.6 * bw) continue;
    const cx = Math.round(xs.reduce((a, b) => a + b, 0) / c.length), cy = Math.round(ys.reduce((a, b) => a + b, 0) / c.length), con = L(cx, cy) - ringMed(cx, cy);
    if (con >= DISC_C && (!best || con > best.contrast)) best = { x: cx, y: cy, contrast: Math.round(con) };
  }
  if (!best) return null;
  const inWords = boxes.some(([x0, y0, x1, y1]) => best.x >= x0 && best.x < x1 && best.y >= y0 && best.y < y1), covered = !!m[best.y * W + best.x];
  return { x: +(best.x / W).toFixed(3), y: +(best.y / Hh).toFixed(3), inWords, covered, shown: !inWords && !covered };
}

const lum = (p, i) => 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];
function measureView(on, off, feature) {
  const { W, H: Hh } = on, m = new Uint8Array(W * Hh);
  for (let i = 0, j = 0; j < m.length; i += 4, j++) m[j] = Math.max(Math.abs(on.px[i] - off.px[i]), Math.abs(on.px[i + 1] - off.px[i + 1]), Math.abs(on.px[i + 2] - off.px[i + 2])) >= MASK ? 1 : 0;
  let wc = 0, wn = 0, nc = 0, nn = 0;
  on.boxes.forEach(([x0, y0, x1, y1], b) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { wc += m[y * W + x]; wn++; if (b === 0) { nc += m[y * W + x]; nn++; } } });
  let tc = 0; const ty = Math.round(Hh * TOP); for (let j = 0; j < ty * W; j++) tc += m[j];
  const sy = Math.round(Hh * SKY), L = new Float32Array(sy * W);
  for (let j = 0; j < L.length; j++) L[j] = lum(off.px, j * 4);
  const fl = Float32Array.from(L).sort()[Math.floor(L.length * FLOOR)];
  let g = 0, gv = 0; for (let j = 0; j < L.length; j++) { const e = Math.max(0, L[j] - fl); g += e; gv += e * (1 - m[j]); }
  const disc = feature === 'sun' ? sunDisc(off, m, on.boxes) : null;
  return { wordCloud: wn ? wc / wn : 0, nameCloud: nn ? nc / nn : 0, topCloud: tc / (ty * W), feature, vis: g > 0 ? gv / g : 1, in: g / L.length, disc };
}

const r3 = (x) => +x.toFixed(3);
async function score(k, deg) {
  const views = [];
  for (const v of VIEWS) {
    const on = await frame(variant(k, deg, true), v, k), off = await frame(variant(k, deg, false), v, k);
    views.push({ view: v.name, ...measureView(on, off, v.feature), png: on.png });
  }
  const g = views.filter((v) => v.feature === 'galaxy'), s = views.filter((v) => v.feature === 'sun');
  return {
    k, deg, wordCloud: r3(Math.max(...views.map((v) => v.wordCloud))), nameCloud: r3(Math.max(...views.map((v) => v.nameCloud))), topCloud: r3(Math.max(...views.map((v) => v.topCloud))),
    galaxy: r3(Math.min(...g.map((v) => v.vis))), galaxyIn: r3(Math.min(...g.map((v) => v.in))), sun: r3(Math.min(...s.map((v) => v.vis))), sunIn: r3(Math.min(...s.map((v) => v.in))),
    discs: Object.fromEntries(views.filter((v) => v.feature === 'sun').map((v) => [v.view, v.disc])),
    views: views.map((v) => ({ view: v.view, wordCloud: r3(v.wordCloud), nameCloud: r3(v.nameCloud), topCloud: r3(v.topCloud), vis: r3(v.vis), in: r3(v.in) })), pngs: Object.fromEntries(views.map((v) => [v.view, v.png])),
  };
}

const jobs = []; for (const [k, list] of Object.entries(CANDS)) for (const d of list) jobs.push([+k, d]);
const WORLD_KEY = await worldKey(), old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
const prev = old && old.world === WORLD_KEY ? old : { world: WORLD_KEY, lands: {} };   // (a record of another world is dropped whole)
const PNG = arg('--png', null); if (PNG) fs.mkdirSync(PNG, { recursive: true });
let next = 0; const t0 = Date.now();
async function worker() {
  while (next < jobs.length) {
    const [k, deg] = jobs[next++], r = await score(k, deg), key = deg === null ? 'own' : String(deg);
    if (PNG) for (const [v, u] of Object.entries(r.pngs)) fs.writeFileSync(path.join(PNG, `k${k}-${key}-${v}.png`), Buffer.from(u.split(',')[1], 'base64'));
    delete r.pngs; (prev.lands[k] = prev.lands[k] || {})[key] = r;
    console.log(`k${k} ${key.padStart(4)}: words ${r.wordCloud} name ${r.nameCloud} discs ${Object.entries(r.discs).map(([v, d]) => v + ':' + (d ? (d.shown ? 'shown' : d.covered ? 'covered' : 'in-words') : '-')).join(',')} top ${r.topCloud} galaxy ${r.galaxy} (${r.galaxyIn}) sun ${r.sun} (${r.sunIn})  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    fs.writeFileSync(OUT, JSON.stringify(prev, null, 1) + '\n');
  }
}
await Promise.all(Array.from({ length: JOBS }, worker));
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(0);
