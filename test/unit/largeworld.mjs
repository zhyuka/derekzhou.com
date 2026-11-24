// test/unit/largeworld.mjs: a long visit's far-out frames hold still (delight-visit 8 #2: a 2-hour visit is 86 km from the
// origin). fp32 rounds a coordinate 86 km out to 8 mm. The camera rounded so (uCam) shook every vertex's clip position
// as it moved: a 1.3 px judder at 3 m. The motes' box was wrapped from world-sized values (the camera, the wind's drift
// since the start) in fp32: they jittered by as much. Now every vertex stage's clip position goes through eyeRel (the
// camera's fp32 and what it drops, uCamL, from the JS's doubles), and the particles' wrap takes the camera modulo the
// box and the wind's drift in boxes from the JS's doubles (uPm, uPn), a mote's share of the wind in 256ths so its drift
// modulo the box is exact (kDrift). An fp32 replay of the shaders' arithmetic: at 86 km and 2 hours, the old ways off
// by millimetres, the new by under a tenth of one.
// plant: {"file": "src/world/glsl/frame-u.glsl", "find": "vec3 eyeRel(vec3 w) { return (w - uCam) - uCamL; }", "with": "vec3 eyeRel(vec3 w) { return w - uCam; }", "why": "the camera's own rounding back on the screen"}
// plant: {"file": "src/world/glsl/vs-particle.glsl", "find": "vec2 rel = mod(pos - uPm.xy + 0.5 * uPa.x, uPa.x) - 0.5 * uPa.x;", "with": "vec2 rel = mod(pos - uCam.xz + 0.5 * uPa.x, uPa.x) - 0.5 * uPa.x;", "why": "the motes wrapped about the camera's fp32"}
import { test, assert, fs, path, ROOT } from '../unit-lib.mjs';

const F = Math.fround;
const G = (f) => fs.readFileSync(path.join(ROOT, 'src/world/glsl', f), 'utf8');

test('large world: every vertex stage\'s clip position goes through eyeRel; the particles wrap from the JS\'s doubles', () => {
  assert.match(G('frame-u.glsl'), /vec3 eyeRel\(vec3 w\) \{ return \(w - uCam\) - uCamL; \}/, 'eyeRel: the exact difference, then what fp32 dropped of the camera');
  for (const f of fs.readdirSync(path.join(ROOT, 'src/world/glsl')).filter((n) => /^vs-.*\.glsl$/.test(n))) {
    const s = G(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    assert.doesNotMatch(s, /uVP \* vec4\([^;]*- uCam, 1\.0\)/, f + ': a clip position from the camera\'s fp32 alone');
  }
  const scn = fs.readFileSync(path.join(ROOT, 'src/world/350-shaders-scene.js'), 'utf8');
  assert.doesNotMatch(scn, /uVP \* vec4\(vW - uCam, 1\.0\)/, 'the land\'s too');
  const p = G('vs-particle.glsl');
  assert.match(p, /float kDrift\(uint q, float n, float f\) \{ return fract\(float\(\(q \* uint\(n\)\) & 255u\) \/ 256\.0 \+ float\(q\) \/ 256\.0 \* f\); \}/, 'a share of the drift modulo 1, exactly');
  assert.doesNotMatch(p.replace(/\/\*[\s\S]*?\*\//g, ''), /- uCam\.xz \+ 0\.5 \* uPa\.x/, 'no wrap about the camera\'s fp32');
  const W = fs.readFileSync(path.join(ROOT, 'src/world/413-draw-frame.js'), 'utf8');
  assert.match(W, /function wrapU\(P, box, wind, fall, H, air\) \{/, 'the wrap\'s terms from the JS\'s doubles');
});

test('large world: 86 km out, a vertex\'s place before the eye to a tenth of a millimetre (was 4 mm)', () => {
  let worstOld = 0, worstNew = 0;
  for (let i = 0; i < 2000; i++) {
    const cam = [86000 + i * 0.2003, 41.37 + 0.001 * i, -51234.5 - i * 0.1771];   // (the camera, flying: the JS's doubles)
    const w = [F(cam[0] + 3.1), F(cam[1] - 1.2), F(cam[2] + 2.4)];   // (a vertex 3-4 m off: the buffer's fp32)
    const camH = cam.map(F), camL = cam.map((c, k) => F(c - camH[k]));
    for (let k = 0; k < 3; k++) {
      const exact = w[k] - cam[k];
      worstOld = Math.max(worstOld, Math.abs(F(w[k] - camH[k]) - exact));
      worstNew = Math.max(worstNew, Math.abs(F(F(w[k] - camH[k]) - camL[k]) - exact));
    }
  }
  assert.ok(worstNew < 1e-4, 'eyeRel off by ' + worstNew + ' m');
  assert.ok(worstOld > 1e-3, 'the camera\'s fp32 alone off by ' + worstOld + ' m (the test can tell)');
});

test('large world: 86 km out and 2 hours in, a mote\'s place to under a tenth of a millimetre (was millimetres)', () => {
  const box = 40, wind = [4.3, 0, -2.9], mod = (x, m) => x - Math.floor(x / m) * m;
  let worstOld = 0, worstNew = 0;
  for (let i = 0; i < 400; i++) {
    const t = 7200 + i / 60, cam = [86000 + 12 * (t - 7200), 40, -51234.5];
    const q = 166 + (i * 37) % 180, k = q / 256, p0 = [((i * 13) % 40) * 1.0, ((i * 7) % 40) * 1.0];
    // the exact wrap, in doubles
    const ex = [0, 1].map((a) => mod(p0[a] + k * wind[a * 2] * t - cam[a * 2] + box / 2, box) - box / 2);
    // the old: mod(pos - uCam.xz ...) in fp32, pos = p0 + vel t
    const old = [0, 1].map((a) => { const pos = F(F(p0[a]) + F(F(F(wind[a * 2]) * F(k)) * F(t))); return F(mod(F(F(pos - F(cam[a * 2])) + box / 2), box) - box / 2); });
    // the new: kDrift from the JS's terms (uPm, uPn), the camera modulo the box
    const nw = [0, 1].map((a) => {
      const d = wind[a * 2] * F(t) / box, n = mod(Math.floor(d), 256), f = F(d - Math.floor(d)), camM = F(mod(cam[a * 2], box));
      const kd = F(F(((q * n) & 255) / 256) + F(F(q / 256) * f)), fr = kd - Math.floor(kd);
      const pos = F(F(p0[a]) + F(box * fr));
      return F(mod(F(F(pos - camM) + box / 2), box) - box / 2);
    });
    const exT = [0, 1].map((a) => mod(p0[a] + k * wind[a * 2] * F(t) - cam[a * 2] + box / 2, box) - box / 2);   // (the shaders' own clock, uT)
    for (let a = 0; a < 2; a++) {
      const dOld = Math.abs(old[a] - ex[a]), dNew = Math.abs(nw[a] - exT[a]);
      if (dOld < box / 2) worstOld = Math.max(worstOld, dOld);
      if (dNew < box / 2) worstNew = Math.max(worstNew, dNew);
    }
  }
  assert.ok(worstNew < 1e-4, 'the mote off by ' + worstNew + ' m');
  assert.ok(worstOld > 2e-3, 'the old wrap off by ' + worstOld + ' m (the test can tell)');
});
