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

test('deploy gate: the 2026-11-15 stall: a cancelled tip nothing proves gets its gate re-run once, only when main\'s gates are done; a bot merge is proved by its PR\'s head', async () => {
  const { walk } = await import(new URL('../../.github/ci/deploy-walk.mjs', import.meta.url));
  const { botMergeHead, rerunAnswer, proofHeads } = await import(new URL('../../.github/ci/bot-rules.mjs', import.meta.url));
  const S = (c) => c.repeat(40);
  const run = (c, conclusion, attempt = 1, status = 'completed') => ({ head_sha: S(c), status, conclusion, html_url: 'u' + c, run_attempt: attempt, id: c });
  // live 7ab73d1 (0); a9fab98 (a) green; 2715e19 (m: the bot's "Merge #258", main gate cancelled); then d, t (main's tip)
  const V = { [S('a')]: { gate_ok: true, frames_identical: true, base: S('0') }, [S('d')]: { gate_ok: true, frames_identical: true, base: S('m') },
    [S('t')]: { gate_ok: true, frames_identical: true, base: S('d') } };
  const seq = (m, t = run('t', 'success')) => [run('a', 'success'), m, run('d', 'success'), t];
  const asked = [];
  const d = (proved) => ({ verdict: async (r) => V[r.head_sha], ownerMerge: async () => false, branchIdentical: async () => proved, laterStallOk: async () => -1, say: () => {},
    rerun: async (r, runs) => { const x = rerunAnswer(r, runs); if (x === 'rerun') asked.push(r.id); return x; } });   // (the bot's own rule: rerunTip is rerunAnswer, then the POST)
  // nothing proves m: the walk stops at a, and m's gate is re-run (all of main's gates done)
  const w = await walk(S('0'), seq(run('m', 'cancelled')), d(false));
  assert.equal(w.to, S('a')); assert.deepEqual(asked, ['m']); assert.match(w.why, /re-ran its gate \(once\)/);
  // a gate of main's still running (or the tip's, queued): no re-run yet (it would be the pending one, or cancel the tip's)
  for (const t of [run('t', null, 1, 'in_progress'), run('t', null, 1, 'queued')]) {
    const ww = await walk(S('0'), seq(run('m', 'cancelled'), t), d(false));
    assert.equal(ww.to, S('a')); assert.match(ww.why, /once main's gates are done the bot re-runs it/);
  }
  assert.deepEqual(asked, ['m'], 'never asked while a gate of main\'s runs');
  // m's re-run cancelled again: never a second re-run, the owner looks
  const w2 = await walk(S('0'), seq(run('m', 'cancelled', 2)), d(false));
  assert.equal(w2.to, S('a')); assert.match(w2.why, /cancelled again on its re-run/); assert.deepEqual(asked, ['m']);
  // the re-run green: on to main's tip
  V[S('m')] = { gate_ok: true, frames_identical: true, base: S('a') };
  assert.equal((await walk(S('0'), seq(run('m', 'success', 2)), d(false))).to, S('t'));
  delete V[S('m')];
  // m proved by its PR's head: past it at once, no re-run
  assert.equal((await walk(S('0'), seq(run('m', 'cancelled')), d(true))).to, S('t')); assert.deepEqual(asked, ['m']);
  // the rules themselves
  assert.equal(rerunAnswer({ run_attempt: 1 }, [{ status: 'completed' }]), 'rerun');
  assert.equal(rerunAnswer({ run_attempt: 2 }, [{ status: 'completed' }]), 'again');
  assert.equal(rerunAnswer({}, [{ status: 'completed' }, { status: 'queued' }]), 'wait');
  assert.deepEqual(proofHeads(S('m'), 'Merge #258: still-pick: the bake\'s device ...', [S('a'), S('h')]), [S('m'), S('h')], 'the bot\'s merge: its PR\'s head, the second parent');
  assert.deepEqual(proofHeads(S('m'), 'Merge pull request #256 from zhyuka/claude/flight-height', [S('a'), S('h')]), [S('m')], 'the owner\'s merge: itself only');
  assert.deepEqual(proofHeads(S('m'), 'Merge #258: x', [S('a')]), [S('m')], 'one parent');
  assert.deepEqual(proofHeads(S('m'), 'CI: a plain commit', [S('a'), S('h')]), [S('m')]);
  assert.equal(botMergeHead('Merge #258: x', [S('a'), S('h')]), S('h'));
  // and the bot runs them: rerunTip asks rerunAnswer first, branchIdentical proves every head proofHeads names
  const BOT = fs.readFileSync(path.join(ROOT, '.github/ci/merge-bot.mjs'), 'utf8');
  assert.match(BOT, /async function rerunTip\(r, runs\) \{\n  const a = rerunAnswer\(r, runs\);\n  if \(a !== 'rerun'\) return a;/);
  assert.match(BOT, /for \(const h of proofHeads\(sha, c\?\.commit\?\.message, \(c\?\.parents \|\| \[\]\)\.map\(\(p\) => p\.sha\)\)\.slice\(1\)\) if \(await proved\(h\)\) return true;/);
  assert.match(BOT, /rerun: rerunTip/);
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
  const t2 = ['.github/workflows/gpu.yml'].filter((p) => fs.existsSync(path.join(ROOT, p))).concat(fs.readdirSync(path.join(ROOT, 'tools/gpu')).map((n) => 'tools/gpu/' + n).filter((p) => /\.m?js$/.test(p) && !NOT_T2.has(p)));
  for (const f of NOT_T2) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), f + ' exists');
    const base = path.basename(f);
    for (const g of t2) assert.ok(!fs.readFileSync(path.join(ROOT, g), 'utf8').includes(base), `${g} names ${base}: T2 runs it, so it is T2's own`);
  }
});

