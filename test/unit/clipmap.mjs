// test/unit/clipmap.mjs: the land's clipmap rings meet without a crack, out to +-2e6 m from the start.
// The rings' vertex placement is read from the sources as they ship (the ring uniforms in 414-draw-scene.js and
// hpClip, the placement in VS_TERRAIN, VS_TERRAIN_SPLIT and hp-gridw.glsl) and replayed in fp32 (Math.fround after
// every operation, as a GPU without FMA rounds them). Where a finer ring's outer edge meets the next ring's inner
// edge, both rings must put the shared vertex at the same fp32 bits: a seam a bit apart is the owner's one-pixel line
// across the land, far from the start (a tab open for hours). And a lint: no source places a vertex as origin metres
// plus aG cells (`uLev.xy + aG * uLev.z`, the form that cracked).
// And the land's level of detail never pops (tools/physics/lod-pop.mjs, the clipmap replayed over the dunes in doubles):
// in a flight at cruise, a point handed from one ring to the next keeps its drawn height (under 0.5 px of edge motion at
// laptop size) and its shading (under 2 levels), because the morph lays the fine ring on the coarse ring's own triangles.
// plant: {"file": "src/world/350-shaders-scene.js", "find": "w = (c + mod(c, 2.0) * (mod(c, 4.0) - 2.0) * m) * uLev.z;", "with": "w = c * uLev.z;", "why": "the morph off: each ring's vertices on their own lattice, the coarse ring's surface swapped in at the handoff"}
// And the brinks hold still: a fixed point on a slip face's brink, shaded as FS_TERRAIN shades it, steps over 2 levels in
// under 0.1% of frames (the fragment's footprint reads its own slope, not the morphing vertices').
// plant: {"file": "src/world/350-shaders-scene.js", "find": "max(abs(dot(nc, rd)), 0.02)", "with": "max(abs(dot(n, rd)), 0.02)", "why": "the footprint from the vertices' normal again: the brinks shimmer as the vertices morph"}
// And the near dunes' crests hold still: their slope's kink rounded over 2 m (duneWave), a crest point steps over 2 levels
// in under 0.1% of frames.
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "if (abs(f - c) < r) {", "with": "if (false) {", "why": "the near crest's kink sharp again: a vertex morphing across it turns 12 levels in a frame"}
// plant: {"file": "src/world/glsl/hp-gridw.glsl", "find": "vec2 c = L.xy + aG, w = c * L.z;", "with": "vec2 c = L.xy + aG, w = L.xy + aG * L.z;", "why": "the height passes placed from origin metres again"}
// plant: {"file": "src/world/100-clipmap-grid.js", "find": "* 2 - GN / 2; }", "with": "* 2 - GN / 2 + (g > 100 ? 2 : 0); }", "why": "the outermost ring alone (level 9, 179 m cells) moved two cells: its seam with level 8 apart"}
// plant: {"file": "src/world/414-draw-scene.js", "find": "gl.uniform4f(P.u.uLev, ringCell(g, 0), ringCell(g, 2), g, GN / 2);", "with": "gl.uniform4f(P.u.uLev, cx - GN / 2 * g, cz - GN / 2 * g, g, GN / 2);", "why": "the rings' origin in metres again"}
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const F = Math.fround;
const GRID = rd('src/world/100-clipmap-grid.js'), DRAW = rd('src/world/414-draw-scene.js');
const HPF = rd('src/world/250-probes-realm-ground-read-back.js'), SCN = rd('src/world/350-shaders-scene.js');
const GRIDW = rd('src/world/glsl/hp-gridw.glsl');
const GN = Number(/var GN = (\d+);/.exec(GRID)[1]);
const DEF = rd('src/world/180-world-definition-two-kits-by.js');
const G0 = Number(/height: 'Hd'[^}]*g0: ([\d.]+)/.exec(DEF)[1]), LEVELS = Number(/height: 'Hd'[^}]*levels: (\d+)/.exec(DEF)[1]);   // (the land's finest cell and its rings, as the world defines them)

