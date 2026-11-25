// parts.mjs: the world's long scripts kept as small section files, put back together byte for byte (restructure step 1).
//
//   node tools/parts.mjs split FILE DIR        cut FILE at its section dividers into DIR/NNN-slug.js + DIR/parts.json
//   node tools/parts.mjs assemble SRC OUT      write OUT/ = SRC/'s readable scripts whole (the dev build): each
//                                              SRC/<dir>/parts.json's parts joined (into OUT/<its out name>), with the
//                                              dev parts of SRC/dev/<dir>/; every plain SRC/*.js copied
//   node tools/parts.mjs assemble --ship SRC OUT   the same, the shipped build: each dev part's stub in its place
//   ... assemble [--ship] --min-glsl SRC OUT   each .glsl file's text put back minified (tools/glslmin.mjs: no comment,
//                                              no spare whitespace, the same tokens; checked, else exit 1): what
//                                              tools/build.mjs ships. Without it the text exactly, as written
//   node tools/parts.mjs check [--ship] SRC OUT    exit 1 naming each OUT/ file that is not what assemble makes
//   node tools/parts.mjs glsl SRC              move every plain GLSL literal into its folder's glsl/NAME.glsl (step 3)
//
// A part dir holds parts.json ({"out": "world.js", "divider": "<regex source>"}) and its parts, named NNN-slug.js:
// the parts are joined in the order of their names (plain byte order), with nothing between them, so the joined text is
// the file split, exactly. NNN counts in tens from 000 (000 is what comes before the first divider), so a new section
// goes in between two without renaming any other. Split cuts at the divider lines (whole lines); a part may also be cut
// anywhere at a line's start by hand (the dev parts below).
// Split is re-runnable on any later version of the same file (DIR must be empty or absent: `git rm -r DIR` first).
// No CR anywhere (a CRLF checkout would change every template literal's text, the shaders'). Deterministic: no paths,
// no time; the same SRC gives the same OUT on any OS.
import fs from 'fs';
import path from 'path';
import { minGlsl, minGlslKeeping, checkGlsl, KEEP } from './glslmin.mjs';
import { fillStamp } from './plan.mjs';

const DIVIDERS = {   // (the section dividers each long script already uses)
  world: '^  /\\* -{20,}',
  inkbirds: '^  /\\* (?:-{10,}|={10,})',
};
function die(msg) { console.error('parts: FAIL: ' + msg); process.exit(1); }
function readText(f) {
  const t = fs.readFileSync(f, 'utf8');
  if (t.indexOf('\r') >= 0) die(f + ' has a CR');
  return t;
}
function slug(line) {
  let s = line.replace(/^\s*\/\*\s*[-=]+\s*/, '').replace(/[-=]+\s*(\*\/)?\s*$/, '').replace(/\*\/.*$/, '');
  s = s.toLowerCase().replace(/\([^)]*\)?/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  s = s.split('-').filter((w) => w && !['the', 'a', 'an', 'and', 'of', 's'].includes(w)).slice(0, 5).join('-');
  return s || 'section';
}
function split(file, dir) {
  const base = path.basename(file), stem = base.replace(/(\.v\d+)?\.js$/, '');
  const re = DIVIDERS[stem]; if (!re) die('no divider known for ' + base + ' (add it to DIVIDERS)');
  if (fs.existsSync(dir) && fs.readdirSync(dir).length) die(dir + ' is not empty (git rm -r it first)');
  const text = readText(file), rx = new RegExp(re), lines = text.split('\n'), cuts = [0];
  let off = 0;
  for (let i = 0; i < lines.length; i++) { if (i > 0 && rx.test(lines[i])) cuts.push(off); off += lines[i].length + 1; }
  if (cuts.length > 100) die(base + ': ' + cuts.length + ' parts (over 100: NNN in tens would run past 999)');
  fs.mkdirSync(dir, { recursive: true });
  const names = [];
  for (let k = 0; k < cuts.length; k++) {
    const body = text.slice(cuts[k], k + 1 < cuts.length ? cuts[k + 1] : text.length);
    const name = String(k * 10).padStart(3, '0') + '-' + (k ? slug(body.slice(0, body.indexOf('\n'))) : 'head') + '.js';
    fs.writeFileSync(path.join(dir, name), body); names.push(name);
  }
  fs.writeFileSync(path.join(dir, 'parts.json'), JSON.stringify({ out: base, divider: re }, null, 2) + '\n');
  const back = join(dir, null, false).text;
  if (back !== text) die('the parts do not join back to ' + base);
  console.log(`split ${base} into ${names.length} parts in ${dir}`);
}
/* (restructure step 3) the shaders' text as .glsl files: a plain GLSL template literal (one with no ${...}) in a part
   or a whole script is kept in its folder's glsl/ as NAME.glsl, the literal itself replaced by `@glsl NAME` (the
   backticks kept). Every read of a part or a script puts the text back: `@glsl NAME` becomes the backtick, the file's
   text exactly, the backtick. A .glsl file has no backtick, no ${ and no CR; every one is used. node tools/parts.mjs
   glsl SRC moves every plain GLSL literal out (re-runnable: what is moved is a marker, not GLSL; it fails unless both
   builds assemble to what they did). */
