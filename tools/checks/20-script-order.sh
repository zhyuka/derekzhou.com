#!/usr/bin/env bash
# check: The world's page loads in order
# enforces: no-2d-birds
# enforces: script-order
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# plant: {"file": "build/site/index.html", "find": "<div id=\"world-end\" hidden></div>", "with": "", "why": "the hold's marker gone"}
# plant: {"file": "build/site/index.html", "find": "<script data-cfasync=\"false\" id=\"score-slot\"></script>", "with": "", "why": "the score's slot gone"}
cd build/site
# hour.js in the head (before the first paint), site.js, then (the
# first-paint hold, 2026-11-06) the world, the realms' kit and realms,
# parser-blocking after the footer (the world measures the words),
# fetchpriority="high" (the hold runs as the last realm registers),
# then the ink birds' wing model and the ink birds last, deferred,
# fetchpriority="low". The head's link rel=expect blocking=render
# holds the paint until #world-end is parsed: one empty, hidden
# marker right after the last realm's script.
# Every script data-cfasync="false", so Rocket Loader leaves the
# order as served. One canvas, in the HTML; no bird SVGs.
python3 - <<'PY'
import re, sys
src = open('index.html', encoding='utf-8').read()
head, body = src.split('<body>', 1)
tags = lambda s: re.findall(r'<script\b([^>]*)\bsrc="/([^"]+)"([^>]*)></script>', s)
want_head = [('hour', False)]
want_body = [('site', False), ('sound', False), ('world', False), ('realm-kit', False), ('realm-dunes', False), ('realm-above', False), ('facetform', True), ('facetpose', True), ('wingmodel', True), ('model', True), ('labbird', True), ('birdwing', True), ('inkbirds', True)]
pri = {'sound': None, 'world': 'high', 'realm-kit': 'high', 'realm-dunes': 'high', 'realm-above': 'high', 'facetform': 'low', 'facetpose': 'low', 'wingmodel': 'low', 'model': 'low', 'labbird': 'low', 'birdwing': 'low', 'inkbirds': 'low'}
fail = 0
# no async script: each loads in the order below
asyn = [g for g in tags(src) if 'async' in (g[0] + g[2]).split()]
if asyn:
    print('::error::no script is async: got %s' % [g[1] for g in asyn]); fail = 1
for part, want in [(head, want_head), (body, want_body)]:
    got = tags(part)
    names = [(re.sub(r'(\.v\d+)?\.js$', '', g[1]), 'defer' in (g[0] + g[2]).split()) for g in got]
    if names != want:
        print('::error::scripts out of order: got %s, want %s' % (names, want)); fail = 1
    for g in got:
        if 'data-cfasync="false"' not in g[0] + g[2]:
            print('::error::%s lacks data-cfasync="false"' % g[1]); fail = 1
        st = re.sub(r'(\.v\d+)?\.js$', '', g[1])
        if part is body and st in pri and re.findall(r'\bfetchpriority="(\w+)"', g[0] + g[2]) != ([pri[st]] if pri[st] else []):
            print('::error::%s wants fetchpriority="%s"' % (g[1], pri[st])); fail = 1
if head.count('<link rel="expect" href="#world-end" blocking="render">') != 1 or src.count('id="world-end"') != 1 or not re.search(r'src="/realm-above(?:\.v\d+)?\.js"[^>]*></script>\s*<div id="world-end" hidden></div>', body):
    print('::error::the hold: the head wants one <link rel="expect" href="#world-end" blocking="render">, and the body one empty <div id="world-end" hidden></div> right after the last realm'); fail = 1
# (2026-11-07) the sound icon's switch right after site.js (it shows the icon before the first paint), and the
# score's slot: one empty script after the ink birds, the page's last
if body.count('<script data-cfasync="false" id="score-slot"></script>') != 1 or not re.search(r'src="/inkbirds(?:\.v\d+)?\.js"[^>]*></script>\s*(?:<!--.*?-->\s*)?<script data-cfasync="false" id="score-slot"></script>\s*</body>', body, re.S):
    print('::error::the score\'s slot: one empty <script data-cfasync="false" id="score-slot"></script> right after the ink birds, the page\'s last'); fail = 1
wi = body.find('src="/world.js"'); fi = body.find('</footer>')
if wi < 0 or fi < 0 or wi < fi:
    print('::error::the world, the kit and the realms come after the footer (the world measures the words)'); fail = 1
if body.count('<canvas class="sky" aria-hidden="true"></canvas>') != 1:
    print('::error::the page needs its one canvas.sky'); fail = 1
if re.search(r"""class=["'][^"']*\bbird\b|<polyline""", src):   # (a bird class in any class list, in either quotes, or a stroke)
    print('::error::the old 2D birds are retired: no bird SVG in the page'); fail = 1
print('in order' if not fail else 'FAILED'); sys.exit(fail)
PY
