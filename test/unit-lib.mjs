// test/unit-lib.mjs: what every test/unit/<area>.mjs file shares (split from test/unit.mjs, 2026-11-07). Nothing here needs
// WebGL or a page: the code is read from the dev build (src/ assembled by tools/parts.mjs into a temporary folder), cut out
// by its own anchors and run in a function of its own, so src/ exports nothing for the tests.
//   node --test test/unit/                 every area, a process each (CI: tools/checks/24-unit.sh)
//   node test/unit/<area>.mjs --write      write that area's golden values, test/golden/unit/<area>.json (a deliberate change)
// An anchor not found fails with its text: the code moved, and the test's anchor follows it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

// ------------------------------------------------------------------ the code under test
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'unit-'));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));
execFileSync(process.execPath, [path.join(ROOT, 'tools', 'parts.mjs'), 'assemble', path.join(ROOT, 'src'), path.join(TMP, 'src')], { stdio: 'ignore' });
const WORLD = fs.readFileSync(path.join(TMP, 'src', 'world.js'), 'utf8');
function cut(s, a, b, withEnd = false) {   // from anchor a (included) to anchor b (excluded, or included)
  const i = s.indexOf(a);
  assert.ok(i >= 0 && s.indexOf(a, i + 1) < 0, 'anchor not found once in world.js: ' + JSON.stringify(a));
  const j = s.indexOf(b, i + a.length);
  assert.ok(j >= 0, 'end anchor not found after ' + JSON.stringify(a) + ': ' + JSON.stringify(b));
  return s.slice(i, withEnd ? j + b.length : j);
}
const STREAMS = cut(WORLD, '  /* ---------------------------------------------------------------- streams */', '  /* ---------------------------------------------------------------- colour */');
const VEC = cut(WORLD, '  /* ---------------------------------------------------------------- small vector maths (build time) */', '  var BUILD = ');

// ------------------------------------------------------------------ the golden values, one file an area (test/golden/unit/<area>.json)
const GOLDS = {};
const goldFile = (key) => path.join(ROOT, 'test', 'golden', 'unit', key.split('.')[0] + '.json');
function golden(key, value) {
  const f = goldFile(key);
  if (!(f in GOLDS)) GOLDS[f] = WRITE ? {} : (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {});
  if (WRITE) { GOLDS[f][key] = value; return; }
  assert.ok(key in GOLDS[f], 'no golden value for ' + key + ' (node test/unit/<area>.mjs --write)');
  assert.deepEqual(value, GOLDS[f][key], key + ' changed (a deliberate change: node test/unit/<area>.mjs --write, and commit ' + path.relative(ROOT, f) + ')');
}
if (WRITE) process.on('beforeExit', () => {
  for (const [f, g] of Object.entries(GOLDS)) {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(Object.fromEntries(Object.keys(g).sort().map((k) => [k, g[k]])), null, 1) + '\n');
    console.log('unit: wrote ' + path.relative(ROOT, f) + ' (' + Object.keys(g).length + ' values)');
  }
});
const md5 = () => crypto.createHash('md5');
function upd(h, v) {   // a value into a hash: numbers as their 8 bytes, typed arrays as their bytes, the rest by structure
  if (v === null || v === undefined) { h.update('~' + v); return; }
  if (ArrayBuffer.isView(v)) { h.update(v.constructor.name); h.update(Buffer.from(v.buffer, v.byteOffset, v.byteLength)); return; }
  if (typeof v === 'number') { const b = Buffer.alloc(8); b.writeDoubleLE(v); h.update(b); return; }
  if (Array.isArray(v)) { h.update('[' + v.length); v.forEach((x) => upd(h, x)); return; }
  if (typeof v === 'object') { const ks = Object.keys(v); h.update('{' + ks.join(',')); ks.forEach((k) => upd(h, v[k])); return; }
  h.update(String(v));
}
const digest = (...v) => { const h = md5(); v.forEach((x) => upd(h, x)); return h.digest('hex').slice(0, 12); };

export { test, assert, fs, os, path, vm, crypto, execFileSync, fileURLToPath, ROOT, TMP, WORLD, cut, golden, md5, upd, digest, STREAMS, VEC, WRITE };
