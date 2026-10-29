// The realm lint (the realms' API rules), run by validate.yml's "The world's rules" step in report mode.
//   node lint_realms.js report|strict realm-kit.js realm-<id>.js ...
// Each realm file's GLSL (the template literals it hands the engine) is read for its top-level identifiers (functions,
// constants, structs, globals). Under Realm API v4 every one of them is written with the `$_` prefix (replaced by
// `<id>_` at registration), so two realms concatenated into one program never collide. The lint reports:
//   - top-level identifiers without `$_` that are not library names (the engine's own: LIB, the frame's blocks, the
//     mirrored hashes);
//   - names two realms both define (a collision once realms share a program);
// and, in strict mode, fails on either. The realm files predate v4: they are linted in report mode, and what the
// report lists is the work of moving them to it.
'use strict';
const fs = require('fs'), path = require('path');
const mode = process.argv[2] || 'report';
const files = process.argv.slice(3);
// the engine's library names a realm may use as they are (the engine's LIB and the frame's uniforms and helpers)
const LIBRARY = new Set(['main', 'hash', 'ih', 'hf', 'vnoise', 'worley', 'lattice', 'fbm', 'atmos', 'fogAmt', 'hazeAmt', 'skyCol', 'lin2oklab', 'oklab2lin',
  'waterNormal', 'waterRefl', 'saturate', 'luma', 'LUMA', 'PI', 'TAU', 'uT', 'uRes', 'uDbg', 'uCam', 'uCamF', 'uCamR', 'uCamU', 'uProj', 'uSun', 'uSunC', 'uVP']);
function glslOf(src) {
  const out = []; const re = /`([\s\S]*?)`/g; let m;
  while ((m = re.exec(src))) if (/\b(float|vec[234]|void|mat[234]|int)\b/.test(m[1])) out.push(m[1]);
  return out.join('\n');
}
function topLevel(glsl) {
  // strip comments, then walk braces: names declared at depth 0
  const s = glsl.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\$\{[^}]*\}/g, ' ');
  const names = []; let depth = 0, buf = '';
  for (const ch of s) {
    if (ch === '{') { if (depth === 0) scan(buf); depth++; buf = ''; continue; }
    if (ch === '}') { depth = Math.max(0, depth - 1); buf = ''; continue; }
    if (depth === 0) { buf += ch; if (ch === ';') { scan(buf); buf = ''; } }
  }
  function scan(b) {
    const fn = /(?:^|[\s;])(?:highp |mediump |lowp )?(?:float|vec[234]|ivec[234]|int|uint|bool|void|mat[234]|[A-Z]\w*)\s+([$A-Za-z_]\w*)\s*\(/.exec(b);
    if (fn) { names.push(fn[1]); return; }
    const st = /\bstruct\s+([$A-Za-z_]\w*)/.exec(b); if (st) { names.push(st[1]); return; }
    const cv = /(?:^|[\s;])(?:const\s+)?(?:highp |mediump |lowp )?(?:float|vec[234]|ivec[234]|int|uint|bool|mat[234])\s+([$A-Za-z_]\w*)\s*(?:=|;|\[)/.exec(b);
    if (cv && !/\buniform\b|\bin\b|\bout\b/.test(b)) names.push(cv[1]);
  }
  return [...new Set(names)];
}
let bad = 0; const owner = new Map(), report = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8'), id = (/id:\s*'([a-z]+)'/.exec(src) || [, path.basename(f)])[1];
  const names = topLevel(glslOf(src));
  const unprefixed = names.filter((n) => !n.startsWith('$_') && !LIBRARY.has(n));
  for (const n of names) {
    const k = n.startsWith('$_') ? null : n;
    if (!k || LIBRARY.has(k)) continue;
    if (owner.has(k) && owner.get(k) !== id) report.push(`collision: ${k} in ${owner.get(k)} and ${id}`); else owner.set(k, id);
  }
  report.push(`${path.basename(f)} (${id}): ${names.length} top-level GLSL names, ${unprefixed.length} without $_` + (unprefixed.length ? ': ' + unprefixed.slice(0, 40).join(', ') + (unprefixed.length > 40 ? ' ...' : '') : ''));
  if (unprefixed.length) bad++;
}
const coll = report.filter((r) => r.startsWith('collision')).length;
console.log('realm lint (' + mode + '):\n  ' + report.join('\n  ') + '\n  => ' + (bad || coll ? `${bad} file(s) not v4-namespaced, ${coll} collision(s)` : 'clean'));
process.exit(mode === 'strict' && (bad || coll) ? 1 : 0);
