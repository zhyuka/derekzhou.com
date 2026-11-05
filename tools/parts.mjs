// parts.mjs: the world's long scripts kept as small section files, put back together byte for byte (restructure step 1).
//
//   node tools/parts.mjs split FILE DIR        cut FILE at its section dividers into DIR/NNN-slug.js + DIR/parts.json
//   node tools/parts.mjs assemble SRC OUT      write OUT/ = SRC/'s readable scripts whole (the dev build): each
//                                              SRC/<dir>/parts.json's parts joined (into OUT/<its out name>), with the
//                                              dev parts of SRC/dev/<dir>/; every plain SRC/*.js copied
//   node tools/parts.mjs assemble --ship SRC OUT   the same, the shipped build: each dev part's stub in its place
//   node tools/parts.mjs check [--ship] SRC OUT    exit 1 naming each OUT/ file that is not what assemble makes
//
// A part dir holds parts.json ({"out": "world.v8.js", "divider": "<regex source>"}) and its parts, named NNN-slug.js:
// the parts are joined in the order of their names (plain byte order), with nothing between them, so the joined text is
// the file split, exactly. NNN counts in tens from 000 (000 is what comes before the first divider), so a new section
// goes in between two without renaming any other. Split cuts at the divider lines (whole lines); a part may also be cut
// anywhere at a line's start by hand (the dev parts below).
// Split is re-runnable on any later version of the same file (DIR must be empty or absent: `git rm -r DIR` first).
// No CR anywhere (a CRLF checkout would change every template literal's text, the shaders'). Deterministic: no paths,
// no time; the same SRC gives the same OUT on any OS.
import fs from 'fs';
import path from 'path';

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
  const strays = fs.readdirSync(dir).filter((n) => n !== 'parts.json' && !plain.includes(n) && !stubs.includes(n));
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
    const t = readText(f);
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
      if (p === DEV) continue;   // (src/dev/: only the dev twins of part folders, read by join)
      if (e.isDirectory()) { if (fs.existsSync(path.join(p, 'parts.json'))) { const j = join(p, path.join(DEV, path.relative(src, p)), ship); put(j.out, j.text); } else walk(p, false); }
      else if (top && e.isFile() && e.name.endsWith('.js')) put(e.name, readText(p));
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
  return [...out.entries()].sort((x, y) => (x[0] < y[0] ? -1 : 1));
}

const argv = process.argv.slice(2), SHIP = argv.includes('--ship'), [cmd, a, b] = argv.filter((x) => x !== '--ship');
if (cmd === 'split' && a && b) split(a, b);
else if ((cmd === 'assemble' || cmd === 'check') && a && b) {
  const files = assemble(a, SHIP), what = SHIP ? 'the shipped build' : 'the dev build';
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
} else { console.error('usage: node tools/parts.mjs split FILE DIR | assemble [--ship] SRC OUT | check [--ship] SRC OUT'); process.exit(2); }
