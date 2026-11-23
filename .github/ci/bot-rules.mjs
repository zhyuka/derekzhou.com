// bot-rules.mjs: small decisions of the merge bot (merge-bot.mjs), apart so they are unit-tested (test/unit/merge-bot.mjs).
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

// A gate run's verdict artifact: a re-run attempt uploads its own gate-verdict next to the earlier attempt's, and the
// artifacts list gives the older first. The newest unexpired one is the run's answer (#189 was read as its failed first
// attempt, Nov 12). By created_at, then id.
export function newestArtifact(list) {
  const live = (list || []).filter((a) => a && !a.expired);
  live.sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) || (b.id || 0) - (a.id || 0));
  return live[0] || null;
}

// The verdict as a notice on the gate's verdict job (2026-11-23). From Nov 15 the account's artifact storage was full,
// so no gate-verdict artifact uploaded (the upload never fails a job) and the bot read every green gate as "no
// verdict": nothing landed, and live stayed at a1c4136 while the owner merged #321, #328, #330 and #238. GitHub keeps a
// job's annotations with its run, outside artifact storage, and no job here can write another run's (no workflow grants
// checks: write; test/unit/merge-bot.mjs holds that), so the notice meets the artifact's trust line, and the PC's copy
// still decides nothing. It carries what the bot, the deploy walk and T2's probe read, on one line.
export const NOTICE_TITLE = 'gate-verdict';
export function verdictNotice(v) {
  const keep = { sha: v.sha, base: v.base, gate_ok: v.gate_ok, frames_identical: v.frames_identical, reason: v.reason, t2_key: v.t2_key, t2: v.t2 };
  return `::notice title=${NOTICE_TITLE}::` + JSON.stringify(keep).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}
// A check run's annotations (GET /check-runs/{id}/annotations): the last gate-verdict notice that parses, or null.
export function verdictFromAnnotations(list) {
  const a = (list || []).filter((x) => x && x.title === NOTICE_TITLE && x.annotation_level === 'notice');
  for (let i = a.length - 1; i >= 0; i--) { try { const v = JSON.parse(a[i].message); if (v && typeof v === 'object' && typeof v.sha === 'string') return v; } catch { /* not ours */ } }
  return null;
}

// THE STILLS (docs/deploy.md, "The stills"). Once a tip has the bake (tools/gpu/bake-stills.js: #197 onward), the
// Cloudflare build of it fetches the release for its world's key, so live moves there only once the PC's stills job
// (stills.yml) has put that release up and said so: the commit status `stills`, success. Before the bake nothing waits.
// statuses: GET /commits/{sha}/statuses, newest first (a re-run's status after the first's): the newest `stills` wins.
export function stillsReady(hasBake, statuses) {
  if (!hasBake) return { ok: true, why: 'no bake at this tip' };
  const s = (statuses || []).find((x) => x && x.context === 'stills');
  if (!s) return { ok: false, why: 'its stills release is not up yet (no stills status)' };
  return s.state === 'success' ? { ok: true, why: s.description || 'stills up' } : { ok: false, why: `its stills status is ${s.state}${s.description ? ' (' + s.description + ')' : ''}` };
}

// The PR's tested head of a merge commit the bot made ("Merge #N: ...": its first parent main, its second the PR's head,
// whose gate the bot read before it merged); null for any other commit (the owner's "Merge pull request #N", a plain one).
export function botMergeHead(message, parents) {
  return /^Merge #\d+: /.test(message || '') && (parents || []).length === 2 ? parents[1] : null;
}

// What the deploy gate does about a cancelled main tip nothing proves (its run r, among main's runs since live, the
// tip's own synthetic entry included): 'wait' while any of them has not completed (main's gate group keeps one run and
// one pending: a re-run asked now would be the pending one, cancelled by the next landing, or would cancel a landed
// tip's pending gate: the hub's review of #289); 'again' when r is a re-run already (once only: the owner looks); else
// 'rerun'.
export function rerunAnswer(r, runs) {
  if ((runs || []).some((x) => x.status !== 'completed')) return 'wait';
  return (r.run_attempt || 1) > 1 ? 'again' : 'rerun';
}

// The commits whose own branch gate proves a main tip's frames: the tip itself, and for the bot's own merge commit its
// PR's tested head (botMergeHead). The proof is the PR's diff on its own base, the trust the bot gave it when it merged;
// the merged tree is checked by main's own gate only when that runs.
export function proofHeads(sha, message, parents) {
  const h = botMergeHead(message, parents);
  return h ? [sha, h] : [sha];
}
