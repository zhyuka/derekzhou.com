// test/unit/framing.mjs: the camera's framing, per window shape
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/320-camera-drawn-between-last-two.js", "find": "  var CAMUP = 9;", "with": "  var CAMUP = 12;", "why": "the wide windows tilted 12 degrees, not 9"}
import { test, assert, fs, os, path, vm, crypto, execFileSync, ROOT, TMP, WORLD, cut, golden, md5, upd, digest, STREAMS, VEC, fileURLToPath } from '../unit-lib.mjs';

// ------------------------------------------------------------------ the camera's framing, per window shape
// (dev-speed item 5b) frustumFor, setFrustum and basePitchT cut from the world as it ships; the field of view, the frame and the
// wide windows' tilt read from the world too (FOV_LONG, CAMUP, the world's frame: [wide, tall])
const FRUSTUM = cut(WORLD, '  function frustumFor(aspect, out) {', '  function easeFrustum(');
const PITCH = cut(WORLD, '  function basePitchT(V) {', '\n', true);
const num = (re) => { const m = re.exec(WORLD); assert.ok(m, 'not found in world.js: ' + re); return m.slice(1).map(Number); };
const [FOV] = num(/var FOV_LONG = (\d+(?:\.\d+)?);/), [UP] = num(/var CAMUP = (\d+(?:\.\d+)?);/), FRAME = num(/frame: \[([\d.]+), ([\d.]+)\]/);
function framing(w, h) {   // the frustum and the base pitch for a window w x h; the horizon's place, 0 the top, 1 the bottom
  const F = vm.runInThisContext('(function (W, H, FOV_LONG, CAMUP, FRAME) {\n  \'use strict\';\n  var DEG = Math.PI / 180, OUT = { w: W, h: H }, FRT = {}, FR = {}, TALLK = 0, WIDEK = 1, WIDEKT = 1;\n' +
    '  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }\n  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }\n' +
    '  function lerp(a, b, t) { return a + (b - a) * t; }\n  function wideWin() { return W * 5 >= H * 6; }\n' + FRUSTUM + PITCH +
    '\n  setFrustum(true); var p = basePitchT({ def: { frame: FRAME } });\n  return { tanX: FRT.tanX, tanY: FRT.tanY, pitch: p, wide: WIDEKT, tall: TALLK };\n})')(w, h, FOV, UP, FRAME);
  const deg = (t) => (2 * Math.atan(t) * 180) / Math.PI;
  return { across: deg(F.tanX), tall: deg(F.tanY), pitch: (F.pitch * 180) / Math.PI, wide: F.wide, horizon: 0.5 + Math.tan(F.pitch) / (2 * F.tanY) };
}
test('framing: 72 degrees across a wide window, the horizon at the frame raised 9 degrees (1440x900: about 72% down)', () => {
  assert.equal(FOV, 72); assert.equal(UP, 9); assert.deepEqual(FRAME, [0.55, 0.58]);
  for (const [w, h] of [[1440, 900], [1920, 1080], [2560, 1080], [1280, 1024]]) {
    const f = framing(w, h);
    assert.ok(Math.abs(f.across - 72) < 1e-9, `${w}x${h}: ${f.across} across`); assert.equal(f.wide, 1, `${w}x${h} is wide`);
    const flat = 0.5 + (2 * FRAME[0] - 1) / 2, raised = 0.5 + Math.tan(Math.atan((2 * FRAME[0] - 1) * Math.tan(f.tall * Math.PI / 360)) + 9 * Math.PI / 180) / (2 * Math.tan(f.tall * Math.PI / 360));
    assert.ok(Math.abs(f.horizon - raised) < 1e-9 && f.horizon > flat, `${w}x${h}: horizon ${f.horizon}`);
  }
  const h = framing(1440, 900).horizon; assert.ok(h > 0.70 && h < 0.74, `1440x900: horizon ${h} (about 72% down)`);
});
test('framing: a tall window at most 80 degrees tall and at least 42 across until that cap, the horizon 58% down, no tilt', () => {
  for (const [w, h] of [[393, 852], [360, 800], [412, 915], [320, 1000], [768, 1024]]) {
    const f = framing(w, h);
    assert.ok(f.tall <= 80 + 1e-9, `${w}x${h}: ${f.tall} tall`);
    assert.ok(f.across >= 42 - 1e-9 || Math.abs(f.tall - 80) < 1e-9, `${w}x${h}: ${f.across} across with ${f.tall} tall (the 80-degree cap is the only thing that narrows it)`);
    assert.equal(f.wide, 0, `${w}x${h} is not wide`);
    if (h / w >= 1.75) assert.ok(Math.abs(f.horizon - FRAME[1]) < 1e-9, `${w}x${h}: horizon ${f.horizon} (the tall frame ${FRAME[1]})`);
  }
});
test('framing: the 9-degree tilt is a step at 6:5, never a share of it', () => {
  const a = framing(1200, 1000), b = framing(1199, 1000);
  assert.equal(a.wide, 1); assert.equal(b.wide, 0);
  assert.ok(Math.abs(a.pitch - b.pitch - 9) < 0.01, `the tilt across the step: ${a.pitch - b.pitch}`);
});
