#!/usr/bin/env bash
# Regenerate the subset fonts served by the site from the full faces.
# Manual tooling, like download-fonts.sh — not a build step. Run after
# replacing a source font, then bump the .subN suffix (assets are
# immutable-cached, so changed bytes need a new filename).
# Requires: pip install fonttools brotli
set -euo pipefail
cd "$(dirname "$0")/assets/fonts"
# Latin basic + en/em dash, curly quotes, ellipsis, middle dot. The name
# table keeps the copyright and the OFL notice (IDs 0, 13 and 14).
RANGE="U+0020-007E,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2026,U+00B7"
SUBSET=(--flavor=woff2 --unicodes="$RANGE" --layout-features=kern,liga,calt --name-IDs=0,1,2,3,4,5,6,13,14)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
# Geist: the variable face cut to the weights the site sets (400-500) —
# one file, smaller than a single static weight
python3 - "$tmp/Geist-400-500.ttf" <<'PY'
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
f = TTFont('Geist-Variable.woff2')
f.flavor = None
instancer.instantiateVariableFont(f, {'wght': (400, 500)}).save(sys.argv[1])
PY
pyftsubset "$tmp/Geist-400-500.ttf" "${SUBSET[@]}" --output-file=Geist-400-500.sub2.woff2
pyftsubset GeistMono-Regular.woff2 "${SUBSET[@]}" --output-file=GeistMono-Regular.sub2.woff2
for f in Geist-400-500 GeistMono-Regular; do echo "$f.sub2.woff2: $(wc -c < "$f.sub2.woff2") bytes"; done
