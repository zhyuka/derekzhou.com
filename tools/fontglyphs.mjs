// fontglyphs.mjs: the letters each served font must hold, and the ones it does (load-perf, 2026-11-07).
// The served fonts are cut to the letters the pages show (subset-fonts.sh, .sub3): Geist to every letter of every page's
// text, Geist Mono to the credit row's (.credit, the only text set in mono). A page that shows a letter its font lacks
// would draw that letter in the fallback face, so CI's check "Every letter the pages show is in its font"
// (tools/checks/40-font-glyphs.sh) holds each cut font to the pages' letters, those the full face has.
//   node tools/fontglyphs.mjs --text sans|mono [DIR]   the letters (DIR: the pages' folder, default site): subset-fonts.sh
//   node tools/fontglyphs.mjs --check [DIR]            exit 1 unless every font holds its letters
// Node built-ins only: the woff2's tables are Brotli (zlib), and only its cmap is read.
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// each served font, the full face it is cut from, and which text it sets
export const FONTS = [
  { cut: 'assets/fonts/Geist-400-500.sub3.woff2', full: 'assets/fonts/Geist-Variable.woff2', role: 'sans' },
  { cut: 'assets/fonts/GeistMono-Regular.sub3.woff2', full: 'assets/fonts/GeistMono-Regular.woff2', role: 'mono' },
];
const PAGES = ['index.html', '404.html'];

const NAMED = { nbsp: 0xa0, middot: 0xb7, ndash: 0x2013, mdash: 0x2014, amp: 0x26, lt: 0x3c, gt: 0x3e, quot: 0x22, apos: 0x27, hellip: 0x2026, lsquo: 0x2018, rsquo: 0x2019, ldquo: 0x201c, rdquo: 0x201d, copy: 0xa9 };
function decode(t, where) {
  return t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1));
    if (!(e in NAMED)) throw new Error(where + ': an entity this tool does not know, ' + m + ' (add it to NAMED)');
    return String.fromCodePoint(NAMED[e]);
  });
}
// a page's shown text: the body's, without scripts, styles, the lettered name's SVG, comments or tags
function bodyText(html, where) {
  const body = html.split(/<body\b[^>]*>/i)[1] || '';
  return decode(body.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|svg|template)\b[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ''), where);
}
function monoText(html, where) {   // the credit rows: <p class="credit">...</p>, one level deep
  let t = '';
  for (const m of html.matchAll(/<(\w+)\b[^>]*\bclass="[^"]*\bcredit\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi)) t += m[2].replace(/<[^>]+>/g, '');
  return decode(t, where);
}
export function letters(role, dir = path.join(ROOT, 'site')) {
  const set = new Set();
  for (const p of PAGES) {
    const f = path.join(dir, p); if (!fs.existsSync(f)) continue;
    const h = fs.readFileSync(f, 'utf8');
    for (const c of (role === 'mono' ? monoText : bodyText)(h, p)) if (!/[\n\r\t]/.test(c)) set.add(c.codePointAt(0));
  }
  return [...set].sort((a, b) => a - b);
}

// the code points a woff2's cmap maps (formats 4 and 12)
const u128 = (b, o) => { let v = 0; for (let i = 0; i < 5; i++) { const x = b[o.i++]; v = v * 128 + (x & 127); if (!(x & 128)) return v; } throw new Error('bad UIntBase128'); };
export function cmap(file) {
  const b = fs.readFileSync(file);
  if (b.toString('latin1', 0, 4) !== 'wOF2') throw new Error(file + ': not a woff2');
  const n = b.readUInt16BE(12), csize = b.readUInt32BE(20), o = { i: 48 };
  let off = 0, at = -1, len = 0;
  for (let t = 0; t < n; t++) {
    const flags = b[o.i++], tag = flags & 63, ver = flags >> 6;
    if (tag === 63) o.i += 4;
    const orig = u128(b, o), glyfLoca = tag === 10 || tag === 11;
    const size = (glyfLoca ? ver !== 3 : ver !== 0) ? u128(b, o) : orig;
    if (tag === 0) { at = off; len = orig; }
    off += size;
  }
  if (at < 0) throw new Error(file + ': no cmap');
  const s = zlib.brotliDecompressSync(b.subarray(o.i, o.i + csize)).subarray(at, at + len);
  const cps = new Set();
  for (let k = 0, nt = s.readUInt16BE(2); k < nt; k++) {
    const st = s.readUInt32BE(4 + k * 8 + 4), fmt = s.readUInt16BE(st);
    if (fmt === 4) {
      const seg = s.readUInt16BE(st + 6) / 2, ends = st + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ros = deltas + seg * 2;
      for (let i = 0; i < seg; i++) {
        const e = s.readUInt16BE(ends + i * 2), a = s.readUInt16BE(starts + i * 2), d = s.readUInt16BE(deltas + i * 2), ro = s.readUInt16BE(ros + i * 2);
        for (let c = a; c <= e && c !== 0xffff; c++) {
          const g = ro ? s.readUInt16BE(ros + i * 2 + ro + (c - a) * 2) : (c + d) & 0xffff;
          if (g && (!ro || ((g + d) & 0xffff))) cps.add(c);
        }
      }
    } else if (fmt === 12) {
      for (let i = 0, ng = s.readUInt32BE(st + 12); i < ng; i++) { const p = st + 16 + i * 12; for (let c = s.readUInt32BE(p); c <= s.readUInt32BE(p + 4); c++) cps.add(c); }
    }
  }
  return cps;
}

const hex = (c) => 'U+' + c.toString(16).toUpperCase().padStart(4, '0') + ' ' + JSON.stringify(String.fromCodePoint(c));
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), i = a.indexOf('--text');
  if (i >= 0) { process.stdout.write(String.fromCodePoint(...letters(a[i + 1], a[i + 2] ? path.resolve(a[i + 2]) : undefined))); process.exit(0); }
  if (!a.includes('--check')) { console.error('usage: --text sans|mono [DIR] | --check [DIR]'); process.exit(2); }
  const dir = a[a.indexOf('--check') + 1] ? path.resolve(a[a.indexOf('--check') + 1]) : path.join(ROOT, 'site');
  let fail = 0;
  for (const f of FONTS) {
    const want = letters(f.role, dir), full = cmap(path.join(dir, f.full)), cut = cmap(path.join(dir, f.cut));
    const missing = want.filter((c) => full.has(c) && !cut.has(c));
    if (missing.length) { fail = 1; console.log(`::error::${f.cut} lacks ${missing.length} letter(s) the pages show in ${f.role}: ${missing.map(hex).join(', ')}. Run ./subset-fonts.sh (it cuts the fonts to the pages' letters), rename the fonts (.subN+1) and every reference in the same commit`); }
    console.log(`${f.cut}: ${cut.size} letters; the pages show ${want.length} in ${f.role}, ${want.filter((c) => !full.has(c)).length} of them not in the full face either`);
  }
  if (!fail) console.log('font glyphs: every letter the pages show is in its font');
  process.exit(fail);
}
