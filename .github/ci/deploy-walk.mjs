// deploy-walk.mjs: the deploy gate's walk over main's tips since live (merge-bot.mjs, step 3), apart so it can be
// unit-tested (test/unit/verdict.mjs). runs: main's push runs of the Gate between live and main, oldest first. d: the bot's
// lookups (verdict, ownerMerge, branchIdentical, laterStallOk) and say, injected. Returns { to, why }: the newest tip
// live may move to, and why it stops there.
// A cancelled run (a newer push to main superseded it) is no result, never red: that tip is judged by its own
// branch's gate or the owner's merge (as a tip judged against another base is), and the next green gate, which runs
// every static check on the whole tree, covers the rest. Only a failure, an unproved visible change or failed stall
// visits stop live; a gate still running makes it wait.
export async function walk(live, runs, d) {
  let to = live, prev = live, mustReach = -1, safe = live, why = '';
  for (const r of runs) {
    const tip = r.head_sha.slice(0, 10);
    if (r.status !== 'completed') { why = `main ${tip}'s gate is ${r.status}: live waits there`; break; }
    if (r.conclusion === 'cancelled') {
      if (!(await d.ownerMerge(r.head_sha)) && !(await d.branchIdentical(r.head_sha))) { why = `main ${tip}'s gate was cancelled and its own branch's gate does not prove its frames: live waits for a later gate at ${to.slice(0, 10)}`; break; }
      d.say(`deploy gate: main ${tip}'s gate was cancelled (superseded): no result; judged by its branch's gate`);
      prev = r.head_sha;   // (judged; the next tip's gate compared against it, but live does not stop on it)
      continue;
    }
    const v = r.conclusion === 'success' ? await d.verdict(r) : null;
    if (!v || !v.gate_ok) { why = `**main is red at ${tip}** (${r.conclusion}): ${r.html_url}. live stays at ${to.slice(0, 10)}.`; break; }
    if (!v.frames_identical && !(await d.ownerMerge(r.head_sha)) && !(v.base !== prev && (await d.branchIdentical(r.head_sha)))) { why = `main ${tip} changes what a visitor sees (${v.reason}) without the owner's own merge: live stays at ${to.slice(0, 10)}`; break; }
    if (v.t2 && v.t2.stall_ok === false) {
      const j = await d.laterStallOk(runs, r);
      if (j < 0) { why = `main ${tip}'s stall visits failed, and no later tip's pass: ${r.html_url}. live stays at ${to.slice(0, 10)}.`; break; }
      if (mustReach < 0) safe = to;
      mustReach = Math.max(mustReach, j);
    }
    to = prev = r.head_sha;
    if (runs.indexOf(r) >= mustReach) mustReach = -1;
  }
  if (mustReach >= 0) { why = `a tip's failed stall visits are cleared only at ${runs[mustReach].head_sha.slice(0, 10)}, not reached: live goes no further than ${safe.slice(0, 10)}`; to = safe; }
  return { to, why };
}
