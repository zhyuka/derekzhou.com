// test/unit/check-shards.mjs: CI's validate job runs tools/check.mjs --shard i/n on n runners side by side (2026-11-24).
// Every check runs on exactly one shard, and the matrix in validate.yml is the n its command names, so no check is
// skipped and none runs twice.
// plant: {"file": "tools/check.mjs", "find": "const inShard = (slug) => !SH || split(rest, SH[1]).at.get(slug) === SH[0];", "with": "const inShard = (slug) => !SH || split(rest, SH[1]).at.get(slug) !== 1;", "why": "a shard that runs another shard's checks too"}
// plant: {"file": ".github/workflows/validate.yml", "find": "shard: [0, 1, 2, 3, 4]", "with": "shard: [0, 1, 2, 3]", "why": "a matrix one shard short of its command's n: that shard's checks never run"}
import { test, assert, fs, path, ROOT } from '../unit-lib.mjs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const CHECK = path.join(ROOT, 'tools/check.mjs');
const list = (...a) => {
  const r = spawnSync(process.execPath, [CHECK, '--list', ...a], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.split('\n').filter(Boolean).map((l) => ({ slug: l.slice(0, 20).trim(), kind: l.slice(20, 29).trim() }));
};

test('check-shards: validate.yml\'s matrix is the n its command names, each shard once', () => {
  const y = fs.readFileSync(path.join(ROOT, '.github/workflows/validate.yml'), 'utf8').replace(/\r\n/g, '\n');
  const m = y.match(/^\s+shard: \[([\d, ]+)\]$/m);
  assert.ok(m, 'a matrix of shards');
  const shards = m[1].split(',').map((s) => Number(s.trim()));
  const ns = [...y.matchAll(/--shard \$\{\{ matrix\.shard \}\}\/(\d+)/g)].map((x) => Number(x[1]));
  assert.ok(ns.length >= 2, 'the checks and the plants both sharded');
  for (const n of ns) assert.deepEqual(shards, Array.from({ length: n }, (_, i) => i), `the matrix is 0..${n - 1}`);
});

test('check-shards: every check that runs on a push is on exactly one shard', () => {
  const y = fs.readFileSync(path.join(ROOT, '.github/workflows/validate.yml'), 'utf8');
  const n = Number(y.match(/--shard \$\{\{ matrix\.shard \}\}\/(\d+)/)[1]);
  const want = list().filter((c) => c.kind !== 'build' && c.kind !== 'schedule').map((c) => c.slug).sort();
  const got = [];
  for (let i = 0; i < n; i++) got.push(...list('--shard', `${i}/${n}`).map((c) => c.slug));
  assert.deepEqual(got.sort(), want, 'each check once over the shards');
  assert.ok(want.length > 20);
});

test('check-shards: a bad --shard is refused', () => {
  for (const a of ['5/5', '-1/5', 'x/5', '0/0']) {
    const r = spawnSync(process.execPath, [CHECK, '--list', '--shard', a], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 2, a);
  }
});

test('check-shards: every plant a change selects runs on exactly one shard, a parted check\'s too (#382)', () => {
  const y = fs.readFileSync(path.join(ROOT, '.github/workflows/validate.yml'), 'utf8');
  const n = Number(y.match(/--shard \$\{\{ matrix\.shard \}\}\/(\d+)/)[1]);
  const os = require('node:os'), f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'plants-')), 'changed.txt');
  fs.writeFileSync(f, fs.readdirSync(path.join(ROOT, 'tools/checks')).filter((x) => /^\d\d-.*\.sh$/.test(x)).map((x) => 'tools/checks/' + x).join('\n') + '\n');
  const dry = (...a) => { const r = spawnSync(process.execPath, [CHECK, '--prove', '--changed', f, '--dry', ...a], { cwd: ROOT, encoding: 'utf8' }); return r.stdout.split('\n').filter((l) => l.startsWith('would  ')); };
  const all = dry(), got = [];
  for (let i = 0; i < n; i++) got.push(...dry('--shard', `${i}/${n}`));
  assert.ok(all.some((l) => /^would  35-birds /.test(l)), 'the birds check has plants (a parted check)');
  assert.ok(all.some((l) => /^would  15-security-txt /.test(l)), 'a weekly check has plants (in no shard\'s split)');
  assert.deepEqual(got.sort(), all.sort(), 'each plant once over the shards');
});
// plant: {"file": "tools/check.mjs", "find": ": rest.some((c) => c.slug === slug + '#0') ? slug + '#0' : null);", "with": ": slug);", "why": "a parted check's plants looked up by its whole name, in no shard's split (#382's first push: the 13 birds plants never ran)"}
// plant: {"file": "tools/check.mjs", "find": ": SH[0] === 0));", "with": ": false));", "why": "a weekly check's plants on no shard (15-security-txt's, from #367 to 2026-11-24)"}
