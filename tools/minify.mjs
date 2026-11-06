// minify.mjs: the world's shipped scripts, minified (fast500 lane C, steps 4b and 4c; the owner's "Minified scripts":
// a committed minified copy, made by this script, CI checking it is exactly what this script makes from the sources).
// A change to this file alone changes no served byte: the gate checks the build (validate.yml) and merges it without rendering.
//
//   node tools/minify.mjs DIR                  rewrite DIR's scripts in place, minified
//   node tools/minify.mjs --build SRC SITE     write SRC's scripts into SITE, minified (the same names)
//   node tools/minify.mjs --check SRC SITE     minify SRC's scripts in memory; exit 1 naming each SITE file that differs
//   node tools/minify.mjs --report SRC         print each script's bytes (raw, brotli q4, q11) before and after, as JSON
//   ... --start-src DIR                        (with --build or --check) make the start file from DIR, not SRC
// (restructure step 2) SRC is the shipped build, the record and the dev harness left out by file: node tools/parts.mjs
// assemble --ship src build/ship. The start file is made from the dev build (assemble src build/src): --start-src.
//
// (fast500 step 5) Where SITE/index.html loads a start file (/start.vN.js), --build also writes SITE/start.vN.js and
// --check also holds it: tools/start.mjs makes it from SRC's scripts as SITE/index.html loads them (the hour and site.js
// from SITE), run in a fake browser; CI fails unless the committed file is exactly that (and unless one table of
// programs serves every device and visit the start file serves).
//
// The scripts are the five the world's page loads, readable as strip.py ships them (world, inkbirds, realm-kit,
// realm-dunes, realm-above), under their dev names (world.js) or their served names (world.v3.js); any other file in
// the folder is left alone. Each is:
//   1. (world only, step 4b) cut: the record and the switches (diag v2's engine side) and the dev harness are taken
//      out by exact, counted cuts (each anchor a whole line found exactly once, else exit 1). What the rest of the
//      file needs stays, as empty functions: the four it calls without an `if (REC)` (recMark, recShown, recWrap,
//      devGL: each a no-op on the shipped page, where REC is null, DEVMODE false and SW.wrap 0). REC, STILLMODE,
//      DEVMODE and DEVKEEP (each declared once, null or false, never assigned again: checked) lose their declarations
//      and become the constant false (terser's global_defs), so what they guard (the record's hooks, the harness's
//      branches) is dropped as dead code. (fast500's deep sweep, 2026-11-05) So do the switches: SW's line goes with the record (the shipped
//      page sets no switch), its one object literal is read and every SW.<key> becomes its default (global_defs,
//      dotted; after the cut SW is only ever read key by key, never written, computed or used whole: checked), so
//      what only another value of a switch reaches is dropped too.
//   1b. (inkbirds, the one bird, 2026-11-06) the ink birds read no dev flag: HOST.dev must not appear in them (else
//      exit 1); the planner's dev tallies it once guarded are gone with the planner.
//   2. minified by terser (pinned 5.51.2: the TERSER environment variable names its package folder, else node's own
//      resolution from here): compress and mangle, never the top level (the scripts share the page's global WORLD),
//      Safari 10's mangler and printer workarounds on, the original quotes kept, ES5 output rules (no syntax
//      the source does not already use). A string's value never changes: a template literal without substitutions
//      is printed as a string (its newlines escaped: the same characters), a constant concatenation is evaluated
//      exactly; the GLSL guard (glsl_guard.js) proves every shader source byte for byte the same at run time. Every
//      comment is dropped but the provenance note and the INIT-END marker (put back on a line of its own: putMarker).
//   3. checked, else exit 1: no name is undeclared in the output that was not undeclared in the input (terser's scope
//      analysis: the cut left nothing dangling); the comments kept are there (the two-line provenance note every
//      shipped script starts with, the INIT-END marker where the source has one, with nothing CI holds above it
//      (getRandomValues, performance.now) moved below it, any licence comment); the script's function as strict
//      ("use strict") as the source's; no CR in the input (a CRLF checkout would change every template's text).
// Deterministic: the same input gives the same bytes on any OS (no paths, no time, LF, one newline at the end).
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createRequire } from 'module';
import { pathToFileURL, fileURLToPath } from 'url';

