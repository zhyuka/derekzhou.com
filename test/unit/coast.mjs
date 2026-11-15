// test/unit/coast.mjs: the land's varyings are centroid, so the coast's gap is never extrapolated off a triangle.
// The land's gap over the cloud sea (vX, gTX in the shading) jumps from tens of metres to 1e4 where the land stands
// 140 m over the sea's level (HdGap's shortcut). A varying without `centroid` is evaluated at the pixel's centre, and
// under MSAA a pixel only partly covered takes that centre from outside the triangle: across a 1e4 jump the
// extrapolated gap falls far under COAST_H and the pixel takes the sea's colour, one pixel at a time along the
// triangles' edges (the crawling specks on the plateaux, moonlit, seed 3: 29-33 a frame in the plateau's rows, 0-1
// with vX centroid). Every varying of VS_TERRAIN, VS_TERRAIN_SPLIT and FS_TERRAIN must be centroid, and the FS must
// read each as the VSs write it.
// plant: {"file": "src/world/350-shaders-scene.js", "find": "centroid in vec3 vN; centroid in float vX; out vec4 oC;", "with": "centroid in vec3 vN; in float vX; out vec4 oC;", "why": "the coast's gap read at the pixel's centre again"}
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCN = fs.readFileSync(path.join(ROOT, 'src/world/350-shaders-scene.js'), 'utf8');
const F = Math.fround;

function fnSrc(name) {
  const a = SCN.indexOf('function ' + name + '('); assert.ok(a >= 0, name + ' found');
  let i = SCN.indexOf('{', a), n = 0;
  for (; i < SCN.length; i++) { if (SCN[i] === '{') n++; else if (SCN[i] === '}' && --n === 0) break; }
  return SCN.slice(a, i + 1);
}
// [qualifiers, type, name] of each `in` or `out` varying declared at a shader's top level
function varyings(src, dir) {
  const out = [];
  for (const m of src.matchAll(new RegExp('(?<=^|[;\\n`])\\s*((?:(?:centroid|flat|smooth)\\s+)*)' + dir + '\\s+(float|vec[234])\\s+(\\w+)\\s*;', 'g'))) out.push([m[1].trim(), m[2], m[3]]);
  return out;
}

test('coast: every varying of the land\'s programs is centroid, in the VSs and the FS alike', () => {
  const vs = [fnSrc('VS_TERRAIN'), fnSrc('VS_TERRAIN_SPLIT')].map((s) => varyings(s, 'out'));
  const fsv = varyings(fnSrc('FS_TERRAIN'), 'in').filter(([, , n]) => /^v[A-Z]/.test(n));
  assert.ok(fsv.some(([, , n]) => n === 'vX'), 'FS_TERRAIN reads vX (the coast\'s gap)');
  for (const list of [...vs, fsv]) for (const [q, t, n] of list) assert.match(q, /\bcentroid\b/, `${n} (${t}) is not centroid: under MSAA it is read off its triangle`);
  for (const list of vs) assert.deepEqual(list.map((x) => x.join(' ')).sort(), fsv.map((x) => x.join(' ')).sort(), 'the FS reads each varying as the VS writes it');
});

test('coast: why: a gap across the 1e4 jump, read half a cell off its triangle, comes out under COAST_H', () => {
  // (the arithmetic the test above prevents) two vertices of an edge: one 60 m over the sea, one past the shortcut
  const COAST_H = Number(/COAST_H = ([\d.]+);/.exec(fs.readFileSync(path.join(ROOT, 'src/world/glsl/world-glsl.glsl'), 'utf8'))[1]);
  const a = F(60), b = F(1e4), lerp = (s) => F(a + F(F(b - a) * F(s)));
  for (let s = 0; s <= 1; s += 1 / 64) assert.ok(lerp(s) >= COAST_H, 'inside the triangle the gap stays between its vertices');
  assert.ok(lerp(-0.01) < COAST_H, 'a hundredth of the edge outside it: ' + lerp(-0.01) + ' m, the sea\'s colour');
});
