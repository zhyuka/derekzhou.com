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
two builds; T1 renders those builds (T1 renders each base build once: its frames' hashes
are cached by the build's content, so a branch cut from a rendered main renders only its head). Every change to the live site goes through a pull
request the owner approves.

Auto-revert (2026-11-07): when main's gate fails on a commit the merge bot landed, the bot re-runs the failed jobs
once; red again, it commits the tree of the green main tip before it as that commit's child, moves main there, and
says so on the PR (merge-bot.mjs, step 1b; its message ends "Reverts-main-tip: <sha>", which lets the deploy gate
step over the pair). The owner's own merges are never reverted by the bot. MERGE_TOKEN needs Actions write for the
re-run.

The PR's own words (2026-11-16): right before it lands a PR, by either way, the bot pipes the PR's title and body as
they are that tick to `python3 .claude/hooks/guard.py --text` (merge.yml checks out .claude/hooks beside .github/ci).
A banned name (RULES.json "naming", names.json) holds the PR with one comment, never repeating the name; the gate runs
on push and never sees them, and the bot would write "Merge #N: <title>" onto main. Anything else but a clean exit
(no python3, an unreadable names.json) holds it too, without a comment. Before guard.py has --text, the tick says it
did not check (bot-rules.mjs textAnswer, test/unit/merge-bot.mjs).

A cancelled main gate (a newer push superseded it) is no result: its tip is judged by its own PR's gate (for the bot's
own merge commit, "Merge #N: ...", the gate on the PR's head, its second parent) or the owner's merge. When nothing
proves it, the bot re-runs that tip's gate itself, once (2026-11-15: live waited 4 hours at 7ab73d1 on #258's
cancelled merge for "a later gate" that never runs on that tip); cancelled again, the deploy gate says so and the
owner looks (.github/ci/deploy-walk.mjs, its test in test/unit/verdict.mjs).

**The hub's review lands it (the owner, 2026-11-23: "just auto push stuff and u do everything quickly", choosing "Yes,
everything").** The owner no longer merges each visible PR. Once the hub's review passes, the hub writes the line
`<!-- hub-review SHA -->` into the PR's body, SHA its full head commit. The body edit starts a tick (merge.yml's
pull_request_target `edited`), and the bot lands the PR on its green gate, visible or not, labelled needs-owner or not,
the bot's own files included. A push after the review moves the head, so the line no longer matches: it waits for a
new one. (A body line, not a commit status: the hub's session may edit a PR's body but not write statuses.) The deploy walk counts a reviewed landing as the owner's own merge, so live follows it once
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
private repository need a paid plan (GitHub Pro).

Where CI runs (2026-11-23): nowhere on the owner's PC (the owner: "None on my PC", 2026-11-23). The repository is
public, so GitHub's standard hosted runners are free, and every job runs on `ubuntu-latest`: the gate's static, plan,
T1 and verdict; merge, post-deploy, scheduled, validate; the Stills look-up. test/unit/fork-guard.mjs fails on any
job that names a self-hosted runner. (From 2026-11-06, while the repository was private and its included minutes had
run out, every job ran on the PC: Linux ones in WSL2 labelled pc-wsl, the GPU ones on its RTX 4090, labelled
gpu-4090 / gpu-exclusive.) With the PC went T2 and T3 (gpu.yml: base against head on Direct3D 11, the changed
shaders read back bit for bit, the stall visits, forced colours off; T3's timings) and the stills bake (below). The
gate is T0 and T1, T1 rendering the canvas in full under SwiftShader, as it already did whenever the 4090 was
offline. tools/gpu/ stays, for a GPU check run by hand. Forks: every `pull_request_target` or `workflow_run` job
skips unless the head repository is this one, so the merge bot runs only for this repository's own branches and
stills.yml only after this repository's own Gate runs (a fork's own workflow named Gate could otherwise start it, with
main's write token). A fork's PR that adds or edits a `pull_request` workflow runs its own copy, on GitHub's runners:
only the setting "Require approval for all external contributors" (Settings > Actions > General) stops that
(docs/security.md).
T1's base records are cached by the
runner's image (ImageOS) as well as its OS and architecture, so a record rendered in WSL is never compared with a
hosted runner's frames.

The hand-off (2026-11-23): the gate's jobs pass each other the two builds and T1's shards as the run's own artifacts,
gate-served and gate-t1, kept a day (retention-days: 1, hidden files included: the build's .well-known/). Actions
storage is metered for private repositories only; the 2026-11-15 quota that moved the hand-off onto the PC's disk
was the private repository's. .github/ci/handoff.mjs still lays the folder out (gate/<run id>-<attempt>/NAME with a
sha256 manifest, under HANDOFF_ROOT, which every job sets to its own runner.temp/handoff); each reader (T1,
the verdict, the Stills look-up) downloads the artifact and gets it checked against the manifest, failing loudly on a
missing, changed or extra file. The plan job proves the check on the real builds each run (selftest: one byte flipped
must be caught). put writes its manifest's sha256 to its job's outputs, and every reader is pinned to it (--pinned,
HANDOFF_SHA). An artifact is scoped to its run, so no other run's code can rewrite it. The Stills job, a
workflow_run that cannot see the gate's job outputs, fetches the Gate run's gate-verdict and gate-served artifacts
(actions: read) and pins the builds to the verdict's served_sha. The verdict the merge bot trusts is the gate-verdict
artifact (30 days), whose upload fails the verdict job if it fails.

## The stills

The openings' stills (the world's first frames, baked on a real GPU by tools/gpu/bake-stills.js, #197) are not
in the repository: each served build's set is a release of it, `stills-<key>` with one asset `stills.pack`, where the
key is tools/stills.mjs worldKey, a sha256 of the plain build but its stills and build.txt.
The Cloudflare build fetches its own key's set with STILLS_TOKEN (a Pages secret) and ships without it on any failure.
The key is the whole served build, so any served change (a sound, a stylesheet, a font) is a new key, and a set is
only ever its own world's:
- stills.yml, after every green Gate run on main: is the set for the tip's key up (one request)? Then the tip's commit
  status `stills` is success. Not up: success too, saying the world ships without stills (never a red main).
- The deploy gate (merge-bot.mjs): live moves to a tip that has tools/gpu/bake-stills.js only once its `stills` status
  is success (bot-rules.mjs stillsReady). merge.yml ticks when stills.yml completes.
- post-deploy.yml: at a live commit with the bake, one still of live's own set is fetched from derekzhou.com, 200 and
  its sha256 (.github/ci/stills-live.mjs).
The bake (about 76 minutes for all 2,304 stills, seconds a key it cached) ran on the PC's RTX 4090 until 2026-11-23.
CI no longer bakes, so a served change that makes a new key ships without stills: the first paint the words over the
hour's still sky, then the world's first frame drawn whole as the cut, no fade and no still from another key
(tools/checks/44-first-paint.sh proves it on every gate, on a phone and a laptop; post-deploy's stills-live.mjs checks
live asks for no still and says so in build.txt). Live never waits for a bake. Later: a key of what the canvas reads
(sound and the site's metadata are outside it; CSS, fonts and the words reach it), so a change it never sees keeps its
set; and a measured SwiftShader bake on hosted runners.

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
