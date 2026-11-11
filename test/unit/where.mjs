// test/unit/where.mjs: tools/where.mjs, a name's declaration and the sections that read, assign and write its members
// plant: {"file": "tools/where.mjs", "find": "if (t instanceof T.AST_SymbolRef && t.thedef === def) assigns.add(t.start.pos);", "with": "if (false) assigns.add(t.start.pos);", "why": "assignments not seen"}
import { test, assert, ROOT } from '../unit-lib.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const W = await import(pathToFileURL(path.join(ROOT, 'tools', 'where.mjs')).href);

test('where: three sections, one name read, assigned and written', async () => {
  const files = [
    ['000-head.js', '(function () {\n  var A = { n: 0 }, B = 1;\n'],
    ['010-one.js', '  function f() { A.n++; return B; }\n  B = 2;\n'],
    ['020-two.js', '  function g(A) { return A; }\n  A = f() ? A : null;\n  A.m = B;\n})();\n'],
  ];
  const r = await W.whereFiles(files, 'A');
  assert.equal(r.kind, 'var');
  assert.deepEqual(r.decl, { file: '000-head.js', line: 2 });
  assert.deepEqual(r.assigns, { '020-two.js': [2] });
  assert.deepEqual(r.members, { '010-one.js': [1], '020-two.js': [3] });
  assert.deepEqual(r.reads, { '010-one.js': [1], '020-two.js': [2, 3] }, 'g\'s own A is not the sections\' A');
  const f = await W.whereFiles(files, 'f');
  assert.equal(f.kind, 'function');
  assert.deepEqual(f.decl, { file: '010-one.js', line: 1 });
  assert.equal(await W.whereFiles(files, 'nope'), null);
});

test('where: the world\'s own names resolve to their sections', async () => {
  const r = await W.where('clockNow', 'world');
  assert.ok(r, 'clockNow is a top-level name');
  assert.equal(r.kind, 'function');
  assert.equal(r.decl.file, 'src/world/000-head.js');
  assert.ok(Object.keys(r.reads).length > 5, 'read across the world');
  assert.equal(await W.where('clockNow', 'birds'), null, 'not one of the ink birds\'');
});
