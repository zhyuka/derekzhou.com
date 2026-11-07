// test/unit/merge-bot.mjs: the merge bot's small rules (.github/ci/bot-rules.mjs)
import { test, assert } from '../unit-lib.mjs';

test('merge bot: a conflict is its session\'s, never the owner\'s (no label that holds the PR)', async () => {
  const { updateRefused, HOLD } = await import(new URL('../../.github/ci/bot-rules.mjs', import.meta.url));
  for (const s of [422, 409, 405]) { const r = updateRefused(s); assert.equal(r.owner, false, String(s)); assert.ok(!HOLD.includes(r.label), s + ': no holding label'); }
  assert.deepEqual(updateRefused(403), { owner: true, label: 'needs-owner' }, "the token's permissions are the owner's");
});