test('deploy gate: live moves to the newest walked tip with its stills up when the target has none (2026-11-23)', async () => {
  const { walk, liveTarget } = await import(new URL('../../.github/ci/deploy-walk.mjs', import.meta.url));
  const S = (c) => c.repeat(40);
  const run = (c, conclusion, status = 'completed') => ({ head_sha: S(c), status, conclusion, html_url: 'u' + c });
  const V = {}; for (const c of 'abcde') V[S(c)] = { gate_ok: true, frames_identical: true, base: S('0') };
  const d = { verdict: async (r) => V[r.head_sha], ownerMerge: async () => false, branchIdentical: async () => true, laterStallOk: async () => -1, say: () => {} };
  const ready = (baked) => async (sha) => (baked.includes(sha) ? { ok: true, why: 'stills up' } : { ok: false, why: 'its stills release is not up yet (no stills status)' });
  // all green: the walk reaches c, which has no release yet; a was baked
  const w = await walk(S('0'), [run('a', 'success'), run('b', 'success'), run('c', 'success')], d);
  assert.deepEqual(w.steps, [S('a'), S('b'), S('c')], 'the walk records every tip it passed');
  assert.equal((await liveTarget(S('0'), w.to, w.steps, ready([S('c')]))).to, S('c'), 'the target baked: live moves there');
  const t = await liveTarget(S('0'), w.to, w.steps, ready([S('a')]));
  assert.equal(t.to, S('a'), 'the target unbaked, an earlier walked tip baked: live moves to that one');
  assert.match(t.why, /newest walked tip with its stills up/);
  assert.equal((await liveTarget(S('0'), w.to, w.steps, ready([S('a'), S('b')]))).to, S('b'), 'the newest baked one, not the oldest');
  const none = await liveTarget(S('0'), w.to, w.steps, ready([]));
  assert.equal(none.to, S('0'), 'none baked: live stays'); assert.match(none.why, /live stays/);
  // a stop: b red with unproved frames; c beyond it is baked but never chosen
  const dr = { ...d, branchIdentical: async () => false };
  const ws = await walk(S('0'), [run('a', 'success'), run('b', 'failure'), run('c', 'success')], dr);
  assert.equal(ws.to, S('a')); assert.deepEqual(ws.steps, [S('a')], 'only the tips up to the stop');
  assert.equal((await liveTarget(S('0'), ws.to, ws.steps, ready([S('c')]))).to, S('0'), 'a baked tip past a stop is never chosen');
  // failed stall visits cap the walk at the safe tip: the steps past it go too
  const dv = { ...d, branchIdentical: async () => false, verdict: async (r) => (r.head_sha === S('b') ? { ...V[S('b')], t2: { stall_ok: false } } : V[r.head_sha]), laterStallOk: async () => 3 };
  const wc = await walk(S('0'), [run('a', 'success'), run('b', 'success'), run('c', 'failure'), run('d', 'success')], dv);
  assert.equal(wc.to, S('a')); assert.deepEqual(wc.steps, [S('a')], 'capped at the safe tip: nothing past it');
  assert.equal((await liveTarget(S('0'), wc.to, wc.steps, ready([S('c')]))).to, S('0'));
  assert.deepEqual(await liveTarget(S('0'), S('0'), [], ready([])), { to: S('0'), why: '' }, 'nothing to move');
});
// plant: {"file": ".github/ci/deploy-walk.mjs", "find": "return { to, why, steps: k >= 0 ? steps.slice(0, k + 1) : [] };", "with": "return { to, why, steps };", "why": "the fallback may choose a tip past the walk's stop"}
