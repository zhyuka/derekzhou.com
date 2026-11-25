# Structure

<!-- Moved word for word from CLAUDE.md's section "Structure" (restructure step 7, 2026-11-06). -->

The site is built from the folder site/ and src/: Cloudflare Pages runs
tools/build.mjs and serves its output (dist/, the project's build output
directory), alone. site/ holds what is served as written; the eight files
marked "built" below exist only in a build, never in site/. Everything else
here is the repository's own, and never served.

site/index.html              Home page: the words over a 3D world, drawn live behind them
site/style.css           All styles (named by its content in the deploy build: docs/caching.md): the words' colours, the still skies of each time of day
site/site.js                 Email obfuscation only
site/hour.js              The hour: which time of day the world opens on (the page's one clock read)
site/world.js             The world: the engine, the camera, the time of day, the words' colours, the governor (docs/world.md) (built)
site/realm-kit.js         The builders the world's kits share (rocks, ruins, stupas, temples, isles) (built)
site/realm-dunes.js       The dunes' kit: the sand province's land, rock, landmarks and light (built)
site/realm-above.js       The cloud sea's kit: its surface, towers, canyons, floating isles and light (built)
site/plan.js              The plan's worker: the visit's first plan, made off the main thread (the world's own code; docs/world.md) (built)
site/inkbirds.js          The ink birds: the living sky, every flock on its own business in the world (docs/birds.md) (built)
site/sound.js             The sound icon's switch: silent until pressed (docs/sound.md) (built)
site/score.js             The score the sound icon plays, following the sky (docs/sound.md) (built)
site/404.html                Custom 404 page (the hour's still sky, no world, no birds)
site/assets/favicon.svg      Adaptive circle favicon (dark in light mode, inverse in dark)
site/assets/favicon.png      PNG fallback favicon (32x32)
site/assets/apple-touch-icon.png  180x180 iOS icon
site/assets/sound/           The sound icon's sheet of notes (notes-N.mp3: fetched only at the press; docs/sound.md)
site/assets/fonts/           Self-hosted WOFF2: Geist and Geist Mono, full faces (the subsets'
                             sources; served too, loaded by no page) + two .sub3 subsets (the pages' letters)
                             (loaded), and OFL.txt (their licence)
site/robots.txt              Allow search engines, block AI crawlers
site/.well-known/security.txt  Vulnerability reporting
site/\_headers               Cloudflare Pages security + caching + Early Hints headers
site/\_redirects             HTTPS enforcement (http and www to https://derekzhou.com)
CLAUDE.md                    The short version; docs/ the full record, one file an area
subset-fonts.sh              Regenerates the .sub3 font subsets (the pages' letters: tools/fontglyphs.mjs) in site/assets/fonts (manual tooling)
download-fonts.sh            Fetches the full source fonts into site/assets/fonts (manual tooling)
src/                         The scripts the site serves minified, as written (the world, the kit and
                             the realms, the ink birds, the sound icon's switch and its score): the realms,
                             sound.js and score.js whole under their served names, the world and the ink
                             birds in sections (src/world/, src/birds/inkbirds/; the world's read-only feed
                             for the score is src/world/512-score-feed.js)
src/birds/model/             The ink birds' wing model, six scripts served as written (copied by the build):
                             facetform.js (the tattoo's M as a faceted solid; generated), facetpose.js (the
                             faceted M posed), wingmodel.js (the measured wingbeat driving the M's rig),
                             model.js (the measured per-kind wingbeat data; generated), labbird.js (the
                             wingbeat flying the M, flap and glide), birdwing.js (the wing made to fly in the world)
tools/birds/form/mkform.py   Generates src/birds/model/facetform.js (python3 -I; CI makes it again and compares)
tools/birds/model/           Generates src/birds/model/model.js: make.py runs build_model.py (with linkage.py)
                             on data/ and settings.json, then solve.js on the form; model_full.json keeps every
                             number's source and notes (never served); LICENSES.md and data/*/LICENSES.md the
                             sources' licences. make.py --check: CI's proof that both files are what it makes
tools/parts.mjs              Splits a long script into its sections and assembles src/ into build/src/
src/**/glsl/                 The shaders' text: each plain GLSL literal as NAME.glsl, `@glsl NAME` in the part
test/shaders.mjs             Every program the page issues, compiled and linked in Chrome (--compile)
test/unit/<area>.mjs         Pure code in Node, one file an area (tools/checks/24-unit.sh runs them, a process each), sharing
                             test/unit-lib.mjs; --write updates test/golden/unit/<area>.json:
                             test/unit/air.mjs (the world's one air: every wind reader, the key, the skies' suns),
                             test/unit/aurora.mjs (the aurora by its physics: its sheet, colour, motion and the night's phases),
                             test/unit/band.mjs (the clouds' lift over the flight band as the air carries them),
                             test/unit/cloudshadow.mjs (the clouds' shadows on the land: the chord, the ellipse, the wiring),
                             test/unit/citations.mjs (the naming check's citation patterns), test/unit/clipmap.mjs (the land's rings meet to the bit
                             far out: an fp32 replay), test/unit/events.mjs (the rare sights: placed, path-independent, at most one rare site in reach),
                             test/unit/clouds.mjs (the cloud bodies' billows), test/unit/dunes.mjs (the dunes' slip faces at
                             the sand's angle of repose: physics: sand/S1), test/unit/coast.mjs (the land's
                             varyings centroid: the coast's gap never read off its triangle), test/unit/drag.mjs (the drag), test/unit/motion.mjs (the phone's motion steering: held still, turned),
                             test/unit/drift.mjs (the clouds' drift with the wind: cloudPos, the air cells, their readers),
                             test/unit/lenticular.mjs (terrain-held clouds: the lenses over the far ridges),
                             test/unit/glory.mjs (the glory and the fogbow on the moonlit cloud sea),
                             test/unit/fork-guard.mjs (no PC job a fork's PR can start), test/unit/check-shards.mjs (every check on exactly one of validate's shards), test/unit/flight.mjs (the heading and the bank), test/unit/flight-sim.mjs (the flight flown whole: the slip's plans, its chatter, the hard rules), test/unit/framing.mjs (the camera's framing),
                             test/unit/glslmin.mjs (the shaders' minifier), test/unit/governor.mjs (the render scale's
                             governor), test/unit/ground.mjs (the recorded ground's measure), test/unit/handoff.mjs (the gate's hand-off, run artifacts pinned by manifest), test/unit/height.mjs (the camera's height over the recorded ground), test/unit/held.mjs (the
                             held world), test/unit/maps.mjs (the maps, the director, the plan's worker),
                             test/unit/largeworld.mjs (a long visit's far-out
                             frames held still: eyeRel and the veils' wrap), test/unit/fog.mjs (a basin's fog pool: held under its rim, none with no mist,
                             the flight over it), test/unit/merge-bot.mjs (the merge bot's small rules), test/unit/mist.mjs (the mist pools:
                             their depth by the sky at a capped rate, opaque within 1.5 m, the camera over them), test/unit/perch-ink.mjs (the name's perch table read back exactly), test/unit/prune.mjs (the shaders' dead functions left out at issue), test/unit/rates.mjs (what counts frames counts time: the clouds' history, a speck's pose), test/unit/ripples.mjs (the sand
                             ripples' warp read C1), test/unit/smoke.mjs (the post-deploy smoke tells Cloudflare's bot challenge
                             from the site's answer: .github/ci/cf-challenge.mjs), test/unit/sky.mjs (the order of the
                             skies), test/unit/sound.mjs (the score), test/unit/still-pick.mjs (hour.js's still), test/unit/hold.mjs (the first-paint hold's gates, by browser),
                             test/unit/stills.mjs (the baked stills), test/unit/streams.mjs (the random streams and
                             hashes), test/unit/t1.mjs (T1's DOM hash), test/unit/verdict.mjs (the gate's verdict),
                             test/unit/where.mjs (tools/where.mjs), test/unit/ruler.mjs (the visit ruler)
test/fakepage.cjs            The one fake browser the static checks and the shader census share (devices, the page's scripts)
test/sims/boot.mjs           The boot on the fake page, each device profile once (tools/checks/39-boot-frames.sh)
test/birds-motion.mjs        The ink birds' drawn motion, frame by frame in the headless sim: no snap, flicker or jump
test/birds-flock.mjs         How a flock's birds fly together in the headless sim: the skein's phase lock in wake bouts
test/birds-wind.mjs          The birds in wind in the headless sim: air speed into a headwind, crabbing, landings against a side wind
test/ground.mjs              The land's real ground for the sims, from test/golden/ground/<seed>.bin (recorded on the 4090)
test/golden/                 What the tests compare against: the unit areas' values, the boot's frames, the recorded ground
tools/birds/sim.mjs          The ink birds headless in Node: the real module on a stub host (no GL, 50 ms steps), 960x600 and 390x844
test/birds.mjs               The birds' behaviour on the sim over random scenes (test/birds-scenes.mjs), against the research's numbers
test/birds-motion.mjs        The ink birds' drawn motion frame by frame on the headless sim (their form and place on the window bounded in their second difference)
tools/build.mjs              The build in one command (node tools/build.mjs dist: what Cloudflare deploys once
                             set to): site/ + the built scripts, each script and stylesheet named by its content
                             (world.<sha8>.js), every reference rewritten, build.txt (the commit); --check proves
                             the build the same bytes twice, site/ free of built files, and the named build resolves
tools/minify.mjs             Builds the seven minified scripts from build/ship/; CI checks the build
tools/glslmin.mjs            A shader's text without comments and spare space, token for token the same (the build's)
tools/first-paint.mjs        The first paint with no stills, headless: the words first, the world as a cut, no stale still
tools/paint-trend.mjs        The first paint, base against head (the gate's paint job): words and the world's first frame, cold, timed
tools/check.mjs              Every static check from one command (npm run check; CI's validate job): the build once, then
                             tools/checks/*.sh in parallel; --fast, --only, --list, --prove (each check's planted failures)
                             --shard i/n: the build and one shard's checks (CI runs 5 side by side; --shards n prints the split)
tools/checks/costs.json      Each check's seconds on a hosted runner: check.mjs --shard splits the checks by them
tools/check-quick.mjs        The checks that take seconds (npm run check:quick; the Stop hook)
tools/dup-names.mjs          No name declared twice in one scope of a served script
tools/where.mjs              Where a world name is declared, and which sections read, assign and write it
tools/visit/ruler.mjs        The visit ruler: a 2-hour visit for each opening, headless, in about a minute (places passed,
                             the first near pass, flocks, crossings, the sky's changes, look runs, the longest gap)
tools/visit/headings.mjs     Each land's first heading chosen by the ruler and the frames' look: no more than look-rule.mjs's
                             share of the words under cloud, a near pass by 40 s, the fewest gaps and the clearest feature
tools/visit/looks.mjs        Each candidate heading's first frames in SwiftShader (T1's harness), clouds on and off: the cloud
                             in the words' boxes and the top band, the Milky Way and the low sun left clear (its record,
                             build/looks.json, never committed); --table --check is the ruler, the gate's looks job
                             (eight runners, --shard i/8, every 8th land): the table's headings and each land's own,
                             measured live and failed by look-rule.mjs's rule() (about 76 s a heading)
tools/visit/look-rule.mjs    The look's caps on the words and the name under cloud, the glow kept, its weights, rule(),
                             worldKey (KEY_INPUTS: the cloud layout, the opening's view, the words' layout; not the sky,
                             the land's surface or the birds) and looksKey (worldKey, the table and the measuring code:
                             the gate measures only when it moved, base against head)
tools/fontglyphs.mjs         The letters each served font must hold (subset-fonts.sh, tools/checks/40-font-glyphs.sh)
tools/loadperf.mjs           How fast the page loads, in headless Chromium, by hand (docs/fonts-performance.md)
tools/clouds/edge-specks.mjs A cloud edge's specks and high-frequency residual on a frame, by hand (node tools/clouds/edge-specks.mjs FRAME.png x0 y0 x1 y1)
tools/clouds/crops.mjs       Base|head crops in a cloud session, by hand: two refs built as scratch twins (the camera handed to the
                             harness, never deployed), headless SwiftShader on T1's harness, the camera held or aimed at a
                             cloud of a kind; base, head, crop and diff PNGs for a review branch (test/unit/clouds.mjs: its edit)
tools/ground-site.mjs        The page the recorded ground is read from, and the measure of a recording against it
tools/ground-fresh.mjs       Whether every recorded ground is today's world's, under SwiftShader (tools/checks/37-ground-fresh.sh)
tools/stills.mjs             The openings' baked stills between the PC that bakes them and the Cloudflare build (docs/deploy.md)
tools/stills-release.mjs     A bake's stills up as the release the Cloudflare build fetches (stills.yml)
tools/stills-twin.mjs        The still's preload put back in the twin the PC bakes (stills.yml)
tools/gpu/                   GPU checks run by hand on a real GPU (no CI job runs them): T2 (t2.js), T3 (t3.js), the ground's recorder
                             (record-ground.mjs), the stills' bake (bake-stills.js) and their helpers
tools/night/                 The moon's face (moonmap.py): the near side's albedo map resampled to sky-body.glsl's 32 x 32
                             MOONA (its source, NASA's SVS CGI Moon Kit, kept out of the repository: docs/licences.md)
tools/physics/               The dunes' slope census against the sand's physics (physics: sand/S1): dune-census.mjs
                             (the model in JS) and dune-census-gpu.mjs (the shipped GLSL under SwiftShader), by hand;
                             mist-sim.mjs, the mist pools against the 16 openings' land (delight-weather 1), by hand;
                             fog-sim.mjs, the fog pools against the land at AIR's fog sites (234), by hand;
                             ripple-size.py, the sand's ripples at true and drawn size from the flight, filtered at the
                             pixel and not (point-sampled, today's fade, fwidth), by hand
tools/precision/             far-origin.mjs: how fp32 degrades far out (a 2-hour visit is 86 km): each world-anchored value
                             the GPU reads, in metres and laptop pixels, by hand (docs/world.md, ## THE LARGE WORLD)
tools/android/               The Android lab: the boot timed on real phones in Firebase Test Lab, by hand (its README.md)
tools/tsc.mjs                tsc --checkJs over the assembled world, src/realm-*.js, src/sound.js, src/score.js and
                             site/*.js (copies, cast from the side: never a byte in site/), by npx typescript (pinned;
                             not a dependency), with tools/types/world.d.ts for what TypeScript's DOM types lack and the
                             shared objects' types (TG, EXT, the targets, the birds' module, window.WORLD and its air,
                             events and kit): each error as section:line or file:line (tools/checks/48-tsc.sh, at zero)
tools/sound/page.mjs         The sound icon pressed in headless Chromium against a build (tools/checks/38-sound.sh)
tools/still-words.mjs        The words' boxes in each bake window and its band's smallest, measured in Chromium against a
                             build (a layout only): 226's STILL_WORDS (their union) and test/golden/still-words.json
                             (--check, tools/checks/70-still-words.sh; --write after a stylesheet change)
tools/sound/sheet.py         Makes the score's sheet of notes from the two CC0 libraries, by hand (docs/sound.md)
tools/sound/render.mjs       Renders the score offline against a scripted flight and prints its loudness, by hand
tools/plan.mjs               Makes the plan's worker from the world's plan spans, stamped (fillStamp writes PW_V at assembly), minified as the world is
package.json, package-lock.json  terser, pinned, for tools/minify.mjs (npm ci; node_modules/ after it)
.gitattributes               src/ and site/ never converted to CRLF (minify.mjs refuses a CR)
.github/workflows/validate.yml  CI checks: tools/check.mjs on five runners (--shard i/5), every check a file of tools/checks/
.github/ci/areas.json        Which gates a changed path needs (areas.mjs); every pattern matches a tracked or served file
.github/ci/handoff.mjs       The gate's jobs hand each other the two builds and T1's shards (run artifacts, sha256 manifest, pinned)
                             (HANDOFF_ROOT), every file checked against a sha256 manifest (docs/deploy.md)
tools/checks/NN-slug.sh      One static check each, its `# check:` line its name (numbers unique; they run in parallel):
                             tools/checks/00-assemble.sh, tools/checks/01-build.sh (the build every check reads),
                             tools/checks/10-dup-names.sh, tools/checks/11-required-files.sh, tools/checks/12-secrets.sh,
                             tools/checks/13-rules-data.sh (RULES.json), tools/checks/14-deploy-inputs.sh,
                             tools/checks/15-security-txt.sh, tools/checks/16-asset-refs.sh, tools/checks/17-no-inline-code.sh,
                             tools/checks/18-lettered-name.sh, tools/checks/19-page-words.sh, tools/checks/20-script-order.sh,
                             tools/checks/21-absences.sh, tools/checks/22-build-check.sh, tools/checks/23-wing-model.sh,
                             tools/checks/24-unit.sh, tools/checks/25-world-rules.sh, tools/checks/26-glsl-guard.sh,
                             tools/checks/27-shaders.sh, tools/checks/28-w7.sh (nothing darkens), tools/checks/29-still-skies.sh,
                             tools/checks/30-perch-ink.sh, tools/checks/31-no-fades.sh, tools/checks/32-licences.sh,
                             tools/checks/33-no-frameworks.sh, tools/checks/34-reduced-motion.sh, tools/checks/35-birds.sh,
                             tools/checks/36-load-budget.sh, tools/checks/37-ground-fresh.sh, tools/checks/38-sound.sh,
                             tools/checks/39-boot-frames.sh, tools/checks/40-font-glyphs.sh,
                             tools/checks/41-docs-drift.sh (this list, and areas.json's patterns, true to the files),
                             tools/checks/42-one-air.sh (the world's one air: no wind or sun of a section's own),
                             tools/checks/43-dune-census.sh (the shipped dunes' slopes, from the page's own probe:
                             the sand spec's bounds, physics: sand/S1),
                             tools/checks/44-gust-glsl.sh (the shaders' gust is the JS's, by value: lib/gust-glsl.mjs),
                             tools/checks/45-citations.sh (no author-style citation: a credit is its DOI or URL),
                             tools/checks/46-names-in-messages.sh (no banned name in a commit message from main to HEAD,
                             the PR's title or its body: .claude/hooks/guard.py --messages, the one names.json list),
                             tools/checks/47-first-paint.sh (with no stills, the words first, then the world as a cut,
                             no stale still: tools/first-paint.mjs),
                             tools/checks/48-tsc.sh (tsc --checkJs at zero: tools/tsc.mjs)
                             tools/checks/70-still-words.sh (the words' boxes each still was baked with, still true)
tools/checks/nocomments.mjs  A copy of a tree with every comment blanked, so a check that greps for code never reads prose
tools/checks/lib/            What the checks run: tools/checks/lib/rules_check.py (RULES.json's references exist),
                             tools/checks/lib/world_rules.py (the world's rules), tools/checks/lib/w7_unit.js (W7:
                             nothing darkens), tools/checks/lib/glsl_guard.js (every visit of a device, the same shader
                             sources; also the gate's shader census), tools/checks/lib/docs-drift.mjs (this map, checked),
                             tools/checks/lib/one-air.mjs (the air's names and literals, for 42-one-air.sh),
                             tools/checks/lib/gust-glsl.mjs (the shaders' gust rendered and held to the JS's, for 44-gust-glsl.sh),
                             tools/checks/lib/citations.mjs (no author-style citation in a tracked file, for 45-citations.sh)

Seven scripts are served minified: world.js, realm-kit.js,
realm-dunes.js, realm-above.js, inkbirds.js, sound.js and score.js
(and the plan's worker, made by tools/plan.mjs). src/ holds them
as written. The world and the ink birds are kept as section files, one per
divider of the old whole file (src/world/NNN-slug.js, src/birds/inkbirds/;
each folder's parts.json names the served file): edit the section you need;
a new section is a new NNN between two others (they join in name order,
nothing between). node tools/parts.mjs assemble src build/src writes the
whole scripts under their served names into build/src/ (never committed:
the dev build, as written). The record, the switches and the dev harness
are dev-only parts, in src/dev/world/: each has a stub beside the world's
parts (src/world/NNN-slug.ship.js: the switches' defaults, and the four
functions called without a guard as empty ones), and assemble --ship src
build/ship writes the shipped build, the dev parts left out by file.
A plain GLSL literal (no ${...}) is kept as a file in its folder's glsl/
(src/world/glsl/, src/birds/inkbirds/glsl/, src/glsl/ for the realms):
the script has `@glsl NAME` where it was, and assemble writes the text
back exactly. The build (tools/build.mjs: assemble --min-glsl, for the
shipped build and the dev build) writes it
back minified instead (tools/glslmin.mjs, 2026-11-06): no comment, no
blank line, no spare space, every line of code still a line (the world's
folds work by lines), a #define's spacing kept, the same tokens (checked;
the build fails otherwise); a file a script reads at run time stays as
written (glslmin.mjs's KEEP: dunes-glsl, whose D_Hd the land split finds
by its text). So the world issues and the browser
compiles the short text; src/ keeps the readable one. Edit a shader in its
.glsl file; nothing derived from it is committed (2026-11-06): the gate's
census and T1 compare the base's build with the head's.
tools/minify.mjs makes the served seven from build/ship/: the switches'
line cut out of the world (an exact, counted cut; every switch then read
as its default; the ink birds read no dev flag: checked), then terser
(pinned in package.json) compresses and
mangles, every string's value and every shader's text (as assemble gave it) the same, every
comment dropped but each file's two-line provenance note and the INIT-END
marker. None of what they make is committed: a change
is made in src/ and committed alone, and the build makes the rest. The
rules that read the scripts' text (the absences, world_rules.py) read
build/src/; every other check of a served file reads build/site/ (CI's
first step: node tools/build.mjs --plain build/site). tools/build.mjs runs
all of it into a folder of its own (node tools/build.mjs --plain OUT: site/
copied, src/ assembled, the built scripts written into the copy) and then
(restructure step 5) names each script and
stylesheet by its content: world.js becomes world.<sha8>.js, the first 8
hex of the sha256 of its final bytes, files that load others by name (the
world, after its plan worker) named after them, and every
reference rewritten (index.html, 404.html, \_headers, the plan
worker's URL); node tools/build.mjs OUT writes that, with OUT/build.txt holding the
commit. CI step "The build, the same bytes every time; site/ holds no
built file" (node tools/build.mjs --check) builds twice and fails unless both
builds are the same bytes, site/ holds none of the files the build writes
(a built file committed back is an error: git rm it), and in the named build every
name is its bytes' hash, no old name is left, every reference resolves and
every script and stylesheet has its own immutable \_headers block. The
plan's worker is built too, never committed: tools/plan.mjs copies the
world's plan spans (the angle constants; the maps and the director; MAPS,
mapsInit, kitAt; the weights' grids) verbatim from the assembled world into
it, stamped with their md5. The source holds no stamp (its part has
var PW_V = '';): tools/parts.mjs assemble writes the spans' stamp into
every assembled world (tools/plan.mjs fillStamp, 2026-11-15), so a change
to the spans needs no step by hand, and the build fails if the world's
PW_V is ever not that stamp; the build then minifies it as the world is
(tools/plan.mjs buildPlan: terser with the world's options, its header
kept; 27 -> 15 KB at Brotli 4, 2026-11-06), and test/unit/maps.mjs runs that
worker against the page's own plan, hash for hash. The hour, site.js and the wing model (src/birds/model/) are
served as written. The stylesheet is served without its comments
(load-perf, 2026-11-07: tools/build.mjs cssMin, every comment but a /*!
one dropped, every line trimmed, blank lines dropped, a rule still on its
own line; the build fails unless only comments and white space went): it
is render-blocking, and its notes were 8 KB of its 19 (4,995 B at Brotli
11 before, 2,151 B after). Its notes stay in site/style.css.

No Functions, no private pages. A private /studio/ needs an origin guard
first (a Pages Function that checks the Cloudflare Access token again, in
a functions/ folder at the repository's root, where Pages looks for it,
with site/\_routes.json sending it every private path), because Access
alone lets a percent-encoded path through and does not cover the
pages.dev host. The owner keeps a tested guard in a private repo. The
Access application on
derekzhou.com still lists paths for pages that no longer exist: Access asks
for a sign-in there, and past it they serve 404.

The shipped scripts have no development harness: the world is built and
measured in a dev build with hooks on `<html>` (a seed, a moment, a still,
switches, a record), and src/'s files are that build with every
hook cut out by counted edits (docs/verify.md), the served copies built
from them. Nothing on the page reads such a hook. The record's code and
the dev helpers those hooks called are in src/dev/world/, in the dev
build only, unreachable (the switches keep their defaults); the served
copy is built without them (assemble --ship: the four functions called
without a guard kept as empty ones; tools/minify.mjs: every switch read
as its default; the ink birds read no dev flag). The
comments, in src/ (a served copy keeps only its first two lines and the
INIT-END marker), keep the dev build's tags and the names of its files
(design-v5 and its sections, rounds, fixes and judges; notes.md,
w04b_sky.js, diag.js and the like): they cite the world's development
record, which lives outside this repository, so a file they name is not
missing here (each script's first two lines say so).
