// test/unit/verdict.mjs: the gate's verdict on T2's read-backs, and the deploy gate
// (split from test/unit.mjs, 2026-11-07: one file an area, found by glob, so two PRs that add tests never share a file)
import { test, assert, fs, os, path, vm, crypto, execFileSync, ROOT, TMP, WORLD, cut, golden, md5, upd, digest, STREAMS, VEC, fileURLToPath } from '../unit-lib.mjs';

test('verdict: T2 read-backs, only a DIFFER stops a merge (the owner: "frames decide")', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-'));
  const run = (bits, outs, cached) => {
    const needs = { static: { result: 'success' }, plan: { result: 'success', outputs: { base: 'abc', site_changed: 'true', glsl_changed: 'true' } },
      t1: { result: 'skipped' }, t2: { result: 'success', outputs: outs || Object.assign({ frames_identical: 'true', glsl_changed: 'true', csp_ok: 'true' }, bits) } };
    const out = path.join(dir, 'v.json');
    try { execFileSync(process.execPath, [fileURLToPath(new URL('../../.github/ci/verdict.mjs', import.meta.url)), dir, out], { env: Object.assign({}, process.env, { NEEDS: JSON.stringify(needs), T2_CACHED: cached ? JSON.stringify(cached) : '', GITHUB_OUTPUT: '', GITHUB_STEP_SUMMARY: '' }), stdio: 'pipe' }); } catch {}
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  assert.equal(run({ bits_identical: 'true', bits_differ: 'false' }).frames_identical, true, 'identical');
  assert.equal(run({ bits_identical: 'false', bits_differ: 'false' }).frames_identical, true, 'unread only: the frames decide');
  assert.equal(run({ bits_identical: 'false', bits_differ: 'true' }).frames_identical, false, 'a read that differs goes to the owner');
  assert.equal(run({ bits_identical: 'false' }).frames_identical, false, 'an answer from before bits_differ: not identical counts as differ');
  assert.equal(run({ bits_identical: 'true', bits_differ: 'false', frames_identical: 'false' }).frames_identical, false, 'a changed frame goes to the owner');
  // main after a fast-forward: the frames answer is the PR's (cached), the 4090 ran only the stall visits
  const pr = { frames_identical: 'true', glsl_changed: 'true', bits_identical: 'true', bits_differ: 'false', csp_ok: 'true' };
  const m = run(null, { frames_identical: '', glsl_changed: '', bits_identical: '', bits_differ: '', csp_ok: '', stall_ok: 'false' }, pr);
  assert.equal(m.frames_identical, true, "main keeps the PR's frames answer");
  assert.equal(m.t2.stall_ok, false, "and main's own stall visits");
  assert.equal(run(null, { stall_ok: 'true' }, pr).t2.stall_ok, true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('deploy gate: a cancelled main gate is no result; only a failure stops live', async () => {
  const { walk } = await import(new URL('../../.github/ci/deploy-walk.mjs', import.meta.url));
  const S = (c) => c.repeat(40);
  const run = (c, conclusion, status = 'completed') => ({ head_sha: S(c), status, conclusion, html_url: 'u' + c });
  const V = { [S('a')]: { gate_ok: true, frames_identical: true, base: S('0') }, [S('b')]: { gate_ok: true, frames_identical: true, base: S('a') },
    [S('c')]: { gate_ok: true, frames_identical: true, base: S('b') } };
  const d = (proved) => ({ verdict: async (r) => V[r.head_sha], ownerMerge: async () => false, branchIdentical: async () => proved, laterStallOk: async () => -1, say: () => {} });
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', 'success'), run('c', 'success')], d(true))).to, S('c'), 'all green: the newest tip');
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', 'cancelled'), run('c', 'success')], d(true))).to, S('c'), 'cancelled in between: past it, to the newest green');
  const f = await walk(S('0'), [run('a', 'success'), run('b', 'failure'), run('c', 'success')], d(false));
  assert.equal(f.to, S('a'), 'failed in between: live stops before it'); assert.match(f.why, /red at b/);
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', 'cancelled'), run('c', 'success')], d(false))).to, S('a'), 'cancelled, frames unproved: live waits before it');
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', 'cancelled')], d(true))).to, S('a'), 'cancelled last: nothing newer to stand on');
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', null, 'in_progress')], d(true))).to, S('a'), 'running: waits');
});

test('deploy gate: a red tip whose frames are proved, covered by a later green gate, is stepped over', async () => {
  const { walk } = await import(new URL('../../.github/ci/deploy-walk.mjs', import.meta.url));
  const S = (c) => c.repeat(40);
  const run = (c, conclusion, status = 'completed') => ({ head_sha: S(c), status, conclusion, html_url: 'u' + c });
  const V = { [S('a')]: { gate_ok: true, frames_identical: true, base: S('0') }, [S('c')]: { gate_ok: true, frames_identical: true, base: S('b') } };
  const d = (owner) => ({ verdict: async (r) => V[r.head_sha], ownerMerge: async (sha) => owner && sha === S('b'), branchIdentical: async () => false, laterStallOk: async () => -1, say: () => {} });
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', 'failure'), run('c', 'success')], d(true))).to, S('c'), "a red owner's merge, then a green tip: live steps over");
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', 'failure'), run('c', 'success')], d(false))).to, S('a'), 'a red tip with unproved frames: live stops');
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', 'failure'), run('c', null, 'in_progress')], d(true))).to, S('a'), 'a red proved tip, no later green yet: live waits');
});

test('deploy gate: the 2026-11-15 stall: a cancelled tip nothing proves gets its gate re-run, once; a bot merge is proved by its PR\'s head', async () => {
  const { walk } = await import(new URL('../../.github/ci/deploy-walk.mjs', import.meta.url));
  const { botMergeHead } = await import(new URL('../../.github/ci/bot-rules.mjs', import.meta.url));
  const S = (c) => c.repeat(40);
  const run = (c, conclusion, attempt = 1) => ({ head_sha: S(c), status: 'completed', conclusion, html_url: 'u' + c, run_attempt: attempt, id: c });
  // live 7ab73d1 (0); a9fab98 (a) green; 2715e19 (m: the bot's "Merge #258", main gate cancelled); then green tips d, t (main's tip)
  const V = { [S('a')]: { gate_ok: true, frames_identical: true, base: S('0') }, [S('d')]: { gate_ok: true, frames_identical: true, base: S('m') },
    [S('t')]: { gate_ok: true, frames_identical: true, base: S('d') } };
  const seq = (m) => [run('a', 'success'), m, run('d', 'success'), run('t', 'success')];
  const reruns = [];
  const d = (proved) => ({ verdict: async (r) => V[r.head_sha], ownerMerge: async () => false, branchIdentical: async () => proved, laterStallOk: async () => -1, say: () => {},
    rerun: async (r) => { reruns.push(r.id); return (r.run_attempt || 1) > 1 ? 'again' : 'rerun'; } });
  // before: nothing proves m: the walk stopped at a for good (no later gate ever runs on m)
  const w = await walk(S('0'), seq(run('m', 'cancelled')), d(false));
  assert.equal(w.to, S('a')); assert.deepEqual(reruns, ['m'], 'm\'s own gate re-run'); assert.match(w.why, /re-ran its gate \(once\)/);
  const w2 = await walk(S('0'), seq(run('m', 'cancelled', 2)), d(false));
  assert.equal(w2.to, S('a')); assert.match(w2.why, /cancelled again on its re-run/, 'never re-run twice: the owner looks');
  assert.deepEqual(reruns, ['m', 'm'], '(the second walk asked, and was told again)');
  // the re-run green: the walk goes on to main's tip
  V[S('m')] = { gate_ok: true, frames_identical: true, base: S('a') };
  assert.equal((await walk(S('0'), seq(run('m', 'success', 2)), d(false))).to, S('t'));
  delete V[S('m')];
  // with the bot merge proved by its PR's head (branchIdentical true): past m at once, no re-run
  reruns.length = 0;
  assert.equal((await walk(S('0'), seq(run('m', 'cancelled')), d(true))).to, S('t')); assert.deepEqual(reruns, []);
  // the PR's head of the bot's own merge commit, and nothing else's
  assert.equal(botMergeHead('Merge #258: still-pick: the bake\'s device ...', ['a9fab98', 'c9a2907']), 'c9a2907');
  assert.equal(botMergeHead('Merge pull request #256 from zhyuka/claude/flight-height', ['x', 'y']), null, 'the owner\'s merge');
  assert.equal(botMergeHead('Merge #258: x', ['a9fab98']), null, 'one parent');
  assert.equal(botMergeHead('CI: a plain commit', ['x', 'y']), null);
});

test('verdict: a push with no open PR (a preview) is not compared, so it never lands on that run', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-nopr-'));
  const run = (outputs) => {
    const needs = { static: { result: 'success' }, plan: { result: 'success', outputs: Object.assign({ base: 'abc', site_changed: 'false' }, outputs) }, t1: { result: 'skipped' }, t2: { result: 'skipped' } };
    const out = path.join(dir, 'v.json');
    try { execFileSync(process.execPath, [fileURLToPath(new URL('../../.github/ci/verdict.mjs', import.meta.url)), dir, out], { env: Object.assign({}, process.env, { NEEDS: JSON.stringify(needs), T2_CACHED: '', GITHUB_OUTPUT: '', GITHUB_STEP_SUMMARY: '' }), stdio: 'pipe' }); } catch {}
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  const no = run({ has_pr: 'false' });
  assert.equal(no.frames_identical, false, 'no PR: not identical, even with the build byte for byte the base\'s');
  assert.equal(no.has_pr, false);
  assert.match(no.reason, /no open PR/);
  assert.equal(run({ has_pr: 'true' }).frames_identical, true, 'a PR\'s push with the same build: identical');
  assert.equal(run({}).frames_identical, true, 'an older plan with no has_pr output: as before');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('verdict: a world change that also changes the page is not "frames identical" on T2 alone (T1 --dom-only beside T2)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-dom-'));
  const run = (shards, t1result = 'success', t2result = 'success') => {
    for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { recursive: true, force: true });
    shards.forEach((s, i) => { fs.mkdirSync(path.join(dir, 's' + i)); fs.writeFileSync(path.join(dir, 's' + i, 'result.json'), JSON.stringify(Object.assign({ shard: i, shards: 4, null_ok: true }, s))); });
    const needs = { static: { result: 'success' }, plan: { result: 'success', outputs: { base: 'abc', site_changed: 'true', dom_changed: 'true' } },
      t1: { result: t1result }, t2: { result: t2result, outputs: { frames_identical: 'true', glsl_changed: 'false', csp_ok: 'true', bits_identical: 'true', bits_differ: 'false' } } };
    const out = path.join(os.tmpdir(), 'verdict-dom-out.json');
    try { execFileSync(process.execPath, [fileURLToPath(new URL('../../.github/ci/verdict.mjs', import.meta.url)), dir, out], { env: Object.assign({}, process.env, { NEEDS: JSON.stringify(needs), T2_CACHED: '', GITHUB_OUTPUT: '', GITHUB_STEP_SUMMARY: '' }), stdio: 'pipe' }); } catch {}
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  };
  const four = (o) => [0, 1, 2, 3].map(() => Object.assign({ dom_only: true }, o));
  const same = run(four({ frames_identical: true }));
  assert.equal(same.frames_identical, true, 'T2 frames and T1 DOM both the base\'s');
  assert.equal(same.t1.dom_only, true); assert.match(same.reason, /T1 \(the DOM/);
  const dom = run([{ dom_only: true, frames_identical: false }].concat(four({ frames_identical: true }).slice(1)));
  assert.equal(dom.frames_identical, false, 'the page outside the canvas changed: the owner sees it');
  assert.match(dom.reason, /outside the canvas/);
  assert.equal(run(four({ frames_identical: true }), 'success', 'skipped').frames_identical, false, 'DOM only, and no T2: not identical');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('areas: the tools/gpu files T2 is not run on for (NOT_T2) are run by nothing T2 runs', async () => {
  const { NOT_T2 } = await import('../../.github/ci/areas.mjs');
  const t2 = ['.github/workflows/gpu.yml'].concat(fs.readdirSync(path.join(ROOT, 'tools/gpu')).map((n) => 'tools/gpu/' + n).filter((p) => /\.m?js$/.test(p) && !NOT_T2.has(p)));
  for (const f of NOT_T2) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), f + ' exists');
    const base = path.basename(f);
    for (const g of t2) assert.ok(!fs.readFileSync(path.join(ROOT, g), 'utf8').includes(base), `${g} names ${base}: T2 runs it, so it is T2's own`);
  }
});