const MARK = /`@glsl ([a-z0-9-]+)`/g, USED = new Map(), MIN = process.argv.includes('--min-glsl');
function expand(text, gdir, where) {
  return text.replace(MARK, (m, name) => {
    const f = path.join(gdir, name + '.glsl');
    if (!fs.existsSync(f)) die(where + ': ' + m + ' but no ' + f);
    const t = readText(f);
    if (t.includes('`') || t.includes('${')) die(f + ': a backtick or ${ in it (a .glsl file is a plain literal\'s text)');
    if (!USED.has(gdir)) USED.set(gdir, new Set());
    USED.get(gdir).add(name + '.glsl');
    if (!MIN) return '`' + t + '`';
    let mt; try { mt = KEEP.has(name) ? minGlslKeeping(t, KEEP.get(name)) : minGlsl(t); } catch (x) { die(f + ': ' + x.message); }
    const e = checkGlsl(t, mt);
    if (e) die(f + ': the minified text is not the same program (' + e + ')');
    return '`' + mt + '`';
  });
}
function readPart(f, gdir) { const t = readText(f); return expand(MIN ? minInline(t, f) : t, gdir, f); }   // (inline literals first: a .glsl file's text is minGlsl's or KEEP's own)
/* (load-perf, 2026-11-25) a GLSL template literal still in a part (one with ${...} in it, the shaders the world
   writes with its constants in, which no .glsl file can hold, or one that tests read where it stands) is minified too,
   with --min-glsl: each run of text between the substitutions by
   minGlsl, the substitutions as written. It is checked as one program: the text with each substitution standing as a
   word (__SUBn__) must have the same tokens and preprocessor lines before and after (checkGlsl). A literal that fails
   (a comment or a preprocessor line across a substitution, say) ships as written. GLSL by the same words as moveGlsl. */
