// test/unit/clouds.mjs: the cloud bodies' fine billows: one scale and depth a body, set once
// plant: {"file": "src/world/410-drawing-frame.js", "find": "B.u4a[2] = B.det[0]; B.u4a[3] = B.det[1];", "with": "B.u4a[2] = (V.L || V.light).clDetail[0]; B.u4a[3] = B.det[1];", "why": "the billows' scale blended per frame by the place's weight again"}
import { test, assert, vm, WORLD, cut } from '../unit-lib.mjs';

// (the owner's wiggle, 2026-11-14: clDetail, blended each frame by the place's weight between ABOVE's [80, 5] and the
// dunes' [120, 4], scaled noise looked up at world coordinates, so a few thousand metres from the origin the billows slid
// through every body as the flight crossed realms)
const DRAW = cut(WORLD, '    var push = pushVol;', '    ST.vols = m;');
const DET = /\n(  function volDetail\(V\) \{[^\n]*\})/.exec(WORLD);

test('clouds: the volume draw reads no light for the billows; each body brings its own', () => {
  assert.ok(!/clDetail/.test(DRAW), 'the draw loop reads clDetail: the billows\' scale changes per frame with the place');
  assert.match(DRAW, /B\.u4a\[2\] = B\.det\[0\]; B\.u4a\[3\] = B\.det\[1\];/, 'the billows\' scale and depth are not the body\'s own');
});
test('clouds: a body\'s billows are set once, from the light it is made under, and never follow it', () => {
  assert.ok(DET, 'volDetail not found in world.js');
  const volDetail = vm.runInThisContext('(function () {' + DET[1] + ' return volDetail; })')();
  const V = { L: { clDetail: new Float32Array([80, 5]) } }, d = volDetail(V);
  assert.deepEqual(Array.from(d), [80, 5]);
  V.L.clDetail[0] = 120; V.L.clDetail[1] = 4;   // (the flight crosses into the dunes)
  assert.deepEqual(Array.from(d), [80, 5], 'the body\'s billows followed the light');
  assert.deepEqual(Array.from(volDetail({})), [120, 4], 'no light yet: the default');
});
