// glslmin.mjs: a shader's text without its comments and spare whitespace, the same program token for token. The build
// minifies every src/**/glsl/NAME.glsl this way where it puts the text back into its script (tools/parts.mjs assemble
// --min-glsl), so the world issues and the browser compiles the short text; src/ keeps the
// readable one. No token changes but a function's own local names, shortened (mangleGlsl, below; never a name a
// script can find by its text):
//   - comments (// and /* */) go, and blank lines; each run of code lines between a preprocessor line and a uniform
//     declaration becomes one line (the world's folds skip a use on a line that starts "uniform", so each such line
//     stays a line of its own, in order);
//   - a preprocessor line (#version, #define, #ifdef ...) keeps its text as written but its comment and its outer space
//     (a #define's spacing is meaning: `#define A (1.0)` is not `#define A(1.0)`);
//   - within any other line, a space stays only where two tokens would lex as one (two words, `a - -b`, `x / *p`);
//   - the text's own leading and trailing whitespace become one newline or one space each (a .glsl file is a piece the
//     scripts join to others: what was apart stays apart);
//   - a file in KEEP (below: a script reads part of its text at run time) keeps that part as written, from its first
//     line's text to its last; the rest of the file is minified as any other (load-perf, 2026-11-25: dunes-glsl was kept
//     whole, comments and all, for its D_Hd alone).
// minGlsl(text) is checked by checkGlsl(text): the tokens of the result are the tokens of the text, in order, and every
// preprocessor line is the same line. The build fails on any difference.
//   node tools/glslmin.mjs FILE.glsl ...    print each file's size before and after (and check it)

// GLSL ES 3.00 tokens: words (identifiers, keywords), numbers, the operators longest first, any other single character
const OPS = ['<<=', '>>=', '++', '--', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '^^', '+=', '-=', '*=', '/=', '%=', '&=', '^=', '|='];
const NUM = /^(?:0[xX][0-9a-fA-F]+[uU]?|(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?[uUfF]?)/;
const WORD = /^[A-Za-z_][A-Za-z0-9_]*/;
export function tokens(code) {   // code: no comments, no preprocessor lines
  const out = []; let i = 0;
  while (i < code.length) {
    const c = code[i];
    if (/\s/.test(c)) { i++; continue; }
    const rest = code.slice(i, i + 64);
    let m = NUM.exec(rest) || WORD.exec(rest);
    if (m) { out.push(m[0]); i += m[0].length; continue; }
    const op = OPS.find((o) => code.startsWith(o, i));
    if (op) { out.push(op); i += op.length; continue; }
    out.push(c); i++;
  }
  return out;
}
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/\/\/[^\n]*/g, '');
const isPre = (l) => /^\s*#/.test(l);
const isUniform = (l) => /^\s*uniform\b/.test(l);   // (the folds' own test: 076-folds-finish's foldTok)

function joinTokens(ts) {   // the tokens, a space only where two neighbours would lex as something else
  let s = '', prev = null;
  for (const t of ts) {
    if (prev !== null) { const j = tokens(prev + t), k = prev.slice(-1) + t[0]; if (j.length !== 2 || j[0] !== prev || j[1] !== t || k === '/*' || k === '//') s += ' '; }   // (a slash and a star or slash would open a comment)
    s += t; prev = t;
  }
  return s;
}

export function minGlsl(text) {
  // the world reads its shaders' text by lines in two places, and both keep their lines: the folds (076-folds-finish)
  // skip a use on a line that starts "uniform", so a uniform declaration stays a line of its own; the prune (071) and
  // the compiler need a preprocessor line to start and end a line. Every other run of code lines becomes one line, its
  // tokens joined as within a line (HYGIENE, 2026-11-25: a newline where no space is needed was a byte for nothing)
  const out = []; let run = [];
  const flush = () => { if (run.length) { out.push(joinTokens(tokens(run.join('\n')))); run = []; } };
  for (const l of stripComments(text).split('\n')) {
    if (!l.trim()) continue;
    if (isPre(l)) { flush(); out.push(l.trim()); }
    else if (isUniform(l)) { flush(); out.push(joinTokens(tokens(l))); }
    else run.push(l);
  }
  flush();
  if (!out.length) return /\n/.test(text) ? '\n' : (text ? ' ' : '');
  let s = out.join('\n');
  const lead = /^\s*/.exec(text)[0], trail = /\s*$/.exec(text)[0];
  if (lead) s = (lead.includes('\n') ? '\n' : ' ') + s;
  if (trail) s += trail.includes('\n') ? '\n' : ' ';
  return s;
}

