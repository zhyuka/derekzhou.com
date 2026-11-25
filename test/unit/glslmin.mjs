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
  // preprocessor lines keep their spacing, and their own lines; a run of code lines between them is one line
  const pre = '#version 300 es\nprecision highp float;\n#define A (1.0)   // one\n#define F(x) ((x) * 2.0)\n\n// gone\nfloat f() {\n  return F(A);\n}\n';
  assert.equal(minGlsl(pre), '#version 300 es\nprecision highp float;\n#define A (1.0)\n#define F(x) ((x) * 2.0)\nfloat f(){return F(A);}\n');
  assert.equal(minGlsl('float a;\nfloat b;\n'), 'float a;float b;\n');
  // a uniform declaration stays a line of its own (the folds, 076-folds-finish, skip a use on a line that starts
  // "uniform": joined, a use after it would not be folded, and a declaration after code would be)
  const uni = 'float a;\nuniform int uDbg;\nint b = uDbg;\n', umin = minGlsl(uni);
  assert.equal(umin, 'float a;\nuniform int uDbg;\nint b=uDbg;\n'); assert.equal(checkGlsl(uni, umin), null);
  const FOLD = vm.runInThisContext('(function () {\n' + cut(WORLD, '  function foldTok(s, tok, lit) {', '  function foldIssue(P) {') + '  return foldTok;\n})()');
  const fa = FOLD(uni, 'uDbg', '0'), fb = FOLD(umin, 'uDbg', '0');
  assert.equal(fb.n, fa.n, 'the folds fold as many uses in the minified text as in the source');
  assert.equal(fb.s, minGlsl(fa.s), 'and the same ones: folding the minified text is minifying the folded one');
  // a piece's own edges: what was apart stays apart
  assert.equal(minGlsl('\nvec3 a;\n'), '\nvec3 a;\n'); assert.equal(minGlsl(' vec3 a; '), ' vec3 a; ');
  // the tokenizer: numbers, words, the longest operator
  assert.deepEqual(tokens('a<<=1.5e+2u>>b'), ['a', '<<=', '1.5e+2u', '>>', 'b']);
  // a file whose text a script reads at run time keeps that part as written (the land split finds D_Hd by its text)
  const { KEEP, minGlslKeeping } = await import(new URL('../../tools/glslmin.mjs', import.meta.url));
  assert.ok(KEEP.has('dunes-glsl') && WORLD.includes("g.indexOf('vec3 D_Hd(vec2 p) {')"), 'the land split still reads dunes-glsl\'s text: keep D_Hd in KEEP');
  assert.equal(minGlslKeeping('// a\nfloat  x = 1.0;\nvec3 K(vec2 p) {\n  return  vec3(x);\n}\n// b\nfloat y;\n', [['vec3 K(vec2 p) {', '\n}']]),
    'float x=1.0;\nvec3 K(vec2 p) {\n  return  vec3(x);\n}\nfloat y;\n');
});

// plant: {"file": "tools/glslmin.mjs", "find": "const isUniform = (l) => /^\\s*uniform\\b/.test(l);", "with": "const isUniform = (l) => false;", "why": "a uniform declaration joined into the code around it: the folds would fold its name, and miss a use joined after it"}

test('glslmin: dunes-glsl minified but for D_Hd, which the world\'s own land split still splits as it does the source', async () => {
  const { KEEP, minGlslKeeping, checkGlsl } = await import(new URL('../../tools/glslmin.mjs', import.meta.url));
  const src = fs.readFileSync(path.join(ROOT, 'src/glsl/dunes-glsl.glsl'), 'utf8'), min = minGlslKeeping(src, KEEP.get('dunes-glsl'));
  assert.equal(checkGlsl(src, min), null, 'the same program, token for token');
  assert.ok(min.length < src.length * 0.75, 'minified: ' + min.length + ' of ' + src.length + ' bytes');
  const HP_SITES_FN = vm.runInThisContext('(function () {\n' + cut(WORLD, '  function HP_SITES_FN(g) {', '  function VS_TERRAIN_SPLIT(') + '  return HP_SITES_FN;\n})()');
  const a = HP_SITES_FN(src), b = HP_SITES_FN(min);
  assert.ok(a && b, 'D_Hd is of the split shape in the source and as shipped');
  assert.equal(b, a, 'the sites\' part is the same text either way');
});
// plant: {"file": "tools/glslmin.mjs", "find": "export const KEEP = new Map([['dunes-glsl', [['vec3 D_Hd(vec2 p) {', '\\n}']]]]);", "with": "export const KEEP = new Map([['dunes-glsl', [['vec3 D_Hd(vec2 p) {', '\\n  vec3 h']]]]);", "why": "D_Hd's body minified: the land split no longer finds its shape"}

test('glslmin: the shipped scripts carry no unminified GLSL (inline literals too), but for dunes-glsl\'s kept D_Hd', () => {
  const out = path.join(TMP, 'glslmin-ship');
  fs.rmSync(out, { recursive: true, force: true });
  execFileSync(process.execPath, [path.join(ROOT, 'tools/parts.mjs'), 'assemble', '--ship', '--min-glsl', path.join(ROOT, 'src'), out], { stdio: 'pipe' });
  const loose = [];
  for (const n of fs.readdirSync(out).filter((x) => x.endsWith('.js'))) {
    const s = fs.readFileSync(path.join(out, n), 'utf8');
    for (const m of s.matchAll(/`[^`]*`/g)) {
      const t = m[0].replace(/vec3 D_Hd\(vec2 p\) \{[\s\S]*?\n\}/, '');   // (KEEP: as written)
      if (!/\bvec[234]\b|\buniform\b|void main/.test(t) || !/;\n/.test(t)) continue;
      if (/\n[ \t]+\S|\n\s*\/\/|\/\*/.test(t)) loose.push(n + ': ' + JSON.stringify(t.slice(0, 60)));
    }
  }
  assert.deepEqual(loose, [], 'every GLSL literal minified');
  const dunes = fs.readFileSync(path.join(out, 'realm-dunes.js'), 'utf8');
  assert.ok(dunes.includes('vec3 D_Hd(vec2 p) {\n  vec3 h = dunes(p);\n'), 'D_Hd as written');
});
// plant: {"file": "tools/parts.mjs", "find": "return expand(MIN ? minInline(t, f) : t, gdir, f);", "with": "return expand(t, gdir, f);", "why": "the inline GLSL literals ship as written again"}
