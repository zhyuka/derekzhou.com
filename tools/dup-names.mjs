// dup-names.mjs: no name is declared twice in one scope of a served script (RULES.json "no-duplicate-names").
// The world and the ink birds are section files joined into one script with one scope, so two sections can each
// declare `function lateWarm()` and the later silently replaces the earlier (2026-11-06: no late program was ever
// warmed). JavaScript allows that for function declarations and var, so neither the parser nor the browser says a
// word. This parses each assembled script (acorn, which terser already brings) and fails on any name declared twice
// in the same scope where one replaces the other unseen: two function declarations, a function and a var, or two
// vars from different section files (let, const and class twice are syntax errors already and fail the parse). A var
// declared twice inside one section's function is a local reused, and is only counted (--all lists them). Each
// finding names both section files and their lines.
//   node tools/dup-names.mjs          the dev build and the shipped build of src/, and src/birds/model/'s files
//   node tools/dup-names.mjs --all    also list every var reused within one section
//   node tools/dup-names.mjs --self-test   the check on planted cases (CI runs it first: it must catch each)
// Exit 1 on a new duplicate or a script that does not parse. KNOWN holds the duplicates found on main when this check
// came (2026-11-06), reported to the hub and left to their lanes: each prints a warning until it is fixed; take its
// line out of KNOWN in the PR that fixes it. Run by npm run check:quick and by CI.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const acorn = createRequire(import.meta.url)(path.join(ROOT, 'node_modules', 'acorn'));
const SRC = path.join(ROOT, 'src'), DEV = path.join(SRC, 'dev');

// --- the scripts, each as [name, [[file, text], ...]] (its pieces in order) --------------------------------------
const PART = /^\d{3}-[a-z0-9-]+\.js$/, STUB = /^\d{3}-[a-z0-9-]+\.ship\.js$/;
const ls = (d, re) => (fs.existsSync(d) ? fs.readdirSync(d).filter((n) => re.test(n)) : []);
const expand = (t, g) => t.replace(/`@glsl ([a-z0-9-]+)`/g, (_, n) => '`' + fs.readFileSync(path.join(g, n + '.glsl'), 'utf8') + '`');
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
function pieces(dir, ship) {
  const devDir = path.join(DEV, path.relative(SRC, dir));
  const pick = ls(dir, PART).map((n) => path.join(dir, n)).concat(ship ? ls(dir, STUB).map((n) => path.join(dir, n)) : ls(devDir, PART).map((n) => path.join(devDir, n)));
  pick.sort((x, y) => (path.basename(x) < path.basename(y) ? -1 : 1));
  return pick.map((f) => [rel(f), expand(fs.readFileSync(f, 'utf8'), path.join(dir, 'glsl'))]);
}
function scripts(ship) {
  const out = [];
  (function walk(d, top) {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = path.join(d, e.name);
      if (p === DEV || e.name === 'glsl') continue;
      if (e.isDirectory()) {
        if (fs.existsSync(path.join(p, 'parts.json'))) out.push([JSON.parse(fs.readFileSync(path.join(p, 'parts.json'), 'utf8')).out, pieces(p, ship)]);
        else walk(p, false);
      } else if (e.isFile() && e.name.endsWith('.js') && (top || rel(d) === 'src/birds/model')) {
        out.push([rel(p), [[rel(p), top ? expand(fs.readFileSync(p, 'utf8'), path.join(SRC, 'glsl')) : fs.readFileSync(p, 'utf8')]]]);
      }
    }
  })(SRC, true);
  return out;
}

// --- where a line of the joined script came from -------------------------------------------------------------------
function locator(ps) {
  const starts = []; let line = 1;
  for (const [f, t] of ps) { starts.push([line, f]); line += (t.match(/\n/g) || []).length; }
  return (l) => { let k = 0; while (k + 1 < starts.length && starts[k + 1][0] <= l) k++; return starts[k][1] + ':' + (l - starts[k][0] + 1); };
}

