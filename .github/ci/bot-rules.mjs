// bot-rules.mjs: small decisions of the merge bot (merge-bot.mjs), apart so they are unit-tested (test/unit/merge-bot.mjs).
// An update from main GitHub refuses because the branch conflicts (422; 409 from the merge API) is the branch's own
// session's to fix, never the owner's: it gets one comment a head and no label, and the bot tries again every tick,
// so the PR lands as soon as its session merges main and the gate is green. Any other refusal (403: the token's
// permissions) is the owner's, labelled needs-owner as before.
export const conflictStatus = (status) => status === 422 || status === 409 || status === 405;
export const HOLD = ['needs-owner', 'visible'];   // (the labels that keep the bot off a PR: never set for a conflict)

// The hub's review (the owner, 2026-11-23: "just auto push stuff and u do everything quickly", choosing "Yes,
// everything", then "Full auto, I'll allow it"): the line <!-- hub-review SHA --> in a PR's body, SHA its full head
// commit, lands it, visible or not, the bot's own files included, and counts as the owner's own merge for the deploy
// walk. A push after the review changes the head, so the line no longer matches and the PR waits for a new review.
// (A body line, not a commit status: the hub's session may edit a PR's body but not write statuses.)
export function reviewedIn(body, sha) {
  return typeof body === 'string' && typeof sha === 'string' && /^[0-9a-f]{40}$/.test(sha) && body.includes(`<!-- hub-review ${sha} -->`);
}
// Every head the hub reviewed, as its body names them.
export function reviewedShas(body) {
  return typeof body === 'string' ? [...body.matchAll(/<!-- hub-review ([0-9a-f]{40}) -->/g)].map((m) => m[1]) : [];
}
// A review still holds when the head adds to the reviewed commit only merges (main brought in, by its session or by
// the bot's update-branch): every commit of its own that main lacks (non-merge, GitHub's compare main...head) was
// already in the reviewed commit. A new commit of its own needs a new review (2026-11-23: the lanes' merges of main
// moved every reviewed head, and nothing landed).
export function reviewHolds(ownNow, ownThen) {
  if (!Array.isArray(ownNow) || !Array.isArray(ownThen)) return false;
  const seen = new Set(ownThen);
  return ownNow.every((c) => seen.has(c));
}
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

