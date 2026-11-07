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