// The .glsl files with a part kept as written, because a script reads that part's text at run time, each part [its
// first text, its last] (the first found once in the file, the last the first after it):
//   dunes-glsl: the world's land split (HP_SITES_FN) finds D_Hd's body by its exact text, indentation and spaces
//   included: D_Hd is kept from its header to its closing brace
export const KEEP = new Map([['dunes-glsl', [['vec3 D_Hd(vec2 p) {', '\n}']]]]);
// minGlsl outside the kept parts, the parts as written (each starts a line and ends one: what is around it stays apart)
export function minGlslKeeping(text, parts, post = (x) => x) {
  let out = '', i = 0;
  for (const [a, z] of parts) {
    const s = text.indexOf(a, i);
    if (s < 0 || text.indexOf(a, s + 1) >= 0) throw new Error('a kept part\'s first text is not in the file exactly once: ' + a);
    const e = text.indexOf(z, s + a.length);
    if (e < 0) throw new Error('a kept part has no end: ' + JSON.stringify(z) + ' after ' + a);
    out += post(minGlsl(text.slice(i, s))) + text.slice(s, e + z.length);
    i = e + z.length;
  }
  return out + post(minGlsl(text.slice(i)));
}

// the same program: the same tokens in order (preprocessor lines compared whole, trimmed), the same lines' kinds
function parts(text) {
  const lines = stripComments(text).split('\n'), seq = []; let code = [];
  const flush = () => { if (code.length) { for (const t of tokens(code.join('\n'))) seq.push(t); code = []; } };
  for (const l of lines) { if (isPre(l)) { flush(); seq.push('#LINE ' + l.trim().replace(/\s+$/, '')); } else code.push(l); }
  flush();
  return seq;
}
export function checkGlsl(text, min = minGlsl(text)) {
  const a = parts(text), b = parts(min);
  if (a.length !== b.length) return `the minified text has ${b.length} tokens, the text ${a.length}`;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return `token ${i}: ${JSON.stringify(a[i])} became ${JSON.stringify(b[i])}`;
  if (min.includes('`') || min.includes('${')) return 'a backtick or ${ in the minified text';
  const code = min.split('\n').filter((l) => !isPre(l)).join('\n');
  if (code.includes('/*') || code.includes('//')) return 'a comment opener in the minified code (two tokens joined)';
  return null;
}

// ------------------------------------------------------------------ local names, shortened (HYGIENE, 2026-11-25)
// A function's own names (its parameters and the locals it declares) are renamed, within that function only, to the
// shortest names free there. Nothing a script can find by its text is touched: a name is kept as written when it is in
// PROTECT, the set of every identifier in any string or template literal of the scripts (a script may search a shader
// for it, splice code that uses it, or #define it) and in any preprocessor line of any .glsl file. A new name is never
// in PROTECT, never a name the function's own text holds (no shadowing), never a keyword or a type. Uniforms, globals,
// functions, struct fields (after a '.'), #define names and KEEP's parts are never renamed: only .glsl files are
// mangled, each part of a KEEP file outside its kept text. checkMangle proves the result the same program: the same
// tokens but for identifiers renamed one to one within a function, none of them protected.
const TYPES = new Set('float int uint bool void vec2 vec3 vec4 ivec2 ivec3 ivec4 uvec2 uvec3 uvec4 bvec2 bvec3 bvec4 mat2 mat3 mat4 mat2x2 mat2x3 mat2x4 mat3x2 mat3x3 mat3x4 mat4x2 mat4x3 mat4x4'.split(' '));
const QUALS = new Set(['in', 'out', 'inout', 'const', 'highp', 'mediump', 'lowp', 'precise']);
const RESERVED = new Set(('attribute const uniform varying layout centroid flat smooth noperspective break continue do for while switch case default if else in out inout true false invariant discard return struct precision highp mediump lowp sampler2D sampler3D samplerCube sampler2DArray sampler2DShadow isampler2D usampler2D ' +
  'common partition active asm class union enum typedef template this goto inline noinline volatile public static extern external interface long short double half fixed unsigned superp input output hvec2 hvec3 hvec4 dvec2 dvec3 dvec4 fvec2 fvec3 fvec4 sizeof cast namespace using main').split(' '));
