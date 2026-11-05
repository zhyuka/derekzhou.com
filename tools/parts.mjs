// parts.mjs: the world's long scripts kept as small section files, put back together byte for byte (restructure step 1).
//
//   node tools/parts.mjs split FILE DIR        cut FILE at its section dividers into DIR/NNN-slug.js + DIR/parts.json
//   node tools/parts.mjs assemble SRC OUT      write OUT/ = SRC/'s readable scripts whole: each SRC/<dir>/parts.json's
//                                              parts joined (into OUT/<its out name>), every plain SRC/*.js copied
//   node tools/parts.mjs check SRC OUT         exit 1 naming each OUT/ file that is not what assemble makes from SRC
//
// A part dir holds parts.json ({"out": "world.v8.js", "divider": "<regex source>"}) and its parts, named NNN-slug.js:
// the parts are joined in the order of their names (plain byte order), with nothing between them, so the joined text is
// the file split, exactly. NNN counts in tens from 000 (000 is what comes before the first divider), so a new section
// goes in between two without renaming any other. The divider is a whole line; each part but the first starts with one.
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
  const back = join(dir).text;
  if (back !== text) die('the parts do not join back to ' + base);
  console.log(`split ${base} into ${names.length} parts in ${dir}`);
}
function join(dir) {
  const meta = JSON.parse(readText(path.join(dir, 'parts.json')));
  const names = fs.readdirSync(dir).filter((n) => /^\d{3}-[a-z0-9-]+\.js$/.test(n)).sort();
  const strays = fs.readdirSync(dir).filter((n) => n !== 'parts.json' && !names.includes(n));
  if (strays.length) die(dir + ': files that are not parts: ' + strays.join(', ') + ' (a part is NNN-slug.js)');
  if (!names.length) die(dir + ': no parts');
  const rx = new RegExp(meta.divider);
  let text = '';
  names.forEach((n, k) => {
    const t = readText(path.join(dir, n));
    if (k && !rx.test(t.slice(0, t.indexOf('\n') < 0 ? t.length : t.indexOf('\n')))) die(dir + '/' + n + ' does not start with a divider line');
    if (k + 1 < names.length && !t.endsWith('\n')) die(dir + '/' + n + ' does not end with a newline');
    text += t;
  });
  return { out: meta.out, text };
}
function assemble(src) {   // -> [[name, text]] in name order: SRC's plain scripts, and every part dir at any depth
  const out = new Map();
  const put = (n, t) => { if (out.has(n)) die(n + ' made twice (a whole file beside its parts?)'); out.set(n, t); };
  const walk = (d, top) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (fs.existsSync(path.join(p, 'parts.json'))) { const j = join(p); put(j.out, j.text); } else walk(p, false); }
      else if (top && e.isFile() && e.name.endsWith('.js')) put(e.name, readText(p));
    }
  };
  walk(src, true);
  return [...out.entries()].sort((x, y) => (x[0] < y[0] ? -1 : 1));
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'split' && a && b) split(a, b);
else if ((cmd === 'assemble' || cmd === 'check') && a && b) {
  const files = assemble(a);
  if (cmd === 'assemble') {
    fs.mkdirSync(b, { recursive: true });
    for (const [n, t] of files) fs.writeFileSync(path.join(b, n), t);
    console.log(`assembled ${files.length} scripts from ${a} into ${b}`);
  } else {
    let bad = 0;
    for (const [n, t] of files) {
      const f = path.join(b, n);
      if (!fs.existsSync(f) || !fs.readFileSync(f).equals(Buffer.from(t, 'utf8'))) { console.error(`differs: ${f}`); bad++; }
    }
    if (bad) process.exit(1);
    console.log(`ok   ${files.length} scripts in ${b} are what ${a} assembles to`);
  }
} else { console.error('usage: node tools/parts.mjs split FILE DIR | assemble SRC OUT | check SRC OUT'); process.exit(2); }
