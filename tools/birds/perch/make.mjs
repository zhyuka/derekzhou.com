// make.mjs: the perches' ink (src/birds/inkbirds/255-perch-ink.js), measured from what is served: the lettered name's
// drawing in site/index.html and the link words and the credit line set in the served fonts (site/assets/fonts/).
//
//   node tools/birds/perch/make.mjs           write src/birds/inkbirds/255-perch-ink.js
//   node tools/birds/perch/make.mjs --check   write nothing; exit 1 unless the file is what this makes (within a
//                                             browser's antialiasing: a name run's ends 1 unit, a top 0.005 em)
//
// Needs a Chromium driven by Playwright: playwright and its browser, or playwright-core (PW_CORE naming its folder)
// with the machine's Chrome (CHROME_PATH, else the 'chrome' channel), as validate.yml's browser steps run it.
// The name: its one path filled (its own fill rule) on a 1310 x 314 canvas (its viewBox), each column of PERCH_INK.col
// units read down its middle: the runs of sky, top to bottom (a bird stands at the bottom of a run of sky over ink).
// The words: each glyph drawn alone at its place in the word (the served subset, 400 px): its ink's left and right
// over the word's advance, and its ink's top over the baseline, in em. The credit: each character's ink top in em
// (Geist Mono), 0 where it has none a bird could stand on.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');   // (fileURLToPath: on Windows a URL's pathname keeps a leading /C:/)
const OUT = path.join(ROOT, 'src/birds/inkbirds/255-perch-ink.js');
const check = process.argv.includes('--check');
const req = createRequire(import.meta.url);
let pw; try { pw = process.env.PW_CORE ? req(process.env.PW_CORE) : req('playwright'); } catch (e) { pw = req('playwright-core'); }

const html = fs.readFileSync(path.join(ROOT, 'site/index.html'), 'utf8');
const svg = html.match(/<svg[^>]*viewBox="0 0 (\d+) (\d+)"[^>]*>\s*<path([^>]*)>/);
if (!svg) throw new Error('make.mjs: the name\'s drawing not found in site/index.html');
const VW = +svg[1], VH = +svg[2], d = svg[3].match(/ d="([^"]+)"/)[1], rule = (svg[3].match(/fill-rule="([^"]+)"/) || [0, 'nonzero'])[1];
const links = [...html.matchAll(/<footer[\s\S]*?<\/footer>/g)][0][0].match(/<a [^>]*>([^<]+)<\/a>/g).map((a) => a.replace(/<[^>]+>/g, ''));
const ent = { '&nbsp;': ' ', '&middot;': '·', '&ndash;': '–', '&#8288;': '' };
const credit = html.match(/<p class="credit">([^<]*)<\/p>/)[1].replace(/&[#\w]+;/g, (m) => { if (!(m in ent)) throw new Error('make.mjs: ' + m); return ent[m]; });
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'site/assets/fonts', f)).toString('base64');
const COL = 6, ROOM = 34, FLAT = 7, SPAN = 3;