function inlineLiterals(s) {   // [[start, end, [[a, b], ...the substitutions' spans]], ...] of the template literals with ${}
  const out = []; let i = 0, inS = null, inC = null;
  while (i < s.length) {
    const c = s[i], d = s[i + 1];
    if (inC === '//') { if (c === '\n') inC = null; i++; continue; }
    if (inC === '/*') { if (c === '*' && d === '/') { inC = null; i += 2; continue; } i++; continue; }
    if (inS) { if (c === '\\') { i += 2; continue; } if (c === inS || c === '\n') inS = null; i++; continue; }
    if (c === '/' && d === '/') { inC = '//'; i += 2; continue; }
    if (c === '/' && d === '*') { inC = '/*'; i += 2; continue; }
    if (c === '"' || c === "'") { inS = c; i++; continue; }
    if (c === '`') {
      let j = i + 1; const subs = [];
      for (; j < s.length; j++) {
        if (s[j] === '\\') { j++; continue; }
        if (s[j] === '$' && s[j + 1] === '{') { const a = j; let depth = 1; j += 2; while (j < s.length && depth) { if (s[j] === '{') depth++; else if (s[j] === '}') depth--; else if (s[j] === '`') return null; j++; } subs.push([a, j]); j--; continue; }
        if (s[j] === '`') break;
      }
      out.push([i, j + 1, subs]);
      i = j + 1; continue;
    }
    i++;
  }
  return out;
}
const INLINE = { minified: 0, kept: 0 };
function minInline(s, where) {
  const lits = inlineLiterals(s);
  if (!lits) return s;   // (a template inside a substitution: left alone)
  let out = '', at = 0;
  for (const [a, b, subs] of lits) {
    const runs = [], exprs = []; let k = a + 1;
    for (const [x, y] of subs) { runs.push(s.slice(k, x)); exprs.push(s.slice(x, y)); k = y; }
    runs.push(s.slice(k, b - 1));
    const whole = runs.join('');
    if (whole.startsWith('@glsl ') || !/#version|void main|\bvec[234]\b|\buniform\b|\bfloat \w+\(\) \{/.test(whole) || !/;\n/.test(whole) || runs.some((r) => r.includes('\\'))) continue;
    let mins; try { mins = runs.map((r) => minGlsl(r)); } catch (e) { INLINE.kept++; continue; }
    const ph = (rs) => rs.map((r, n) => r + (n < exprs.length ? ' __SUB' + n + '__ ' : '')).join('');
    if (checkGlsl(ph(runs), ph(mins))) { INLINE.kept++; continue; }
    out += s.slice(at, a + 1) + mins.map((r, n) => r + (n < exprs.length ? exprs[n] : '')).join('');
    at = b - 1; INLINE.minified++;
  }
  return out + s.slice(at);
}
const PART = /^(\d{3})-[a-z0-9-]+\.js$/, STUB = /^(\d{3})-[a-z0-9-]+\.ship\.js$/;
function listParts(d, re) { return fs.existsSync(d) ? fs.readdirSync(d).filter((n) => re.test(n)) : []; }
/* (restructure step 2) the dev-only parts: a part folder src/<rel> may have a twin src/dev/<rel> holding parts that are
   only in the dev build (the record, the harness). Each dev part NNN-slug.js has, in src/<rel>, a stub NNN-slug.ship.js
   (what the shipped build has in its place: the no-ops the rest calls; it may be empty), and no plain part of the same
   NNN. assemble (the dev build) joins src/<rel>'s plain parts and src/dev/<rel>'s, by NNN; assemble --ship joins the
   plain parts and the stubs: the dev parts are left out by file. */
function join(dir, devDir, ship) {
  const meta = JSON.parse(readText(path.join(dir, 'parts.json')));
  const plain = listParts(dir, PART), stubs = listParts(dir, STUB), dev = listParts(devDir, PART);
  const strays = fs.readdirSync(dir).filter((n) => n !== 'parts.json' && n !== 'glsl' && !plain.includes(n) && !stubs.includes(n));
  if (strays.length) die(dir + ': files that are not parts: ' + strays.join(', ') + ' (a part is NNN-slug.js, a stub NNN-slug.ship.js)');
  if (devDir && fs.existsSync(devDir)) { const ds = fs.readdirSync(devDir).filter((n) => !dev.includes(n)); if (ds.length) die(devDir + ': files that are not parts: ' + ds.join(', ')); }
  const N = (n) => n.slice(0, 3), seen = new Map();
  for (const n of plain) { if (seen.has(N(n))) die(dir + ': two parts numbered ' + N(n)); seen.set(N(n), 'plain'); }
  for (const n of dev) { if (seen.has(N(n))) die(devDir + '/' + n + ': its number is a plain part\'s too (a dev part replaces a stub, never a part)'); seen.set(N(n), 'dev'); }
  for (const n of stubs) if (seen.get(N(n)) !== 'dev' || stubs.filter((x) => N(x) === N(n)).length > 1) die(dir + '/' + n + ': a stub with no dev part ' + N(n) + ' in ' + devDir + ' (or two stubs)');
  for (const n of dev) if (!stubs.some((x) => N(x) === N(n))) die(devDir + '/' + n + ': no stub ' + N(n) + '-*.ship.js in ' + dir + ' (what the shipped build has in its place)');
  const pick = plain.map((n) => path.join(dir, n)).concat(ship ? stubs.map((n) => path.join(dir, n)) : dev.map((n) => path.join(devDir, n)));
  pick.sort((x, y) => (path.basename(x) < path.basename(y) ? -1 : 1));
  if (!pick.length) die(dir + ': no parts');
  let text = '';
  pick.forEach((f, k) => {
    const t = readPart(f, path.join(dir, 'glsl'));
    if (k + 1 < pick.length && t && !t.endsWith('\n')) die(f + ' does not end with a newline');
    text += t;
  });
  return { out: meta.out, text };
}
function assemble(src, ship) {   // -> [[name, text]] in name order: SRC's plain scripts, and every part dir at any depth
  const out = new Map(), DEV = path.join(src, 'dev');
  const put = (n, t) => { if (out.has(n)) die(n + ' made twice (a whole file beside its parts?)'); out.set(n, t); };
  const walk = (d, top) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = path.join(d, e.name);
      if (p === DEV || (top && e.name === 'glsl')) continue;   // (src/dev/: the dev twins of part folders, read by join; src/glsl/: the whole scripts' shaders)
      if (e.isDirectory()) { if (fs.existsSync(path.join(p, 'parts.json'))) { const j = join(p, path.join(DEV, path.relative(src, p)), ship); put(j.out, j.text); } else walk(p, false); }
      else if (top && e.isFile() && e.name.endsWith('.js')) put(e.name, readPart(p, path.join(src, 'glsl')));
    }
  };
  walk(src, true);
  if (fs.existsSync(DEV)) (function orphans(d) {   // (a dev folder whose part folder is gone)
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) orphans(p);
      else if (!fs.existsSync(path.join(src, path.relative(DEV, d), 'parts.json'))) die(p + ': in src/dev/ with no part folder ' + path.join(src, path.relative(DEV, d)));
    }
  })(DEV);
  for (const g of [path.join(src, 'glsl')].concat(partDirs(src).map((d) => path.join(d, 'glsl')))) {   // (every .glsl file used)
    if (!fs.existsSync(g)) continue;
    const unused = fs.readdirSync(g).filter((n) => !(USED.get(g) || new Set()).has(n));
    if (unused.length) die(g + ': not used by any part (or not a .glsl file): ' + unused.join(', '));
  }
  // (2026-11-15) the plan's stamp: the world's part holds var PW_V = ''; each assembly writes in its spans' stamp
  return [...out.entries()].map(([n, t]) => { try { return [n, fillStamp(t)]; } catch (e) { die(n + ': ' + e.message); } }).sort((x, y) => (x[0] < y[0] ? -1 : 1));
}
function partDirs(src) {   // every part folder under SRC (not src/dev/)
  const out = [], DEV = path.join(src, 'dev');
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (!e.isDirectory() || p === DEV) continue; if (fs.existsSync(path.join(p, 'parts.json'))) out.push(p); else walk(p); } })(src);
  return out.sort();
}
/* the plain GLSL template literals in a script's text: [start, end] of each (the backticks included), skipping comments
   and quoted strings; GLSL by its words (#version, void main, vecN, uniform) */
