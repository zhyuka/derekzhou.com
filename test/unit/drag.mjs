// test/unit/drag.mjs: the drag: where it starts, how far it turns
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
// plant: {"file": "src/world/340-input-drag-anywhere-phone-turn.js", "find": "if (dx * dx + dy * dy < 64) return;", "with": "if (dx * dx + dy * dy < 16) return;", "why": "a drag that starts after 4 px, not 8"}
import { test, assert, fs, os, path, vm, crypto, execFileSync, ROOT, TMP, WORLD, cut, golden, md5, upd, digest, STREAMS, VEC, fileURLToPath } from '../unit-lib.mjs';

// ------------------------------------------------------------------ the drag: where it starts, how far it turns
// (dev-speed item 5c) onMove cut from the world as it ships (the start: 8 px, the first 8 px taken too; a vertical swipe
// on a touch page that scrolls left to the page), and applyInput's gain line (90 degrees across the window's width)
const MOVE = cut(WORLD, '  function onMove(e) {', '  function onUp(e) {');
const GAIN = /\n(\s*var G = \(PI \/ 2\) \/ Math\.max\(OUT\.cssW \|\| 800, 240\),)/.exec(WORLD);
function dragging(type = 'mouse', mode = 'none') {
  return vm.runInThisContext('(function (TYPE, MODE) {\n  \'use strict\';\n  var DRAG = { id: 1, x0: 100, y0: 100, x: 100, y: 100, on: false, type: TYPE }, TOUCHMODE = MODE, DOMQ = {}, running = true, REC = null,\n' +
    '    INP = { dx: 0, dy: 0, down: false }, root = { setPointerCapture: function () {} };\n  function domNext() {}\n' + MOVE +
    '\n  return { move: function (x, y) { onMove({ pointerId: 1, clientX: x, clientY: y, timeStamp: 0 }); }, on: function () { return DRAG.on; }, inp: INP };\n})')(type, mode);
}
test('drag: under 8 px is still a tap; from 8 px it steers, the first 8 px taken too', () => {
  const D = dragging(); D.move(104, 104); D.move(105.6, 105.6);   // (7.9 px from the press)
  assert.equal(D.on(), false, 'under 8 px: a tap'); assert.equal(D.inp.dx, 0);
  D.move(108, 100);   // (8 px across)
  assert.equal(D.on(), true, '8 px: a drag'); assert.equal(D.inp.dx, 8, 'the first 8 px steer too'); assert.equal(D.inp.down, true);
  D.move(130, 90); assert.equal(D.inp.dx, 30); assert.equal(D.inp.dy, -10);
});
test('drag: a vertical swipe on a touch page that scrolls is the page\'s; across it steers', () => {
  const V = dragging('touch', 'scroll'); V.move(103, 140); assert.equal(V.on(), false, 'vertical: the page scrolls');
  const H = dragging('touch', 'scroll'); H.move(140, 103); assert.equal(H.on(), true, 'across: it steers');
});
test('drag: across the window\'s width the view turns 90 degrees, on any width', () => {
  assert.ok(GAIN, 'applyInput\'s gain line not found in world.js');
  const g = (w) => vm.runInThisContext('(function (OUT) { var PI = Math.PI, INP = {};' + GAIN[1].replace(/,$/, ';') + ' return G; })')({ cssW: w });
  for (const w of [1440, 393, 800, 2560, 240]) assert.ok(Math.abs(g(w) * w - Math.PI / 2) < 1e-12, `${w} px: ${(g(w) * w * 180) / Math.PI} degrees`);
  assert.ok(Math.abs(g(100) * 240 - Math.PI / 2) < 1e-12, 'a window under 240 px turns as one of 240');
  assert.ok(Math.abs(g(0) * 800 - Math.PI / 2) < 1e-12, 'a window not yet measured turns as one of 800');
});
