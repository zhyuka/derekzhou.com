#!/usr/bin/env bash
# Regenerate the subset fonts served by the site from the full faces.
# Manual tooling, like download-fonts.sh — not a build step. Run after
# replacing a source font, or after the pages' words gain a letter (CI's
# check "Every letter the pages show is in its font" says so), then bump
# the .subN suffix and every reference (assets are immutable-cached, so
# changed bytes need a new filename).
# Requires: pip install fonttools brotli; node.
# (load-perf, 2026-11-07: .sub3) Each font is cut to the letters the pages
# show (tools/fontglyphs.mjs): Geist to every page's text, Geist Mono to
# the credit row's. Before, both were cut to Latin basic and a few marks
# (.sub2: 10,932 + 9,320 B); cut to the pages, the first paint waits for
# about 9 KB fewer. Space is always kept. The name table keeps the
# copyright and the OFL notice (IDs 0, 13 and 14).
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
cd "$root/site/assets/fonts"
SANS="$(node "$root/tools/fontglyphs.mjs" --text sans) "
MONO="$(node "$root/tools/fontglyphs.mjs" --text mono) "
SUBSET=(--flavor=woff2 --layout-features=kern,liga,calt --name-IDs=0,1,2,3,4,5,6,13,14)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
python3 - "$tmp/Geist-400-500.ttf" <<'PY'
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
f = TTFont('Geist-Variable.woff2')
f.flavor = None
instancer.instantiateVariableFont(f, {'wght': (400, 500)}).save(sys.argv[1])
PY
pyftsubset "$tmp/Geist-400-500.ttf" "${SUBSET[@]}" --text="$SANS" --output-file=Geist-400-500.sub3.woff2
pyftsubset GeistMono-Regular.woff2 "${SUBSET[@]}" --text="$MONO" --output-file=GeistMono-Regular.sub3.woff2
for f in Geist-400-500 GeistMono-Regular; do echo "$f.sub3.woff2: $(wc -c < "$f.sub3.woff2") bytes"; done
