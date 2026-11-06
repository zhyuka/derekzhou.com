# Caching

<!-- Moved word for word from CLAUDE.md's section "Caching" (restructure step 7, 2026-11-06). -->

Cloudflare Pages deploys tools/build.mjs's output (build command
`npm ci --no-audit --no-fund --ignore-scripts && node tools/build.mjs dist`,
output directory `dist`, live since 2026-11-06). HTML: max-age=0,
must-revalidate. Everything else: max-age=31536000, immutable, so CHANGED
BYTES NEED A NEW NAME. For every script and the stylesheet the build does
that: it serves each under its content's hash (world.js as world.<sha8>.js),
names a file that loads another by name after the one it loads (the world
after the plan's worker, the start file after its table), and rewrites every
reference (index.html, 404.html, \_headers' Link preloads and cache blocks,
the two workers' URLs). So their names in site/ and src/ are plain
(style.css, hour.js, world.js, realm-kit.js, realm-dunes.js, realm-above.js,
inkbirds.js, plan.js, start.js, start-table.js, and the wing model's six in
src/birds/model/) and never change for an edit; renaming one is a refactor
(git mv, then every reference). validate.yml's reverse check
fails on any script or stylesheet in the build that no page loads (the
plan's worker aside: the world starts it, by name; the start file's table:
the start file starts it), so git mv rather than copy.

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
devices differ only in the #define lines after #version, and the reference
device's programs are exactly glsl_manifest.txt. So a change to a
program's text comes with its manifest lines in the same commit (node
.github/workflows/glsl_guard.js build/site --write
.github/workflows/glsl_manifest.txt), and the diff names the programs a
deploy makes every returning visitor compile again.
