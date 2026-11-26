// deploy-walk.mjs: the deploy gate's walk over main's tips since live (merge-bot.mjs, step 3), apart so it can be
// unit-tested (test/unit/verdict.mjs). runs: main's push runs of the Gate between live and main, oldest first. d: the bot's
// lookups (verdict, ownerMerge, branchIdentical, laterStallOk, prProved, revertOf), its one act (rerun(run, runs): re-run a
// cancelled tip's gate, once and only when all of main's gates are done: 'rerun', 'wait', or 'again' (bot-rules.mjs rerunAnswer)) and say, injected. Returns { to, why }: the newest tip
// live may move to, and why it stops there.
// A cancelled run (a newer push to main superseded it) is no result, never red: that tip is judged by its own
// branch's gate or the owner's merge (as a tip judged against another base is), and the next green gate, which runs
// every static check on the whole tree, covers the rest. Only a failure, an unproved visible change or failed stall
// visits stop live; a gate still running makes it wait.
// A red tip the bot reverted (a later tip that is its revert, d.revertOf: the tree before the red tip, so the bytes
// live already serves) is stepped over, with the revert, once the revert's own gate is green.
export async function walk(live, runs, d) {
  let to = live, prev = live, mustReach = -1, safe = live, why = '';
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    const tip = r.head_sha.slice(0, 10);
    if (r.status !== 'completed') {
      // (a tip the bot fast-forwarded main to is the very tree its PR's gate passed on this base: when that gate
      // needed no T2, main's own gate (and its stall visits, which run only with T2) can add nothing, so live need
      // not wait for it: 2-4 minutes off every such landing)
      if (d.prProved && (await d.prProved(r.head_sha, prev))) { d.say(`deploy gate: main ${tip}'s gate is ${r.status}, but its PR's gate passed this very tree on ${prev.slice(0, 10)} with no T2: live goes on`); to = prev = r.head_sha; continue; }
      why = `main ${tip}'s gate is ${r.status}: live waits there`; break;
    }
    if (r.conclusion === 'cancelled') {
      if (!(await d.ownerMerge(r.head_sha)) && !(await d.branchIdentical(r.head_sha))) {
        // (2026-11-15: live waited 4 hours at 7ab73d1 on #258's cancelled tip for "a later gate" that could never come:
        // no later gate runs on this tip. Its own gate is re-run, once, by the bot; cancelled again, the owner looks)
        const re = d.rerun ? await d.rerun(r, runs) : null;
        why = re === 'rerun' ? `main ${tip}'s gate was cancelled and nothing else proves its frames: the bot re-ran its gate (once); live waits at ${to.slice(0, 10)} for it`
          : re === 'wait' ? `main ${tip}'s gate was cancelled and nothing else proves its frames: live waits at ${to.slice(0, 10)}; once main's gates are done the bot re-runs it (a re-run asked now would be cancelled, or cancel a landed tip's)`
          : `main ${tip}'s gate was cancelled${re === 'again' ? ' again on its re-run' : ''} and nothing else proves its frames: live waits at ${to.slice(0, 10)}; re-run that gate (${r.html_url})`;
        break;
      }
      d.say(`deploy gate: main ${tip}'s gate was cancelled (superseded): no result; judged by its branch's gate`);
      prev = r.head_sha;   // (judged; the next tip's gate compared against it, but live does not stop on it)
      continue;
    }
    const v = r.conclusion === 'success' ? await d.verdict(r) : null;
    if (!v || !v.gate_ok) {
      let j = -1;
      if (d.revertOf && mustReach < 0 && i + 1 < runs.length && (await d.revertOf(runs[i + 1].head_sha)) === r.head_sha) j = i + 1;   // (the bot's revert is always the red tip's own child: it moves main from that tip only)
      const rv = j >= 0 && runs[j].status === 'completed' && runs[j].conclusion === 'success' ? await d.verdict(runs[j]) : null;
      if (rv && rv.gate_ok) { d.say(`deploy gate: main ${tip} was red and the bot reverted it at ${runs[j].head_sha.slice(0, 10)} (green): stepped over`); to = prev = runs[j].head_sha; i = j; continue; }
      // A red tip a later tip's green gate covers (every static check on the whole tree), and whose frames are proved
      // (the owner's merge, or its branch's gate): like a cancelled one, no result; live goes on. Unproved frames stop
      // live (a later gate compares against this tip, so it cannot see that change); no later green yet: live waits.
      if (await d.ownerMerge(r.head_sha) || (await d.branchIdentical(r.head_sha))) {
        let later = false;
        for (let k = i + 1; k < runs.length && !later; k++) if (runs[k].status === 'completed' && runs[k].conclusion === 'success') { const w = await d.verdict(runs[k]); later = !!(w && w.gate_ok); }
        if (later) { d.say(`deploy gate: main ${tip} was red (${r.conclusion}), its frames are proved and a later tip's gate is green: no result; stepped over`); prev = r.head_sha; continue; }
        why = `main ${tip} is red (${r.conclusion}), its frames proved: live waits at ${to.slice(0, 10)} for a later green gate`; break;
      }
      why = `**main is red at ${tip}** (${r.conclusion}): ${r.html_url}. live stays at ${to.slice(0, 10)}.`; break; }
    if (!v.frames_identical && !(await d.ownerMerge(r.head_sha)) && !(v.base !== prev && (await d.branchIdentical(r.head_sha)))) { why = `main ${tip} changes what a visitor sees (${v.reason}) without the owner's own merge: live stays at ${to.slice(0, 10)}`; break; }
    if (v.t2 && v.t2.stall_ok === false) {
      const j = await d.laterStallOk(runs, r);
      if (j < 0) { why = `main ${tip}'s stall visits failed, and no later tip's pass: ${r.html_url}. live stays at ${to.slice(0, 10)}.`; break; }
      if (mustReach < 0) safe = to;
      mustReach = Math.max(mustReach, j);
    }
    to = prev = r.head_sha;
    if (i >= mustReach) mustReach = -1;
  }
  if (mustReach >= 0) { why = `a tip's failed stall visits are cleared only at ${runs[mustReach].head_sha.slice(0, 10)}, not reached: live goes no further than ${safe.slice(0, 10)}`; to = safe; }
  return { to, why };
}