// THE STILLS (docs/deploy.md, "The stills"). Once a tip has the bake (tools/gpu/bake-stills.js: #197 onward), the
// Cloudflare build of it fetches the release for its world's key, so live moves there only once the stills job
// (stills.yml) has looked and said so: the commit status `stills`, success, whether the set is up or the world has
// none and ships without stills (CI bakes none). No stills status passes too: the build fetches its key's set or ships
// without, so only a stills failure or pending holds live. Before the bake nothing waits.
// statuses: GET /commits/{sha}/statuses, newest first (a re-run's status after the first's): the newest `stills` wins.
export function stillsReady(hasBake, statuses) {
  if (!hasBake) return { ok: true, why: 'no bake at this tip' };
  const s = (statuses || []).find((x) => x && x.context === 'stills');
  if (!s) return { ok: true, why: 'no stills status: CI bakes none; the build fetches its key\'s set or ships without' };   // (stills.yml posts none once its commit is not main's tip, nor where main's gate was cancelled: most tips, since #362)
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
// The PR's own words, checked right before it lands (RULES.json "naming"; HYGIENE, 2026-11-16): the gate runs on push,
// so its static job never sees the PR's title or body, and the bot writes "Merge #N: <title>" onto main. guard.py --text
// (from #325) reads them on stdin and exits 1 on a banned name (names.json, the list the hook and --scan read). r is
// spawnSync's answer, null when main's guard.py has no --text yet (before #325: then nothing is checked, and the tick
// says so). Anything but a clean exit 0 holds the PR; only a name found is the PR's to fix, so only then a comment
// (which never repeats the name: guard.py prints a hash's first characters, the bot prints nothing of it).
export function textAnswer(r) {
  if (r === null) return { land: true, note: "guard.py has no --text yet (#325): the PR's title and body are not checked" };
  if (r.error) return { land: false, why: `python3 could not run guard.py --text (${r.error.code || r.error.message}): held, the tick after decides` };
  if (r.status === 0) return { land: true };
  if (r.status === 1 && !/cannot be read/.test(r.stdout || '')) return { land: false, comment: true, why: "the PR's title or body holds a banned name (RULES.json naming)" };
  return { land: false, why: `guard.py --text could not check it (exit ${r.status}${/cannot be read/.test(r.stdout || '') ? ', names.json unreadable' : ''}): held` };
}

// The no-review path (the hub, 2026-11-24): only a served build byte for byte the base's lands without the hub's mark
// (docs, tests, CI, tools). "Frames identical" alone is not enough once the build differs: T1 looks only where its
// cases look, and #373 (a second bright planet) and #354 (the moon's corona) changed what a visitor sees with every T1
// frame the base's. A verdict that does not say (site_changed missing) counts as changed.
export function unreviewedLands(v) {
  if (!v) return { ok: false, why: 'no verdict' };
  if (v.site_changed !== false) return { ok: false, why: 'the served build differs from the base\'s (T1 sees only its own cases): waits for the hub\'s review' };
  if (!v.frames_identical) return { ok: false, why: `frames may change (${v.reason}): waits for the hub's review` };
  return { ok: true };
}

// Whether main's changes since a PR's gate base mean it must be gated again before it lands (2026-11-25, the hub).
// shared: the areas (areas.json) both touched; same: the files both changed; approved: the hub reviewed its head.
// A file both changed is always re-gated, reviewed or not: git merges the two line by line, and nothing tested that
// tree (#405, reviewed: it and main's #411 both changed tools/visit/looks.json, the merge mixed two entry formats, and
// main's gate went red on the ruler test). An area alone re-gates only an unreviewed PR: a reviewed one merges, and
// main's gate tests it (#362: re-gating every reviewed PR after every landing serialised them).
// A doc only people read is exempt (the hub, 03:01Z Nov 25: #427, reviewed, re-gated only because #414 had also edited
// docs/world.md; nearly every PR edits a doc): a line-by-line merge of docs/*.md changes neither the served build (docs/
// is never served) nor any check's result, but docs/structure.md, whose content docs-drift reads (a tool's line). The
// checks that scan every tracked file (secrets, citations, the names) read a merged doc's lines, each of them one side's,
// already checked on its own gate; main's gate checks the merge after it lands.
export const mergeSafe = (f) => /^docs\/[^/]+\.md$/.test(f) && f !== 'docs/structure.md';
export function regateAnswer({ shared = [], same: all = [], approved = false }) {
  const same = all.filter((f) => !mergeSafe(f));
  if (same.length) return { regate: true, why: `main changed ${same.length} of its file(s) since its gate (${same.slice(0, 5).join(', ')}): re-gated${approved ? ', the review holds' : ''}` };
  if (shared.length && !approved) return { regate: true, why: `main touched the ${shared.join(', ')} area since its gate: re-gated` };
  return { regate: false };
}

// The bot's own files (merge-bot.mjs's SELF): a PR changing one waits for the hub's review, its served build the base's or
// not, since the bot runs main's copy on the next tick. Its workflow, its code and every module it imports (areas.mjs,
// deploy-walk.mjs, this file), and the data it decides by (areas.json, the names guard and its list). #435 (2026-11-25)
// changed this file, the list then held only merge.yml and merge-bot.mjs, and it landed with no review;
// test/unit/merge-bot.mjs derives the list from the bot's imports and reads, so a new module cannot fall out of it.
// The gate's verdict (verdict.mjs) is the bot's input as much as its code: gate_ok and frames_identical decide what lands
// unreviewed. #510 changed it, its served build the base's, and landed with no review (2026-11-25, 17:18Z).
// And what makes the verdict green (the hub, 17:28Z Nov 25): gate.yml (which jobs run, which the verdict needs), the
// workflows it calls (validate.yml) and the check runner they run (tools/check.mjs: which checks run, which a branch may
// skip on main's pass, #506).
export const BOT_FILES = ['.github/workflows/merge.yml', '.github/ci/merge-bot.mjs', '.github/ci/bot-rules.mjs', '.github/ci/areas.mjs', '.github/ci/areas.json', '.github/ci/deploy-walk.mjs', '.github/ci/budget-room.mjs', '.github/ci/verdict.mjs', '.github/workflows/gate.yml', '.github/workflows/validate.yml', 'tools/check.mjs', '.claude/hooks/guard.py', '.claude/hooks/names.json'];

// The load budget's sums (the hub, 03:50Z Nov 25): #427, #432 and #437 each fit world.js's line on their own gates,
// edited different sections (no file shared), and landed together at 125,005 B, 77 B over it. builtOf maps a changed
// path to the built scripts it goes into (src/<dir>/parts.json's out; a plain src/ or site/ script its own; the build's
// tools and the minifier's lock every one, '*'); budgetShared names each built script that both the PR and main's
// commits since its gate base go into, when the PR's own build of it is within NEAR of its line (the verdict's budget,
// .github/ci/budget-room.mjs: Brotli 11 as 36-load-budget weighs it). Each is a "file" for regateAnswer: the merged tree
// is gated, its load budget measured whole. A script far from its line never re-gates (ordinary work does not
// serialise); a verdict without the measure (a gate from before it) re-gates on any shared script.
// (Building the merged tree in the bot instead would run a PR's build tools in the job that holds the merge token.)
export const NEAR = 0.02;
export const BUILD_TOOLS = ['tools/build.mjs', 'tools/minify.mjs', 'tools/parts.mjs', 'tools/plan.mjs', 'package.json', 'package-lock.json'];
export function builtOf(f) {
  if (BUILD_TOOLS.includes(f)) return ['*'];
  if (f.startsWith('src/dev/')) return [];
  if (f.startsWith('src/world/')) return ['/world.js', '/plan.js'];   // (the plan's worker is cut from the world's spans)
  if (f.startsWith('src/birds/inkbirds/')) return ['/inkbirds.js'];
  let m = /^src\/birds\/model\/([\w.-]+\.js)$/.exec(f) || /^src\/([\w.-]+\.js)$/.exec(f) || /^site\/([\w.-]+\.js)$/.exec(f);
  return m ? ['/' + m[1]] : [];
}
export function budgetShared({ prFiles = [], mainFiles = [], budget = null }) {
  const outs = (fs) => { const s = new Set(); for (const f of fs) for (const o of builtOf(f)) s.add(o); return s; };
  const pr = outs(prFiles), main = outs(mainFiles);
  // (a script the PR's build leaves the base's size is not its growth: a comment in a section, #432's in 215)
  if (budget) for (const o of [...pr]) if (budget[o] && typeof budget[o].base === 'number' && budget[o].base === budget[o].size) pr.delete(o);
  if (!pr.size) return [];   // (the PR grows no built script: no sum of its)
  const all = pr.has('*') || main.has('*');
  const both = all ? [...new Set([...pr, ...main])].filter((o) => o !== '*') : [...pr].filter((o) => main.has(o));
  if (all && budget) both.push(...Object.keys(budget).filter((o) => !both.includes(o)));
  return both.filter((o) => !budget || (budget[o] && budget[o].size > budget[o].line * (1 - NEAR))).map((o) => 'build:' + o);   // (a measure without the script: it has no line)
}