function glslLiterals(s) {
  const out = []; let i = 0, inS = null, inC = null;
  while (i < s.length) {
    const c = s[i], d = s[i + 1];
    if (inC === '//') { if (c === '\n') inC = null; i++; continue; }
    if (inC === '/*') { if (c === '*' && d === '/') { inC = null; i += 2; continue; } i++; continue; }
    if (inS) { if (c === '\\') { i += 2; continue; } if (c === inS || c === '\n') inS = null; i++; continue; }
    if (c === '/' && d === '/') { inC = '//'; i += 2; continue; }
    if (c === '/' && d === '*') { inC = '/*'; i += 2; continue; }
    if (c === '"' || c === "'") { inS = c; i++; continue; }
    if (c === '`') {
      let j = i + 1, sub = false;
      for (; j < s.length; j++) {
        if (s[j] === '\\') { j++; continue; }
        if (s[j] === '$' && s[j + 1] === '{') { sub = true; let depth = 1; j += 2; while (j < s.length && depth) { if (s[j] === '{') depth++; else if (s[j] === '}') depth--; j++; } j--; continue; }
        if (s[j] === '`') break;
      }
      const body = s.slice(i + 1, j);
      if (!sub && /#version|void main|\bvec[234]\b|\buniform\b/.test(body)) out.push([i, j + 1]);
      i = j + 1; continue;
    }
    i++;
  }
  return out;
}
function glslName(s, at, taken) {   // the name the literal is assigned to (var NAME = ... or function NAME()), as a file name
  const before = s.slice(Math.max(0, at - 3000), at), re = /(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=|function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m, name = 'glsl';   // (none within 3000 characters: name it by hand)
  while ((m = re.exec(before))) name = m[1] || m[2];
  name = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'glsl';
  let n = name, k = 2;
  while (taken.has(n)) n = name + '-' + k++;
  taken.add(n);
  return n;
}
function moveGlsl(src) {
  const before = [assemble(src, false), assemble(src, true)].map((x) => JSON.stringify(x));
  USED.clear();
  const writes = [], taken = new Map(), files = [];
  for (const e of fs.readdirSync(src, { withFileTypes: true })) if (e.isFile() && e.name.endsWith('.js')) files.push([path.join(src, e.name), path.join(src, 'glsl')]);
  for (const d of partDirs(src)) {
    const dev = path.join(src, 'dev', path.relative(src, d));
    for (const n of fs.readdirSync(d)) if (n.endsWith('.js')) files.push([path.join(d, n), path.join(d, 'glsl')]);
    if (fs.existsSync(dev)) for (const n of fs.readdirSync(dev)) if (n.endsWith('.js')) files.push([path.join(dev, n), path.join(d, 'glsl')]);
  }
  files.sort((x, y) => (x[0] < y[0] ? -1 : 1));
  for (const [, g] of files) if (!taken.has(g)) taken.set(g, new Set(fs.existsSync(g) ? fs.readdirSync(g).map((n) => n.replace(/\.glsl$/, '')) : []));
  let moved = 0;
  for (const [f, g] of files) {
    let s = readText(f);
    const lits = glslLiterals(s).filter(([a, b]) => !s.slice(a, b).startsWith('`@glsl '));
    if (!lits.length) continue;
    const names = lits.map(([a]) => glslName(s, a, taken.get(g)));   // (named in source order)
    for (let k = lits.length - 1; k >= 0; k--) {
      const [a, b] = lits[k];
      writes.push([path.join(g, names[k] + '.glsl'), s.slice(a + 1, b - 1)]);
      s = s.slice(0, a) + '`@glsl ' + names[k] + '`' + s.slice(b);
      moved++;
    }
    writes.push([f, s]);
  }
  for (const [f, t] of writes) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); }
  USED.clear();
  const after = [assemble(src, false), assemble(src, true)].map((x) => JSON.stringify(x));
  if (after[0] !== before[0] || after[1] !== before[1]) die('the moved shaders do not assemble back to what they were (files written: git checkout -- src and git clean src to undo)');
  console.log(`moved ${moved} GLSL literals into glsl/ folders; both builds assemble as before`);
}