const browser = await (process.env.CHROME_PATH ? pw.chromium.launch({ executablePath: process.env.CHROME_PATH }) : process.env.PW_CORE ? pw.chromium.launch({ channel: 'chrome' }) : pw.chromium.launch());
const page = await browser.newPage();
await page.setContent('<!doctype html><meta charset="utf-8"><body></body>');
const R = await page.evaluate(async ({ d, rule, VW, VH, COL, links, credit, sans, mono }) => {
  const fs1 = new FontFace('PG', 'url(' + sans + ')', { weight: '400' }), fs2 = new FontFace('PM', 'url(' + mono + ')', { weight: '400' });
  await fs1.load(); await fs2.load(); document.fonts.add(fs1); document.fonts.add(fs2);
  const cv = document.createElement('canvas'); cv.width = VW; cv.height = VH;
  const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#000'; g.fill(new Path2D(d), rule);
  const A = g.getImageData(0, 0, VW, VH).data, cols = [];
  for (let c = 0; c * COL < VW; c++) {
    const x = c * COL + (COL >> 1), runs = []; let y = 0;
    while (y < VH) { const ink = A[4 * (y * VW + x) + 3] > 127; let e = y; while (e < VH && (A[4 * (e * VW + x) + 3] > 127) === ink) e++; if (!ink) runs.push(y + ',' + e); y = e; }
    cols.push(runs.join(';'));
  }
  /* a glyph's ink: drawn alone at its place in the word, at 400 px; its left and right over the word's advance, its top over the baseline in em */
  const S = 400, cw = document.createElement('canvas'); cw.width = 4000; cw.height = 800; const q = cw.getContext('2d', { willReadFrequently: true });
  function glyphs(word, fam, every) {
    q.font = '400 ' + S + 'px ' + fam; const adv = q.measureText(word).width, out = [];
    for (let i = 0; i < word.length; i++) {
      const ch = word[i]; q.clearRect(0, 0, cw.width, cw.height); q.fillStyle = '#000'; const off = q.measureText(word.slice(0, i)).width, base = 600;
      q.fillText(ch, 100, base);   // (alone, at a fixed place: its place in the word added back)
      const D = q.getImageData(0, 0, cw.width, cw.height).data; let l = 1e9, r = -1, top = 1e9;
      for (let y = 0; y < cw.height; y++) for (let x = 0; x < cw.width; x++) if (D[4 * (y * cw.width + x) + 3] > 127) { if (x < l) l = x; if (x > r) r = x; if (y < top) top = y; }
      out.push(r < 0 ? null : [(l - 100 + off) / adv, (r + 1 - 100 + off) / adv, (base - top) / S]);
    }
    return out;
  }
  return { cols, links: links.map((w) => glyphs(w, 'PG')), credit: glyphs(credit, 'PM') };
}, { d, rule, VW, VH, COL, links, credit, sans: font('Geist-400-500.sub2.woff2'), mono: font('GeistMono-Regular.sub2.woff2') });
await browser.close();

/* the same tables but for what another Chromium's antialiasing moves: every number within its tolerance */
function near(a, b) {
  const nums = (t) => { const m = t.match(/name: '([^']*)'/), rest = t.replace(/name: '[^']*'/, ''); return { name: m ? m[1].split(/[|;,]/) : [], rest: rest.match(/-?\d+(\.\d+)?/g) || [], shape: rest.replace(/-?\d+(\.\d+)?/g, '#') }; };
  const A = nums(a), B = nums(b);
  if (A.shape !== B.shape || A.name.length !== B.name.length || A.rest.length !== B.rest.length) return false;
  for (let i = 0; i < A.name.length; i++) if ((A.name[i] === '') !== (B.name[i] === '') || Math.abs(+A.name[i] - +B.name[i]) > 1) return false;
  for (let i = 0; i < A.rest.length; i++) if (Math.abs(+A.rest[i] - +B.rest[i]) > 0.005) return false;
  return true;
}
const r3 = (v) => Math.round(v * 1000) / 1000;
const linkT = R.links.map((L) => '[' + L.filter(Boolean).map((g) => '[' + r3(g[0]) + ', ' + r3(g[1]) + ', ' + r3(g[2]) + ']').join(', ') + ']');
const credT = R.credit.map((g, i) => (g && /[A-Za-z0-9]/.test(credit[i]) ? r3(g[2]) : 0));
const text = `  /* ---------------- the perches' ink (the words' letters, measured) ---------------- */

  /* where a bird can stand on the words. Made by tools/birds/perch/make.mjs from what is served (do not edit by hand):
     the lettered name's ink (its drawing on its ${VW} x ${VH} viewBox, read down the middle of each column of ${COL} units:
     the runs of sky, top to bottom), each link word's glyphs (their ink's left and right over the word's advance, their
     top over the baseline in em: ${links.join(', ')}) and the credit's characters (their ink's top in em, 0 for none) */
  var PERCH_INK = {
    h: ${VH}, col: ${COL}, room: ${ROOM}, flat: ${FLAT}, span: ${SPAN},
    name: '${R.cols.join('|')}',
    links: [${linkT.join(',\n      ')}],
    credit: [${credT.join(', ')}]
  };
`;
if (check) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== text && !near(cur, text)) { console.log('::error::src/birds/inkbirds/255-perch-ink.js is not what tools/birds/perch/make.mjs makes from site/ (run it and commit the result)'); process.exit(1); }
  console.log('make.mjs: the perches\' ink is what the served name and fonts make');
} else { fs.writeFileSync(OUT, text); console.log('make.mjs: wrote ' + path.relative(ROOT, OUT)); }
