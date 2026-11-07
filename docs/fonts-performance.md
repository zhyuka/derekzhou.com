# Fonts + performance

<!-- Moved word for word from CLAUDE.md's section "Fonts + performance" (restructure step 7, 2026-11-06). -->

Served fonts are ASCII subsets (.sub2: Latin basic, · – — ‘ ’ “ ” …).
./download-fonts.sh fetches the sources from Vercel's own geist package
(pinned) into site/assets/fonts; ./subset-fonts.sh cuts the subsets
there. Geist is one variable file cut to the two weights the site sets,
wght 400-500 (10.9 KB, smaller
than a single static weight); Geist Mono Regular is 9.3 KB: 20 KB of
fonts in all. The subsets keep the copyright and the OFL notice in their
name tables (IDs 0, 13, 14), and assets/fonts/OFL.txt ships beside them.
The home page uses no glyph outside the subsets; do not add glyphs.
font-display: optional + the metric-matched fallbacks give CLS = 0 by
construction: 'Geist Fallback' (Arial) and 'Geist Fallback Android'
(Roboto), 400 and 500 apart, their size-adjust the page's own text set in
Geist over the same text in the system face and their ascent and descent
Geist's (1.005, 0.295) over it; 'Geist Mono Fallback' (Menlo, Courier New)
by the advance, 0.6 em. Both subsets are used (Geist: the line, the links,
the h1's hidden words, the 404's heading; Geist Mono: the credit), so both
are preloaded in index.html and Early-Hinted via Link headers on / in
\_headers. Never preload a font no rule uses (Chrome warns, and every
first visit pays for it).

The world's scripts are on the path to the first paint only where the
first-paint hold runs (World: BOOT): there the page paints once, with the
world's first frame; where hour.js skips the hold they are not (parser-
blocking, but the paint is not held: Chrome paints while they come). The world's and the kits' are fetched
from the page at high priority; the wing model and the ink birds after
them, at low. (2026-11-06: the world's four scripts are no longer
early-hinted. The build stores them Brotli 11, ready to send whole, and
hinted they went out ahead of the fonts on a slow link.) As
served: world.js 360 KB, the kits 47 KB,
inkbirds.js 141 KB, its wing model 138 KB (model.js 26 KB of it: its
notes stay in tools/birds/model/model_full.json, 2026-11-06), the
plan's worker 73 KB (node tools/minify.mjs --report build/ship: the five
minified, before and after, raw and brotli).

theme-color is #173a63 in the HTML (the day still's top: a visit with no
script), takes the top of the hour's still sky (hour.js, before the
first paint), the world's still top for the hour (the wide windows' own
on a window 6:5 or wider) as the world's script's first act, and follows
the top of the drawn world. The favicon is SVG-first with PNG fallback.
