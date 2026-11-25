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

test('glslmin: a function\'s own names shortened, one to one, never a protected one', async () => {
  const { minGlsl, mangleGlsl, checkMangle } = await import(new URL('../../tools/glslmin.mjs', import.meta.url));
  const src = 'uniform float uK;\nfloat g;\nfloat f(vec3 pos, float amount) {\n  float total = pos.x * amount + uK + g;\n  vec3 col = vec3(total), tmp = col;\n  for (int idx = 0; idx < 2; idx++) total += tmp.x;\n  return col.x + total;\n}\n';
  const P = new Set(['amount']), mt = minGlsl(src), mm = mangleGlsl(mt, P);
  // the parameters and locals renamed (most saved first); the uniform, the global, the function, the fields and the protected parameter kept
  assert.equal(mm, 'uniform float uK;\nfloat g;float f(vec3 d,float amount){float a=d.x*amount+uK+g;vec3 b=vec3(a),e=b;for(int c=0;c<2;c++)a+=e.x;return b.x+a;}\n');
  assert.equal(checkMangle(mt, mm, P), null);
  // what the check refuses
  assert.match(checkMangle(mt, mt.replace('total=pos', 'total=amount'), P), /protected name \(amount\)/);
  assert.match(checkMangle(mt, mt.replace('col.x+total', 'col.y+total'), P), /a field \(x\) renamed/);
  assert.match(checkMangle(mt, mt.replace(/\bg\b/g, 'h'), P), /outside a function/);
  assert.match(checkMangle(mt, mt.replace('tmp=col', 'col=col').replace('tmp.x', 'col.x'), P), /kept where it is renamed|one to one|already in its function/);
});

test('glslmin: every text a script finds in a shader is still there once its names are shortened', async () => {
  const { minGlsl, shipGlsl, protectedNames, KEEP, minGlslKeeping } = await import(new URL('../../tools/glslmin.mjs', import.meta.url));
  const acorn = await import('acorn');
  const P = protectedNames(path.join(ROOT, 'src'));
  // the scripts' own literals and regexes, as their lexer reads them
  const lits = new Set();
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) { walk(f); continue; }
      if (!f.endsWith('.js')) continue;
      for (const tk of acorn.tokenizer(fs.readFileSync(f, 'utf8'), { ecmaVersion: 'latest' })) {
        if (tk.type.label === 'string' || tk.type.label === 'template') { const v = String(tk.value); if (v.length >= 3 && /[A-Za-z_]/.test(v)) lits.add(v); }
        else if (tk.type.label === 'regexp') for (const w of tk.value.pattern.replace(/\\[A-Za-z]/g, ' ').matchAll(/[A-Za-z_]\w{2,}/g)) lits.add(w[0]);   // (a regex's search: the names it spells out)
      }
    }
  })(path.join(ROOT, 'src'));
  const W = /[A-Za-z0-9_]/, edges = (s, i, v) => (!W.test(v[0]) || !W.test(s[i - 1] || ' ')) && (!W.test(v[v.length - 1]) || !W.test(s[i + v.length] || ' '));
  const whole = (s, v) => { for (let i = s.indexOf(v); i >= 0; i = s.indexOf(v, i + 1)) if (edges(s, i, v)) return true; return false; };
  const lost = []; let files = 0, shortened = 0;
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) { walk(f); continue; }
      if (!f.endsWith('.glsl')) continue;
      const name = e.name.replace(/\.glsl$/, ''), t = fs.readFileSync(f, 'utf8');
      const before = KEEP.has(name) ? minGlslKeeping(t, KEEP.get(name)) : minGlsl(t), after = shipGlsl(name, t, P);
      files++; if (after !== before) shortened++;
      // (a find counts where it is whole at its edges: a text that only matches inside a longer name, 'paper' in cpaper,
      // ' ms' in msun, is a script's own word that no shader search could rely on)
      for (const v of lits) if (whole(before, v) && !whole(after, v)) lost.push(path.relative(ROOT, f) + ': ' + JSON.stringify(v.slice(0, 60)));
    }
  })(path.join(ROOT, 'src'));
  assert.ok(files > 20 && shortened > 10, files + ' files, ' + shortened + ' shortened');
  assert.deepEqual(lost, [], 'a text a script searches a shader for is lost');
  // the names the world finds by name, by hand: the land split's D_Hd, the folds' token, the realms' hooks
  for (const n of ['D_Hd', 'uDbg', 'skyHook', 'emitMod']) assert.ok(P.has(n), n + ' protected');
  const dunes = fs.readFileSync(path.join(ROOT, 'src/glsl/dunes-glsl.glsl'), 'utf8');
  const HP_SITES_FN = vm.runInThisContext('(function () {\n' + cut(WORLD, '  function HP_SITES_FN(g) {', '  function VS_TERRAIN_SPLIT(') + '  return HP_SITES_FN;\n})()');
  assert.equal(HP_SITES_FN(shipGlsl('dunes-glsl', dunes, P)), HP_SITES_FN(dunes), 'the land split still finds D_Hd as written');
});
// plant: {"file": "tools/glslmin.mjs", "find": "    for (const n of declared(toks, f)) if (!protect.has(n) && !RESERVED.has(n)", "with": "    for (const n of declared(toks, f)) if (!RESERVED.has(n)", "why": "a protected name shortened: a text a script finds in a shader (a local it splices code for, or searches) is lost"}
// plant: {"file": "tools/glslmin.mjs", "find": "if (l !== 'string' && l !== 'template' && l !== 'regexp') continue;", "with": "if (l !== 'string') continue;", "why": "the names in template literals and regexes not protected: a spliced or searched name shortened"}

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
