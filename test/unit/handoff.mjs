// test/unit/handoff.mjs: the gate's hand-off on the PC's disk (.github/ci/handoff.mjs): what a job puts, the next gets
// byte for byte or fails loudly; a re-run reads its run's newest attempt; drop and the sweep clear it.
import { test, assert, fs, os, path, execFileSync, ROOT } from '../unit-lib.mjs';
import crypto from 'node:crypto';

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
    fs.rmSync(path.join(h, 'extra'));
    // the pin: put's output is the manifest's sha256; a reader pinned to it fails when the files AND the manifest were
    // rewritten together (another run's code, the folder being shared), and when the pin is missing
    const o = path.join(t, 'gh-out'); fs.writeFileSync(o, '');
    assert.ok(cli({ ...env, GITHUB_OUTPUT: o }, 'put', path.join(t, 'src'), 'served').ok);
    const pin = /^sha=([0-9a-f]{64})$/m.exec(fs.readFileSync(o, 'utf8'))?.[1];
    assert.ok(pin, 'put writes sha=<manifest sha256> to the step outputs');
    assert.ok(cli({ ...env, GITHUB_OUTPUT: o }, 'put', path.join(t, 'src'), 't1-s2', '--as', 'sha_2').ok);
    assert.match(fs.readFileSync(o, 'utf8'), /^sha_2=[0-9a-f]{64}$/m, 'put --as KEY writes KEY=<sha256>: a matrix leg\'s own output');
    assert.ok(!cli({ ...env, GITHUB_OUTPUT: o }, 'put', path.join(t, 'src'), 'x', '--as', 'a=b').ok, '--as takes a word only');
    assert.ok(cli({ ...env, HANDOFF_SHA: pin }, 'get', 'served', path.join(t, 'p1'), '--pinned').ok);
    fs.writeFileSync(path.join(h, 'assets/a.bin'), Buffer.from([9]));
    const mf = path.join(t, 'root/gate/11-1/served.manifest.json'), m = JSON.parse(fs.readFileSync(mf, 'utf8'));
    m['assets/a.bin'] = crypto.createHash('sha256').update(Buffer.from([9])).digest('hex'); fs.writeFileSync(mf, JSON.stringify(m));
    assert.ok(cli(env, 'get', 'served', path.join(t, 'p2')).ok, 'unpinned, a rewritten pair passes: why every gate reader pins');
    assert.match(cli({ ...env, HANDOFF_SHA: pin }, 'get', 'served', path.join(t, 'p3'), '--pinned').out, /::error::handoff get: served's manifest is not the one its job handed off/);
    assert.match(cli({ ...env, HANDOFF_SHA: '' }, 'get', 'served', path.join(t, 'p4'), '--pinned').out, /::error::handoff get: served is pinned, but HANDOFF_SHA is not a sha256/);
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

test('handoff: the gate and the Stills job pass the builds and T1\'s shards as run artifacts, every reader checked and pinned', () => {
  const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
  const gate = rd('.github/workflows/gate.yml'), stills = rd('.github/workflows/stills.yml'), bot = rd('.github/ci/merge-bot.mjs');
  for (const [f, y] of [['gate.yml', gate], ['stills.yml', stills]]) {
    assert.match(y, /(handoff\.mjs|\$h) get served /, f + ' reads the builds through the hand-off\'s manifest check');
    assert.ok(!/ci-handoff|handoff\.mjs (sweep|drop|verdict-put)/.test(y), f + ': nothing on the PC\'s shared disk');
    for (const l of y.split('\n').filter((x) => /handoff\.mjs get |\$h get /.test(x))) assert.match(l, /--pinned/, f + ': every reader pinned: ' + l.trim());
    for (const step of y.split(/\n\s+- /).filter((t) => /name: gate-(served|t1)\b/.test(t) && t.includes('actions/upload-artifact'))) {
      assert.match(step, /retention-days: 1\b/, f + ': a hand-off artifact is kept a day');
      assert.match(step, /include-hidden-files: true/, f + ': the build\'s .well-known/ travels too');
      assert.ok(!/continue-on-error/.test(step), f + ': a hand-off that did not upload fails its job');
    }
  }
  assert.match(gate, /handoff\.mjs put "\$RUNNER_TEMP\/served" served\n\s+node \.github\/ci\/handoff\.mjs selftest served/);
  assert.match(stills, /HANDOFF_SHA: \$\{\{ steps\.pin\.outputs\.served_sha \}\}/, 'the Stills look-up pins the builds to the Gate run\'s verdict');
  assert.match(rd('.github/ci/verdict.mjs'), /served_sha: c\.served_sha/, 'the verdict carries the pin');
  assert.ok(!/fs\.(cpSync|copyFileSync)\(/.test(rd('.github/ci/handoff.mjs')), 'handoff.mjs copies by bytes: cpSync and copyFileSync carry modes over, and the PC\'s /mnt/c refuses them (EPERM)');
  // what decides is never read from the shared folder alone (the hub's review of #321): the bot and T2's probe read the
  // gate-verdict artifact only, and every gate reader of the builds and T1's shards is pinned to its putting job's output
  assert.ok(!/handoff\.mjs|ci-handoff|localVerdict/.test(bot), 'the merge bot never reads the PC\'s verdict copy: any run\'s code can write it');
  assert.ok(!/\/verdict\/|handoff\.mjs.*root\(\)/.test(gate), 'T2\'s probe never takes a cached answer from the PC\'s verdict copy');
  assert.match(gate, /served_sha: \$\{\{ steps\.handoff\.outputs\.sha \}\}/); for (let n = 0; n < 4; n++) {   // (T1 on four runners, 2026-11-24: each leg's own output, each read pinned to it)
    assert.match(gate, new RegExp(`sha_${n}: \\$\\{\\{ steps\\.shards\\.outputs\\.sha_${n} \\}\\}`), `T1's job output sha_${n}`);
    assert.match(gate, new RegExp(`SHA_${n}: \\$\\{\\{ needs\\.t1\\.outputs\\.sha_${n} \\}\\}`), `the verdict reads shard ${n}'s pin`);
  }
  assert.match(gate, /handoff\.mjs put "\$RUNNER_TEMP\/t1" "t1-s\$S" --as "sha_\$S"/, 'each shard hands off under its own name and output');
  assert.match(gate, /HANDOFF_SHA="\$\{!v\}" node \.github\/ci\/handoff\.mjs get "t1-s\$n" "\$RUNNER_TEMP\/t1\/\$n" --pinned/, 'each shard read pinned to its own output');
});
// plant: {"file": ".github/ci/merge-bot.mjs", "find": "async function verdict(run) {", "with": "async function verdict(run) { try { return JSON.parse(fs.readFileSync(path.join('/mnt/c/ci-handoff/verdict', run.id + '-1.json'), 'utf8')); } catch {}", "why": "the bot trusting a verdict file on the PC's shared disk before the artifact"}
// plant: {"file": ".github/ci/handoff.mjs", "find": "if (sha(mf) !== pin)", "with": "if (false)", "why": "the pin on the manifest dropped"}
// plant: {"file": ".github/ci/handoff.mjs", "find": "if (!have.has(f)) bad.push('missing ' + f); else if (sha(path.join(dir, f)) !== h) bad.push('changed ' + f);", "with": "if (!have.has(f)) bad.push('missing ' + f);", "why": "the hand-off's byte check dropped"}
