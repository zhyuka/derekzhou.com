// test/unit/prune.mjs: the shaders' text without the functions their main never reaches (071-glsl-prune.js; load-perf,
// 2026-11-15: the serial-GPU boot). Only dead top-level definitions go; everything kept is the text byte for byte
// plant: {"file": "src/world/071-glsl-prune.js", "find": "var seen = pruneIds(rest + '\\n' + (extra || ''), {})", "with": "var seen = pruneIds(rest, {})", "why": "a function named only in the defines given before the text cut"}
import { test, assert, vm, WORLD, cut } from '../unit-lib.mjs';

const PRUNE = cut(WORLD, '  var PRUNE_ID = ', '  /* (fast500 step 9, the owner');
const P = vm.runInThisContext('(function () {\n  \'use strict\';\n' + PRUNE + '\n  return { prune: glslPrune, defs: pruneDefs };\n})')();
const names = (src) => P.defs(src).map((d) => d.name);

const SRC = [
  '#version 300 es',
  'precision highp float;',
  'uniform float uK;',
  'out vec4 o;',
  'float used(float x) { return x * 2.0; }',
  'float dead(float x) { return x + uK; }',
  'float deeper(float x) { return used(x) + 1.0; }',
  'vec3 deadToo(vec3 p) { if (p.x > 0.0) { return p; } return -p; }',
  'void main() { o = vec4(deeper(uK)); }',
  '',
].join('\n');

test('prune: a dead function goes, a live chain from main stays, the rest byte for byte', () => {
  const out = P.prune(SRC, '');
  assert.deepEqual(names(out), ['used', 'deeper', 'main']);
  assert.ok(!out.includes('dead(') && !out.includes('deadToo('));
  // what is kept is the input with whole definitions cut out, nothing else
  const kept = SRC.replace('float dead(float x) { return x + uK; }', '').replace('vec3 deadToo(vec3 p) { if (p.x > 0.0) { return p; } return -p; }', '');
  assert.equal(out, kept);
});
test('prune: every overload of a live name stays; a struct-returning function is a function', () => {
  const src = 'struct H { float t; };\nH hit(float a) { return H(a); }\nH hit(vec2 a) { return H(a.x); }\nH miss(float a) { return H(0.0); }\nvoid main() { H h = hit(1.0); }\n';
  assert.deepEqual(names(P.prune(src, '')), ['hit', 'hit', 'main']);
});
test('prune: a name in a #define body, a global initialiser or the defines given before keeps its function', () => {
  const src = '#define SHADE(x) tone(x)\nfloat tone(float x) { return x; }\nfloat g0() { return 1.0; }\nconst float K = 2.0;\nfloat bySeed() { return 0.0; }\nfloat gone() { return 3.0; }\nvoid main() { float a = SHADE(K); }\n';
  const out = P.prune(src, '#define EXTRA bySeed()\n');
  assert.deepEqual(names(out), ['tone', 'bySeed', 'main']);
});
test('prune: a definition holding an unbalanced #if/#endif is kept; balanced preprocessor inside a dead one goes with it', () => {
  const src = 'float a() {\n#ifdef X\n  return 1.0;\n#else\n  return 2.0;\n#endif\n}\n#ifdef Y\nfloat b() { return 1.0;\n#endif\n}\nvoid main() { }\n';
  const out = P.prune(src, '');
  assert.ok(!out.includes('float a()'), 'the balanced dead one goes');
  assert.ok(out.includes('float b()'), 'the unbalanced one is kept');
});
test('prune: no main at the top level, or nothing to cut: the text as it was; pruning twice changes nothing more', () => {
  const noMain = 'float f() { return 1.0; }\n';
  assert.equal(P.prune(noMain, ''), noMain);
  assert.equal(P.prune('void main() { }\n', ''), 'void main() { }\n');
  const once = P.prune(SRC, '');
  assert.equal(P.prune(once, ''), once);
});
test('prune: comments and preprocessor lines are boundaries, not headers', () => {
  const src = '// float fake() {\n/* float alsoFake() { } */\n#define M 1\nfloat real() { return 1.0; }\nvoid main() { }\n';
  assert.deepEqual(names(src), ['real', 'main']);
  assert.ok(!P.prune(src, '').includes('float real()'));
});
