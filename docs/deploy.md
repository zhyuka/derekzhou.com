# Deploy

<!-- Moved word for word from CLAUDE.md's section "Deploy" (restructure step 7, 2026-11-06). -->

Cloudflare Pages (the project's Settings > Build, its build configuration):
build command `npm ci --no-audit --no-fund --ignore-scripts && node
tools/build.mjs dist`, build output directory `dist`, NODE_VERSION 22.
Auto-deploys on push to `live`, the branch the merge bot fast-forwards to the newest main
commit whose own gate is green (merge-bot.mjs, the deploy gate). Build watch paths (Settings > Build) limit that to
pushes that touch a deploy input, .github/ci/deploy-inputs.txt (include site/*, src/*,
tools/build.mjs, tools/minify.mjs, tools/parts.mjs, tools/glslmin.mjs, tools/plan.mjs, tools/stills.mjs,
package.json, package-lock.json, .gitattributes; exclude nothing); post-deploy.yml waits
for the newest main commit that touched one, and CI fails if the build loads a tool not listed. The gate decides whether a change alters what
is served by building base and head (.github/ci/served.sh) and comparing the
two builds; T1 and T2 render those builds (T1 renders each base build once: its frames' hashes
are cached by the build's content, so a branch cut from a rendered main renders only its head). Every change to the live site goes through a pull
request the owner approves.

Auto-revert (2026-11-07): when main's gate fails on a commit the merge bot landed, the bot re-runs the failed jobs
once; red again, it commits the tree of the green main tip before it as that commit's child, moves main there, and
says so on the PR (merge-bot.mjs, step 1b; its message ends "Reverts-main-tip: <sha>", which lets the deploy gate
step over the pair). The owner's own merges are never reverted by the bot. MERGE_TOKEN needs Actions write for the
re-run.

A cancelled main gate (a newer push superseded it) is no result: its tip is judged by its own PR's gate (for the bot's
own merge commit, "Merge #N: ...", the gate on the PR's head, its second parent) or the owner's merge. When nothing
proves it, the bot re-runs that tip's gate itself, once (2026-11-15: live waited 4 hours at 7ab73d1 on #258's
cancelled merge for "a later gate" that never runs on that tip); cancelled again, the deploy gate says so and the
owner looks (.github/ci/deploy-walk.mjs, its test in test/unit/verdict.mjs).

**The hub's review lands it (the owner, 2026-11-23: "just auto push stuff and u do everything quickly", choosing "Yes,
everything").** The owner no longer merges each visible PR. Once the hub's review passes, the hub sets the commit status
`hub-review` = success on the PR's head commit (`gh api -X POST repos/OWNER/REPO/statuses/SHA -f state=success -f
context=hub-review -f description=...`). The status event starts a tick, and the bot lands the PR on its green gate,
visible or not, labelled needs-owner or not, the bot's own files included. A push after the review carries no status,
so it waits for a new one. The deploy walk counts a reviewed landing as the owner's own merge, so live follows it once
its stills are up. The hub sends the owner a daily note of what went live, and "undo X" lands a revert the same way.

Before that rule, the owner's "land it when green" was GitHub's auto-merge (the owner, 2026-11-06: "GitHub auto-merge"): on a PR the
bot leaves to him (needs-owner, visible, or one that changes the bot), he clicks Enable auto-merge, and GitHub merges
it once its gate's `verdict` check is green. A new push does not undo it: GitHub merges the head whose checks pass.
His approval cannot be a review, because the agents open every PR as his account and GitHub refuses an author's
approval. Auto-merge is his alone: the hook (.claude/hooks/guard.py) stops an agent from enabling it or merging, by
the GitHub tools, `gh pr merge` (--auto too) or GraphQL. GitHub's merge commit ("Merge pull request #N") is the
owner's own merge to the deploy gate, as the button's is. It needs, once: the repository's Settings > General >
Allow auto-merge; and a ruleset on main (Settings > Rules) requiring the status check `verdict`, with Repository
admin as a bypass actor so the merge bot's own landings (MERGE_TOKEN is the owner's) are not held. Rulesets on a
private repository need a paid plan (GitHub Pro). The repository is private, so CI uses the
account's included Actions minutes (2,000 a month on GitHub Free) until they ran out
on 2026-11-06; since then every job runs on the owner's PC (the owner: "All on my PC,
free"): Linux jobs on a self-hosted runner in WSL2 labelled pc-wsl, T2 on the Windows
gpu-4090 runner. One job at a time, so T1 is skipped when T2 runs for the same head.

The hand-off (2026-11-16): the gate's jobs pass each other their files on the PC's own disk, not as GitHub artifacts
(2026-11-15: the repository's artifact storage quota was hit and every gate's plan job failed uploading its two
builds). Every job runs on the PC, and the WSL runners and the Windows gpu-4090 runner see one folder, HANDOFF_ROOT
(default /mnt/c/ci-handoff, C:\ci-handoff on Windows). .github/ci/handoff.mjs puts a folder under
gate/<run id>-<attempt>/ with a sha256 manifest; each reader (T1, T2, T3, the verdict, the Stills job) gets it checked
against the manifest and fails loudly on a missing, changed or extra file, never falling back to anything else. The
plan job proves the check on the real builds each run (selftest: one byte flipped must be caught). A re-run of failed
jobs reads its run's newest attempt that has the name. The verdict job drops a green off-main run's hand-off; main's
is kept for the Stills job; every gate's start sweeps anything older than 24 hours. The trust line: the folder is
shared, and a PR's own build code runs in its plan job with it writable, so nothing that decides is read from it alone.
put writes its manifest's sha256 to its job's outputs (GitHub keeps them per run), and T1, T2, T3 and the verdict read
pinned to it (--pinned, HANDOFF_SHA): files and manifest rewritten together still fail. The verdict the merge bot and
T2's probe trust is the gate-verdict artifact, never the PC's copy (verdict/<run id>-<attempt>.json, kept 30 days as a
record only). That artifact and T2's and T3's reports are the artifacts left, small, and their uploads never fail a
job. The Stills job (after main's gate, a workflow_run) cannot see the gate's job outputs and reads unpinned.

## The stills

Live and the bake (2026-11-23): a bake takes about an hour on the 4090 (six skies) and main moved every 20-30 minutes, and
each newer tip's Stills run cancelled the running bake, so none finished and live stayed at a1c4136 from Nov 15 though
the walk reached main's tip green. Now a running bake on main is never cancelled (stills.yml: cancel-in-progress only
off main; GitHub keeps the newest pending run, which bakes next), and when the walk's target has no `stills` status
yet, the bot moves live to the newest tip the walk passed whose `stills` status is success (deploy-walk.mjs
liveTarget; never a tip past the walk's stop). A tip whose world key has a release up already (a tests or docs
landing after a finished bake) gets its status from the look-up at once, with no bake.

The openings' stills (the world's first frames, baked on the PC's RTX 4090 by tools/gpu/bake-stills.js, #197) are not
in the repository: each served build's set is a release of it, `stills-<key>` with one asset `stills.pack`, where the
key is tools/stills.mjs worldKey, a sha256 of the plain build but its stills and build.txt.
The Cloudflare build fetches its own key's set with STILLS_TOKEN (a Pages secret) and ships without it on any failure.
The key is the whole served build, so any served change (a sound, a stylesheet, a font) is a new key, and live never
goes without its set:
- stills.yml, after every green Gate run on main: the set for the tip's key up already (one request), or baked and put
  up (tools/stills-release.mjs); then the tip's commit status `stills` is success (failure, with why, if the job fails;
  never a red main). Never on a claude/* branch (2026-11-14): a branch's warm bake cost six 13-minute GPU jobs a
  visible PR's gate and held T2 (1.3 minutes) behind it for hours; main bakes each world once, after it lands.
- The deploy gate (merge-bot.mjs): live moves to a tip that has tools/gpu/bake-stills.js only once its `stills` status
  is success (bot-rules.mjs stillsReady); before #197 nothing waits. merge.yml ticks when stills.yml completes.
- post-deploy.yml: at a live commit with the bake, one still of live's own set is fetched from derekzhou.com, 200 and
  its sha256 (.github/ci/stills-live.mjs).
The bake's own cache (each still's key in bake.json) decides what a served change costs on the PC: seconds when it
hits, about 76 minutes for all 2,304 stills when it does not.
The PC's gpu-4090 runner is also T2's, so the bake is six jobs, a sky each (about 13 minutes), one at a time, and a
T2 queued meanwhile takes the runner between two; and a newer main tip's Stills run cancels a stale tip's (the cache
keeps every encoded batch, so the same key goes on where it stopped). In a wave of world changes, live waits for the
newest tip's set: one bake, at the wave's end.

The owner's steps (once; until they are done the build ships without stills, as before):
1. A token: GitHub, Settings, Developer settings, Personal access tokens, Fine-grained tokens, Generate new token.
   Resource owner `zhyuka`; Only select repositories, `zhyuka/derekzhou.com`; Repository permissions, Contents:
   Read-only, nothing else. (When it expires the build ships without stills until it is renewed.)
2. The variable: Cloudflare, Workers & Pages, the project, Settings, Variables and Secrets: Type **Text** (not
   Secret: a Secret reaches Pages Functions at runtime only, never the build, which then says "stills: no STILLS_TOKEN"
   on /build.txt, as it did 2026-11-13), named `STILLS_TOKEN`, the token as its value, for Production. Then retry the
   production deployment; /build.txt's second line says what the fetch did.
3. The watch paths: Settings, Build, Build watch paths: add `tools/stills.mjs` (the list above, as
   .github/ci/deploy-inputs.txt has it).
Optional: a Pages deploy hook stored as the repository secret `STILLS_DEPLOY_HOOK`, which stills.yml calls once a new set
is up (live already rebuilds on every move of `live`, so the hook only matters when a set goes up after the last move).
