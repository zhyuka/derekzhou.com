// nocomments.mjs FROM TO: a copy of the tree FROM at TO with every comment in its .js and .css files blanked (each
// comment's characters turned to spaces, its line breaks kept), so a check that greps for code never reads prose and
// every line and column stays where it was. A comment holding the world's INIT-END marker is kept (the absences read
// it). Strings, template literals and regular expressions are left as they are. Every other file is copied as is.
//   node tools/checks/nocomments.mjs --self-test   a stripped file must minify to the original's bytes (terser)
import fs from 'node:fs'; import path from 'node:path';

const KEEP = /---- INIT-END:/;
// the token before a '/' that makes it start a regular expression, not a division
const RE_BEFORE = /(^|[(,=:[!&|?{};+\-*%<>~^]|\breturn|\btypeof|\bcase|\bdo|\belse|\bin|\bof|\bnew|\bdelete|\bvoid|\bthrow|\byield|\bawait)\s*$/;
export function strip(s, css) {
  let o = '', i = 0; const n = s.length;
  const blank = (a, b) => { const t = s.slice(a, b); o += KEEP.test(t) ? t : t.replace(/[^\n\r]/g, ' '); };
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === '/' && d === '*') { const e = s.indexOf('*/', i + 2), j = e < 0 ? n : e + 2; blank(i, j); i = j; continue; }
    if (!css && c === '/' && d === '/') { let j = i; while (j < n && s[j] !== '\n' && s[j] !== '\r') j++; blank(i, j); i = j; continue; }
    if (c === '"' || c === "'" || (!css && c === '`')) {
      let j = i + 1;
      while (j < n && s[j] !== c) { if (s[j] === '\\') j++; else if (c === '`' && s[j] === '$' && s[j + 1] === '{') { let k = 1; j += 2; while (j < n && k) { if (s[j] === '{') k++; else if (s[j] === '}') k--; if (k) j++; } } j++; }
      o += s.slice(i, j + 1); i = j + 1; continue;
    }
    if (!css && c === '/' && RE_BEFORE.test(o.slice(-40))) {
      let j = i + 1, cls = false;
      while (j < n && (cls || s[j] !== '/') && s[j] !== '\n') { if (s[j] === '\\') j++; else if (s[j] === '[') cls = true; else if (s[j] === ']') cls = false; j++; }
      o += s.slice(i, j + 1); i = j + 1; continue;
    }
    o += c; i++;
  }
  return o;
}
function copy(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) { if (e.name !== '.check' && e.name !== 'node_modules') copy(a, b); continue; }
    if (/\.(js|mjs|css)$/.test(e.name)) fs.writeFileSync(b, strip(fs.readFileSync(a, 'utf8'), e.name.endsWith('.css')));
    else fs.copyFileSync(a, b);
  }
}
if (process.argv[2] === '--self-test') {
  // the stripped text must be the same program: terser (no compress, no mangle, no comments) prints both alike
  const { minify } = await import('terser');
  const files = process.argv.slice(3); let bad = 0;
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8'), t = strip(s, false);
    const o = { compress: false, mangle: false, format: { comments: false } };
    const [a, b] = [(await minify(s, o)).code, (await minify(t, o)).code];
    if (a !== b || t.length !== s.length || t.split('\n').length !== s.split('\n').length) { console.log('::error::nocomments changed the program of ' + f); bad = 1; }
  }
  console.log(bad ? 'nocomments: FAILED' : 'nocomments: ' + files.length + ' scripts keep their programs, lines and columns');
  process.exit(bad);
} else if (process.argv[2] && process.argv[3]) copy(path.resolve(process.argv[2]), path.resolve(process.argv[3]));
