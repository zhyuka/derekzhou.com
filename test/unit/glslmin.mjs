// test/unit/glslmin.mjs: the shaders' minifier (tools/glslmin.mjs): the same program, token for token
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
import { test, assert, fs, os, path, vm, crypto, execFileSync, ROOT, TMP, WORLD, cut, golden, md5, upd, digest, STREAMS, VEC, fileURLToPath } from '../unit-lib.mjs';

// ------------------------------------------------------------------ the shaders' minifier (tools/glslmin.mjs)
test('glslmin: the same program, token for token', async () => {
  const { minGlsl, checkGlsl, tokens } = await import(new URL('../../tools/glslmin.mjs', import.meta.url));
  const cases = [
    ['float a = b - -c;', 'float a=b- -c;'],
    ['float a = b + +c;', 'float a=b+ +c;'],
    ['x = y / *p;', 'x=y/ *p;'],
    ['a = b-- - c;', 'a=b---c;'],   // (b -- - c: the same tokens, maximal munch)
    ['a = b & &c;', 'a=b& &c;'],
    ['vec2 v = vec2(1.0, .5) * 1e-3;  // a comment', 'vec2 v=vec2(1.0,.5)*1e-3;'],
    ['  uniform vec3 uA; /* why */ uniform int uDbg;', ' uniform vec3 uA;uniform int uDbg;'],   // (a piece's leading space stays one space)
    ['p.xy += q.zw;', 'p.xy+=q.zw;'],
    ['uint u = 0x1Fu;', 'uint u=0x1Fu;'],
  ];
  for (const [src, want] of cases) { assert.equal(minGlsl(src), want, src); assert.equal(checkGlsl(src), null, src); }
  // preprocessor lines keep their spacing, and their own lines; every code line stays a line
  const pre = '#version 300 es\nprecision highp float;\n#define A (1.0)   // one\n#define F(x) ((x) * 2.0)\n\n// gone\nfloat f() {\n  return F(A);\n}\n';
  assert.equal(minGlsl(pre), '#version 300 es\nprecision highp float;\n#define A (1.0)\n#define F(x) ((x) * 2.0)\nfloat f(){\nreturn F(A);\n}\n');
  // a piece's own edges: what was apart stays apart
  assert.equal(minGlsl('\nvec3 a;\n'), '\nvec3 a;\n'); assert.equal(minGlsl(' vec3 a; '), ' vec3 a; ');
  // the tokenizer: numbers, words, the longest operator
  assert.deepEqual(tokens('a<<=1.5e+2u>>b'), ['a', '<<=', '1.5e+2u', '>>', 'b']);
  // a file whose text a script reads at run time is not minified (the land split finds D_Hd by its text)
  const { KEEP } = await import(new URL('../../tools/glslmin.mjs', import.meta.url));
  assert.ok(KEEP.has('dunes-glsl') && WORLD.includes("g.indexOf('vec3 D_Hd(vec2 p) {')"), 'the land split still reads dunes-glsl\'s text: keep it in KEEP');
});
