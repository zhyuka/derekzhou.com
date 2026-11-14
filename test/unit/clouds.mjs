// test/unit/clouds.mjs: the cloud bodies' fine billows: one scale and depth a body, set once
// plant: {"file": "src/world/410-drawing-frame.js", "find": "B.u4a[2] = B.det[0]; B.u4a[3] = B.det[1];", "with": "B.u4a[2] = (V.L || V.light).clDetail[0]; B.u4a[3] = B.det[1];", "why": "the billows' scale blended per frame by the place's weight again"}
import { test, assert, vm, WORLD, cut } from '../unit-lib.mjs';

// (the owner's wiggle, 2026-11-14: clDetail, blended each frame by the place's weight between ABOVE's [80, 5] and the
// dunes' [120, 4], scaled noise looked up at world coordinates, so a few thousand metres from the origin the billows slid
// through every body as the flight crossed realms)
const DRAW = cut(WORLD, '    var push = pushVol;', '    ST.vols = m;');
const DET = cut(WORLD, '  function volDetail(V) {', '  function volPrep(');

test('clouds: the volume draw reads no light for the billows; each body brings its own', () => {
  assert.ok(!/clDetail/.test(DRAW), 'the draw loop reads clDetail: the billows\' scale changes per frame with the place');
  assert.match(DRAW, /B\.u4a\[2\] = B\.det\[0\]; B\.u4a\[3\] = B\.det\[1\];/, 'the billows\' scale and depth are not the body\'s own');
});
test('clouds: a body\'s billows are set once, from the kits\' own blended by the light\'s weight about the camera, and never follow it', () => {
  assert.ok(DET, 'volDetail not found in world.js');
  // (the world's KW, CS and lightWeight stubbed: the camera at the landing, the light's weight there 0.6)
  const make = (ok, w) => vm.runInThisContext('(function (KW, CS, lightWeight) {' + DET + ' return volDetail; })')({ ok }, { x: 0, z: 0 }, () => w);
  const kits = { lightRaw: { clDetail: [120, 4] }, lightRawB: { clDetail: [80, 5] } };
  // the boot: V.L the dunes kit's unblended copy, before the landing's first climateLight; the body takes the landing's light
  const boot = make(true, 0.6)(Object.assign({ L: { clDetail: new Float32Array([120, 4]) } }, kits));
  assert.ok(Math.abs(boot[0] - 96) < 1e-4 && Math.abs(boot[1] - 4.6) < 1e-4, `a body made in the boot: [${Array.from(boot)}], not the landing's [96, 4.6]`);
  const V = Object.assign({ L: { clDetail: new Float32Array([96, 4.6]) } }, kits), d = make(true, 0.6)(V);
  V.L.clDetail[0] = 120; V.L.clDetail[1] = 4;   // (the flight crosses into the dunes)
  assert.ok(Math.abs(d[0] - 96) < 1e-4, 'the body\'s billows followed the light');
  assert.deepEqual(Array.from(make(false, 0)({})), [120, 4], 'no weights, no light yet: the default');
});