// ---- the JS side: the ring uniforms, as the draw and hpClip make them (fp32 on upload)
function fnSrc(src, name) {   // a function's whole text, by brace matching
  const a = src.indexOf('function ' + name + '('); if (a < 0) return null;
  let i = src.indexOf('{', a), n = 0;
  for (; i < src.length; i++) { if (src[i] === '{') n++; else if (src[i] === '}' && --n === 0) break; }
  return src.slice(a, i + 1);
}
const HELPERS = [fnSrc(GRID, 'ringCell')].filter(Boolean).join('\n');
function drawUniforms(cam) {   // [levels][4] from drawScene's loop: its `var g = ...` line and its uniform4f(P.u.uLev, ...)
  const gl = /var g = S\.g0 \* Math\.pow\(2, l\)[^;]*;/.exec(DRAW)[0];
  const args = /gl\.uniform4f\(P\.u\.uLev, ([^;]*?)\);/.exec(DRAW)[1];
  const f = new Function('CAM', 'S', 'GN', HELPERS + '\nvar out = []; for (var l = 0; l < S.levels; l++) { ' + gl + ' out.push([' + args + ']); } return out;');
  return f({ pos: cam }, { g0: G0, levels: LEVELS }, GN).map((v) => v.map(F));
}
function hpUniforms(cam) {   // hpClip's HPLA, run as written (hpRun stubbed)
  const f = new Function('CAM', 'S', 'GN', 'HPLA', 'hpRun', HELPERS + '\n' + fnSrc(HPF, 'hpClip') + '\nhpClip(null, S); return HPLA;');
  const A = f({ pos: cam }, { g0: G0 }, GN, new Float32Array(40), () => {});
  return Array.from({ length: 10 }, (_, l) => Array.from(A.subarray(l * 4, l * 4 + 4)));
}

