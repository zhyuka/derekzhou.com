// test/unit/held.mjs: the held world (the owner, 2026-11-12: "a, the still world"): which slow devices hold the world
// and which keep the still sky
// plant: {"file": "src/world/455-boot-stages.js", "find": "hold('stage G: the frame at scale 0.35 takes ' + GS.med[0] + ' ms (over 21.7)'); }", "with": "decline('stage G: the frame at scale 0.35 takes ' + GS.med[0] + ' ms (over 21.7)'); return false; }", "why": "a boot that misses the 0.35 floor declining to the still sky again"}
import { test, assert, vm, WORLD, cut } from '../unit-lib.mjs';

// hold, giveUp and decline (450) and stage G's floor (455), cut from the world as it ships and run on stubs
const HOLD = cut(WORLD, '  var HELD = false, HDRAW = false', '  function render() {');
const FLOOR = cut(WORLD, '  function gFloor() {', '  /* (fast500 step 10, S10e) G pinned');
function world({ shown = false, lost = false } = {}) {
  return vm.runInThisContext('(function (shown, LOST) {\n  \'use strict\';\n' +
    '  var DEAD = false, GAVEUP = false, RUNG = 3, BOOT = {}, GS = { pick: -1, med: [null] }, running = true, marked = 0;\n' +
    '  var canvas = { classList: { remove: function () { canvas.on = false; } }, on: true };\n' +
    '  function bootMark() {} function recMark() {} function fail() {} function clearWords() {}\n' +
    '  function stop() { running = false; } function markStill() { marked++; }\n' + HOLD + FLOOR +
    '\n  return { hold: hold, giveUp: giveUp, decline: decline, gFloor: gFloor, GS: GS,\n' +
    '    st: function () { return { held: HELD, draw: HDRAW, dead: DEAD, still: marked > 0, rung: RUNG, running: running, canvas: canvas.on, why: BOOT.held || BOOT.declined || \'\' }; } };\n})')(shown, lost);
}
test('held: a boot that misses the 0.35 floor holds the world, never the still sky', () => {
  const W = world(); W.GS.med[0] = 38.2;
  assert.equal(W.gFloor(), true, 'the boot goes on to stage H and the show');
  const s = W.st();
  assert.equal(s.held, true); assert.equal(s.draw, true, 'drawn whole in its first held frame');
  assert.equal(s.dead, false); assert.equal(s.still, false); assert.equal(s.running, true);
  assert.match(s.why, /0\.35 takes 38\.2 ms/);
});
test('held: a boot within the floor is not held', () => {
  const W = world(); W.GS.med[0] = 15;
  assert.equal(W.gFloor(), true); assert.equal(W.st().held, false);
  const P = world(); P.GS.pick = 0; P.GS.med[0] = 40;   // (a scale was picked within the bar: the floor is not asked)
  assert.equal(P.gFloor(), true); assert.equal(P.st().held, false);
});
test('held: a first frame doubted twice or a broken program still declines to the still sky', () => {
  for (const why of ['the first frame doubted twice', 'an engine program will not link here', 'no realm will link here']) {
    const W = world(); W.decline(why); const s = W.st();
    assert.equal(s.held, false, why); assert.equal(s.dead, true, why); assert.equal(s.still, true, why); assert.equal(s.canvas, false, why);
  }
});
test('held: the governor\'s floor holds a shown world at the tier\'s top; before the show it keeps the still sky', () => {
  const W = world({ shown: true }); W.giveUp(); let s = W.st();
  assert.equal(s.held, true); assert.equal(s.rung, 0); assert.equal(s.dead, false); assert.equal(s.still, false);
  const L = world({ shown: true, lost: true }); L.giveUp(); s = L.st();
  assert.equal(s.held, false, 'a lost context is not held'); assert.equal(s.dead, true);
  const N = world({ shown: false }); N.giveUp(); s = N.st();
  assert.equal(s.held, false); assert.equal(s.dead, true); assert.equal(s.still, true);
});
test('held: the GPU named too slow is held from the start; a CPU renderer keeps the still sky', () => {
  assert.match(WORLD, /if \(!DEVMODE && SLOW_GPU\.test\(EXT\.renderer\)\) hold\(/, 'SLOW_GPU holds');
  assert.match(WORLD, /if \(!DEVMODE && \/SwiftShader\|llvmpipe\|Software\/i\.test\(EXT\.renderer\)\) \{ DEAD = true; return; \}/, 'a CPU renderer stays dead');
  assert.match(WORLD, /if \(GS\.hT \|\| !GS\.pinned \|\| BOOT\.restore \|\| reduced\(\) \|\| DEVMODE \|\| HELD\) return true;/, 'no trial once held');
});
test('held: reduced motion keeps its own still (its branch comes before the held one)', () => {
  const i = WORLD.indexOf('    if (reduced() && !STILLMODE) {   // one still frame'), j = WORLD.indexOf('    if (HELD) {   // the world held');
  assert.ok(i > 0 && j > i, 'the reduced-motion still is decided first');
});