const TERSER_VERSION = '5.51.2';
const STEMS = ['world', 'inkbirds', 'realm-kit', 'realm-dunes', 'realm-above'];
const NAME = new RegExp('^(' + STEMS.join('|') + ')(\\.v\\d+)?\\.js$');

function die(msg) { console.error('minify: FAIL: ' + msg); process.exit(1); }

async function loadTerser() {
  let dir = process.env.TERSER;
  if (!dir) {
    try { dir = path.dirname(createRequire(fileURLToPath(import.meta.url)).resolve('terser/package.json')); }
    catch (e) { die('terser not found (npm ci, or set TERSER to its package folder)'); }
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  if (pkg.version !== TERSER_VERSION) die('terser ' + pkg.version + ' at ' + dir + ' (pinned: ' + TERSER_VERSION + ')');
  return import(pathToFileURL(path.join(dir, 'main.js')).href);
}

// ------------------------------------------------------------------ step 4b: the record out of the shipped world
/* (restructure step 2) the record, the switches and the dev harness are no longer cut here: they are dev-only parts
   (src/dev/world/), left out by file in the shipped build (node tools/parts.mjs assemble --ship), each with its stub
   (the switches' defaults, and recMark, recShown, recWrap and devGL as no-ops). What is left here is a check that the
   input is that shipped build, and the dev constants below. */
let SWLINE = null; const SWDEFS = {};   // (fast500's deep sweep, 2026-11-05: the switches' line as cut, and its defaults as global_defs)
function cutRecord(s) {
  let L = s.split('\n');
  const log = [];
  if (!L.some((l) => l.startsWith('  function recMark() {}'))) die('the world is not the shipped build (no recMark stub): node tools/parts.mjs assemble --ship src DIR, then minify DIR');
  if (L.some((l) => l.startsWith('  var REC = null'))) die('the world has the record in it (REC declared): minify the shipped build (node tools/parts.mjs assemble --ship)');
  { const k = L.map((l, n) => (l.startsWith('  var SW = {') ? n : -1)).filter((n) => n >= 0);   // (fast500's deep sweep, 2026-11-05) the switches' line (src/world/503-switches.js, in both builds): cut, its defaults the constants of every SW.<key> (SWDEFS)
    if (k.length !== 1) die('cut SW: the line "  var SW = {" found ' + k.length + ' times (want 1)');
    SWLINE = L[k[0]]; L.splice(k[0], 1); }
  // the dev constants: each declared once and never assigned again; its declaration taken out (REC's went with the
  // cut) and every reference made the constant false by the compressor (global_defs: a reference to the name only,
  // never a local of the same name), so what they guard (the record's hooks, the harness's branches) is dead code
  for (const d of DECLS) {
    if (!d.line) continue;
    const k = L.map((l, n) => (l.startsWith(d.line) ? n : -1)).filter((n) => n >= 0);
    if (k.length !== 1) die('cut ' + d.name + ': the line ' + JSON.stringify(d.line) + ' found ' + k.length + ' times (want 1)');
    L.splice(k[0], 1);
    log.push(d.name + ': its declaration out, the constant false');
  }
  const code = L.join('\n');
  { const m = SWLINE.match(/^  var SW = (\{[^}]*\});/); if (!m) die('SW: its line is not one object literal');
    const o = Function('return ' + m[1])(); for (const k of Object.keys(o)) SWDEFS['SW.' + k] = o[k];
    const w = code.match(/(^|[^\w$.])SW\s*(\[|\.\w+\s*(=(?!=)|\+\+|--|[-+*\/|&]=))|(\+\+|--)\s*SW\.|(^|[^\w$.])SW(?![\w$.])/gm);
    if (w) die('SW: written, computed or used whole after the cut (' + w.join(' | ') + ')');
    log.push('SW: its line out, ' + Object.keys(o).length + ' switches the constant defaults'); }
  for (const d of DECLS) {
    const n = d.name;
    const w = code.match(new RegExp('(^|[^\\w$.])' + n + '\\s*(=(?!=)|\\+\\+|--|[-+*/|&]=)|(\\+\\+|--)\\s*' + n + '\\b|\\b(var|let|const|function)\\s+' + n + '\\b', 'g'));
    if (w) die('cut ' + n + ': assigned or declared in the world after the cut (' + w.map((x) => x.trim()).join(' | ') + '): no constant');
  }
  return { code, log };
}
const DECLS = [   // the declaration lines, each the start of exactly one line (REC's, "var REC = null, RECW = null;", is in the record, a dev part)
  { name: 'REC' },
  { name: 'STILLMODE', line: '  var STILLMODE = false; ' },
  { name: 'DEVMODE', line: '  var DEVMODE = false; ' },
  { name: 'DEVKEEP', line: '  var DEVKEEP = false;' }];
const GLOBAL_DEFS = Object.fromEntries(DECLS.map((d) => [d.name, false]));

// ------------------------------------------------------------------ (fast500's deep sweep, 2026-11-05) the ink birds' dev flag
function cutInk(s) {   // (the ink birds' dev members and the staging's dev hooks are no longer in src/: no line is cut)
  const log = [];
  const n = s.split('HOST.dev').length - 1;
  if (n !== 0) die('ink: HOST.dev ' + n + ' times (want none)');
  log.push('HOST.dev: none');
  return { code: s, log };
}

// ------------------------------------------------------------------ step 4c: terser
const NOTE1 = ' The comments in this file keep the tags and file names';
const NOTE2 = ' fixes and judges; notes.md';
const MARK = '---- INIT-END:';
function keepComment(node, c) {   // (the INIT-END marker: only the one this script puts back, below)
  const v = c.value;
  return c.c4cMarker === true || (!v.includes(MARK) && (v.startsWith(NOTE1) || v.startsWith(NOTE2) || /@license|@preserve|^!/.test(v)));
}
const OPTIONS = {
  ecma: 5, module: false, toplevel: false, safari10: true, ie8: false,
  compress: { passes: 2, unsafe: false, drop_console: false, keep_fargs: true, keep_infinity: true },
  mangle: { safari10: true, toplevel: false },
  format: { comments: keepComment, quote_style: 3, ascii_only: false, beautify: false, semicolons: true, preamble: null },
  sourceMap: false
};
const FORMAT = Object.assign({}, OPTIONS.format, { ecma: 5, safari10: true, ie8: false });   // (what minify() gives its printer)

/* The INIT-END marker, put back where the source has it. terser keeps a comment only while the token it is attached to
   is printed, and the compressor joins the statements about the marker (var a = ..; var b = ..: one var), so the
   marker is placed by the compressed and mangled tree's own source positions instead: in the statement list that
   holds the marker in the source (the script's function), split at the marker if a joined statement (a var, a
   sequence) spans it, attached to the first statement after it. Every statement before it must come from the source
   above the marker and every one after it from below (the compressor moved nothing across it), else exit 1. */
const KIDS = ['body', 'expression', 'args', 'definitions', 'value', 'expressions', 'condition', 'consequent', 'alternative', 'left', 'right', 'init'];
const P0 = (n) => (n && n.start ? n.start.pos : -1), P1 = (n) => (n && n.end ? n.end.pos : -1);   // (a token has no end position: its start)
function holder(node, m) {   // the innermost node with a statement list (body: [...]) spanning m
  let best = null; const seen = new Set();
  (function go(n) {
    if (!n || typeof n !== 'object' || seen.has(n)) return; seen.add(n);
    if (Array.isArray(n)) { n.forEach(go); return; }
    if (!n.start || !(P0(n) <= m && m <= P1(n))) return;
    if (Array.isArray(n.body)) best = n;
    for (const k of KIDS) if (n[k]) go(n[k]);
  })(node);
  return best;
}
function putMarker(name, ast, m, text) {
  const H = holder(ast, m);
  if (!H) die(name + ': no statement list holds the INIT-END marker');
  const B = H.body;
  let i = B.findIndex((st) => P1(st) > m);
  if (i < 0) die(name + ': nothing follows the INIT-END marker');
  const st = B[i];
  if (P0(st) < m) {   // a joined statement spans the marker: split it there
    const key = st.definitions ? 'definitions' : st.body && st.body.expressions ? 'expressions' : null;
    const list = key === 'definitions' ? st.definitions : key ? st.body.expressions : null;
    if (!list) die(name + ': the statement over the INIT-END marker (' + st.TYPE + ') cannot be split');
    const k = list.findIndex((x) => P0(x) > m);
    if (k <= 0 || list.slice(k).some((x) => P0(x) < m) || list.slice(0, k).some((x) => P1(x) > m)) die(name + ': the ' + st.TYPE + ' over the INIT-END marker mixes code from both sides');
    let a, b;
    if (key === 'definitions') {
      a = new st.constructor(Object.assign({}, st, { definitions: list.slice(0, k) }));
      b = new st.constructor(Object.assign({}, st, { definitions: list.slice(k), start: list[k].start }));
    } else {
      const seq = (xs) => (xs.length === 1 ? xs[0] : new st.body.constructor(Object.assign({}, st.body, { expressions: xs, start: xs[0].start })));
      a = new st.constructor(Object.assign({}, st, { body: seq(list.slice(0, k)) }));
      b = new st.constructor(Object.assign({}, st, { body: seq(list.slice(k)), start: list[k].start }));
    }
    B.splice(i, 1, a, b); i++;
  }
  const bad = B.slice(0, i).filter((x) => P1(x) > m).concat(B.slice(i).filter((x) => P0(x) < m));
  if (bad.length) die(name + ': the compressor moved code across the INIT-END marker (' + bad.map((x) => x.TYPE + '@' + P0(x)).join(' ') + ')');
  const t = B[i].start, tok = Object.assign(Object.create(Object.getPrototypeOf(t)), t);
  tok.comments_before = [{ type: 'comment2', value: text, c4cMarker: true, nlb: true, pos: m, endpos: m + text.length + 4, line: t.line, col: 0 }];
  tok.nlb = true;   // (the marker on a line of its own: what follows starts the next line)
  B[i].start = tok;
}
async function globalsOf(T, code) {
  const r = await T.minify(code, { compress: false, mangle: false, module: false, toplevel: false, format: { ast: true, code: true, comments: false, quote_style: 3 } });
  r.ast.figure_out_scope({});
  const g = new Set([...r.ast.globals.keys()]); g.code = r.code;   // (the code as read: no comments)
  return g;
}
const count = (s, re) => (s.match(re) || []).length;
async function build(T, name, input, cut = true) {   // (cut false: --report's measure of 4c alone)
  if (input.includes('\r')) die(name + ': a CR in the input (LF only: a CRLF checkout changes every template literal)');
  const stem = name.match(NAME)[1];
  let code = input, log = [];
  if (stem === 'world' && cut) ({ code, log } = cutRecord(input));
  if (stem === 'inkbirds' && cut) ({ code, log } = cutInk(input));
  const opts = Object.assign({}, OPTIONS, { format: Object.assign({}, OPTIONS.format, { ast: true, code: false }) });
  if (stem === 'world' && cut) opts.compress = Object.assign({}, OPTIONS.compress, { global_defs: Object.assign({}, GLOBAL_DEFS, SWDEFS) });
  const r = await T.minify(code, opts);
  const at = code.indexOf(MARK);
  if (at >= 0) {
    if (code.indexOf(MARK, at + 1) >= 0) die(name + ': two INIT-END markers');
    const m = code.lastIndexOf('/*', at), e = code.indexOf('*/', at);
    if (m < 0 || e < 0 || code.slice(m, at).includes('*/')) die(name + ': the INIT-END marker is not a /* */ comment');
    putMarker(name, r.ast, m, code.slice(m + 2, e));
  }
  const out = r.ast.print_to_string(FORMAT) + '\n';
  // the checks
  const g0 = await globalsOf(T, input), g1 = await globalsOf(T, out);
  const extra = [...g1].filter((x) => !g0.has(x)).sort();
  if (extra.length) die(name + ': undeclared in the output, not in the input: ' + extra.join(' ') + ' (the cut left a reference dangling)');
  const gone = [...g0].filter((x) => !g1.has(x)).sort();
  const lines = input.split('\n');
  if (lines[0].startsWith('//' + NOTE1) && !(out.startsWith(lines[0] + '\n' + lines[1] + '\n'))) die(name + ': the provenance note is not the output\'s first two lines');
  const ie = count(input, /---- INIT-END:/g);
  if (count(out, /---- INIT-END:/g) !== ie) die(name + ': the INIT-END marker ' + ie + ' times in the input, ' + count(out, /---- INIT-END:/g) + ' in the output');
  if (ie) {   // what CI holds above the marker (the entropy, the clock) stays above it
    for (const re of [/getRandomValues\(/g, /performance\.now\(/g, /Math\.random/g, /\bDate\b/g, /randomUUID/g]) {
      const below = (s) => count(s.slice(s.indexOf(MARK)), re);
      if (below(out) > below(code)) die(name + ': ' + re.source + ' below the INIT-END marker in the output (' + below(out) + ', the source ' + below(code) + ')');
      if (count(out, re) > count(code, re)) die(name + ': ' + re.source + ' more often in the output than in the source');
    }
  }
  const lic = count(input, /@license|@preserve|\/\*!/g);
  if (count(out, /@license|@preserve|\/\*!/g) < lic) die(name + ': a licence comment lost');
  // the script's own function as strict as in the source (terser drops a nested "use strict": redundant inside it)
  const strictTop = (c) => /^[!(]*function\s*\([^)]*\)\s*\{\s*(['"])use strict\1/.test(c);
  if (strictTop(g1.code) !== strictTop(g0.code)) die(name + ': the script\'s function is ' + (strictTop(g0.code) ? '' : 'not ') + 'strict in the input, ' + (strictTop(g1.code) ? '' : 'not ') + 'in the output');
  return { out, cut: code, log, gone };
}

function scripts(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) die('no folder ' + dir);
  const f = fs.readdirSync(dir).filter((n) => NAME.test(n)).sort();
  const stems = f.map((n) => n.match(NAME)[1]);
  for (const s of STEMS) if (stems.filter((x) => x === s).length !== 1) die(dir + ': ' + stems.filter((x) => x === s).length + ' files for ' + s + ' (want 1)');
  return f;
}
const read = (p) => fs.readFileSync(p, 'utf8');
function startName(site) {   // (fast500 5) the start file SITE/index.html loads, or null
  const ix = path.join(site, 'index.html');
  if (!fs.existsSync(ix)) return null;
  const m = [...read(ix).replace(/<!--[\s\S]*?-->/g, '').matchAll(/<script\b[^>]*\bsrc="\/(start(?:\.v\d+)?\.js)"/g)];
  if (m.length > 1) die(ix + ' loads ' + m.length + ' start files (want at most 1)');
  return m.length ? m[0][1] : null;
}
const br = (s, q) => zlib.brotliCompressSync(Buffer.from(s, 'utf8'), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: q } }).length;
const sizes = (s) => ({ raw: Buffer.byteLength(s, 'utf8'), br4: br(s, 4), br11: br(s, 11) });

const a0 = process.argv.slice(2), si = a0.indexOf('--start-src');
// (restructure step 2) --start-src DIR: the scripts tools/start.mjs runs, as written (the dev build: the record in it,
// REC declared); SRC, minified, is the shipped build (the record left out by file). Without it, SRC for both.
const START_SRC = si >= 0 ? a0[si + 1] : null, a = si >= 0 ? a0.slice(0, si).concat(a0.slice(si + 2)) : a0;
if (si >= 0 && !START_SRC) die('--start-src needs a folder');
const T = await loadTerser();
if (a[0] === '--check') {
  const [src, site] = a.slice(1);
  if (!src || !site) die('usage: minify.mjs --check SRC SITE');
  let bad = 0;
  for (const n of scripts(src)) {
    const { out } = await build(T, n, read(path.join(src, n)));
    const p = path.join(site, n);
    if (!fs.existsSync(p)) { console.error('minify: ' + p + ' is missing (the script makes it from ' + path.join(src, n) + ')'); bad = 1; continue; }
    if (fs.readFileSync(p).equals(Buffer.from(out, 'utf8'))) console.log('ok   ' + p + ' is what the script makes from ' + path.join(src, n));
    else { console.error('::error::' + p + ' is not what tools/minify.mjs makes from ' + path.join(src, n) + ' (rebuild: node tools/minify.mjs --build ' + src + ' ' + site + ')'); bad = 1; }
  }
  const sn = startName(site);
  if (sn) {
    let out = null;
    try { out = await (await import('./start.mjs')).makeStart(START_SRC || src, path.join(site, 'index.html'), null, undefined, sn); } catch (e) { console.error('::error::the start file cannot be made: ' + (e && e.message || e)); bad = 1; }
    if (out !== null) for (const [p, text] of [[path.join(site, sn), out.start], [path.join(site, out.tableName), out.table]]) {   // (the start file and its table, start-table.vN.js)
      if (fs.existsSync(p) && fs.readFileSync(p).equals(Buffer.from(text, 'utf8'))) console.log('ok   ' + p + ' is what tools/start.mjs makes from ' + (START_SRC || src));
      else { console.error('::error::' + p + ' is not what tools/start.mjs makes from ' + src + ' (rebuild: node tools/minify.mjs --build ' + src + ' ' + site + ')'); bad = 1; }
    }
  }
  process.exit(bad);
} else if (a[0] === '--report') {
  const src = a[1]; if (!src) die('usage: minify.mjs --report SRC');
  const rows = [];
  for (const n of scripts(src)) {
    const input = read(path.join(src, n)), { out, cut, log, gone } = await build(T, n, input);
    const nocut = n.startsWith('world') ? sizes((await build(T, n, input, false)).out) : undefined;
    rows.push({ file: n, before: sizes(input), cut: nocut && sizes(cut), minifiedWithoutTheCut: nocut, after: sizes(out), log, globalsOnlyTheCutUsed: gone.length ? gone : undefined });
  }
  console.log(JSON.stringify(rows, null, 1));
} else if (a[0] === '--build') {
  const [src, site] = a.slice(1);
  if (!src || !site) die('usage: minify.mjs --build SRC SITE');
  for (const n of scripts(src)) {
    const input = read(path.join(src, n)), { out } = await build(T, n, input);
    fs.writeFileSync(path.join(site, n), out);
    console.error('minify: ' + path.join(site, n) + ' made from ' + path.join(src, n) + ' (' + Buffer.byteLength(input) + ' -> ' + Buffer.byteLength(out) + ' bytes)');
  }
  const sn = startName(site);
  if (sn) {
    const out = await (await import('./start.mjs')).makeStart(START_SRC || src, path.join(site, 'index.html'), null, undefined, sn);
    for (const [n, text] of [[sn, out.start], [out.tableName, out.table]]) {   // (the start file and its table, start-table.vN.js)
      fs.writeFileSync(path.join(site, n), text);
      console.error('minify: ' + path.join(site, n) + ' made by tools/start.mjs from ' + (START_SRC || src) + ' (' + Buffer.byteLength(text) + ' bytes)');
    }
  }
} else if (a.length === 1 && !a[0].startsWith('--')) {
  const dir = a[0];
  for (const n of scripts(dir)) {
    const p = path.join(dir, n), input = read(p), { out, log } = await build(T, n, input);
    fs.writeFileSync(p, out);
    console.error('minify: ' + n + ' ' + Buffer.byteLength(input) + ' -> ' + Buffer.byteLength(out) + ' bytes' + (log.length ? ' (' + log.join('; ') + ')' : ''));
  }
} else die('usage: minify.mjs DIR | --build SRC SITE | --check SRC SITE | --report SRC  [--start-src DIR]');
