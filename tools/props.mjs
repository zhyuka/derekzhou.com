// props.mjs: the ink birds' renamed properties (tools/minify.mjs renames the ink birds' own; the hub's bird bytes, PR B,
// 2026-11-25), listed and checked against everything else that is served (tools/checks/50-props.sh). It builds the
// shipped scripts itself (tools/parts.mjs assemble --ship, then tools/minify.mjs --build) into a scratch folder, so a
// change to either is seen, and reads the renamed list from the two texts alone, not from the minifier: a property of
// the input inkbirds.js (a member read or written, an object key) that the output never has is one renamed. Each
// renamed name must be in no other file the page or the build serves as a word (the other minified scripts, site/'s
// pages and scripts, the wing model: src/birds/model), in no string or template literal of the ink birds' input (a key
// read by string, a JSON key, a kind's name), and no property of a DOM or built-in object (terser's DOM list and the
// JS built-ins'). One that is crosses a script boundary under a new name: exit 1, naming it.
//   node tools/props.mjs            the check; the renamed names listed
//   node tools/props.mjs --json     the same, as JSON
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as acorn from 'acorn';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORD = /[A-Za-z_$][\w$]*/g;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'props-'));
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));
const ship = path.join(tmp, 'ship'), site = path.join(tmp, 'site');
fs.mkdirSync(site);
execFileSync(process.execPath, [path.join(ROOT, 'tools/parts.mjs'), 'assemble', '--ship', '--min-glsl', path.join(ROOT, 'src'), ship], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(ROOT, 'tools/minify.mjs'), '--build', ship, site], { stdio: 'pipe' });

// the properties of a script: every non-computed member name and every non-computed object key (a quoted key too)
function propsOf(code) {
  const out = new Set(), ast = acorn.parse(code, { ecmaVersion: 'latest' });
  (function go(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'MemberExpression' && !n.computed && n.property.type === 'Identifier') out.add(n.property.name);
    if (n.type === 'Property' && !n.computed) out.add(n.key.type === 'Identifier' ? n.key.name : String(n.key.value));
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(go); else if (v && typeof v.type === 'string') go(v); }
  })(ast);
  return out;
}
const inkIn = fs.readFileSync(path.join(ship, 'inkbirds.js'), 'utf8'), inkOut = fs.readFileSync(path.join(site, 'inkbirds.js'), 'utf8');
const after = propsOf(inkOut), renamed = [...propsOf(inkIn)].filter((p) => !after.has(p)).sort();

// what each renamed name must not be: in another script, a property (a member, a key), a global's name or a string's
// word (a local's name, mangled, reaches no one else's object); in a page, a stylesheet or JSON, any word
const words = new Map();   // word -> the first file it is in
const add = (ws, where) => { for (const w of ws) if (!words.has(w)) words.set(w, where); };
function reach(code) {
  const w = new Set(propsOf(code));
  for (const tk of acorn.tokenizer(code, { ecmaVersion: 'latest' })) if (tk.type.label === 'string' || tk.type.label === 'template') for (const x of String(tk.value).match(WORD) || []) w.add(x);
  const g = code.match(/(?:^|[^\w$.])(window|self|globalThis)\.([A-Za-z_$][\w$]*)/g) || []; for (const m of g) w.add(m.split('.').pop());
  return w;
}
for (const f of fs.readdirSync(site).sort()) if (f !== 'inkbirds.js') add(reach(fs.readFileSync(path.join(site, f), 'utf8')), 'the minified ' + f);
for (const d of ['site', 'src/birds/model']) for (const f of fs.readdirSync(path.join(ROOT, d)).sort()) {
  const t = /\.(js|html|json|css)$/.test(f) ? fs.readFileSync(path.join(ROOT, d, f), 'utf8') : null;
  if (t !== null) add(f.endsWith('.js') ? reach(t) : t.match(WORD) || [], d + '/' + f);
}
for (const tk of acorn.tokenizer(inkIn, { ecmaVersion: 'latest' })) if (tk.type.label === 'string' || tk.type.label === 'template') add(String(tk.value).match(WORD) || [], 'a string of the ink birds\' (' + JSON.stringify(String(tk.value).slice(0, 40)) + ')');
const T = path.dirname(createRequire(import.meta.url).resolve('terser/package.json'));
const dom = new Set(fs.readFileSync(path.join(T, 'tools/domprops.js'), 'utf8').match(/"([^"]+)"/g).map((q) => q.slice(1, -1)));
const builtin = new Set();
for (const o of [globalThis, Object, Object.prototype, Array, Array.prototype, String.prototype, Number, Number.prototype, Function.prototype, Math, JSON, Float32Array.prototype, Float64Array.prototype, Int32Array.prototype, Uint8Array.prototype, Uint16Array.prototype, Map.prototype, Set.prototype, Promise.prototype, Date.prototype, RegExp.prototype, Error.prototype]) for (let p = o; p; p = Object.getPrototypeOf(p)) for (const k of Object.getOwnPropertyNames(p)) builtin.add(k);

const bad = [];
for (const p of renamed) {
  if (words.has(p)) bad.push(p + ': in ' + words.get(p));
  else if (dom.has(p) || builtin.has(p)) bad.push(p + ': a DOM or built-in property');
}
if (process.argv.includes('--json')) console.log(JSON.stringify({ renamed, bad }, null, 1));
else console.log('props: ' + renamed.length + ' of the ink birds\' properties renamed: ' + renamed.join(' '));
if (renamed.length < 50) { console.error('::error::props: only ' + renamed.length + ' properties renamed (the minifier renames the ink birds\' own: tools/minify.mjs)'); process.exit(1); }
if (bad.length) { for (const b of bad) console.error('::error::props: renamed across a script boundary: ' + b); process.exit(1); }
console.log('props: none of them is in another served file, in a string of the ink birds\', or a DOM or built-in property');