// ---- the GLSL side: the placement statements, from the first `vec2 ` line to the morph, evaluated in fp32
function placement(src, from) {   // the lines of a main() between its first `vec2 ` and the first assignment to w after d and m
  const a = src.indexOf(from); assert.ok(a >= 0, 'the placement starts with ' + from);
  const lines = src.slice(a).split('\n'), out = [];
  for (const ln of lines) { const s = ln.replace(/\/\/.*$/, '').trim(); if (!s) continue; out.push(s); if (/^w\s*(-=|=)/.test(s)) break; }
  assert.ok(out.length >= 4 && out.length <= 6, 'a placement of a few statements: ' + out.join(' | '));
  return out;
}
function vsMain(fn) { const t = fnSrc(SCN, fn); return t.slice(t.indexOf('void main() {')); }
const PL = {
  terrain: placement(vsMain('VS_TERRAIN'), 'vec2 '),
  split: placement(vsMain('VS_TERRAIN_SPLIT'), 'vec2 '),
  gridw: placement(GRIDW.slice(GRIDW.indexOf('vec4 L = uLevA[l];') + 18), 'vec2 ')
};
// a small fp32 evaluator for these statements: floats and vec2/vec3/vec4 as arrays, every operation rounded
function tok(s) { return s.match(/\d+\.\d*|\d*\.\d+|\d+|[A-Za-z_]\w*|\S/g); }
function bin(a, b, f) {
  if (Array.isArray(a) || Array.isArray(b)) { const n = Array.isArray(a) ? a.length : b.length; return Array.from({ length: n }, (_, i) => F(f(Array.isArray(a) ? a[i] : a, Array.isArray(b) ? b[i] : b))); }
  return F(f(a, b));
}
const SW = { x: 0, y: 1, z: 2, w: 3 };
const FN = {
  abs: (x) => bin(x, 0, (p) => Math.abs(p)),
  max: (x, y) => bin(x, y, Math.max),
  clamp: (x, lo, hi) => bin(bin(x, lo, Math.max), hi, Math.min),
  mod: (x, y) => bin(x, y, (p, q) => F(p - F(q * Math.floor(F(p / q))))),
  vec2: (x, y) => [F(x), F(y === undefined ? x : y)]
};
function evalExpr(toks, env) {
  let i = 0;
  const peek = () => toks[i], next = () => toks[i++];
  function prim() {
    let t = next(), v;
    if (t === '(') { v = add(); assert.equal(next(), ')'); }
    else if (t === '-') v = bin(prim(), 0, (p) => -p);
    else if (/^[\d.]/.test(t)) v = F(Number(t));
    else if (FN[t]) { assert.equal(next(), '('); const as = [add()]; while (peek() === ',') { next(); as.push(add()); } assert.equal(next(), ')'); v = FN[t](...as); }
    else { assert.ok(t in env, 'known name ' + t); v = env[t]; }
    while (peek() === '.') { next(); const s = next(); v = s.length === 1 ? v[SW[s]] : s.split('').map((c) => v[SW[c]]); }
    return v;
  }
  function mul() { let v = prim(); while (peek() === '*' || peek() === '/') { const o = next(), r = prim(); v = bin(v, r, o === '*' ? (p, q) => p * q : (p, q) => p / q); } return v; }
  function add() { let v = mul(); while (peek() === '+' || peek() === '-') { const o = next(), r = mul(); v = bin(v, r, o === '+' ? (p, q) => p + q : (p, q) => p - q); } return v; }
  const v = add(); assert.equal(i, toks.length, 'the whole expression read: ' + toks.join(' '));
  return v;
}
function splitTop(toks, sep) { const out = [[]]; let n = 0; for (const t of toks) { if (t === '(') n++; if (t === ')') n--; if (t === sep && n === 0) out.push([]); else out[out.length - 1].push(t); } return out; }
function run(stmts, env) {
  for (const s of stmts) {
    let t = tok(s.replace(/;$/, ''));
    if (t[0] === 'vec2' || t[0] === 'float') t = t.slice(1);
    for (const part of splitTop(t, ',')) {
      const name = part[0];
      if (part[1] === '-' && part[2] === '=') env[name] = bin(env[name], evalExpr(part.slice(3), env), (p, q) => p - q);
      else { assert.equal(part[1], '='); env[name] = evalExpr(part.slice(2), env); }
    }
  }
  return env.w;
}
const place = (pl, lev, aG, cam) => run(pl, { uLev: lev, L: lev, aG, uCam: cam.map(F) });

// ---- the seams: each level's outer edge against the next level's inner edge
function seams(cam, pl, U) {
  let n = 0, bad = 0, first = null;
  for (let l = 0; l + 1 < LEVELS; l++) {   // (every seam: LEVELS rings meet at LEVELS - 1 of them)
    const gc = G0 * Math.pow(2, l + 1);   // (the coarse ring's cell and corner, in doubles: whichever units its uniform takes)
    const ox = (Math.floor(cam[0] / (2 * gc)) * 2 - GN / 2) * gc, oz = (Math.floor(cam[2] / (2 * gc)) * 2 - GN / 2) * gc;
    for (let k = 0; k <= GN; k++) for (const [i, j] of [[k, 0], [k, GN], [0, k], [GN, k]]) {
      const wf = place(pl, U[l], [i, j], cam);   // (an odd edge vertex is pulled onto its even neighbour: a coarse vertex)
      const ci = Math.round((wf[0] - ox) / gc), cj = Math.round((wf[1] - oz) / gc);
      assert.ok(ci >= 0 && ci <= GN && cj >= 0 && cj <= GN, 'the edge vertex lies in the coarser ring');
      assert.ok(Math.abs(wf[0] - (ox + ci * gc)) < gc / 8 && Math.abs(wf[1] - (oz + cj * gc)) < gc / 8, 'on its lattice');
      const wc = place(pl, U[l + 1], [ci, cj], cam);
      n++;
      if (wc[0] !== wf[0] || wc[1] !== wf[1]) { bad++; if (!first) first = { l, aG: [i, j], coarse: [ci, cj], fine: wf, coarseAt: wc }; }
    }
  }
  return { n, bad, first };
}

