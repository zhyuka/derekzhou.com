// where.mjs: where a name of the world (or the ink birds) is declared, and which sections read it, assign it and write
// its members, by terser's scope analysis of the sections joined as tools/parts.mjs joins them (the dev build: each
// src/dev/<dir> part in its stub's place; @glsl markers left, so every position maps back to its section file).
//   node tools/where.mjs NAME            the world's NAME (src/world/), else the ink birds' (src/birds/inkbirds/)
//   node tools/where.mjs NAME --birds    the ink birds' only
//   node tools/where.mjs NAME --json     the same as JSON
// Only the one top-level function scope's names (each section's shared names); a name declared inside a function is
// that function's, not a section's. Exit 1 when NAME is not one of them.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const AREAS = { world: ['src/world', 'src/dev/world'], birds: ['src/birds/inkbirds', null] };

async function terser() {   // the AST classes and figure_out_scope (terser's own modules: main.js exports neither)
  const dir = process.env.TERSER || path.dirname(createRequire(import.meta.url).resolve('terser/package.json'));
  const lib = (f) => import(pathToFileURL(path.join(dir, 'lib', f)).href);
  const T = { ...(await lib('ast.js')), ...(await lib('parse.js')) };
  await lib('scope.js');
  return T;
}

// the area's section files in join order, a dev part in its stub's place
export function sections(root, area) {
  const [dir, dev] = AREAS[area].map((d) => d && path.join(root, d));
  const devs = dev && fs.existsSync(dev) ? fs.readdirSync(dev) : [];
  return fs.readdirSync(dir).filter((n) => /^\d{3}-[a-z0-9-]+(\.ship)?\.js$/.test(n)).sort().map((n) => {
    const m = n.match(/^(.*)\.ship\.js$/);
    return m && devs.includes(m[1] + '.js') ? path.join(dev, m[1] + '.js') : path.join(dir, n);
  });
}

// files: [[label, text], ...] joined in order. Returns null when name is not a top-level name, else
// { name, kind, decl: {file, line}, reads: {file: [lines]}, assigns: {file: [lines]}, members: {file: [lines]} }
export function whereIn(T, files, name) {
  let text = '';
  const offs = [];
  for (const [label, t] of files) { offs.push([text.length, label]); text += t; }
  const at = (pos) => {
    let k = offs.length - 1; while (offs[k][0] > pos) k--;
    return { file: offs[k][1], line: text.slice(offs[k][0], pos).split('\n').length };
  };
  const ast = T.parse(text, {});
  ast.figure_out_scope({});
  let top = null;   // the one function holding the sections' shared names: the scope with the most of them
  ast.walk(new T.TreeWalker((n) => { if (n instanceof T.AST_Lambda && (!top || n.variables.size > top.variables.size)) top = n; }));
  const def = top && top.variables.get(name);
  if (!def) return null;
  const assigns = new Set(), members = new Set();
  ast.walk(new T.TreeWalker((n) => {
    let t = null;
    if (n instanceof T.AST_Assign) t = n.left;
    else if ((n instanceof T.AST_UnaryPrefix || n instanceof T.AST_UnaryPostfix) && (n.operator === '++' || n.operator === '--')) t = n.expression;
    if (!t) return;
    if (t instanceof T.AST_SymbolRef && t.thedef === def) assigns.add(t.start.pos);
    else if (t instanceof T.AST_PropAccess) {
      let b = t; while (b instanceof T.AST_PropAccess) b = b.expression;
      if (b instanceof T.AST_SymbolRef && b.thedef === def) members.add(t.start.pos);
    }
  }));
  const group = (ps) => {
    const g = {};
    for (const p of [...ps].sort((a, b) => a - b)) { const w = at(p), l = (g[w.file] = g[w.file] || []); if (l[l.length - 1] !== w.line) l.push(w.line); }
    return g;   // (each line once)
  };
  const o = def.orig[0], reads = def.references.map((r) => r.start.pos).filter((p) => !assigns.has(p));
  const isFn = o instanceof T.AST_SymbolDefun;
  return { name, kind: isFn ? 'function' : o instanceof T.AST_SymbolConst ? 'const' : o instanceof T.AST_SymbolLet ? 'let' : 'var',
    decl: at(o.start.pos), reads: group(reads), assigns: group(assigns), members: group(members) };
}

let TT = null;
export async function whereFiles(files, name) { return whereIn(TT || (TT = await terser()), files, name); }
export async function where(name, area, root = ROOT) {
  const T = TT || (TT = await terser());
  const files = sections(root, area).map((f) => [path.relative(root, f).split(path.sep).join('/'), fs.readFileSync(f, 'utf8')]);
  return whereIn(T, files, name);
}

function show(r, area) {
  const list = (g) => Object.entries(g).map(([f, ls]) => '  ' + f + ': ' + ls.join(', ')).join('\n') || '  (none)';
  const others = (g) => Object.keys(g).filter((f) => f !== r.decl.file).length;
  return [r.kind + ' ' + r.name + ' (' + area + '), declared at ' + r.decl.file + ':' + r.decl.line,
    'read in ' + Object.keys(r.reads).length + ' sections (' + others(r.reads) + ' others):', list(r.reads),
    'assigned in ' + Object.keys(r.assigns).length + ' sections (' + others(r.assigns) + ' others):', list(r.assigns),
    'members written in ' + Object.keys(r.members).length + ' sections (' + others(r.members) + ' others):', list(r.members)].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), name = a.find((x) => !x.startsWith('--'));
  if (!name) { console.error('usage: node tools/where.mjs NAME [--birds] [--json]'); process.exit(2); }
  const areas = a.includes('--birds') ? ['birds'] : ['world', 'birds'];
  let r = null, area = null;
  for (area of areas) if ((r = await where(name, area))) break;
  if (!r) { console.error('where: ' + name + ' is not a top-level name of ' + areas.join(' or ')); process.exit(1); }
  console.log(a.includes('--json') ? JSON.stringify(Object.assign({ area }, r), null, 1) : show(r, area));
}
