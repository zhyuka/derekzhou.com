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

// AUTO-REVERT. Main's gate failed twice (its run and the bot's one re-run) on a tip the bot itself landed: the bot
// commits the tree of the green main tip before it, as that tip's child, and moves main there (the owner's own
// merges are his to revert). The commit names the tip it reverts, so the deploy gate steps over the pair.
export const revertTrailer = (sha) => `Reverts-main-tip: ${sha}`;
export const revertedTip = (message) => (/^Reverts-main-tip: ([0-9a-f]{40})$/m.exec(message || '') || [])[1] || null;
// The PR the bot landed as this main commit: its own merge ("Merge #N: ...") or a fast-forward to a PR's head (that
// PR closed by the bot, never merged by GitHub). null for the owner's merges and for anything else.
export function botLanded(message, prs, sha) {
  const m = /^Merge #(\d+): /.exec(message || '');
  if (m) return +m[1];
  const p = (prs || []).find((x) => x.head && x.head.sha === sha && !x.merged_at && x.state === 'closed');
  return p ? p.number : null;
}
export function revertMessage(n, tip, base, url) {
  return `Revert #${n}: main went red after it landed\n\nMain's gate failed twice at ${tip.slice(0, 10)} (${url}). The merge bot restores the tree of ${base.slice(0, 10)}, ` +
    `the green main tip before it, so live and every PR's base are again what passed. #${n}'s session fixes it in a new PR.\n\n${revertTrailer(tip)}`;
}
