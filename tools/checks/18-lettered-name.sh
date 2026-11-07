#!/usr/bin/env bash
# check: The lettered name keeps its words
# enforces: lettered-name
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# plant: {"file": "build/site/index.html", "find": "<span class=\"visually-hidden\">Derek Zhou</span>", "with": "<span class=\"visually-hidden\">Derek</span>", "why": "the h1 lost its words"}
cd build/site
# The h1 is drawn (one SVG path in the words' colour) but must still
# read "Derek Zhou" to every reader: its words in a visually hidden
# span, the drawing hidden from assistive tech and inert (no text,
# script, style, link or paint server inside it), the stylesheet
# holding both rules and reserving the drawing's box (no layout shift).
CSS=style.css
python3 - "$CSS" <<'PY'
import re, sys
html = open('index.html').read(); css = open(sys.argv[1]).read()
fail = 0
m = re.search(r'<h1 class="name">(.*?)</h1>', html, re.S)
if not m:
    print('::error::index.html has no <h1 class="name">'); sys.exit(1)
h1 = m.group(1)
if '<span class="visually-hidden">Derek Zhou</span>' not in h1:
    print('::error::the h1 lost its words: <span class="visually-hidden">Derek Zhou</span>'); fail = 1
svg = re.search(r'<svg\b([^>]*)>(.*?)</svg>', h1, re.S)
if not svg:
    print('::error::the h1 has no lettering (svg)'); sys.exit(1)
attrs, body = svg.groups()
for need in ['aria-hidden="true"', 'focusable="false"', 'viewBox="']:
    if need not in attrs:
        print('::error::the lettering svg lacks', need); fail = 1
if len(re.findall(r'<path\b', body)) != 1 or 'fill="currentColor"' not in body:
    print('::error::the lettering must be one path filled with currentColor'); fail = 1
if re.search(r'<(text|script|style|a|image|use|foreignObject|linearGradient|radialGradient|pattern|filter)\b|\bstyle=|href=|\bon[a-z]+=', body, re.I):
    print('::error::the lettering holds more than its drawing'); fail = 1
vb = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', attrs)
ar = re.search(r'\.name svg\s*\{[^}]*aspect-ratio:\s*([\d.]+)\s*/\s*([\d.]+)', css)
if not vb or not ar or abs(float(vb.group(1)) / float(vb.group(2)) - float(ar.group(1)) / float(ar.group(2))) > 1e-6:
    print('::error::the stylesheet must reserve the lettering box (.name svg aspect-ratio = the viewBox\'s)'); fail = 1
if not re.search(r'\.visually-hidden\s*\{[^}]*clip-path:\s*inset\(50%\)', css):
    print('::error::the stylesheet has no .visually-hidden rule'); fail = 1
print('the lettered name keeps its words' if not fail else 'FAILED'); sys.exit(fail)
PY