// The newest endpoint live may move to that has its stills (the hub, 2026-11-26: since #547 a tip with the bake goes
// live only with its stills status success, so one green served change with no set yet held live at an older tip that
// had one). `to` when ready(to) passes; else, newest first and at most cap back, a tip before it the walk itself would
// stop on (walked over the runs up to that tip, so a red tip and its revert, or a failed stall's tips, never qualify)
// whose ready passes; else live. ready(sha) -> { ok, why } (bot-rules.mjs stillsReady). A candidate is only judged:
// the walk's re-run is left out, and its lookups are memoized, so the walks repeat no request.
export async function bakedTo(live, runs, d, to, ready, cap = 20) {
  if (to === live) return { to, why: '' };
  const top = await ready(to);
  if (top.ok) return { to, why: '' };
  const memo = new Map(), m = (k, f) => async (...a) => { const key = k + ':' + a.map((x) => Array.isArray(x) ? 'n' + x.length : (x && x.head_sha) || String(x)).join(','); if (!memo.has(key)) memo.set(key, f(...a)); return memo.get(key); };
  const q = { say: () => {}, rerun: null };
  for (const k of ['verdict', 'ownerMerge', 'branchIdentical', 'laterStallOk', 'revertOf', 'prProved']) if (d[k]) q[k] = m(k, d[k]);
  const at = runs.findIndex((r) => r.head_sha === to);
  for (let k = at - 1, n = 0; k >= 0 && n < cap; k--, n++) {
    const sha = runs[k].head_sha;
    if (!(await ready(sha)).ok) continue;
    if ((await walk(live, runs.slice(0, k + 1), q)).to !== sha) continue;
    return { to: sha, why: `live -> ${sha.slice(0, 10)} (newest baked; ${to.slice(0, 10)} green but ${top.why})` };
  }
  return { to: live, why: `${to.slice(0, 10)} is green but ${top.why}, and no tip since live that the walk stops on has its set` };
}
