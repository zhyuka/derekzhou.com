// test/unit/check-cache.mjs: a check that declares `# inputs:` reuses main's pass on those very inputs, and reads nothing
// else (tools/check.mjs, tools/checks/lib/reads.mjs; CI lane, 2026-11-25, the hub's gate p90: 35-birds' three parts,
// 160-200 s each, were the static pole on PRs that never touch a bird)
// plant: {"file": "tools/check.mjs", "find": "fs.readFileSync(kf(CACHE), 'utf8').trim() === key)", "with": "fs.readFileSync(kf(CACHE), 'utf8').trim() !== '')", "why": "any key restored is taken: a birds change reuses main's pass"}
// plant: {"file": "tools/check.mjs", "find": "    if (res.some((r) => r.test(rel)) || ins.some((f) => f.startsWith(rel + '/'))) continue;", "with": "    continue;", "why": "nothing a check reads is a stray: a missing input never caught"}
// plant: {"file": "tools/checks/lib/reads.mjs", "find": "wrap(fs, ['readFileSync', 'readFile', 'openSync', ", "with": "wrap(fs, ['readFile', ", "why": "readFileSync and openSync unlogged: the reads the sim makes go unseen"}
// plant: {"file": "tools/checks/35-birds.sh", "find": " tools/plan.mjs package-lock.json", "with": " package-lock.json", "why": "an input left out (the plan's tool parts.mjs imports): the key misses a change to it"}
// plant: {"file": ".github/workflows/validate.yml", "find": "        if: github.ref != 'refs/heads/main' && steps.ck.outputs.key != 'none'\n", "with": "        if: steps.ck.outputs.key != 'none'\n", "why": "main restores its own passes: main's gate skips the birds"}
import { test, assert } from '../unit-lib.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = new URL('../../', import.meta.url).pathname, CHECK = path.join(ROOT, 'tools/check.mjs');
const node = (args, env = {}) => spawnSync(process.execPath, [CHECK, ...args], { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, env), maxBuffer: 16 << 20 });
const keys = () => Object.fromEntries(node(['--cache-keys']).stdout.trim().split('\n').map((l) => l.split(' ')));
const touch = (f, fn) => { const p = path.join(ROOT, f), keep = fs.readFileSync(p); try { fs.writeFileSync(p, Buffer.concat([keep, Buffer.from('\n// x\n')])); return fn(); } finally { fs.writeFileSync(p, keep); } };

test('check-cache: 35-birds declares its inputs; its key moves with a bird, the sim, its tests or its script, not with the world', () => {
  const k = keys();
  assert.deepEqual(Object.keys(k).sort(), ['35-birds#0', '35-birds#1', '35-birds#2'], 'the birds\' three parts');
  assert.notEqual(k['35-birds#0'], k['35-birds#1'], 'each part its own key');
  for (const f of ['src/birds/model/facetform.js', 'src/birds/inkbirds/212-flocks.js', 'tools/birds/sim.mjs', 'test/birds-flock.mjs', 'tools/checks/35-birds.sh', 'tools/parts.mjs', 'tools/plan.mjs', 'tools/glslmin.mjs', 'test/golden/ground/11.json'])
    assert.notEqual(touch(f, keys)['35-birds#1'], k['35-birds#1'], f + ' moves the key');
  for (const f of ['src/world/215-air.js', 'site/style.css', 'docs/birds.md'])
    assert.equal(touch(f, keys)['35-birds#1'], k['35-birds#1'], f + ' does not');
});

test('check-cache: main\'s key restored, the check is not run; another key, it is', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ccache-')), k = keys();
  fs.writeFileSync(path.join(d, '35-birds.2.key'), k['35-birds#2'] + '\n');
  const hit = node(['--no-build', '--only', '35-birds#2'], { CHECK_CACHE: d });
  assert.match(hit.stdout, /^ok\s+35-birds#2\s+0\.0 s\s+cached: main's gate passed it on these very inputs/m, hit.stdout);
  // (another key: it runs; with no node on its PATH the check fails at once, which is all this needs to see)
  fs.writeFileSync(path.join(d, '35-birds.2.key'), 'f'.repeat(64) + '\n');
  const miss = spawnSync('bash', ['-c', `CHECK_CACHE=${d} PATH=/usr/bin:/bin "${process.execPath}" "${CHECK}" --no-build --only '35-birds#2'`], { cwd: ROOT, encoding: 'utf8' });
  assert.ok(!/cached:/.test(miss.stdout) && /35-birds#2/.test(miss.stdout), 'another key: run, not reused: ' + miss.stdout.slice(-300));
  fs.rmSync(d, { recursive: true });
});

test('check-cache: a read outside the declared inputs is a stray; its own inputs, a folder holding one, build/ and node_modules are not', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'creads-')), a = (f) => path.join(ROOT, f);
  fs.writeFileSync(path.join(d, 'r-1.txt'), [a('src/world/215-air.js'), a('src/birds/inkbirds/000-head.js'), a('src/birds'), a('src'), a('build/site/world.js'), a('node_modules/terser/package.json'), a('test/golden/ground/11.json'), a('site/index.html'), '/tmp/elsewhere.js'].join('\n'));
  const out = node(['--strays', '35-birds', d]).stdout.trim().split('\n').filter(Boolean);
  assert.deepEqual(out, ['site/index.html', 'src/world/215-air.js']);
  fs.rmSync(d, { recursive: true });
});

test('check-cache: the preload writes down what a node process reads, the modules it loads and the folders it lists', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'creads-'));
  const r = spawnSync(process.execPath, ['--import', new URL('../../tools/checks/lib/reads.mjs', import.meta.url).href, '-e',
    `require('fs').readFileSync(${JSON.stringify(path.join(ROOT, 'src/world/215-air.js'))}); require('fs').readdirSync(${JSON.stringify(path.join(ROOT, 'src/birds'))}); import(${JSON.stringify(new URL('../../tools/birds/sim.mjs', import.meta.url).href)}).catch(() => {});`],
  { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { CHECK_READS: d }) });
  assert.equal(r.status, 0, r.stderr);
  const got = fs.readdirSync(d).flatMap((f) => fs.readFileSync(path.join(d, f), 'utf8').split('\n'));
  for (const f of ['src/world/215-air.js', 'src/birds', 'tools/birds/sim.mjs', 'test/ground.mjs']) assert.ok(got.includes(path.join(ROOT, f)), f + ' written down');
  fs.rmSync(d, { recursive: true });
});

test('check-cache: the gate restores main\'s passes on a branch only, and saves them on main only', () => {
  const y = fs.readFileSync(path.join(ROOT, '.github/workflows/validate.yml'), 'utf8');
  assert.match(y, /- name: Main's passes on these very inputs \(a branch\)\n\s+if: github\.ref != 'refs\/heads\/main' && steps\.ck\.outputs\.key != 'none'\n\s+uses: actions\/cache\/restore@v4/);
  assert.match(y, /- name: Keep main's passes for the branches \(main\)\n\s+if: github\.ref == 'refs\/heads\/main'/);
  assert.match(y, /CHECK_CACHE: \$\{\{ github\.ref != 'refs\/heads\/main' && 'build\/\.check-cache' \|\| '' \}\}/);
  assert.match(y, /CHECK_CACHE_SAVE: \$\{\{ github\.ref == 'refs\/heads\/main' && 'build\/\.check-cache' \|\| '' \}\}/);
  assert.equal((y.match(/key: checkpass-v1-\$\{\{ matrix\.shard \}\}-\$\{\{ steps\.ck\.outputs\.key \}\}/g) || []).length, 2, 'the same key restored and saved');
});
