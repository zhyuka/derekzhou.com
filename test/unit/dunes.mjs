// test/unit/dunes.mjs: the main dunes follow the sand physics spec (physics: sand/S1).
// A transverse dune is a gentle windward slope (7-15 deg), a brink, and a slip face at sand's angle of repose (32-34
// deg) down to a toe; sand steeper than 34 deg slides. The shipped dunes() must build its main wave with duneS1 (the
// slip face a 32 deg plane in the surface's own steepest direction, H at most 0.13 of the local wavelength, the brink a
// smooth min over 2 m, the toe a smooth max over 0.15 of the face, the near family x0.6 and kept off the face), and the
// census of that model (tools/physics/dune-census.mjs, a port of dunes() in doubles) must meet the spec: at most 0.1%
// of the sand over 34 deg, the lee's mode 32 +- 1 deg, the stoss's 90th percentile at most 15 deg, in four winds.
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "float m = dot(G0, g) + sqrt(", "with": "float m = 1.3 * dot(G0, g) + 0.3 + sqrt(", "why": "the slip face past the angle of repose"}
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "  vec2 G0 = swell.yz;\n", "with": "  vec2 G0 = swell.yz + H.yz;\n", "why": "the face solved for a gradient the surface does not have"}
// plant: {"file": "src/glsl/dunes-glsl.glsl", "find": "vec3 H = dSmin(Hm, vec3(0.13 / k, 0.0, 0.0), 2.0);", "with": "vec3 H = Hm.x <= 0.13 / k ? Hm : vec3(0.13 / k, 0.0, 0.0);", "why": "a hard cap on the height: a 1 m step where it switches"}
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const G = fs.readFileSync(path.join(ROOT, 'src/glsl/dunes-glsl.glsl'), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
function body(sig) {
  const a = G.search(sig); if (a < 0) return null;
  let i = G.indexOf('{', a), n = 0;
  for (; i < G.length; i++) { if (G[i] === '{') n++; else if (G[i] === '}' && --n === 0) break; }
  return strip(G.slice(G.indexOf('{', a) + 1, i));
}

test('dunes: the shipped main wave is duneS1, its slip face at the angle of repose', () => {
  const d = body(/vec3 dunes\(vec2 p\) \{/); assert.ok(d, 'dunes() found');
  assert.match(d, /duneS1\(s1Phase\(p, w, pp, 205\.0, g2, g3\), 32\.0 \* dMul\(amp, gKD\), h - gSK, nw\)/, 'the main dunes from duneS1 (205 m, 32 m by the sand weight, over the swell)');
  assert.doesNotMatch(d, /duneWave\(p, w, 205\.0/, 'not the old asymmetric wave');
  assert.match(d, /2\.4 \* wSmall\) \* dMul\(dMul\(dMul\(s2, /, 'the near family at 0.6 of its 4 m');
  assert.match(d, /, nw\);/, 'and weighted off the slip face');
  const s1 = body(/vec3 duneS1\(/); assert.ok(s1, 'duneS1 found');
  assert.match(s1, /vec2 G0 = swell\.yz;\s+float m = dot\(G0, g\) \+ sqrt\(max\(0\.39046 - pow\(-G0\.x \* g\.y \+ G0\.y \* g\.x, 2\.0\), 0\.04\)\);/, 'the face solved for tan^2 32 = 0.39046 in the steepest direction, on the ground under it alone');
  assert.match(s1, /vec3 F = vec3\(H\.x \* \(1\.0 - f\) \/ fl, ph\.yz \* \(-H\.x \/ fl\)\);/, 'the face\'s slope with no dH (its height m (1 - f) / k: H drops out)');
  assert.match(s1, /vec3 P = vec3\(-H\.x \* f \/ fl, ph\.yz \* \(-H\.x \/ fl\)\);/, 'and the face before');
  assert.match(s1, /vec3 H = dSmin\(Hm, vec3\(0\.13 \/ k, 0\.0, 0\.0\), 2\.0\);/, 'H at most 0.13 of the local wavelength, a smooth cap');
  assert.match(s1, /vec3 N = dMul\(vec3\(0\.5 \* n, ph\.yz \* \(0\.5 \/ L\)\), H\);/, 'the next stoss a plane below its toe');
  assert.match(s1, /dSmin\(A, F, 2\.0\)/, 'the brink a smooth min over 2 m');
  assert.match(s1, /max\(0\.15 \* H\.x, 0\.05\)/, 'the toe a smooth max over 0.15 of the face');
  const ph = body(/vec3 s1Phase\(/); assert.ok(ph, 's1Phase found');
  assert.match(ph, /dot\(p, w\) \+ lam \* \(0\.42 \* d1\.x \+ 0\.13 \* d2\.x\)/, 'the crests\' wander along the wind, from the across-wind coordinate');
});

test('dunes: the census meets the spec in four winds (lee mode 32 +- 1, <= 0.1% over 34 deg, stoss p90 <= 15)', async () => {
  const { census } = await import(pathToFileURL(path.join(ROOT, 'tools/physics/dune-census.mjs')).href);
  for (const wind of [0, 0.6, 1.7, 2.9]) {
    const r = census({ model: 's1', half: 800, cell: 8, wind });
    assert.ok(r.over34_pct <= 0.1, `wind ${wind}: ${r.over34_pct}% over 34 deg`);
    assert.ok(Math.abs(r.lee.mode_deg - 32) <= 1, `wind ${wind}: the lee's mode ${r.lee.mode_deg} deg`);
    assert.ok(r.stoss.p90 <= 15, `wind ${wind}: the stoss's p90 ${r.stoss.p90} deg`);
  }
});

// (the hub's review of #271: the census above reads the gradient the code carries; the surface itself is measured here,
// by central differences of the heights over 0.5 m on a 1 m grid. The face once solved for G0 + dH, a gradient its
// height does not have, made walls of 48-62 deg where fl changed fast across the wind: 0.10-0.24% over 34 deg)
test('dunes: the surface itself, by finite differences, in four winds: at most 0.1% over 34 deg, none over 40', async () => {
  const { census } = await import(pathToFileURL(path.join(ROOT, 'tools/physics/dune-census.mjs')).href);
  for (const wind of [0, 0.6, 1.7, 2.9]) {
    const r = census({ model: 's1', half: 220, cell: 1, wind, fd: true });
    assert.ok(r.over34_pct <= 0.1, `wind ${wind}: ${r.over34_pct}% of the surface over 34 deg`);
    assert.ok(r.steepest_deg <= 40, `wind ${wind}: the surface's steepest ${r.steepest_deg} deg`);
  }
});

test('dunes: today\'s old wave fails the same census (the test can tell)', async () => {
  const { census } = await import(pathToFileURL(path.join(ROOT, 'tools/physics/dune-census.mjs')).href);
  const r = census({ model: 'old', half: 800, cell: 8, wind: 0.6 });
  assert.ok(r.over34_pct > 1, 'the old wave: ' + r.over34_pct + '% over 34 deg');
});

test('dunes: the main wave has no step and no crease (walked along the wind every 0.1 m, four winds)', async () => {
  const { mainAt } = await import(pathToFileURL(path.join(ROOT, 'tools/physics/dune-census.mjs')).href);
  let worst = 0, crease = 0;
  for (const wind of [0, 0.6, 1.7, 2.9]) {
    const wx = Math.cos(wind), wy = Math.sin(wind);
    for (let l = 0; l < 6; l++) {
      let prev = null; const ox = -4000 + l * 1263.1, oy = 2000 - l * 741.7;
      for (let i = 0; i < 6000; i++) {
        const r = mainAt(ox + wx * i * 0.1, oy + wy * i * 0.1, wind);
        if (prev) {
          worst = Math.max(worst, Math.abs(r.h[0] - prev.h[0] - 0.1 * (prev.h[1] * wx + prev.h[2] * wy)));
          crease = Math.max(crease, Math.hypot(r.h[1] - prev.h[1], r.h[2] - prev.h[2]));
        }
        prev = r;
      }
    }
  }
  // (a hard cap on H switched its slope, and with it the face's width: a 1.0 m step; the cubic stoss behind the toe a 1.9 m one)
  assert.ok(worst < 0.05, 'a step of ' + worst.toFixed(3) + ' m in 0.1 m');
  assert.ok(crease < 0.05, 'a crease of ' + crease.toFixed(3) + ' in the slope in 0.1 m');
});
