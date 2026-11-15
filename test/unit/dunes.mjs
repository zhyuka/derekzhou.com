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
// plant: {"file": "src/world/350-shaders-scene.js", "find": "max(1.0, 0.5 * wpx) * sB", "with": "max(4.0, 0.5 * wpx) * sB", "why": "the brink rounded over 8 m, not crisp"}
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
  assert.match(d, /ph = s1Phase\(p, w, pp, 205\.0, g2, g3\)/, 'the main dunes\' phase (205 m)');
  assert.match(d, /duneS1\(ph, 32\.0 \* dMul\(amp, gKD\), h - gSK, nw, hf\)/, 'the main dunes from duneS1 (32 m by the sand weight, over the swell)');
  assert.doesNotMatch(d, /duneWave\(p, w, 205\.0/, 'not the old asymmetric wave');
  assert.match(d, /2\.4 \* wSmall\) \* dMul\(dMul\(dMul\(s2, /, 'the near family at 0.6 of its 4 m');
  assert.match(d, /, nw\);/, 'and weighted off the slip face');
  const s1 = body(/vec3 duneS1\(/); assert.ok(s1, 'duneS1 found');
  assert.match(s1, /vec2 G0 = swell\.yz;\s+float m = dot\(G0, g\) \+ sqrt\(max\(0\.39046 - pow\(-G0\.x \* g\.y \+ G0\.y \* g\.x, 2\.0\), 0\.04\)\);/, 'the face solved for tan^2 32 = 0.39046 in the steepest direction, on the ground under it alone');
  assert.match(s1, /vec3 F = vec3\(H\.x \* \(1\.0 - f\) \/ fl, ph\.yz \* \(-H\.x \/ fl\)\);/, 'the face\'s slope with no dH (its height m (1 - f) / k: H drops out)');
  assert.match(s1, /vec3 P = vec3\(-H\.x \* f \/ fl, ph\.yz \* \(-H\.x \/ fl\)\);/, 'and the face before');
  assert.match(s1, /vec3 H = dSmin\(Hm, vec3\(0\.13 \/ k, 0\.0, 0\.0\), 2\.0\);/, 'H at most 0.13 of the local wavelength, a smooth cap');
  assert.match(s1, /vec3 N = dMul\(vec3\(0\.5 \* n, ph\.yz \* \(0\.5 \/ L\)\), H\);/, 'the next stoss a plane below its toe');
  assert.match(s1, /dSmin\(A, F, max\(H\.x \* k \* \(0\.5 \/ L \+ 1\.0 \/ fl\), 0\.05\)\)/, 'the brink a smooth min over 2 m across');
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
  assert.ok(crease < 0.1, 'a crease of ' + crease.toFixed(3) + ' in the slope in 0.1 m');   // (the brink's own turn over 2 m reaches 0.052; the steps' creases were 0.56)
});

// (physics: sand/S2, a crisp brink) the land's fragments rebuild the main dune's slope at their own phase (s1Slope, from
// the 7 varyings) in place of the vertices': walked along the wind across a cell of the land's grid (0.7-5.6 m), the
// fragment's slope (the vertices' interpolated, less their own rebuilt slope interpolated, plus the rebuilt slope at the
// fragment's phase) is the dune's own within 1 deg away from the brink and the toe, and at the brink it turns from the
// stoss to the face within max(2 m, 1.5 px), where the vertices' alone took the whole cell.
test('dunes: the brink rebuilt per fragment (physics: sand/S2): within 1 deg of the slope away from it, crisp at it', async () => {
  const { mainAt, s1Slope } = await import(pathToFileURL(path.join(ROOT, 'tools/physics/dune-census.mjs')).href);
  const fsSrc = fs.readFileSync(path.join(ROOT, 'src/world/350-shaders-scene.js'), 'utf8');
  assert.match(fsSrc, /vec2 s = s1Slope\(fract\(vS1\.x\), g, H, fl, max\(1\.0, 0\.5 \* wpx\) \* sB, /, 'the fragment rebuilds the slope, its brink max(2 m, 1.5 px) wide');
  assert.match(fsSrc, /float B = 1\.0 - smoothstep\(0\.25, 0\.5, cp\);/, 'only as far as the dunes are resolved');
  assert.match(fsSrc, /vS1g = vec3\(fl, s1Slope\(fract\(s\.x\), s\.yz, vS1\.w, fl, 2\.0, max\(0\.15 \* vS1\.w, 0\.05\)\)\);/, 'the vertex\'s own rebuilt slope (the height\'s rounding)');
  const ang = (a, b) => { const d = a[0] * b[0] + 1 + a[1] * b[1]; return Math.acos(Math.min(1, d / Math.hypot(a[0], 1, a[1]) / Math.hypot(b[0], 1, b[1]))) * 180 / Math.PI; };
  const sv = (v) => s1Slope(v.f, v.gph, v.H, v.fl, 2, Math.max(0.15 * v.H, 0.05));
  let far = 0, turnNew = 0, turnOld = Infinity;
  for (const c of [0.7, 1.4, 2.8, 5.6]) for (const wind of [0.6, 2.9]) {
    const wx = Math.cos(wind), wy = Math.sin(wind);
    for (let l = 0; l < 6; l++) {
      const ox = -3000 + l * 451.3, oy = 900 - l * 297.1, run = [];
      for (let i = 0; i < 300 / c; i++) {
        const p0 = [ox + wx * i * c, oy + wy * i * c], p1 = [p0[0] + wx * c, p0[1] + wy * c];
        const v0 = mainAt(p0[0], p0[1], wind), v1 = mainAt(p1[0], p1[1], wind), s0 = sv(v0), s1 = sv(v1);
        for (let t = 0.0625; t < 1; t += 0.125) {
          const m = (x, y) => x + (y - x) * t, a = mainAt(m(p0[0], p1[0]), m(p0[1], p1[1]), wind);
          const ph = m(v0.ph, v1.ph), g = [m(v0.gph[0], v1.gph[0]), m(v0.gph[1], v1.gph[1])], H = m(v0.H, v1.H), fl = m(v0.fl, v1.fl), k = Math.hypot(g[0], g[1]);
          const sB = H * k * (0.5 / (1 - fl) + 1 / fl), sf = s1Slope(ph - Math.floor(ph), g, H, fl, sB, Math.max(0.15 * H, 0.05));
          const old = [m(v0.h[1], v1.h[1]), m(v0.h[2], v1.h[2])], neu = [old[0] + sf[0] - m(s0[0], s1[0]), old[1] + sf[1] - m(s0[1], s1[1])];
          const dB = Math.min(Math.abs(a.f - (1 - a.fl)), a.f, 1 - a.f) / k;
          if (dB > c + 6) far = Math.max(far, ang(neu, [a.h[1], a.h[2]]));
          run.push({ x: (i + t) * c, f: a.f, fl: a.fl, k, sNew: neu[0] * wx + neu[1] * wy, sOld: old[0] * wx + old[1] * wy });
        }
      }
      if (c !== 5.6) continue;
      // (at each brink: the run from 10% to 90% of the way from the stoss's slope to the face's, along the wind)
      for (let j = 1; j < run.length; j++) {
        const q = run[j], b = 1 - q.fl;
        if (!(run[j - 1].f < b && q.f >= b)) continue;
        const near = run.filter((r) => Math.abs(r.x - q.x) < 12), hi = Math.max(...near.map((r) => r.sNew)), lo = Math.min(...near.map((r) => r.sNew));
        const width = (key) => { const lo2 = Math.min(...near.map((r) => r[key])), hi2 = Math.max(...near.map((r) => r[key])); const xs = near.filter((r) => r[key] < hi2 - 0.1 * (hi2 - lo2) && r[key] > lo2 + 0.1 * (hi2 - lo2)).map((r) => r.x); return xs.length ? Math.max(...xs) - Math.min(...xs) + 0.7 : 0.7; };
        if (hi - lo > 0.3) { turnNew = Math.max(turnNew, width('sNew')); turnOld = Math.min(turnOld, width('sOld')); }
      }
    }
  }
  assert.ok(far < 1, 'away from the brink and the toe: ' + far.toFixed(2) + ' deg from the dune\'s slope');
  assert.ok(turnNew <= 3.5, 'the brink turns within ' + turnNew.toFixed(1) + ' m (2 m and a fragment step)');
  assert.ok(turnOld >= 4.5, 'where the vertices\' alone took ' + turnOld.toFixed(1) + ' m (the test can tell)');
});
