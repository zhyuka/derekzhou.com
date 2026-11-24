// test/unit/merge-bot.mjs: the merge bot's small rules (.github/ci/bot-rules.mjs)
import { test, assert, fs, path, ROOT } from '../unit-lib.mjs';

test('merge bot: a conflict is its session\'s, never the owner\'s (no label that holds the PR)', async () => {
  const { updateRefused, HOLD } = await import(new URL('../../.github/ci/bot-rules.mjs', import.meta.url));
  for (const s of [422, 409, 405]) { const r = updateRefused(s); assert.equal(r.owner, false, String(s)); assert.ok(!HOLD.includes(r.label), s + ': no holding label'); }
  assert.deepEqual(updateRefused(403), { owner: true, label: 'needs-owner' }, "the token's permissions are the owner's");
});

test('auto-revert: only the bot\'s own landing, and the deploy gate steps over the red tip and its revert', async () => {
  const B = await import(new URL('../../.github/ci/bot-rules.mjs', import.meta.url));
  const { walk } = await import(new URL('../../.github/ci/deploy-walk.mjs', import.meta.url));
  const S = (c) => c.repeat(40);
  assert.equal(B.botLanded('Merge #12: a thing', [], S('a')), 12, "the bot's merge commit");
  assert.equal(B.botLanded('x', [{ number: 7, head: { sha: S('a') }, state: 'closed', merged_at: null }], S('a')), 7, 'a fast-forward to a PR the bot closed');
  assert.equal(B.botLanded('Merge pull request #9 from o/b', [{ number: 9, head: { sha: S('b') }, state: 'closed', merged_at: 'now' }], S('a')), null, "the owner's merge: never auto-reverted");
  const msg = B.revertMessage(12, S('b'), S('a'), 'u');
  assert.equal(B.revertedTip(msg), S('b')); assert.equal(B.revertedTip('Revert something'), null);
  const run = (c, conclusion) => ({ head_sha: S(c), status: 'completed', conclusion, html_url: 'u' + c });
  const V = { [S('a')]: { gate_ok: true, frames_identical: true, base: S('0') }, [S('c')]: { gate_ok: true, frames_identical: false, base: S('b') }, [S('d')]: { gate_ok: true, frames_identical: true, base: S('c') } };
  const d = (revGreen) => ({ verdict: async (r) => (r.head_sha === S('c') && !revGreen ? null : V[r.head_sha]), ownerMerge: async () => false, branchIdentical: async () => false, laterStallOk: async () => -1, say: () => {},
    revertOf: async (sha) => (sha === S('c') ? S('b') : null) });
  const runs = [run('a', 'success'), run('b', 'failure'), run('c', 'success'), run('d', 'success')];
  assert.equal((await walk(S('0'), runs, d(true))).to, S('d'), 'red b, reverted by green c: live goes on to d');
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', 'failure'), run('c', 'failure')], d(true))).to, S('a'), 'the revert not green: live stays');
  assert.equal((await walk(S('0'), [run('a', 'success'), run('b', 'failure'), run('d', 'success')], d(true))).to, S('a'), 'red, no revert: live stays');
});

test('deploy gate: a tip whose PR\'s gate passed the same tree on the same base, with no T2, need not wait for main\'s gate', async () => {
  const { walk } = await import(new URL('../../.github/ci/deploy-walk.mjs', import.meta.url));
  const S = (c) => c.repeat(40);
  const d = (proved) => ({ verdict: async () => ({ gate_ok: true, frames_identical: true, base: S('0') }), ownerMerge: async () => false, branchIdentical: async () => false, laterStallOk: async () => -1, say: () => {},
    prProved: async (sha, base) => proved && sha === S('b') && base === S('a') });
  const runs = [{ head_sha: S('a'), status: 'completed', conclusion: 'success' }, { head_sha: S('b'), status: 'queued', conclusion: null }];
  assert.equal((await walk(S('0'), runs, d(true))).to, S('b'), "proved by its PR's gate: live goes on");
  assert.equal((await walk(S('0'), runs, d(false))).to, S('a'), 'not proved: live waits for main\'s gate');
});

test('merge bot: a re-run gate is read by its newest verdict artifact, not its first attempt\'s (#189)', async () => {
  const { newestArtifact } = await import(new URL('../../.github/ci/bot-rules.mjs', import.meta.url));
  // run 43169055363: the list gives attempt 1 (plan failed, gate_ok false) before attempt 2 (green)
  const a1 = { id: 13921053188, created_at: '2026-11-12T06:36:48Z', expired: false };
  const a2 = { id: 13920454821, created_at: '2026-11-12T06:37:28Z', expired: false };
  assert.equal(newestArtifact([a1, a2]), a2, 'the newer attempt, whatever the order or the ids');
  assert.equal(newestArtifact([a2, a1]), a2);
  assert.equal(newestArtifact([a1, { ...a2, expired: true }]), a1, 'an expired one cannot be read: the newest readable');
  assert.equal(newestArtifact([a1]), a1, 'one attempt: as before');
  assert.equal(newestArtifact([]), null);
  assert.equal(newestArtifact(undefined), null);
  const same = { id: 5, created_at: a1.created_at };
  assert.equal(newestArtifact([a1, same]).id, 13921053188, 'the same second: the higher id');
});