// --- scopes ----------------------------------------------------------------------------------------------------------
const isFn = (n) => n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression';
function names(pattern, out) {   // (the identifiers a declaration's pattern binds)
  if (!pattern) return out;
  if (pattern.type === 'Identifier') out.push(pattern);
  else if (pattern.type === 'ObjectPattern') pattern.properties.forEach((p) => names(p.type === 'RestElement' ? p.argument : p.value, out));
  else if (pattern.type === 'ArrayPattern') pattern.elements.forEach((e) => names(e, out));
  else if (pattern.type === 'RestElement') names(pattern.argument, out);
  else if (pattern.type === 'AssignmentPattern') names(pattern.left, out);
  return out;
}
function check(ast, where, report) {
  // A function scope: var and the function declarations of its own body. A block: its function declarations (and
  // let/const/class, which the parser already holds to one each).
  const visit = (node, fnScope, blockScope) => {
    if (!node || typeof node.type !== 'string') return;
    const declare = (scope, id, kind) => {
      const had = scope.get(id.name);
      if (had) report(where(had.line), had.kind, where(id.loc.start.line), kind, id.name);
      else scope.set(id.name, { line: id.loc.start.line, kind });
    };
    if (node.type === 'VariableDeclaration' && node.kind === 'var') for (const d of node.declarations) for (const id of names(d.id, [])) declare(fnScope, id, 'var');
    if (node.type === 'FunctionDeclaration' && node.id) declare(blockScope, node.id, 'function');
    let f = fnScope, b = blockScope;
    if (isFn(node) || node.type === 'Program') { f = b = new Map(); }
    else if (node.type === 'BlockStatement' || node.type === 'StaticBlock' || node.type === 'SwitchStatement') b = new Map([...[]]);
    // (a block's function shares no map with its function scope, so `function a` in a block beside `var a` outside is
    //  shadowing, not a duplicate; but a function body's own top-level declarations meet its vars)
    if ((isFn(node) && node.body && node.body.type === 'BlockStatement') || node.type === 'Program') {
      const body = node.type === 'Program' ? node : node.body;
      for (const s of body.body) visitTop(s, f);
      return;
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'start' || k === 'end') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach((c) => visit(c, f, b)); else if (v && typeof v.type === 'string') visit(v, f, b);
    }
  };
  const visitTop = (s, f) => visit(s, f, f);   // (a function body's or the program's own statements: one scope for var and function)
  visit(ast, null, null);
}

// script: name -> why it is known (left to its lane; take the line out when it is fixed)
const KNOWN = new Map([
  ['world.js:lateWarm', 'lane D renames the world\'s to lateWarmProgs (claude/bird-late)'],
  ['inkbirds.js:BA', 'the wings\' bout scratch and the planner\'s band box share one object (110-wings, 160-planner): reported, not fixed'],
]);
const ALL = process.argv.includes('--all');

// --- the self-test: each case is [pieces, what must be reported ('' none)] ---------------------------------------
if (process.argv.includes('--self-test')) {
  const cases = [
    [[['a.js', '(function () {\n  function warm() {}\n'], ['b.js', '  function warm() {}\n})();\n']], 'warm function a.js:2 function b.js:1'],
    [[['a.js', 'var x = 1;\n'], ['b.js', 'function x() {}\n']], 'x var a.js:1 function b.js:1'],
    [[['a.js', '(() => {\n  var BA = {};\n'], ['b.js', '  var q, BA = [];\n})();\n']], 'BA var a.js:2 var b.js:1'],
    [[['a.js', 'function f() { function h() {} }\n'], ['b.js', 'function g() { function h() {} }\n']], ''],
    [[['a.js', 'function f() { var i; for (var i = 0; i < 2; i++); }\n']], 'i var a.js:1 var a.js:1'],
    [[['a.js', 'var y = 1;\nif (y) { function y2() {} }\n{ function z() {} }\nfunction z2() {}\n']], ''],
  ];
  let fails = 0;
  cases.forEach(([ps, want], k) => {
    const got = [];
    check(acorn.parse(ps.map((p) => p[1]).join(''), { ecmaVersion: 'latest', locations: true }), locator(ps), (a, ak, b, bk, id) => got.push([id, ak, a, bk, b].join(' ')));
    if ((got[0] || '') !== want || got.length > 1) { fails++; console.log(`::error::dup-names self-test ${k}: wanted "${want}", got "${got.join('; ')}"`); }
  });
  console.log(fails ? 'dup-names self-test: failed' : `dup-names self-test: ${cases.length} cases`);
  process.exit(fails ? 1 : 0);
}

// --- run -------------------------------------------------------------------------------------------------------------
let bad = 0, seen = new Set(), n = 0, reused = 0;
for (const [label, ship] of [['the shipped build', true], ['the dev build', false]]) {
  for (const [name, ps] of scripts(ship)) {
    const text = ps.map((p) => p[1]).join('');
    let ast;
    try { ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: true }); }
    catch (e) { console.log(`::error::${name} (${label}) does not parse: ${e.message} (${locator(ps)(e.loc ? e.loc.line : 1)})`); bad = 1; continue; }
    n++;
    check(ast, locator(ps), (a, ak, b, bk, id) => {
      const key = [name, id, a, b].join('|');
      if (seen.has(key)) return; seen.add(key);
      const msg = `${name}: ${id} declared twice in one scope: ${ak} at ${a}, ${bk} at ${b} (the second replaces the first)`;
      if (ak === 'var' && bk === 'var' && a.split(':')[0] === b.split(':')[0]) { reused++; if (ALL) console.log('note: ' + msg); return; }
      const known = KNOWN.get(name + ':' + id);
      if (known) { console.log(`::warning::${msg}. Known: ${known}`); return; }
      console.log(`::error::${msg}`);
      bad = 1;
    });
  }
}
console.log(bad ? 'dup-names: duplicates found' : `dup-names: ${n} scripts, no new name declared twice in one scope (${reused} vars reused within a section; --all lists them)`);
process.exit(bad);
