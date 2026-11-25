// test/unit/kit.mjs: WORLD.kit (510's KITAPI) is exactly what the realms call (load-perf, 2026-11-25, the hub's ruling:
// no script outside this repository loads a realm, so the kit keeps no export a realm in src/ does not use). A realm
// reaches the kit as K (var K = W.kit) or as the kit its callbacks are handed (cell/build/cloud/mesh's last argument).
import fs from 'node:fs';
import path from 'node:path';
import { test, assert } from '../unit-lib.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// the set in use, pinned: a realm that starts calling another helper adds it here and to KITAPI together
const IN_USE = ['RNG', 'box', 'cellHash', 'cross', 'cumulus', 'hfl', 'hk', 'ihash', 'lathe', 'lch', 'lens', 'mul', 'norm',
  'prism', 'range', 'rock', 'smooth', 'sub', 'wall'];

function kitKeys() {
  const s = read('src/world/510-realms-kit.js'), m = /var KITAPI = \{([\s\S]*?)\n {2}\};/.exec(s);
  assert.ok(m, 'KITAPI found in 510-realms-kit.js');
  return [...m[1].replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(\w+)\s*:/g)].map((x) => x[1]).sort();
}
function realmUses() {
  const files = fs.readdirSync(path.join(ROOT, 'src')).filter((f) => /^realm-.*\.js$/.test(f));
  assert.ok(files.length >= 3, 'the realm files found');
  const used = new Set();
  for (const f of files) {
    const s = read('src/' + f);
    // the names a realm gives the kit: K (= W.kit) and any callback parameter handed KITAPI (none reads it today)
    for (const m of s.matchAll(/\b(K\d*)\.([A-Za-z_$][\w$]*)/g)) used.add(m[2]);
    assert.ok(!/\bW\.kit\.|\bWORLD\.kit\.|\bK\d*\[/.test(s), f + ': the kit read only as K.name');
  }
  return [...used].sort();
}

test('kit: KITAPI is the pinned set, no more, no less', () => {
  assert.deepEqual(kitKeys(), [...IN_USE].sort());
});

test('kit: every export is called by a realm, and every helper a realm calls is exported', () => {
  assert.deepEqual(realmUses(), kitKeys());
});
// plant: {"file": "src/world/510-realms-kit.js", "find": "cellHash: cellHash, ihash: ihash, hfl: hfl, hk: hk\n", "with": "cellHash: cellHash, ihash: ihash, hfl: hfl, hk: hk, angDiff: angDiff\n", "why": "an export no realm calls is back in the kit"}