test('merge bot: the hub\'s review of a PR\'s head lands it (the owner, 2026-11-23: "just auto push stuff")', async () => {
  const { reviewedIn } = await import(new URL('../../.github/ci/bot-rules.mjs', import.meta.url));
  const A = 'a'.repeat(40), B = 'b'.repeat(40);
  assert.equal(reviewedIn(`text\n<!-- hub-review ${A} -->\n`, A), true, 'reviewed at this head');
  assert.equal(reviewedIn(`<!-- hub-review ${A} -->`, B), false, 'a push after the review: the head moved, it waits');
  assert.equal(reviewedIn(`<!-- hub-review ${A.slice(0, 12)} -->`, A), false, 'a short sha is no review');
  assert.equal(reviewedIn('hub-review ' + A, A), false, 'only the exact hidden line');
  assert.equal(reviewedIn(null, A), false);
  assert.equal(reviewedIn(`<!-- hub-review ${A} -->`, 'not-a-sha'), false);
  const bot = fs.readFileSync(path.join(ROOT, '.github/ci/merge-bot.mjs'), 'utf8');
  assert.match(bot, /const approved = await hubReviewed\(pr, sha\);/, 'the bot reads the review of the head it would land');
  assert.match(bot, /if \(held\.length && !approved\)/, 'a needs-owner or visible label holds only an unreviewed PR');
  assert.match(bot, /if \(!approved && files\.some\(\(f\) => SELF\.includes\(f\)\)\)/, 'the bot\'s own files wait only for the review');
  assert.match(bot, /if \(!lone\.ok && !approved\)/, 'a visible change waits only for the review');
  assert.match(bot, /if \(\(shared\.length \|\| same\.length\) && !approved\)/, 'a reviewed PR is not re-gated for every landing: it merges, and main\'s gate tests it');
  assert.match(bot, /for \(const p of pulls\) if \(await hubReviewed\(p, p\.head\.sha\)\) return true;/, 'live follows a reviewed landing');
  const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/merge.yml'), 'utf8');
  assert.match(yml, /types: \[opened, reopened, ready_for_review, labeled, unlabeled, edited\]/, 'the review line starts a tick at once');
});

test('merge bot: a review holds through merges of main, not through a new commit of its own', async () => {
  const { reviewedShas, reviewHolds } = await import(new URL('../../.github/ci/bot-rules.mjs', import.meta.url));
  const A = 'a'.repeat(40), B = 'b'.repeat(40);
  assert.deepEqual(reviewedShas(`x\n<!-- hub-review ${A} -->\ny <!-- hub-review ${B} -->`), [A, B], 'every reviewed head the body names');
  assert.deepEqual(reviewedShas(`<!-- hub-review ${A.slice(0, 12)} -->`), [], 'a short sha names none');
  assert.deepEqual(reviewedShas(null), []);
  assert.equal(reviewHolds(['c1', 'c2'], ['c1', 'c2']), true, 'main merged in: its own commits are the reviewed ones');
  assert.equal(reviewHolds(['c1'], ['c1', 'c2']), true, 'one of them reached main meanwhile: still nothing new');
  assert.equal(reviewHolds(['c1', 'c2', 'c3'], ['c1', 'c2']), false, 'a commit of its own after the review: a new review');
  assert.equal(reviewHolds(null, ['c1']), false, 'a compare that failed holds nothing');
  assert.equal(reviewHolds(['c1'], null), false);
});

test('merge bot: a tip with the bake goes live unless its stills status failed or is pending (stills.yml\'s status)', async () => {
  const { stillsReady } = await import(new URL('../../.github/ci/bot-rules.mjs', import.meta.url));
  assert.equal(stillsReady(false, []).ok, true, 'before the bake (#197) nothing waits');
  assert.equal(stillsReady(false, undefined).ok, true);
  assert.equal(stillsReady(true, []).ok, true, 'the bake, no stills status: CI bakes none, the build ships its set or none');
  assert.equal(stillsReady(true, [{ context: 'verdict', state: 'success' }]).ok, true, 'a green tip that was not main\'s tip (stills.yml posted nothing): live moves');
  assert.match(stillsReady(true, [{ context: 'verdict', state: 'success' }]).why, /no stills status/);
  assert.equal(stillsReady(true, [{ context: 'stills', state: 'success', description: 'up' }]).ok, true);
  assert.equal(stillsReady(true, [{ context: 'stills', state: 'failure' }]).ok, false, 'a failed stills job: live waits');
  // newest first (GitHub's order): a re-run's success after a failure wins, and a later failure after a success too
  assert.equal(stillsReady(true, [{ context: 'stills', state: 'success' }, { context: 'stills', state: 'failure' }]).ok, true);
  assert.equal(stillsReady(true, [{ context: 'stills', state: 'failure' }, { context: 'stills', state: 'success' }]).ok, false);
  assert.match(stillsReady(true, [{ context: 'stills', state: 'pending' }]).why, /pending/);
});

