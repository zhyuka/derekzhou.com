// still-words.mjs: the words' boxes each opening's still was baked with (226's STILL_WORDS), measured again.
//   node tools/still-words.mjs [SITE]           print the table measured on SITE (default build/site)
//   node tools/still-words.mjs [SITE] --check   exit 1 when the table in src/world/226-moonlit-stay.js differs by over 0.6 px
//   node tools/still-words.mjs [SITE] --write   write the measured table into src/world/226-moonlit-stay.js
// The opening's plans (its moon and its evening star) are made against the still's own shape, the words' boxes as the
// bake had them (the night lane, the hub's round-3 review of #303 and #301): a window's own boxes, scaled, are not the
// bake's (the words do not scale with the window), so the table is measured in each bake window as
// tools/gpu/bake-stills.js sizes it (hi: the shape's own CSS size, 3x when tall; lo: 393 CSS px on its short side, 3x,
// touch). The boxes are 390-words.js's own arithmetic, in CSS px: the lettered name's ink (its path's bounds where its
// svg stands), the line, the credit and the two links. Needs playwright-core and a Chromium (PW_CORE, CHROME_PATH).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../.github/ci/serve.mjs';
import * as H from '../.github/ci/harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), SITE = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'build', 'site'));
const SRC = path.join(ROOT, 'src', 'world', '226-moonlit-stay.js');
const SHAPES = ['393x861', '393x817', '393x770', '393x724', '393x676', '393x629', '393x524', '1080x1080', '1350x1080', '1728x1080', '1920x1080', '2268x1080'];

const srv = await serve(SITE), b = await H.launch(), T = {};
try {
  for (const tier of ['hi', 'lo']) for (const sh of SHAPES) {
    const [w, h] = sh.split('x').map(Number), s = tier === 'lo' ? 393 / Math.min(w, h) : 1, mob = tier === 'lo' || h > w;
    const vp = [Math.round(w * s), Math.round(h * s), tier === 'lo' || h > w ? 3 : 1];
    const arm = await H.openPage(b, srv.url, { vp, epoch: Date.UTC(2026, 9, 30, 1, 0, 0), seeds: [1], mobile: mob });
    T[tier + '-' + sh] = await arm.page.evaluate(() => {
      const r1 = (v) => Math.round(v * 10) / 10, cr = document.querySelector('canvas.sky').getBoundingClientRect();
      const box = (el) => { if (!el) return [0, 0, 0, 0]; const q = el.getBoundingClientRect(); return [q.left - cr.left, q.top - cr.top, q.right - cr.left, q.bottom - cr.top].map(r1); };
      const h1 = document.querySelector('h1'), svg = h1 && h1.querySelector('svg'), p = svg && svg.querySelector('path');
      let name = box(h1);
      if (p) { const vb = svg.viewBox.baseVal, r = svg.getBoundingClientRect(), bb = p.getBBox(), sc = Math.min(r.width / vb.width, r.height / vb.height), ox = r.left + (r.width - vb.width * sc) / 2, oy = r.top + (r.height - vb.height * sc) / 2;
        name = [ox + (bb.x - vb.x) * sc - cr.left, oy + (bb.y - vb.y) * sc - cr.top, ox + (bb.x + bb.width - vb.x) * sc - cr.left, oy + (bb.y + bb.height - vb.y) * sc - cr.top].map(r1); }
      const links = document.querySelectorAll('footer a');
      return [name, box(document.querySelector('.words')), box(document.querySelector('.credit')), box(links[0]), box(links[1])];
    });
    await arm.ctx.close();
  }
} finally { await b.close(); await srv.close(); }

const src = fs.readFileSync(SRC, 'utf8'), RE = /var STILL_WORDS = (\{.*?\});/, m = RE.exec(src);
if (!m) { console.error('still-words: no "var STILL_WORDS = {...};" in ' + path.relative(ROOT, SRC)); process.exit(1); }
if (args.includes('--write')) { fs.writeFileSync(SRC, src.replace(RE, 'var STILL_WORDS = ' + JSON.stringify(T) + ';')); console.log('still-words: the table written (' + Object.keys(T).length + ' bake windows)'); }
else if (args.includes('--check')) {
  const have = JSON.parse(m[1]), bad = [];
  for (const k of Object.keys(T)) for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const a = have[k] && have[k][i] ? have[k][i][j] : NaN; if (!(Math.abs(a - T[k][i][j]) <= 0.6)) bad.push(`${k} box ${i}[${j}]: ${a} in the table, ${T[k][i][j]} measured`); }
  if (bad.length) { console.error('still-words: ' + bad.length + ' values off the table, the stylesheet has moved the words (node tools/still-words.mjs --write):\n  ' + bad.slice(0, 12).join('\n  ')); process.exit(1); }
  console.log('still-words: ' + Object.keys(T).length + ' bake windows, every box within 0.6 px of the table');
} else console.log(JSON.stringify(T));