const argv = process.argv.slice(2), SHIP = argv.includes('--ship'), [cmd, a, b] = argv.filter((x) => x !== '--ship' && x !== '--min-glsl');
if (cmd === 'split' && a && b) split(a, b);
else if (cmd === 'glsl' && a) moveGlsl(a);
else if ((cmd === 'assemble' || cmd === 'check') && a && b) {
  const files = assemble(a, SHIP), what = (SHIP ? 'the shipped build' : 'the dev build') + (MIN ? ', the shaders minified' : '');
  if (cmd === 'assemble') {
    fs.mkdirSync(b, { recursive: true });
    for (const [n, t] of files) fs.writeFileSync(path.join(b, n), t);
    console.log(`assembled ${files.length} scripts from ${a} into ${b} (${what})`);
  } else {
    let bad = 0;
    for (const [n, t] of files) {
      const f = path.join(b, n);
      if (!fs.existsSync(f) || !fs.readFileSync(f).equals(Buffer.from(t, 'utf8'))) { console.error(`differs: ${f}`); bad++; }
    }
    if (bad) process.exit(1);
    console.log(`ok   ${files.length} scripts in ${b} are what ${a} assembles to (${what})`);
  }
} else { console.error('usage: node tools/parts.mjs split FILE DIR | glsl SRC | assemble [--ship] SRC OUT | check [--ship] SRC OUT'); process.exit(2); }
