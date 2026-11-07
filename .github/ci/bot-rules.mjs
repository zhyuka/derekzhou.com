// bot-rules.mjs: small decisions of the merge bot (merge-bot.mjs), apart so they are unit-tested (test/unit.mjs).
// An update from main GitHub refuses because the branch conflicts (422; 409 from the merge API) is the branch's own
// session's to fix, never the owner's: it gets one comment a head and no label, and the bot tries again every tick,
// so the PR lands as soon as its session merges main and the gate is green. Any other refusal (403: the token's
// permissions) is the owner's, labelled needs-owner as before.
export const conflictStatus = (status) => status === 422 || status === 409 || status === 405;
export const HOLD = ['needs-owner', 'visible'];   // (the labels that keep the bot off a PR: never set for a conflict)
export function updateRefused(status) {
  return conflictStatus(status) ? { owner: false, label: null } : { owner: true, label: 'needs-owner' };
}
