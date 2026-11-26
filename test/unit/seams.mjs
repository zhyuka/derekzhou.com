// test/unit/seams.mjs: no seam round the circle in any shader. A read of the noise (it repeats every 1) or a texture by an
// angle taken with atan(y, x) jumps by the read's periods round the circle at the angle's wrap (+-180 deg), and is
// seamless only when that is a whole number: the noctilucent wisps' 3.5 drew a hard vertical edge in the blue hour's
// sky (#540). Every .glsl under src/: every two-argument atan audited here (how its wrap is kept seamless), every read
// by such an angle (or by a name made linearly from it) a whole number of periods, every name made from one otherwise
// kept out of reads, and the galaxy's longitude functions equal either side of its anticentre.
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "    vec2 q = vec2(atan(rd.x, rd.z) / SKYTAU * 16.0, eS * 0.09);   // (16:", "with": "    vec2 q = vec2(atan(rd.x, rd.z) / SKYTAU * 14.0, eS * 0.09);   // (16:", "why": "the wisps at 3.5 noise periods round the sky: a hard vertical seam at azimuth 180 (the blue hour's box edge, #540)"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "vec3(q.x * 3.0, q.y * 11.0, 0.53) * 0.25, 0.0).b * 0.45;   // (tod fix3", "with": "vec3(q.x * 3.1, q.y * 11.0, 0.53) * 0.25, 0.0).b * 0.45;   // (tod fix3", "why": "the wisps' fine octave at 12.4 periods: its seam at azimuth 180"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float n = n3v(vec3(u * 7.0, b * 3.15, 0.13)).b", "with": "float n = n3v(vec3(u * 7.5, b * 3.15, 0.13)).b", "why": "the galaxy's mottling at 7.5 periods round its plane: a seam at the anticentre"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float galAlong(float ld) { return 0.25 + 0.28 * (1.0 + cos(radians(ld)))", "with": "float galAlong(float ld) { return 0.25 + 0.28 * (1.0 + cos(radians(ld * 0.9 + 10.0)))", "why": "the band's brightness along it not periodic in longitude: a step at the anticentre"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "  ib = mod(ib, n);\n", "with": "", "why": "the stars' ring not wrapped: the cell past the seam a different star from its neighbour's"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "float phi = atan(rd.x, rd.z) - uAur.y, cp = cos(phi), sp = sin(phi);", "with": "float phi = atan(rd.x, rd.z) - uAur.y, cp = cos(phi), sp = phi * 0.9;", "why": "the aurora's arc read by its raw azimuth: a jump where it wraps"}
// plant: {"file": "src/world/glsl/sky-body.glsl", "find": "  da = atan(sin(da), cos(da));\n", "with": "", "why": "the moon dogs' azimuth difference not wrapped: a dog lost or doubled across the seam"}
// plant: {"file": "src/world/glsl/fs-vbody.glsl", "find": "void main() {", "with": "void main() { float azq = atan(gl_FragCoord.x, gl_FragCoord.y) / 6.2831853 * 3.0; vec4 azn = n3v(vec3(azq * 1.5, 0.3, 0.1));", "why": "a cloud body's noise read by an angle at 4.5 periods round it: a seam down the body"}
// plant: {"file": "src/glsl/above-glsl.glsl", "find": "vec3 A_shadeSea(vec3 p, vec3 n, vec3 rd, float t, float fp) {", "with": "vec3 A_shadeSea(vec3 p, vec3 n, vec3 rd, float t, float fp) { float sa = atan(p.x, p.z); float sn = textureLod(uN3, vec3(sa / SKYTAU * 5.0, 0.2, 0.4) * 0.5, 0.0).a;", "why": "the cloud sea read by its bearing at 2.5 periods round: a seam across the sea"}
import { test, assert, fs, path, ROOT } from '../unit-lib.mjs';

const glslFiles = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? glslFiles(path.join(d, e.name)) : e.name.endsWith('.glsl') ? [path.join(d, e.name)] : []);
const FILES = glslFiles(path.join(ROOT, 'src')).sort().map((f) => ({ rel: path.relative(ROOT, f).split(path.sep).join('/'), src: fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' ')) }));   // (one pass: a // inside a block comment, or a */ after a //, never runs a comment on)
const TWO_PI = 2 * Math.PI, CONST = { SKYTAU: 6.2831853, TAU: 6.2831853, PI: Math.PI };