const isId = (t) => /^[A-Za-z_]/.test(t);
function codeTokens(text) {   // [{ t, li }] over the code lines (preprocessor lines are not tokens here)
  const out = [];
  text.split('\n').forEach((l, li) => { if (!isPre(l)) for (const t of tokens(stripComments(l))) out.push({ t, li }); });
  return out;
}
function functions(toks) {   // [{ a, b, body }]: each top-level function definition, from its name to its closing brace
  const fns = []; let depth = 0;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i].t;
    if (depth === 0 && TYPES.has(t) && toks[i + 1] && isId(toks[i + 1].t) && !TYPES.has(toks[i + 1].t) && toks[i + 2] && toks[i + 2].t === '(') {
      let j = i + 3, pd = 1;
      while (j < toks.length && pd) { if (toks[j].t === '(') pd++; else if (toks[j].t === ')') pd--; j++; }
      if (toks[j] && toks[j].t === '{') {
        let k = j + 1, bd = 1;
        while (k < toks.length && bd) { if (toks[k].t === '{') bd++; else if (toks[k].t === '}') bd--; k++; }
        fns.push({ a: i + 1, b: k, body: j }); i = k - 1; continue;
      }
    }
    if (t === '{') depth++; else if (t === '}') depth--;
  }
  return fns;
}
function declared(toks, f) {   // the names a function declares: its parameters and its locals (TYPE a [= ...], b ...;)
  const out = new Set();
  for (let p = f.a + 2; p < f.body; p++) if (TYPES.has(toks[p].t) && toks[p + 1] && isId(toks[p + 1].t) && !TYPES.has(toks[p + 1].t)) out.add(toks[p + 1].t);
  for (let p = f.body + 1; p < f.b; p++) {
    if (!TYPES.has(toks[p].t)) continue;
    const prev = toks[p - 1].t;
    if (!['{', ';', '(', '}', ')'].includes(prev) && !QUALS.has(prev)) continue;
    let q = p + 1;
    while (q < f.b && toks[q] && isId(toks[q].t) && !TYPES.has(toks[q].t)) {
      out.add(toks[q].t); q++;
      let nest = 0;
      while (q < f.b && !(nest === 0 && (toks[q].t === ',' || toks[q].t === ';' || toks[q].t === ')'))) { if ('([{'.includes(toks[q].t)) nest++; else if (')]}'.includes(toks[q].t)) nest--; q++; }
      if (toks[q] && toks[q].t === ',') q++; else break;
    }
  }
  return out;
}
const NAMES = (() => { const a = 'abcdefghijklmnopqrstuvwxyz', out = [...a]; for (const c of a) for (const d of a + '0123456789') out.push(c + d); return out; })();
export function mangleGlsl(text, protect) {
  const lines = text.split('\n'), toks = codeTokens(text), ren = new Map();
  for (const f of functions(toks)) {
    const own = new Set(); for (let p = f.a; p < f.b; p++) own.add(toks[p].t);
    const uses = new Map();
    for (const n of declared(toks, f)) if (!protect.has(n) && !RESERVED.has(n) && n.length > 1) uses.set(n, 0);
    for (let p = f.a; p < f.b; p++) if (uses.has(toks[p].t) && toks[p - 1].t !== '.') uses.set(toks[p].t, uses.get(toks[p].t) + 1);
    const order = [...uses.keys()].sort((x, y) => uses.get(y) * (y.length - 1) - uses.get(x) * (x.length - 1) || (x < y ? -1 : 1));
    const free = NAMES.filter((n) => !own.has(n) && !protect.has(n) && !RESERVED.has(n) && !TYPES.has(n));
    const map = new Map(); order.forEach((n, i) => { if (free[i] && free[i].length < n.length) map.set(n, free[i]); });
    for (let p = f.a; p < f.b; p++) if (map.has(toks[p].t) && toks[p - 1].t !== '.') ren.set(p, map.get(toks[p].t));
  }
  if (!ren.size) return text;
  let ti = 0;
  return lines.map((l) => {
    if (isPre(l)) return l;
    const ts = tokens(stripComments(l)); if (!ts.length) return l;
    const lead = /^\s/.test(l) ? ' ' : '', trail = /\S\s+$/.test(l) ? ' ' : '';
    return lead + joinTokens(ts.map((t) => { const r = ren.get(ti); ti++; return r || t; })) + trail;
  }).join('\n');
}
// the same program but for local names: preprocessor lines the same, the same tokens but where a function's own name is
// renamed, one to one within that function, never a protected name, never after a '.'
export function checkMangle(a, b, protect) {
  const la = a.split('\n'), lb = b.split('\n');
  if (la.length !== lb.length) return 'a different number of lines';
  for (let i = 0; i < la.length; i++) if (isPre(la[i]) !== isPre(lb[i]) || (isPre(la[i]) && la[i] !== lb[i])) return 'line ' + (i + 1) + ': a preprocessor line changed';
  const ta = codeTokens(a), tb = codeTokens(b);
  if (ta.length !== tb.length) return `${tb.length} tokens, not ${ta.length}`;
  const fns = functions(ta); let fi = 0;
  const maps = fns.map(() => [new Map(), new Map()]);
  for (let p = 0; p < ta.length; p++) {
    while (fi < fns.length && p >= fns[fi].b) fi++;
    const x = ta[p].t, y = tb[p].t;
    if (x === y) { const m = fi < fns.length && p >= fns[fi].a ? maps[fi] : null; if (m && (m[0].has(x) || m[1].has(y))) return `token ${p}: ${x} kept where it is renamed elsewhere in its function`; continue; }
    if (!(fi < fns.length && p >= fns[fi].a)) return `token ${p}: ${x} became ${y} outside a function`;
    if (!isId(x) || !isId(y) || TYPES.has(x) || RESERVED.has(y) || TYPES.has(y)) return `token ${p}: ${x} became ${y}`;
    if (ta[p - 1].t === '.') return `token ${p}: a field (${x}) renamed`;
    if (protect.has(x) || protect.has(y)) return `token ${p}: a protected name (${protect.has(x) ? x : y})`;
    const [fw, bw] = maps[fi];
    if ((fw.has(x) && fw.get(x) !== y) || (bw.has(y) && bw.get(y) !== x)) return `token ${p}: ${x} -> ${y} is not one to one`;
    fw.set(x, y); bw.set(y, x);
  }
  for (let k = 0; k < fns.length; k++) for (let p = fns[k].a; p < fns[k].b; p++) if (maps[k][1].has(ta[p].t) && !maps[k][0].has(ta[p].t)) return `a new name (${ta[p].t}) was already in its function`;
  return null;
}
// a .glsl file's text as the build ships it: minified (minGlsl, or KEEP's parts as written) and its local names
// shortened, each step checked (the build fails on any difference)
export function shipGlsl(name, t, P) {
  const keep = KEEP.get(name), mt = keep ? minGlslKeeping(t, keep) : minGlsl(t);
  const e = checkGlsl(t, mt); if (e) throw new Error('the minified text is not the same program (' + e + ')');
  const mm = keep ? minGlslKeeping(t, keep, (x) => mangleGlsl(x, P)) : mangleGlsl(mt, P);
  const e2 = checkMangle(mt, mm, P); if (e2) throw new Error('the renamed text is not the same program (' + e2 + ')');
  return mm;
}
// PROTECT: every identifier in any string, template or regex literal of the scripts under src (but an @glsl mark), and in any
// preprocessor line of any .glsl file there
export function protectedNames(src) {
  const ids = new Set();
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) { walk(f); continue; }
      const s = fs.readFileSync(f, 'utf8');
      if (f.endsWith('.js')) {   // (the literals as the scripts' own lexer reads them: acorn, terser's, MIT)
        for (const tk of acorn.tokenizer(s, { ecmaVersion: 'latest', allowHashBang: true })) {
          const l = tk.type.label; if (l !== 'string' && l !== 'template' && l !== 'regexp') continue;
          const v = l === 'regexp' ? tk.value.pattern.replace(/\\[A-Za-z]/g, ' ') : String(tk.value);   // (a regex's \b \s \w are not names)
          if (/^@glsl [a-z0-9-]+$/.test(v)) continue;
          for (const w of v.matchAll(/[A-Za-z_]\w*/g)) ids.add(w[0]);
        }
      }
      else if (f.endsWith('.glsl')) { for (const l of s.split('\n')) if (isPre(l)) for (const w of l.matchAll(/[A-Za-z_]\w*/g)) ids.add(w[0]); }
    }
  })(src);
  return ids;
}

import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import path from 'node:path';
import fs from 'node:fs';
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let A = 0, B = 0, bad = 0;
  for (const f of process.argv.slice(2)) {
    const t = fs.readFileSync(f, 'utf8'), m = minGlsl(t), e = checkGlsl(t, m);
    A += t.length; B += m.length;
    console.log((e ? 'FAIL ' : 'ok   ') + f + ' ' + t.length + ' -> ' + m.length + (e ? ': ' + e : ''));
    if (e) bad = 1;
  }
  console.log('glslmin: ' + A + ' -> ' + B + ' chars (' + (100 * B / Math.max(A, 1)).toFixed(1) + '%)');
  process.exit(bad);
}
