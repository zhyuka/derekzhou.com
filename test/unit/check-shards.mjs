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

test('check-shards: every plant a change selects runs on exactly one shard, dealt out evenly (a parted or weekly check\'s too)', () => {
  const y = fs.readFileSync(path.join(ROOT, '.github/workflows/validate.yml'), 'utf8');
  const n = Number(y.match(/--shard \$\{\{ matrix\.shard \}\}\/(\d+)/)[1]);
  const os = require('node:os'), f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'plants-')), 'changed.txt');
  fs.writeFileSync(f, fs.readdirSync(path.join(ROOT, 'tools/checks')).filter((x) => /^\d\d-.*\.sh$/.test(x)).map((x) => 'tools/checks/' + x).join('\n') + '\n');
  const dry = (...a) => {
    const r = spawnSync(process.execPath, [CHECK, '--prove', '--changed', f, '--dry', ...a], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 << 20 });
    // (main's gate 45405600566 once got this list without its end, the birds plants missing, and passed every run since:
    // whatever it was, a list that is not whole says how it ended instead of failing on a missing line)
    const out = (r.stdout || '').split('\n'), tail = `status ${r.status}, signal ${r.signal}, ${(r.stdout || '').length} bytes out${r.error ? ', ' + r.error.code : ''}; stderr: ${(r.stderr || '').slice(-400)}`;
    assert.ok(r.status === 0 && !r.error, 'check.mjs --prove --dry ' + a.join(' ') + ' ran: ' + tail);
    const head = out.find((l) => l.startsWith('--changed: ')), w = out.filter((l) => l.startsWith('would  '));
    assert.ok(head, 'its --changed line: ' + tail);
    if (!a.length) assert.equal(w.length, +head.match(/; (\d+) of \d+ plants/)[1], 'every plant it selected listed (none lost): ' + tail);
    return w;
  };
  const all = dry(), got = [];
  for (let i = 0; i < n; i++) got.push(...dry('--shard', `${i}/${n}`));
  assert.ok(all.some((l) => /^would  35-birds /.test(l)), 'the birds check has plants (a parted check)');
  assert.ok(all.some((l) => /^would  15-security-txt /.test(l)), 'a weekly check has plants (in no shard\'s split)');
  assert.deepEqual(got.sort(), all.sort(), 'each plant once over the shards');
  const per = Array.from({ length: n }, (_, i) => dry('--shard', `${i}/${n}`).length), most = Math.ceil(all.length / n);
  assert.ok(Math.max(...per) <= most, `the plants dealt out evenly, not by check: ${per.join(', ')} (at most ${most} a shard)`);
});
// plant: {"file": "tools/check.mjs", "find": "if (SH) todo = todo.filter((p, i) => i % SH[1] === SH[0]);", "with": "if (SH) todo = todo.filter((p, i) => i % SH[1] === 0);", "why": "every shard runs the same share of the plants: some twice, the rest never"}
// plant: {"file": "tools/check.mjs", "find": "if (SH) todo = todo.filter((p, i) => i % SH[1] === SH[0]);", "with": "if (SH) todo = todo.filter((p) => inShard(p.check) || (SH[0] === 0 && !rest.some((c) => c.slug === p.check)));", "why": "the plants back on their check's shard: one shard runs a test file's 31 plants alone"}
