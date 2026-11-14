// test/unit/swell.mjs: the near sand's swell (the owner's pick, 2026-11-14) is band-limited by what a pixel spans.
// The swell (shadeSand: 9 m across the wind) is faded by the cycles it puts in one pixel along its own phase, from the
// pixel's step on the ground in x and y (gDPX, gDPY). Those come from the one stage that may take screen derivatives:
// FS_TERRAIN sets them, in its main, before it calls the shading. The realm's GLSL is also compiled into vertex
// shaders (the land's heights), where dFdx does not exist: no derivative may appear there. And the fade must be gone
// by a quarter of a cycle a pixel (never under four pixels a cycle: no aliasing, no glitter).
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "float sk = (1.0 - smoothstep(0.125, 0.25, scp))", "with": "float sk = (1.0 - smoothstep(0.25, 0.5, scp))", "why": "the swell kept to two pixels a cycle: it aliases"}
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
function body(src, sig) {
  const a = src.search(sig); if (a < 0) return null;
  let i = src.indexOf('{', a), n = 0;
  for (; i < src.length; i++) { if (src[i] === '{') n++; else if (src[i] === '}' && --n === 0) break; }
  return src.slice(src.indexOf('{', a) + 1, i);
}

test('swell: FS_TERRAIN sets the pixel\'s ground step before it shades', () => {
  const fs0 = body(rd('src/world/350-shaders-scene.js'), /function FS_TERRAIN\(/);
  assert.ok(fs0, 'FS_TERRAIN found');
  const set = fs0.search(/gDPX = dFdx\(vW\.xz\); gDPY = dFdy\(vW\.xz\);/), shade = fs0.indexOf('${S}(');
  assert.ok(set >= 0, 'FS_TERRAIN sets gDPX, gDPY from dFdx, dFdy of vW.xz');
  assert.ok(shade > set, 'and does so before the shading is called');
  assert.match(rd('src/world/180-world-definition-two-kits-by.js'), /vec2 gDPX = vec2\(1e4\), gDPY = vec2\(1e4\);/, 'declared for every stage, unset a step past every detail');
});

test('swell: lint: no screen derivative in the realms\' GLSL (it is compiled into vertex shaders too)', () => {
  const hits = fs.readdirSync(path.join(ROOT, 'src/glsl')).filter((f) => /\bd?Fd[xy]\s*\(|\bfwidth\s*\(/.test(strip(rd('src/glsl/' + f))));
  assert.deepEqual(hits, []);
});

test('swell: faded by cycles a pixel along its phase, gone by a quarter of a cycle a pixel', () => {
  const sand = strip(body(rd('src/glsl/dunes-glsl.glsl'), /vec3 shadeSand\(/) || '');
  assert.match(sand, /max\(abs\(dot\(gDPX, sg\)\), abs\(dot\(gDPY, sg\)\)\)/, 'the swell\'s cycles a pixel from both of the pixel\'s steps');
  const m = /float sk = \(1\.0 - smoothstep\(([\d.]+), ([\d.]+), scp\)\)/.exec(sand);
  assert.ok(m, 'the swell\'s fade found');
  assert.ok(+m[2] <= 0.25, 'gone by ' + m[2] + ' cycles a pixel: at most 0.25 (four pixels a cycle)');
  assert.match(sand, /vec2 sg = sw \/ 9\.0 \+ 1\.5 \* sv\.yz \/ 70\.0;/, 'the phase\'s gradient takes the warp\'s (1.5 gnd(p / 70)) as well as the swell\'s own 1/9');
});
