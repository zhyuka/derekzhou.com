// test/unit/perch-ink.mjs: the name's perch table (255-perch-ink.js, written by tools/birds/perch/make.mjs as each
// column's differences from the one before) read back by 260's nameInk() as it ships: the same table, number for
// number, as the plain one it replaced (LOAD-PERF's review, 2026-11-15: -245 B Brotli)
// plant: {"file": "src/birds/inkbirds/260-perches.js", "find": "return (p[i] || 0) + +d;", "with": "return +d;", "why": "the name's columns read as they are written, not added to the column before (the perches all wrong)"}
import { test, assert, fs, path, vm, crypto, ROOT } from '../unit-lib.mjs';

const src = (f) => fs.readFileSync(path.join(ROOT, 'src/birds/inkbirds', f), 'utf8');
const INK = src('255-perch-ink.js').match(/  var PERCH_INK = \{[\s\S]*?\n  \};\n/)[0];
const FN = src('260-perches.js').match(/  function nameInk\(\) \{[\s\S]*?\n  \}\n/)[0];

test('perch-ink: nameInk() reads the name\'s table back to the plain table it replaced, number for number', () => {
  const I = vm.runInThisContext('(function () {\n' + INK + '  var NAME_INK = null;\n' + FN + '  return nameInk();\n})')();
  assert.equal(I.length, 219, 'the name\'s columns');
  assert.ok(I.every((c) => c.length > 0 && c.every((r) => r.length === 2 && Number.isInteger(r[0]) && Number.isInteger(r[1]) && r[0] < r[1])), 'every column runs of sky, top over bottom');
  // (the sha-256 of the plain table's JSON on main 98fd8ba, before it was written small)
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(I)).digest('hex'), 'ad6f2edd16662663888d33740a01130f9dce9a31f9886fe436fd8cb72371f23e');
});
