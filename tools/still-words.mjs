// still-words.mjs: the words' boxes the opening's plans read (226's STILL_WORDS), measured again.
//   node tools/still-words.mjs [SITE]           print what SITE (default build/site) measures
//   node tools/still-words.mjs [SITE] --check   exit 1 when 226's table or test/golden/still-words.json is off by over TOL px
//   node tools/still-words.mjs [SITE] --write   write both
// The opening's plans (its moon and its evening star) are made in the still's own window (226's stillInputs: no hop at
// the cut), against the words' boxes there. The words have a fixed CSS size, so on a window smaller than the bake's they
// stand bigger and higher than the still's own boxes cropped to it (the hub's round-4 review: Venus on the name at
// 1024x768): each still's table is the UNION, box by box, of the bake window's boxes and those of its band's smallest
// window (226's STILL_MIN), the latter mapped into the still's frame as cover crops it. test/golden/still-words.json keeps
// the smallest windows' own boxes for test/unit/sky.mjs (the plans walked in that window's live view).
// The windows as tools/gpu/bake-stills.js sizes them (hi: the shape's own CSS size, 3x when tall; lo: 393 CSS px on its
// short side, 3x, touch); the smallest windows at the same density and touch. A layout only: the page's scripts are not
// run (the words are laid out by the stylesheet alone), no world, no clock. The boxes are 390-words.js's own arithmetic,
// in CSS px: the lettered name's ink (its path's bounds where its svg stands), the line, the credit and the two links.
// Needs playwright-core and a Chromium (PW_CORE, CHROME_PATH).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../.github/ci/serve.mjs';
import { loadPlaywright } from '../.github/ci/harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), SITE = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'build', 'site'));
// (the tolerance: Chromium builds shape the links' text up to 1.5 px apart (CI's playwright-core 1.49.1 against a newer one:
// the second link's right edge), well inside the plan's 12 px keep; the live plan reads this same table, so it never hops)
const TOL = 2;
const SRC = path.join(ROOT, 'src', 'world', '226-moonlit-stay.js'), GOLD = path.join(ROOT, 'test', 'golden', 'still-words.json');
const src = fs.readFileSync(SRC, 'utf8'), RE = /var STILL_WORDS = (\{.*?\});/, m = RE.exec(src), mm = /var STILL_MIN = (\{.*?\});/.exec(src);
if (!m || !mm) { console.error('still-words: no "var STILL_WORDS = {...};" or "var STILL_MIN = {...};" in ' + path.relative(ROOT, SRC)); process.exit(1); }
const MIN = JSON.parse(mm[1]);

const r1 = (v) => Math.round(v * 10) / 10;
async function boxes(b, url, w, h, dpr, mobile) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, javaScriptEnabled: false, locale: 'en-US' });
  const page = await ctx.newPage();
  await ctx.route(/\.css(\?.*)?$/, async (route) => { const r = await route.fetch(); route.fulfill({ response: r, body: (await r.text()).replace(/font-display:\s*optional/g, 'font-display: block') }); });
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  const out = await page.evaluate(() => {
    const box = (el) => { if (!el) return [0, 0, 0, 0]; const q = el.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; };
    const h1 = document.querySelector('h1'), svg = h1 && h1.querySelector('svg'), p = svg && svg.querySelector('path');
    let name = box(h1);
    if (p) { const vb = svg.viewBox.baseVal, r = svg.getBoundingClientRect(), bb = p.getBBox(), sc = Math.min(r.width / vb.width, r.height / vb.height), ox = r.left + (r.width - vb.width * sc) / 2, oy = r.top + (r.height - vb.height * sc) / 2;
      name = [ox + (bb.x - vb.x) * sc, oy + (bb.y - vb.y) * sc, ox + (bb.x + bb.width - vb.x) * sc, oy + (bb.y + bb.height - vb.y) * sc]; }
    const links = document.querySelectorAll('footer a');
    return [name, box(document.querySelector('.words')), box(document.querySelector('.credit')), box(links[0]), box(links[1])];
  });
  await ctx.close();
  return out;
}

const SHAPES = ['393x861', '393x817', '393x770', '393x724', '393x676', '393x629', '393x524', '1080x1080', '1350x1080', '1728x1080', '1920x1080', '2268x1080'];
const srv = await serve(SITE), b = await loadPlaywright().chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), T = {}, G = {};
try {
  const jobs = [];
  for (const tier of ['hi', 'lo']) for (const sh of SHAPES) jobs.push(async () => {
    const key = tier + '-' + sh, [w, h] = sh.split('x').map(Number), s = tier === 'lo' ? 393 / Math.min(w, h) : 1, mob = tier === 'lo' || h > w, dpr = mob ? 3 : 1;
    const bw = Math.round(w * s), bh = Math.round(h * s), [sw, sh2] = MIN[key];
    const A = await boxes(b, srv.url, bw, bh, dpr, mob), S = await boxes(b, srv.url, sw, sh2, dpr, mob);
    const c = Math.max(sw / bw, sh2 / bh), ox = (sw - bw * c) / 2, oy = (sh2 - bh * c) / 2;   // (the small window shows the still as cover crops it)
    T[key] = A.map((B, i) => { const q = S[i], M = [(q[0] - ox) / c, (q[1] - oy) / c, (q[2] - ox) / c, (q[3] - oy) / c]; return [Math.min(B[0], M[0]), Math.min(B[1], M[1]), Math.max(B[2], M[2]), Math.max(B[3], M[3])].map(r1); });
    G[key] = { min: [sw, sh2], bake: A.map((B) => B.map(r1)), small: S.map((B) => B.map(r1)) };
  });
  for (let i = 0; i < jobs.length; i += 6) await Promise.all(jobs.slice(i, i + 6).map((f) => f()));
} finally { await b.close(); await srv.close(); }
const order = (o) => Object.fromEntries(Object.keys(o).sort((a, z) => (a.split('-')[0] === z.split('-')[0] ? SHAPES.indexOf(a.slice(3)) - SHAPES.indexOf(z.slice(3)) : a < z ? -1 : 1)).map((k) => [k, o[k]]));
const TT = order(T), GG = order(G);

if (args.includes('--write')) {
  fs.writeFileSync(SRC, src.replace(RE, 'var STILL_WORDS = ' + JSON.stringify(TT) + ';'));
  fs.writeFileSync(GOLD, JSON.stringify(GG, null, 1) + '\n');
  console.log('still-words: the table and ' + path.relative(ROOT, GOLD) + ' written (' + Object.keys(TT).length + ' bake windows)');
} else if (args.includes('--check')) {
  const have = JSON.parse(m[1]), gold = fs.existsSync(GOLD) ? JSON.parse(fs.readFileSync(GOLD, 'utf8')) : {}, bad = [];
  const cmp = (name, a, z) => { for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const x = a && a[i] ? a[i][j] : NaN; if (!(Math.abs(x - z[i][j]) <= TOL)) bad.push(`${name} box ${i}[${j}]: ${x} kept, ${z[i][j]} measured`); } };
  for (const k of Object.keys(TT)) { cmp(k, have[k], TT[k]); cmp(k + ' (golden, smallest window)', gold[k] && gold[k].small, GG[k].small); }
  if (bad.length) { console.error('still-words: ' + bad.length + ' values off, the stylesheet has moved the words (node tools/still-words.mjs --write):\n  ' + bad.slice(0, 12).join('\n  ')); process.exit(1); }
  console.log('still-words: ' + Object.keys(TT).length + ' bake windows and their smallest, every box within ' + TOL + ' px of the table');
} else console.log(JSON.stringify(TT));
