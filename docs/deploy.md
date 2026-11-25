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
The bot's own files (bot-rules.mjs BOT_FILES) are its workflow, merge-bot.mjs and every module and data file it runs
on: bot-rules.mjs, areas.mjs, areas.json, deploy-walk.mjs, and the names guard (.claude/hooks/guard.py, names.json).
Until 2026-11-25 the list held merge.yml and merge-bot.mjs alone, and #435, which changed bot-rules.mjs with a served
build the base's, landed with no review; test/unit/merge-bot.mjs now derives the list from the bot's imports.

**Only a byte-for-byte build lands unreviewed (the hub, 2026-11-24).** Without the hub's line the bot lands a PR only
when its served build is byte for byte the base's (docs, tests, CI, tools: bot-rules.mjs unreviewedLands). "Frames
identical" alone no longer lands one: T1 looks only where its cases look, and #373 (a second bright planet) and #354
(the moon's corona) changed what a visitor sees with every T1 frame the base's. Every PR whose served build differs
waits for the hub's review, whatever T1 says; the review's carry-over through merges of main (#361) and the reviewed
PR's landing without a re-gate (#362) are unchanged.

**The served build decides first (the hub, 17:00Z Nov 25).** The verdict's frames_identical is true whenever the head's served build is byte for byte the base's, whatever input files the change touched (#504, a pure split of 340, waited for a review on the input flag alone: with the build the same, input handling cannot have changed) and even on a push with no open PR, which skips T1 (#482, #506 waited for it), unless the ruler's looks were due (looks_changed: their measuring code moved), which a preview also skips. With the build changed, both still hold it: a preview is not compared, and changed input handling is for the owner to see.

**A file main also changed is re-gated, reviewed or not (the hub, 2026-11-25).** #362 let a reviewed PR merge onto main
at once whatever main changed since its gate. #405, reviewed, changed tools/visit/looks.json and two world sections that
main's #410-#416 had changed since its gate; the bot merged it with no new gate, git joined the two looks.json line by
line in two entry formats, and main's gate went red on the ruler test until the bot reverted it. Now (bot-rules.mjs
regateAnswer) a PR sharing any file with main's commits since its gate's base is brought up to date and gated again,
the review holding through that merge of main (#361); a reviewed PR sharing only an area still merges at once.
A doc only people read is not such a file (the hub, 03:01Z Nov 25: #427, reviewed, was re-gated at 02:54Z only
because #414 had also edited docs/world.md, and nearly every PR edits a doc): docs/*.md is never served, and no check
reads one's content but docs-drift's docs/structure.md, which still re-gates (bot-rules.mjs mergeSafe). Of the 7
landings on main from 18:00Z Nov 24 that shared a file with main's changes since their base, 3 shared docs/world.md
alone and would not have been re-gated; 2 shared docs/structure.md and 2 shared code.

**A built script both grew, near its load budget's line, is shared too (the hub, 03:50Z Nov 25).** #427, #432 and
#437 each fit world.js's line on their own gates and edited different sections, so the bot landed them with no new gate;
main d5314482 built world.js at 125,005 B, 77 B over the 122 K line (#437 alone: 124,925 B, 3 B under, 183 B over its
base). The plan job now measures each built script of the head's build and the base's (.github/ci/budget-room.mjs:
Brotli 11, as 36-load-budget weighs it, against that check's BUDGET lines) and the verdict keeps it (`budget`). The bot
(bot-rules.mjs budgetShared) counts a built script as a file both changed when the PR's change grows it, main's commits
since its gate base go into it (builtOf: a parts.json folder's out, a plain script its own, the build's tools every one),
and the PR's build of it is within NEAR (2%) of its line: the merged tree is gated, its budget measured whole. A script
far from its line never re-gates. Building the merged tree in the bot instead would run a PR's build tools in the job
that holds the merge token.

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

The static checks on five runners (2026-11-24): on one 4-core hosted runner validate's 40 checks took about 7.6
minutes, each slowed by the others beside it. validate.yml is a matrix of five shards; each builds once and runs its
share (tools/check.mjs --shard i/5), split by tools/checks/costs.json's seconds, longest first to the least-loaded
shard, so every shard computes the same split (test/unit/check-shards.mjs: each check on exactly one shard, the matrix
the command's n). A check not in costs.json counts 10 s; refresh the table from a validate log when the split drifts. (2026-11-24, from three sharded main gates: the table had the one-runner seconds, so 35-birds, 177 s with its 55 test processes, shared a shard with the wing model, 98 s beside it, and that shard took 3.5 minutes against the others' 1-2; now birds has a shard to itself.) A check marked `# parts: N` runs on a push as N checks, slug#0 .. slug#N-1, each with CHECK_PART=i/N, which the shards take side by side; its plants and --only run it whole. 35-birds is three parts (its 56 tests by their place in the list, 20, 18 and 18, the clock test in part 0; two parts until 2026-11-24, when its part 0, 148 s, was the gate's pole), so no shard waits on more than a third of it. 24-unit is two parts (2026-11-25: 104 s on one shard, and every lane's iteration waited on it; not three, which would put one beside a part of 35-birds: 119 and 141 s there). A check marked `# apart: <check> ...` never shares a shard with those checks, either way round, while a shard free of them is left; a parted check's parts never share one either, and the most kept apart are placed first (24-unit: 35-birds and both ground sweeps, so its parts take the two shards the three birds parts leave; 37-ground-fresh: 43-dune-census, the sweeps on two birds shards; 13-rules-data, whose hook timing failed at 1059 ms beside 35-birds: 35-birds): its area files dealt longest first, each to the part with the least so far, by the seconds 24-unit.sh lists for them (a file not listed counts 1 s).
A check marked `# inputs: GLOB ...` (2026-11-25, the hub's gate p90: 35-birds, whose three parts took 160-200 s each and set the static pole on PRs that never touch a bird) reads nothing but those files: check.mjs preloads tools/checks/lib/reads.mjs into its node processes, and a run that read a repository file no glob matches fails, wherever it runs (its sim now assembles src/birds alone: the same inkbirds.js, byte for byte, without reading the world). Its key is the sha256 of its script, check.mjs, the preload, its part and its inputs' paths and bytes. Main's gate saves each pass's key (CHECK_CACHE_SAVE; the cache entry checkpass-v1-<shard>-<check.mjs --cache-key>); a branch's restores it (CHECK_CACHE) and does not run a check whose key it finds ("cached: main's gate passed it on these very inputs"). Main always runs every check.
A unit plant (a `// plant:` line in test/unit/<area>.mjs) runs that area file alone (check.mjs --prove sets
CHECK_PLANT_AT, 24-unit.sh reads it): it re-ran all 40 files, about two minutes a plant on a hosted runner. All 162
unit plants are still caught so (2026-11-24). The plants a change selects run on runners of their own beside the checks (2026-11-25, the hub's gate p90: after a shard's checks in the same job they doubled static's p90, 445 s against about 200; validate.yml's plants job lists them with --dry and asks for one prove runner per 4, 5 at most, none when there are none), dealt out in turn over those runners, whatever their check (every shard holds the
whole checkout and builds the site first): a branch that changed test/unit/sky.mjs ran its 31 plants, 25 s each, on
24-unit's one shard for 13 minutes while the other four sat idle (2026-11-24); now 6 a shard. A file whose only change is to its plant lines (a PR adding a plant) runs only its new or changed plants
(--base, the merge base): a PR adding one plant to 35-birds.sh re-ran all 13, each the 55 bird tests, 49 minutes
(2026-11-24). Any other change to the file runs every plant in it; to a check's script or a lib it names, every plant
of the check. The ruleset requires `verdict`, never a job's name, so the shards' names (validate (0/5) ...) need no setting.

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

T1 on four runners (2026-11-24): T1's four shards ran as four processes on one 4-core hosted runner, 400-435 s each,
the gate's longest job once validate was sharded. They are a matrix now, a shard a runner (gate.yml's t1, `t1 (N/4)`):
each restores and saves its own record (the cache key ends -s<N>), hands off its own artifact gate-t1-s<N>, and writes
its manifest's sha256 as its own job output sha_<N> (handoff.mjs put --as sha_<N>); a leg sets only its own, so the
verdict gets all four and reads each shard pinned to its own. A shard that did not hand off is missing from the
verdict's count, which then says T1 did not report (T1_SHARDS).

The ruler's looks, live (2026-11-25, the hub's ask of 02:09Z): each land's first heading must keep the words and the
name clear of cloud (tools/visit/look-rule.mjs's rule()). The figures were a stored record, tools/visit/looks.json, keyed
by what moves a cloud near the words; every PR that moved the key re-measured it by hand (looks.mjs --table, about 30
minutes) and any other one landing first invalidated it again (#405, #422, #425 and #414 on Nov 24). Of the key's 12
moves, 7 moved no table heading's figure and the largest moved a words share by 0.028, but no narrower key can say in
advance which change moves one. So there is no record: the plan keys base and head (look-rule.mjs looksKey: worldKey,
the table and the measuring code) and, when it moved, gate.yml's looks job measures the head's build on eight runners
(looks.mjs --table --check --shard i/8, every 8th land: about 76 s a heading at --jobs 2 on 4 cores, 3-4 headings a
runner, about 5 minutes and 40 runner-minutes for the 30). The verdict needs it; a gate that did not move the key skips
it. The bot's re-gate of a PR on main's newer tip measures that merged tree, and main's own gate measures each merge
that moved the key. Each shard's record is its artifact looks-s<N> (7 days), for headings.mjs (--looks).

The first paint's trend (2026-11-25, the hub's ruling (b) on #428): gate.yml's paint job, when the served build changed,
opens base and head (the plan's hand-off) cold in the gates' headless Chromium, 9 loads an arm, in turn (since 2026-11-25, the hub's gate p90: on three runners, paint-loads (N/3), 3 an arm each side by side, and the paint job pools them with --judge, each runner's loads centred on its own median so a faster runner moves both arms alike; on one runner the 18 loads took 231-292 s, the gate's pole in 38% of its runs), and times each
load's words (the first contentful paint), world (the world's first shown frame) and main (the main thread's own work up
to it): tools/paint-trend.mjs. It fails when a head median is slower than max(50 ms, 3 x the measured noise, 1.4826 x
the pooled median absolute deviation). What that catches, measured (4 cores, 7 loads an arm, base against itself): words
80-92 ms, noise 6-18 ms, so its limit is the 50 ms floor: any stall before the first paint of about 50 ms or more fails
(a 200 ms stall in hour.js: +192 ms, failed). world and main are SwiftShader's software boot, 8.3-9.5 s with noise
94-392 ms, so their limit is about 0.3-1.2 s: they catch a boot made slower by about half a second or more, NOT a smaller
one (a 200 ms stall at world.js's top moved them +240-300 ms and passed). Catching that would take about 90 loads an arm
(option (a), about 25 minutes) or a GPU runner; the hub declined both. A byte-identical head fails only by chance beyond
3 sigma.

The hand-off (2026-11-23): the gate's jobs pass each other the two builds and T1's shards as the run's own artifacts,
gate-served and, from each of T1's four runners, gate-t1-s<N>, kept a day (retention-days: 1, hidden files included: the build's .well-known/). Actions
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

## The smoke and Cloudflare's bot challenge

post-deploy.yml's smoke (.github/ci/smoke.mjs) runs from a GitHub runner, whose datacenter IP Cloudflare's bot
protection sometimes challenges (b4615db and a72acc9, 2026-11-23: / answered 403 with Cloudflare's challenge page,
while elsewhere it answered 200 with the site's CSP). A challenge (.github/ci/cf-challenge.mjs: `cf-mitigated:
challenge`, or a 403 from `server: cloudflare` without _headers' CSP whose body is Cloudflare's challenge page) is not
the site's answer. A WAF block, an Access denial or an edge error is: a visitor meets it too, and the smoke fails on it.
/ is asked again 3 times, 15, 30 and 60 s apart. If it is still challenged, the smoke warns "challenged by Cloudflare:
can't tell" and skips the checks of / and of the files / references. A challenged private path or unknown path is
"can't tell" too, never "behind Access" or the 404 page. A warning fails nothing, so no issue opens, and the run's
summary reads "passed, N can't tell". Every other answer, and every other check, stays strict. A skip rule in
Cloudflare's WAF would let the smoke see the site every time. It would need something a visitor can't send: a secret
header, not the smoke's user agent, which anyone can copy.

## The stills

The openings' stills (the world's first frames, baked on a real GPU by tools/gpu/bake-stills.js, #197) are not
in the repository: each served build's set is a release of it, `stills-<key>` with one asset `stills.pack`, where the
key is tools/stills.mjs worldKey, a sha256 of the plain build but its stills and build.txt.
The Cloudflare build fetches its own key's set with STILLS_TOKEN (a Pages secret) and ships without it on any failure.
The key is the whole served build, so any served change (a sound, a stylesheet, a font) is a new key, and a set is
only ever its own world's:
- stills.yml, after every green Gate run on main: is the set for the tip's key up (one request)? Then the tip's commit
  status `stills` is success. Not up: success too, saying the world ships without stills (never a red main).
- The deploy gate (merge-bot.mjs): a tip that has tools/gpu/bake-stills.js waits only while its `stills` status is
  failed or pending (bot-rules.mjs stillsReady). No status passes: stills.yml posts none once its commit is no longer
  main's tip, nor where main's gate was cancelled, and the build fetches its key's set or ships without. merge.yml
  ticks when stills.yml completes.
- post-deploy.yml: at a live commit with the bake, one still of live's own set is fetched from derekzhou.com, 200 and
  its sha256; with no set, live must ship without stills cleanly (.github/ci/stills-live.mjs).
The bake (about 76 minutes for all 2,304 stills, seconds a key it cached) ran on the PC's RTX 4090 until 2026-11-23.
CI no longer bakes, so a served change that makes a new key ships without stills: the first paint the words over the
hour's still sky, then the world's first frame drawn whole as the cut, no fade and no still from another key
(tools/checks/47-first-paint.sh proves it on every gate, on a phone and a laptop; post-deploy's stills-live.mjs checks
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
