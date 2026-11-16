// test/unit/merge-bot.mjs: the merge bot's small rules (.github/ci/bot-rules.mjs)
import { test, assert } from '../unit-lib.mjs';

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

test('merge bot: a tip with the bake goes live only with its stills release up (stills.yml\'s status)', async () => {
  const { stillsReady } = await import(new URL('../../.github/ci/bot-rules.mjs', import.meta.url));
  assert.equal(stillsReady(false, []).ok, true, 'before the bake (#197) nothing waits');
  assert.equal(stillsReady(false, undefined).ok, true);
  assert.equal(stillsReady(true, []).ok, false, 'the bake, no status yet: live waits');
  assert.equal(stillsReady(true, [{ context: 'verdict', state: 'success' }]).ok, false, 'another context is not the stills');
  assert.equal(stillsReady(true, [{ context: 'stills', state: 'success', description: 'up' }]).ok, true);
  assert.equal(stillsReady(true, [{ context: 'stills', state: 'failure' }]).ok, false, 'a failed stills job: live waits');
  // newest first (GitHub's order): a re-run's success after a failure wins, and a later failure after a success too
  assert.equal(stillsReady(true, [{ context: 'stills', state: 'success' }, { context: 'stills', state: 'failure' }]).ok, true);
  assert.equal(stillsReady(true, [{ context: 'stills', state: 'failure' }, { context: 'stills', state: 'success' }]).ok, false);
  assert.match(stillsReady(true, [{ context: 'stills', state: 'pending' }]).why, /pending/);
});
