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
test/unit/<area>.mjs         The world's pure code in Node, one file an area (streams, sky, maps and the plan's worker, governor, framing, drag, glslmin, verdict), sharing test/unit-lib.mjs; --write updates test/golden/unit/<area>.json
tools/birds/sim.mjs          The ink birds headless in Node: the real module on a stub host (no GL, 50 ms steps), 960x600 and 390x844
test/birds.mjs               The birds' behaviour on the sim over random scenes (test/birds-scenes.mjs), against the research's numbers
tools/build.mjs              The build in one command (node tools/build.mjs dist: what Cloudflare deploys once
                             set to): site/ + the built scripts, each script and stylesheet named by its content
                             (world.<sha8>.js), every reference rewritten, build.txt (the commit); --check proves
                             the build the same bytes twice, site/ free of built files, and the named build resolves
tools/minify.mjs             Builds the five served scripts from build/ship/; CI checks the build
tools/tsc.mjs                tsc --checkJs over the assembled world, by hand (npx typescript, pinned; not a dependency),
                             with tools/types/world.d.ts for what TypeScript's DOM types lack: each error as section:line
tools/sound/page.mjs         The sound icon pressed in headless Chromium against a build (tools/checks/38-sound.sh)
tools/sound/sheet.py         Makes the score's sheet of notes from the two CC0 libraries, by hand (docs/sound.md)
tools/sound/render.mjs       Renders the score offline against a scripted flight and prints its loudness, by hand
tools/plan.mjs               Makes the plan's worker from the world's plan spans, stamped (--stamp sets PW_V), minified as the world is
package.json, package-lock.json  terser, pinned, for tools/minify.mjs (npm ci; node_modules/ after it)
.gitattributes               src/ and site/ never converted to CRLF (minify.mjs refuses a CR)
.github/workflows/validate.yml  CI checks: runs tools/check.mjs, every check a file of tools/checks/ (and, beside it, the world's: world_rules.py,
                             w7_unit.js, and the shaders' guard, glsl_guard.js
                             (every visit of a device, the same sources))

Five scripts are served minified: world.js, realm-kit.js,
realm-dunes.js, realm-above.js and inkbirds.js. src/ holds them
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
census and T2 compare the base's build with the head's.
tools/minify.mjs makes the served five from build/ship/: the switches'
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
it, stamped with their md5, and the build fails when the world's PW_V is
not that stamp (after a change to the spans, node tools/plan.mjs --stamp
rewrites PW_V in its part); the build then minifies it as the world is
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
