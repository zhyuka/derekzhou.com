# Caching

<!-- Moved word for word from CLAUDE.md's section "Caching" (restructure step 7, 2026-11-06). -->

Cloudflare Pages deploys tools/build.mjs's output (build command
`npm ci --no-audit --no-fund --ignore-scripts && node tools/build.mjs dist`,
output directory `dist`, live since 2026-11-06). HTML: max-age=0,
must-revalidate. Everything else: max-age=31536000, immutable, so CHANGED
BYTES NEED A NEW NAME. For every script and the stylesheet the build does
that: it serves each under its content's hash (world.js as world.<sha8>.js),
names a file that loads another by name after the one it loads (the world
after the plan's worker), and rewrites every
reference (index.html, 404.html, \_headers' Link preloads and cache blocks,
the plan worker's URL). So their names in site/ and src/ are plain
(style.css, hour.js, sound.js, score.js, world.js, realm-kit.js, realm-dunes.js, realm-above.js,
inkbirds.js, plan.js, and the wing model's six in
src/birds/model/) and never change for an edit; renaming one is a refactor
(git mv, then every reference). validate.yml's reverse check
fails on any script or stylesheet in the build that no page loads (the
plan's worker aside: the world starts it, by name), so git mv rather than copy.
The sound icon's sheet of notes (site/assets/sound/notes-N.mp3, fetched by sound.js only at
the press) is an asset: /assets/*'s immutable block covers it, and tools/sound/sheet.py writes it
under a new name when its bytes change, SHEET in src/sound.js with it (docs/sound.md).

The build also stores every content-named script and the stylesheet
Brotli-compressed at quality 11, its \_headers block saying
Content-Encoding: br (2026-11-06). Cloudflare compresses what it serves
at about quality 4 (world.js 143 KB on the wire against 121 KB at 11),
and passes a response that already carries Content-Encoding through to a
client that accepts it, decoding it for one that does not (checked on a
preview). tools/gpu/cfserve.js serves such a file the same way.

By hand, still: what the build does not rename. The fonts (.subN →
.subN+1) and the images: bump the name and update every reference in the
same commit (site/index.html, site/404.html, site/\_headers' Link preloads
and blocks, this file).

The browser's shader cache answers only for a GLSL source it has seen byte
for byte, so a returning visitor's world is quick only while every
program's text stays the same: CI step "Every visit compiles the same
shaders" (glsl_guard.js) runs the site's scripts as shipped in node, in a
fake browser with a fake WebGL2 context, for 15 visits of five devices,
and fails unless every visit of a device compiles the same sources,
and devices differ only in the #define lines after #version. Which
programs a change edits (the ones a deploy makes every returning visitor
compile again) is the gate's to say: its census compares the base's build
with the head's (glsl_changed), and T2 names each changed program and
reads it back. Nothing derived from the shaders is committed
(2026-11-06: a committed manifest and golden texts made every shader PR
conflict with every other).
