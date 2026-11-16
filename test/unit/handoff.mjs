// test/unit/handoff.mjs: the gate's hand-off on the PC's disk (.github/ci/handoff.mjs): what a job puts, the next gets
// byte for byte or fails loudly; a re-run reads its run's newest attempt; drop and the sweep clear it.
import { test, assert, fs, os, path, execFileSync, ROOT } from '../unit-lib.mjs';

const H = path.join(ROOT, '.github/ci/handoff.mjs');
const cli = (env, ...a) => { try { return { ok: true, out: execFileSync(process.execPath, [H, ...a], { env: { ...process.env, ...env }, encoding: 'utf8' }) }; } catch (e) { return { ok: false, out: String(e.stdout || '') }; } };
function scratch() {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-'));
  fs.mkdirSync(path.join(t, 'src/assets'), { recursive: true });
  fs.writeFileSync(path.join(t, 'src/index.html'), '<!doctype html>');
  fs.writeFileSync(path.join(t, 'src/assets/a.bin'), Buffer.from([0, 1, 2, 3]));
  fs.writeFileSync(path.join(t, 'src/.well-known'), 'security');   // (a hidden file is served too)
  return t;
}

test('handoff: put, then get, byte for byte; a changed, missing or extra byte fails, loudly', () => {
  const t = scratch(), env = { HANDOFF_ROOT: path.join(t, 'root'), GITHUB_RUN_ID: '11', GITHUB_RUN_ATTEMPT: '1' };
  try {
    assert.ok(cli(env, 'put', path.join(t, 'src'), 'served').ok);
    const g = cli(env, 'get', 'served', path.join(t, 'out'));
    assert.ok(g.ok, g.out); assert.match(g.out, /3 files of served checked/);
    assert.deepEqual(fs.readFileSync(path.join(t, 'out/assets/a.bin')), Buffer.from([0, 1, 2, 3]));
    assert.ok(cli(env, 'selftest', 'served').ok, 'the plan job\'s own proof');
    const h = path.join(t, 'root/gate/11-1/served');
    fs.writeFileSync(path.join(h, 'assets/a.bin'), Buffer.from([0, 1, 2, 4]));   // (the planted bad byte)
    const bad = cli(env, 'get', 'served', path.join(t, 'out2'));
    assert.ok(!bad.ok); assert.match(bad.out, /::error::handoff get: served is not the bytes handed off .*changed assets\/a\.bin/);
    fs.writeFileSync(path.join(h, 'assets/a.bin'), Buffer.from([0, 1, 2, 3])); fs.rmSync(path.join(h, 'index.html'));
    assert.match(cli(env, 'get', 'served', path.join(t, 'out3')).out, /missing index\.html/);
    fs.writeFileSync(path.join(h, 'index.html'), '<!doctype html>'); fs.writeFileSync(path.join(h, 'extra'), 'x');
    assert.match(cli(env, 'get', 'served', path.join(t, 'out4')).out, /not in the manifest extra/);
    assert.match(cli({ ...env, GITHUB_RUN_ID: '12' }, 'get', 'served', path.join(t, 'out5')).out, /::error::handoff get: .* is not there/, 'another run\'s folder: never a silent stale read');
  } finally { fs.rmSync(t, { recursive: true, force: true }); }
});

test('handoff: a re-run of failed jobs reads its run\'s newest attempt; drop clears every attempt; the sweep, what is old', () => {
  const t = scratch(), root = path.join(t, 'root'), env = { HANDOFF_ROOT: root, GITHUB_RUN_ID: '21', GITHUB_RUN_ATTEMPT: '1' };
  try {
    assert.ok(cli(env, 'put', path.join(t, 'src'), 'served').ok);
    const re = { ...env, GITHUB_RUN_ATTEMPT: '2' };
    assert.ok(cli(re, 'has', 'served').ok, 'attempt 2 finds attempt 1\'s plan');
    assert.ok(cli(re, 'get', 'served', path.join(t, 'o')).ok);
    assert.ok(cli(re, 'put', path.join(t, 'src'), 't1').ok);
    assert.ok(fs.existsSync(path.join(root, 'gate/21-2/t1.manifest.json')), 'a job writes its own attempt');
    assert.ok(!cli(env, 'has', 't1').ok, 'attempt 1 never reads attempt 2');
    assert.ok(cli({ ...env, GITHUB_RUN_ID: '22' }, 'put', path.join(t, 'src'), 'served').ok);
    assert.ok(cli(env, 'drop').ok);
    assert.deepEqual(fs.readdirSync(path.join(root, 'gate')), ['22-1'], 'run 21\'s attempts dropped, run 22 kept');
    const old = path.join(root, 'gate/22-1'), past = new Date(Date.now() - 25 * 3600e3);
    fs.utimesSync(old, past, past);
    assert.ok(cli(env, 'verdict-put', path.join(t, 'src/index.html')).ok);
    assert.match(cli(env, 'sweep', '--hours', '24').out, /swept 1 hand-off/);
    assert.deepEqual(fs.readdirSync(path.join(root, 'gate')), []);
    assert.ok(fs.existsSync(path.join(root, 'verdict/21-1.json')), 'a verdict is kept 30 days, not 24 h');
  } finally { fs.rmSync(t, { recursive: true, force: true }); }
});

test('handoff: the gate, T2, the Stills job and the merge bot use it, not artifacts, for the builds and T1\'s shards', () => {
  const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const gate = rd('.github/workflows/gate.yml'), gpu = rd('.github/workflows/gpu.yml'), stills = rd('.github/workflows/stills.yml'), bot = rd('.github/ci/merge-bot.mjs');
  for (const [f, y] of [['gate.yml', gate], ['gpu.yml', gpu], ['stills.yml', stills]]) {
    assert.ok(!/name: served/.test(y) && !/t1-shard/.test(y), f + ': no served or t1-shard artifact');
    assert.match(y, /(handoff\.mjs|\$h) get served /, f + ' reads the builds from the hand-off');
  }
  assert.match(gpu, /\$h = if \(Test-Path base\/\.github\/ci\/handoff\.mjs\)/, 'T2 reads with the base\'s handoff.mjs: a PR cannot loosen its own check');
  assert.match(gate, /handoff\.mjs put "\$RUNNER_TEMP\/served" served\n\s+node \.github\/ci\/handoff\.mjs selftest served/);
  assert.match(gate, /continue-on-error: true   # \(the artifact quota: the verdict stands on the PC's copy\)/, 'the one artifact left never fails the verdict');
  assert.match(bot, /const lv = localVerdict\(run\);\n  if \(lv\) return lv;/, 'the bot reads the PC\'s verdict first');
});
// plant: {"file": ".github/ci/handoff.mjs", "find": "if (!have.has(f)) bad.push('missing ' + f); else if (sha(path.join(dir, f)) !== h) bad.push('changed ' + f);", "with": "if (!have.has(f)) bad.push('missing ' + f);", "why": "the hand-off's byte check dropped"}