test('clipmap: the placement is read from VS_TERRAIN, VS_TERRAIN_SPLIT and hp-gridw', () => {
  assert.ok(PL.terrain && PL.split && PL.gridw);
  assert.deepEqual(PL.split, PL.terrain, 'the split land VS places as the one-program VS');
  assert.equal(PL.gridw.join('\n').replace(/\bL\b/g, 'uLev'), PL.terrain.join('\n'), 'the height passes place as the land VS');
});

test('clipmap: the draw and hpClip give the rings the same uniforms', () => {
  for (const cam of [[0, 50, 0], [681e3, 200, -12345.6], [-2e6, 80, 2e6]]) assert.deepEqual(hpUniforms(cam), drawUniforms(cam));
});

const CAMS = [[0.1, 40, -0.2], [1234.5, 60, -987.25], [681043.7, 220, 3317.9], [-681043.7, 220, -3317.9], [2e6 - 3.3, 90, -2e6 + 7.1], [-1999999.9, 90, 1999999.6]];
for (let s = 1; s <= 24; s++) { const r = (k) => (((Math.sin(s * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1; CAMS.push([(r(1) * 2 - 1) * 2e6, 100, (r(2) * 2 - 1) * 2e6]); }

test('clipmap: every seam bit-identical out to +-2e6 m (fp32 replay)', () => {
  for (const cam of CAMS) {
    const U = drawUniforms(cam), r = seams(cam, PL.terrain, U);
    assert.ok(r.n > (LEVELS - 1) * 4 * GN / 2, 'seams found at ' + cam + ': ' + r.n);
    assert.equal(r.bad, 0, `cam ${cam}: ${r.bad} of ${r.n} seam vertices apart, first ${JSON.stringify(r.first)}`);
  }
});

test('clipmap: the split land and its height passes put each vertex at the same bits as the one-program land', () => {
  for (const cam of CAMS.slice(0, 8)) {
    const U = drawUniforms(cam), H = hpUniforms(cam);
    for (const l of [0, 3, 9]) for (const aG of [[0, 0], [1, 0], [47, 95], [96, 96], [95, 1], [24, 72]]) {
      const a = place(PL.terrain, U[l], aG, cam), b = place(PL.split, U[l], aG, cam), c = place(PL.gridw, H[l], aG, cam);
      assert.deepEqual(b, a); assert.deepEqual(c, a);
    }
  }
});

test('clipmap: lint: no vertex placed as origin metres + aG cells', () => {
  const BAD = /\b(uLev|L|uLevA\[\w+\])\.xy\s*\+\s*aG\s*\*\s*\1\.z\b/;
  const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const files = [...walk('src'), ...walk('tools/gpu')].filter((f) => /\.(js|glsl|mjs)$/.test(f));
  const hits = files.filter((f) => BAD.test(rd(f)));
  assert.deepEqual(hits, [], 'origin metres + aG g: place from the whole-cell lattice instead ((uLev.xy + aG) * uLev.z)');
});

// ---- the level of detail: no pop at a ring's handoff (tools/physics/lod-pop.mjs)
test('clipmap: no LOD pop at cruise: a point handed to the next ring keeps its height (< 0.5 px) and shading (< 2 levels)', async () => {
  const L = await import('../../tools/physics/lod-pop.mjs'), { landAt } = await import('../../tools/physics/dune-census.mjs');
  const S = L.clipmapSpec(ROOT), H = (x, z) => landAt(x, z, 0.6);
  assert.ok(S.morph, 'VS_TERRAIN morphs no vertex: the rings pop where they hand over (' + S.rule + ')');
  for (const o of [{ a0: 0.3 }, { a0: 2.1, x0: 4000, z0: -2500 }]) {
    const r = L.fly(S, H, { seconds: 4, points: 250, ...o });
    assert.ok(r.handoff.n > 10, 'the flight crossed too few handoffs to say (' + r.handoff.n + ')');
    assert.ok(r.handoff.px < 0.5 && r.px.max < 0.5, `a pop: ${r.handoff.px.toFixed(2)} px at a handoff, ${r.px.max.toFixed(2)} px worst step (${JSON.stringify(r.worst)})`);
    assert.ok(r.handoff.levels < 2, `a shading pop at a handoff: ${r.handoff.levels.toFixed(2)} levels`);
  }
  // the rule before (each odd vertex to c - 1): the fine ring's diagonals crossed half the coarse cells', and popped
  const b = L.fly({ ...S, rule: 'down', step: L.STEP.down }, H, { seconds: 4, points: 250, a0: 0.3 });
  assert.ok(b.handoff.px > 0.5, 'the measure no longer sees the c - 1 rule\'s pops (' + b.handoff.px.toFixed(2) + ' px)');
});

test('clipmap: the brinks hold still at cruise: a brink point steps over 2 levels in under 0.1% of frames (laptop, phone)', async () => {
  const L = await import('../../tools/physics/lod-pop.mjs'), S = L.clipmapSpec(ROOT);
  assert.ok(S.cpFix, "S1_FS's footprint reads the vertices' normal: it swells with their morph and the brinks shimmer");
  for (const size of [[1800, 0.727, 0.454], [2556, 0.384, 0.832]]) for (const o of [{ a0: 0.3 }, { a0: 2.1, x0: 4000, z0: -2500 }]) {
    const r = L.flyBrink(S, { seconds: 5, points: 200, size, ...o });
    assert.ok(r.steps > 10000, 'too few brink reads to say (' + r.steps + ')');
    assert.ok(r.points_over_0p1pct === 0, `the brinks shimmer: ${r.points_over_0p1pct} brink points over 2 levels in more than 0.1% of their frames (worst ${(100 * r.worst_point_frac).toFixed(2)}%, ${r.levels.max.toFixed(1)} levels)`);
  }
  // the footprint from the vertices' normal (the rule before): the brinks must shimmer, or the measure is blind
  const b = L.flyBrink({ ...S, cpFix: false }, { seconds: 5, points: 200, a0: 0.3 });
  assert.ok(b.points_over_0p1pct > 0, 'the measure no longer sees the brinks shimmer (' + (100 * b.worst_point_frac).toFixed(2) + '% at the worst point)');
});

test('clipmap: the near dunes\' crests hold still at cruise: a crest point steps over 2 levels in under 0.1% of frames (laptop, phone)', async () => {
  const L = await import('../../tools/physics/lod-pop.mjs'), S = L.clipmapSpec(ROOT);
  assert.ok(S.roundNear, "duneWave leaves the near crest's kink sharp: a morphing vertex crossing it turns its normal 12 levels in a frame");
  for (const size of [[1800, 0.727, 0.454], [2556, 0.384, 0.832]]) for (const o of [{ a0: 0.3 }, { a0: 2.1, x0: 4000, z0: -2500 }]) {
    const r = L.flyBrink(S, { seconds: 5, points: 200, size, near: true, ...o });
    assert.ok(r.steps > 10000, 'too few crest reads to say (' + r.steps + ')');
    assert.ok(r.points_over_0p1pct === 0, `the near crests shimmer: ${r.points_over_0p1pct} points over 2 levels in more than 0.1% of their frames (${r.levels.max.toFixed(1)} levels)`);
  }
  const b = L.flyBrink({ ...S, roundNear: false }, { seconds: 5, points: 200, near: true, a0: 2.1, x0: 4000, z0: -2500 });   // (the crest sharp: it must shimmer, or the measure is blind)
  L.flyBrink({ ...S, roundNear: S.roundNear }, { seconds: 0, points: 1 });   // (the port put back as the shader draws it)
  assert.ok(b.points_over_0p1pct > 0, 'the measure no longer sees the sharp crest shimmer');
});