test('merge bot: the PR\'s title and body are checked for a banned name right before it lands (guard.py --text)', async () => {
  const { textAnswer } = await import(new URL('../../.github/ci/bot-rules.mjs', import.meta.url));
  assert.equal(textAnswer({ status: 0, stdout: '' }).land, true);
  const hit = textAnswer({ status: 1, stdout: '::error::text: a banned name (names.json 1a2b3c...)' });
  assert.equal(hit.land, false); assert.equal(hit.comment, true, 'a name found: the PR\'s to fix, so a comment');
  assert.match(hit.why, /RULES\.json naming/);
  for (const r of [{ status: 1, stdout: '::error::.claude/hooks/names.json cannot be read (FileNotFoundError)' }, { status: 2, stdout: '' }, { error: { code: 'ENOENT' } }]) {
    const a = textAnswer(r); assert.equal(a.land, false, JSON.stringify(r) + ' holds (fails closed)'); assert.ok(!a.comment, 'not the PR\'s fault: no comment');
  }
  const none = textAnswer(null); assert.equal(none.land, true); assert.match(none.note, /no --text yet/, 'before #325: said, not silent');
  // the bot runs it before both ways of landing, on the title and body as they are this tick, and can read guard.py
  const fs = await import('node:fs'), bot = fs.readFileSync(new URL('../../.github/ci/merge-bot.mjs', import.meta.url), 'utf8');
  const at = bot.indexOf("spawnSync('python3', [GUARD, '--text']"), ff = bot.lastIndexOf("gh('PATCH', '/git/refs/heads/main'"), mg = bot.lastIndexOf("gh('PUT', `/pulls/${n}/merge`");
  assert.ok(at > 0 && at < ff && at < mg, 'the check comes before the fast-forward and the merge');
  assert.match(bot, /input: \(pr\.title \|\| ''\) \+ '\\n' \+ \(pr\.body \|\| ''\)/);
  assert.match(fs.readFileSync(new URL('../../.github/workflows/merge.yml', import.meta.url), 'utf8'), /sparse-checkout: \|\n\s+\.github\/ci\n\s+\.claude\/hooks/, 'the bot\'s checkout has guard.py and names.json');
});
// plant: {"file": ".github/ci/bot-rules.mjs", "find": "if (r.status === 0) return { land: true };", "with": "if (r.status === 0 || r.status === 1) return { land: true };", "why": "a banned name in the PR's text lands anyway"}

test('merge bot: a served build that differs waits for the hub\'s review, even with every T1 frame the base\'s (the hub, 2026-11-24)', async () => {
  const { unreviewedLands } = await import(new URL('../../.github/ci/bot-rules.mjs', import.meta.url));
  assert.equal(unreviewedLands({ site_changed: false, frames_identical: true, reason: 'byte for byte' }).ok, true, 'docs, tests, CI: the build the base\'s, lands');
  const blind = unreviewedLands({ site_changed: true, frames_identical: true, reason: 'T1: every frame, DOM and still the base\'s' });
  assert.equal(blind.ok, false, '#373: a planet no T1 case looks at, every frame the base\'s, still waits');
  assert.match(blind.why, /served build differs/);
  assert.equal(unreviewedLands({ site_changed: true, frames_identical: false, reason: 'T1: frames changed' }).ok, false);
  assert.equal(unreviewedLands({ frames_identical: true, reason: 'an old verdict' }).ok, false, 'a verdict that does not say: counts as changed');
  assert.equal(unreviewedLands(null).ok, false);
  const bot = fs.readFileSync(path.join(ROOT, '.github/ci/merge-bot.mjs'), 'utf8');
  assert.match(bot, /const lone = unreviewedLands\(v\);[^\n]*\n\s+if \(!lone\.ok && !approved\) \{ note\(lone\.why\); continue; \}/, 'the PR loop asks the rule, and only a review passes it');
});
// plant: {"file": ".github/ci/bot-rules.mjs", "find": "if (v.site_changed !== false) return", "with": "if (false) return", "why": "a served build that differs, every T1 frame the base's, lands with no review (#373's planet)"}
// plant: {"file": ".github/ci/merge-bot.mjs", "find": "if (!lone.ok && !approved) { note(lone.why); continue; }", "with": "if (!v.frames_identical && !approved) { note(lone.why); continue; }", "why": "the bot back on frames identical alone"}
