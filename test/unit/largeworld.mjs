// test/unit/largeworld.mjs: a long visit's far-out frames hold still (delight-visit 8 #2: a 2-hour visit is 86 km from the
// origin). fp32 rounds a coordinate 86 km out to 8 mm. The camera rounded so (uCam) shook every vertex's clip position
// as it moved: a 1.3 px judder at 3 m. Now every vertex stage's clip position goes through eyeRel (the camera's fp32
// and what it drops, uCamL, from the JS's doubles), and the veils' wrap takes the camera modulo the box and its whole
// boxes from the JS's doubles (uPm). (The particles' own wrap and its fp32 replay went with them: physics:
// air/particles-seen.)
// plant: {"file": "src/world/glsl/frame-u.glsl", "find": "vec3 eyeRel(vec3 w) { return (w - uCam) - uCamL; }", "with": "vec3 eyeRel(vec3 w) { return w - uCam; }", "why": "the camera's own rounding back on the screen"}
// plant: {"file": "src/world/glsl/vs-ribbon.glsl", "find": "vec2 rel0 = mod(vec2(r2, r3) * uRa.x - uPm.xy + 0.5 * uRa.x, uRa.x) - 0.5 * uRa.x;", "with": "vec2 rel0 = mod(vec2(r2, r3) * uRa.x - uCam.xz + 0.5 * uRa.x, uRa.x) - 0.5 * uRa.x;", "why": "the veils wrapped about the camera's fp32 again"}
import { test, assert, fs, path, ROOT } from '../unit-lib.mjs';

const F = Math.fround;
const G = (f) => fs.readFileSync(path.join(ROOT, 'src/world/glsl', f), 'utf8');

test('large world: every vertex stage\'s clip position goes through eyeRel; the veils wrap from the JS\'s doubles', () => {
  assert.match(G('frame-u.glsl'), /vec3 eyeRel\(vec3 w\) \{ return \(w - uCam\) - uCamL; \}/, 'eyeRel: the exact difference, then what fp32 dropped of the camera');
  for (const f of fs.readdirSync(path.join(ROOT, 'src/world/glsl')).filter((n) => /^vs-.*\.glsl$/.test(n))) {
    const s = G(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    assert.doesNotMatch(s, /uVP \* vec4\([^;]*- uCam, 1\.0\)/, f + ': a clip position from the camera\'s fp32 alone');
  }
  const scn = fs.readFileSync(path.join(ROOT, 'src/world/350-shaders-scene.js'), 'utf8');
  assert.doesNotMatch(scn, /uVP \* vec4\(vW - uCam, 1\.0\)/, 'the land\'s too');
  const rb = G('vs-ribbon.glsl').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(rb, /vec2 rel0 = mod\(vec2\(r2, r3\) \* uRa\.x - uPm\.xy \+ 0\.5 \* uRa\.x, uRa\.x\) - 0\.5 \* uRa\.x;/, 'the veils wrapped about the camera modulo the box (the JS\'s doubles)');
  assert.doesNotMatch(rb, /- uCam\.xz \+ 0\.5 \* uRa\.x/, 'no wrap about the camera\'s fp32');
  const W = fs.readFileSync(path.join(ROOT, 'src/world/414-draw-scene.js'), 'utf8');
  assert.match(W, /gl\.uniform4f\(P\.u\.uPm, wmod\(CAM\.pos\[0\], rb\.box\), wmod\(CAM\.pos\[2\], rb\.box\), Math\.floor\(CAM\.pos\[0\] \/ rb\.box\), Math\.floor\(CAM\.pos\[2\] \/ rb\.box\)\)/, 'the wrap\'s terms from the JS\'s doubles');
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


