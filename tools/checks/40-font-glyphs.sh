#!/usr/bin/env bash
# check: Every letter the pages show is in its font
# enforces: fonts-hold-the-words
# (load-perf, 2026-11-07) The served fonts are cut to the letters the pages show (subset-fonts.sh, .sub3): Geist to
# every page's text, Geist Mono to the credit row's. tools/fontglyphs.mjs reads each cut font's cmap from its woff2
# and fails on a letter a page shows that the cut lacks and the full face has (one the full face lacks too falls back
# as it always did). Fix: ./subset-fonts.sh, then rename the fonts (.subN+1) and every reference in the same commit.
# plant: {"file": "build/site/index.html", "find": "Product&nbsp;Development.", "with": "Product&nbsp;Development!", "why": "a letter the cut font lacks"}
node tools/fontglyphs.mjs --check build/site