// the text from i's open paren to its match; the top-level pieces of a list
function closeOf(s, i) { let d = 0; for (let k = i; k < s.length; k++) { if (s[k] === '(') d++; else if (s[k] === ')' && --d === 0) return k; } return -1; }
function split(s, seps) {
  const out = []; let d = 0, st = 0;
  for (let k = 0; k < s.length; k++) { const ch = s[k]; if (ch === '(') d++; else if (ch === ')') d--; else if (!d && seps.includes(ch)) { out.push([s.slice(st, k), ch]); st = k + 1; } }
  out.push([s.slice(st), null]); return out;
}
// the function about position i: its body (brace-matched from the definition's open brace)
function fnAt(s, i) {
  let a = s.lastIndexOf('\n', i), m;
  for (; a >= 0; a = s.lastIndexOf('\n', a - 1)) { m = /^[A-Za-z]\w*\s+\w+\s*\([^)]*\)\s*\{/.exec(s.slice(a + 1)); if (m) break; }
  const st = a + 1 + m[0].length - 1; let d = 0;
  for (let k = st; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}' && --d === 0) return { start: st, end: k, body: s.slice(st, k) }; }
  return { start: st, end: s.length, body: s.slice(st) };
}
// the statement about position i, and the declarator (name = expr) holding it
function stmtAt(s, i) { const a = Math.max(s.lastIndexOf(';', i), s.lastIndexOf('{', i), s.lastIndexOf('}', i)) + 1, b = s.indexOf(';', i); return { text: s.slice(a, b).trim(), a, b }; }
function declOf(stmt, needle) {
  const t = stmt.replace(/^(?:const\s+)?(?:float|vec[234]|int|uint)\s+/, '');
  for (const [p] of split(t, ',')) if (p.includes(needle)) { const m = /^\s*([A-Za-z_]\w*)\s*(?:[-+*/]?=)\s*([\s\S]*)$/.exec(p); if (m) return { name: m[1], rhs: m[2].trim() }; }
  return null;
}
// a linear expression's coefficient on the circle's angle (per radian), or null when it is not linear in one angle name
function lin(expr, T) {
  expr = expr.trim();
  const terms = split(expr.replace(/^-/, '0-'), '+-').map(([p]) => p.trim()).filter((p) => p !== '');
  const has = (p) => /\batan\s*\(/.test(p) || Object.keys(T).some((k) => new RegExp('(^|[^\\w.])' + k.replace('.', '\\.') + '(?![\\w])').test(p));
  const ang = terms.filter(has); if (ang.length !== 1) return null;
  let c = 1, seen = 0;
  for (const [f, op] of split(ang[0], '*/').map(([p, o], k, A) => [p.trim(), k ? A[k - 1][1] : '*'])) {
    let v;
    if (/^[\d.]+$/.test(f)) v = +f; else if (f in CONST) v = CONST[f];
    else if (f in T) { v = T[f]; seen++; }
    else if (/^atan\s*\(/.test(f) && split(f.slice(f.indexOf('(') + 1, closeOf(f, f.indexOf('('))), ',').length === 2) { v = 1; seen++; }
    else if (/^(degrees|radians)\s*\(/.test(f)) { const r = lin(f.slice(f.indexOf('(') + 1, closeOf(f, f.indexOf('('))), T); if (r === null) return null; v = r * (f.startsWith('degrees') ? 180 / Math.PI : Math.PI / 180); seen++; }
    else if (f.startsWith('(') && closeOf(f, 0) === f.length - 1) { const r = has(f) ? lin(f.slice(1, -1), T) : null; if (r === null) return null; v = r; seen++; }
    else return null;
    c = op === '/' ? c / v : c * v;
  }
  return seen === 1 ? c : null;
}

// each two-argument atan in the shaders, and how its wrap is kept seamless
const AUDIT = [
  { file: 'src/world/glsl/sky-body.glsl', has: 'phi = atan(rd.x, rd.z) - uAnv.x', how: 'wrap', why: 'the far storm: wrapped, then cut to |phi| under 0.7 before any read (x = D tan(phi))' },
  { file: 'src/world/glsl/sky-body.glsl', has: 'phi = atan(sin(phi), cos(phi))', how: 'wrapper' },
  { file: 'src/world/glsl/sky-body.glsl', has: 'da = atan(rd.x, rd.z) - atan(uMoon.x, uMoon.z)', how: 'wrap', why: 'the moon dogs: the azimuth from the moon wrapped, read only as abs(da)' },
  { file: 'src/world/glsl/sky-body.glsl', has: 'da = atan(sin(da), cos(da))', how: 'wrapper' },
  { file: 'src/world/glsl/sky-body.glsl', has: 'l = atan(dot(rd, cross(P, C)), dot(rd, C))', how: 'reads', why: 'the galaxy: its noise by u = l / SKYTAU at whole periods; its shapes by ld, equal either side of the anticentre (below)' },
  { file: 'src/world/glsl/sky-body.glsl', has: 'phi = atan(rd.x, rd.z) - uAur.y', how: 'trig', why: 'the aurora: its azimuth read only as cos and sin' },
  { file: 'src/world/glsl/sky-body.glsl', has: 'q = vec2(atan(rd.x, rd.z) / SKYTAU * 16.0', how: 'reads', why: 'the noctilucent wisps (twice: the night\'s and the change\'s)' },
  { file: 'src/world/glsl/sky-body.glsl', has: 'az = atan(rs.x, rs.z)', how: 'ring', why: 'the stars: a ring of n whole cells, the neighbour past the seam wrapped (mod(ib, n))' },
];
// names made from an angle, not linearly, that a read may take: each with why it holds no seam
const NONLINEAR_OK = { 'src/world/glsl/sky-body.glsl': { x: 'the far storm: D tan(phi), phi wrapped and cut to |phi| < 0.7 first' } };

function sites(F) {
  const out = [];
  for (let i = F.src.indexOf('atan('); i >= 0; i = F.src.indexOf('atan(', i + 1)) {
    if (/\w/.test(F.src[i - 1] || '')) continue;
    const o = i + 4, c = closeOf(F.src, o); if (split(F.src.slice(o + 1, c), ',').length !== 2) continue;
    out.push({ i, stmt: stmtAt(F.src, i) });
  }
  return out;
}

test('seams: every two-argument atan in every shader is audited, and no audit is stale', () => {
  const used = new Set(), n = { files: 0, sites: 0 };
  for (const F of FILES) {
    n.files++;
    for (const S of sites(F)) {
      n.sites++;
      const hit = AUDIT.filter((a) => a.file === F.rel && S.stmt.text.includes(a.has));
      assert.ok(hit.length >= 1, `${F.rel}: an angle by atan not audited for a seam round the circle: ${S.stmt.text.slice(0, 140)}`);
      hit.forEach((a) => used.add(a));
    }
  }
  for (const a of AUDIT) assert.ok(used.has(a), `an audited angle no longer in ${a.file}: ${a.has}`);
  console.log(`# seams: ${n.sites} atan sites in ${n.files} shaders, ${AUDIT.length} audited`);
});

test('seams: every read by an angle (or a name made linearly from one) takes whole periods round the circle', () => {
  let reads = 0;
  for (const F of FILES) {
    for (const S of sites(F)) {
      // the angle's names live in its block: from its statement to the brace that closes the block holding it
      let end = S.stmt.a; for (let d = 0; end < F.src.length; end++) { const ch = F.src[end]; if (ch === '{') d++; else if (ch === '}' && d-- === 0) break; }
      const T = {}, bad = new Set(), NL = NONLINEAR_OK[F.rel] || {};
      const re = (k) => new RegExp('(^|[^\\w.])' + k.replace('.', '\\.') + '(?![\\w])');
      const D = declOf(S.stmt.text, 'atan(');
      if (!D) continue;
      // the units in order: the atan's declarator and the ones after it in its statement, then each statement after
      const first = split(S.stmt.text.replace(/^(?:const\s+)?(?:float|vec[234]|int|uint)\s+/, ''), ',').map(([p]) => p);
      const k0 = first.findIndex((p) => p.includes('atan('));
      const units = first.slice(k0).concat(F.src.slice(S.stmt.b + 1, end).split(';'));
      units.forEach((u, ui) => {
        // the reads in this unit, by the angle's names as they stand
        for (const mm of u.matchAll(/\b(textureLod|texture|texelFetch|n3v)\s*\(/g)) {
          const o = mm.index + mm[0].length - 1, args = split(u.slice(o + 1, closeOf(u, o)), ',').map(([p]) => p.trim());
          const co = mm[1] === 'n3v' ? args[0] : args[1], names = Object.keys(T);
          const tn = [...bad].filter((k) => re(k).test(co) && !NL[k]);
          assert.equal(tn.length, 0, `${F.rel}: a read by a name made from an angle not linearly (${tn.join(', ')}): ${co}`);
          const bare = names.filter((k) => k.includes('.')).map((k) => k.split('.')[0]).filter((b) => new RegExp('(^|[^\\w.])' + b + '(?![\\w.])').test(co));
          assert.equal(bare.length, 0, `${F.rel}: a read by the whole of a vector made from an angle (${bare.join(', ')}): ${co}`);
          if (!names.some((k) => re(k).test(co))) continue;
          assert.ok(/^vec[234]\s*\(/.test(co), `${F.rel}: a read by an angle whose coordinate is not a vecN(...) [* k]: ${co}`);
          const c0 = co.indexOf('('), c1 = closeOf(co, c0); let scale = 1;
          for (const [f, op] of split(co.slice(c1 + 1).trim(), '*/').map(([p], k, A) => [p.trim(), k ? A[k - 1][1] : null]).filter(([f]) => f)) {
            const v = /^[\d.]+$/.test(f) ? +f : NaN; assert.ok(v === v, `${F.rel}: a read by an angle scaled by a non-constant: ${co}`); scale = op === '/' ? scale / v : scale * v;
          }
          for (const [p] of split(co.slice(c0 + 1, c1), ',')) {
            if (!names.some((k) => re(k).test(p))) continue;
            const c = lin(p, T); assert.ok(c !== null, `${F.rel}: a read's coordinate not linear in its angle: ${p.trim()}`);
            const per = c * scale * TWO_PI; reads++;
            assert.ok(Math.abs(per - Math.round(per)) < 1e-4, `${F.rel}: a read at ${per.toFixed(3)} periods round the circle (a seam where the angle wraps): ${co}`);
          }
        }
        // then its assignments (a read's value is the noise's, not the angle's: reads blanked first)
        let blank = u; for (let j = blank.search(/\b(textureLod|texture|texelFetch|n3v)\s*\(/); j >= 0; j = blank.search(/\b(textureLod|texture|texelFetch|n3v)\s*\(/)) { const o = blank.indexOf('(', j); blank = blank.slice(0, j) + '0.0' + blank.slice(closeOf(blank, o) + 1); }
        const decls = ui === 0 ? [blank] : split(blank.replace(/^[\s\S]*?\{(?![^{]*\})/, '').replace(/^\s*(?:const\s+)?(?:float|vec[234]|int|uint)\s+/, ''), ',').map(([p]) => p);
        for (const p of decls) {
          const m = /^\s*([A-Za-z_]\w*)\s*([-+*/]?=)\s*([\s\S]+)$/.exec(p); if (!m) continue;
          const [, name, , rhs] = m, kill = () => { for (const k of Object.keys(T)) if (k === name || k.startsWith(name + '.')) delete T[k]; bad.delete(name); };
          if (ui === 0) {   // the angle itself
            if (/^vec2\s*\(/.test(rhs)) split(rhs.slice(rhs.indexOf('(') + 1, closeOf(rhs, rhs.indexOf('('))), ',').forEach(([q], k) => { if (/atan\s*\(/.test(q)) { const c = lin(q, {}); if (c === null) bad.add(name); else T[name + '.' + 'xy'[k]] = c; } });
            else { const c = lin(rhs, {}); if (c === null) bad.add(name); else T[name] = c; }
            continue;
          }
          const hit = Object.keys(T).concat([...bad]).some((k) => re(k).test(rhs));
          if (/^atan\s*\(\s*sin\s*\(\s*(\w+)\s*\)\s*,\s*cos\s*\(\s*\1\s*\)\s*\)$/.test(rhs.trim()) && RegExp.$1 === name) continue;   // (the wrapper: the same angle, wrapped)
          if (/^vec2\s*\(\s*atan\s*\(/.test(rhs.trim())) { kill(); continue; }   // (a new angle of its own: its own site)
          if (!hit) { kill(); continue; }
          const c = m[2] === '=' ? lin(rhs, T) : null; kill(); if (c === null) bad.add(name); else T[name] = c;
        }
      });
    }
  }
  assert.ok(reads >= 9, `only ${reads} reads by an angle found (the wisps' 4 and the galaxy's 5 at least)`);
  console.log(`# seams: ${reads} reads by an angle, every one whole round the circle`);
});

test('seams: the audited angles keep their wrap (wrapped, read only by cos and sin, or a whole ring)', () => {
  for (const a of AUDIT.filter((x) => x.how !== 'wrapper' && x.how !== 'reads')) {
    const F = FILES.find((f) => f.rel === a.file), i = F.src.indexOf(a.has), fn = fnAt(F.src, i), name = /^(\w+)/.exec(a.has)[1];
    const rest = F.src.slice(F.src.indexOf(';', i) + 1, fn.end);
    if (a.how === 'wrap') {
      assert.match(rest, new RegExp('^\\s*' + name + ' = atan\\(sin\\(' + name + '\\), cos\\(' + name + '\\)\\);'), `${a.file}: ${name} not wrapped at once (${a.why})`);
      const after = rest.slice(rest.indexOf(';') + 1);
      for (const m of after.matchAll(new RegExp('(^|[^\\w.])' + name + '(?![\\w])', 'g'))) {
        const pre = after.slice(Math.max(0, m.index - 4), m.index + 1);
        assert.ok(/(abs|tan)\($/.test(pre), `${a.file}: the wrapped ${name} read other than by abs or tan (${a.why})`);
      }
    } else if (a.how === 'trig') {
      const t = a.has.slice(a.has.indexOf('=') + 1), after = F.src.slice(i + a.has.length, fn.end);
      for (const m of after.matchAll(new RegExp('(^|[^\\w.])' + name + '(?![\\w])', 'g'))) {
        const pre = after.slice(Math.max(0, m.index - 3), m.index + 1);
        assert.ok(/(cos|sin)\($/.test(pre), `${a.file}: ${name} read other than by cos or sin (${a.why})`);
      }
    } else if (a.how === 'ring') {
      assert.match(F.src, /float n = max\(1\.0, floor\(SKYTAU \* cos\(elc\) \/ STC\)\);/, `${a.file}: the stars' ring not a whole number of cells`);
      assert.match(F.src, /float ib = floor\(\(az \+ PI\) \/ SKYTAU \* n\) \+ float\(di\);\s*ib = mod\(ib, n\);/, `${a.file}: the stars' neighbour past the seam not wrapped (${a.why})`);
    }
  }
});

test('seams: the galaxy\'s shapes by longitude equal either side of its anticentre (ld +-180)', () => {
  const F = FILES.find((f) => f.rel === 'src/world/glsl/sky-body.glsl');
  const fns = [...F.src.matchAll(/^float (gal[A-Z]\w*)\(float ld(?:, float bd)?\) \{([^\n]*)\}$/gm)];
  assert.ok(fns.length >= 8, `the galaxy's longitude functions not found (${fns.length})`);
  const H = { exp: Math.exp, pow: Math.pow, cos: Math.cos, sin: Math.sin, abs: Math.abs, radians: (d) => d * Math.PI / 180, smoothstep: (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); } };
  const G = {};
  for (const [, name, body] of fns) G[name] = new Function(...Object.keys(H), 'G', 'return function (ld, bd) { ' + body.replace(/\bfloat\s+/g, 'let ').replace(/\b(gal[A-Z]\w*)\(/g, 'G.$1(') + ' };')(...Object.values(H), G);
  let worst = 0;
  for (const name of Object.keys(G)) for (let bd = -80; bd <= 80; bd += 0.25) {
    const d = Math.abs(G[name](180 - 1e-9, bd) - G[name](-180 + 1e-9, bd)); worst = Math.max(worst, d);
    assert.ok(d < 1e-5, `${name} steps by ${d.toExponential(2)} across the galaxy's anticentre at latitude ${bd}`);
  }
  console.log(`# seams: ${fns.length} galaxy functions, the worst step across the anticentre ${worst.toExponential(2)}`);
});
