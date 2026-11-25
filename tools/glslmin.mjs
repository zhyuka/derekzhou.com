// glslmin.mjs: a shader's text without its comments and spare whitespace, the same program token for token. The build
// minifies every src/**/glsl/NAME.glsl this way where it puts the text back into its script (tools/parts.mjs assemble
// --min-glsl), so the world issues and the browser compiles the short text; src/ keeps the
// readable one. Nothing is renamed and no token changes:
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
export function minGlslKeeping(text, parts) {
  let out = '', i = 0;
  for (const [a, z] of parts) {
    const s = text.indexOf(a, i);
    if (s < 0 || text.indexOf(a, s + 1) >= 0) throw new Error('a kept part\'s first text is not in the file exactly once: ' + a);
    const e = text.indexOf(z, s + a.length);
    if (e < 0) throw new Error('a kept part has no end: ' + JSON.stringify(z) + ' after ' + a);
    out += minGlsl(text.slice(i, s)) + text.slice(s, e + z.length);
    i = e + z.length;
  }
  return out + minGlsl(text.slice(i));
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

import { fileURLToPath } from 'node:url';
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
