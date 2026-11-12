#!/usr/bin/env bash
# check: Absences are enforced
# enforces: no-2d-birds
# enforces: steer-only-by-drag
# enforces: one-entropy-one-clock
# enforces: opening-sky-by-clock-only
# enforces: absence-chrome
# enforces: absence-behaviour
# enforces: absence-no-dom
# enforces: absence-network-sound-cursor
# enforces: absence-dev-hooks
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# (one-check) the rules read code, not prose: the greps below run on a copy of build/ whose .js and .css comments are
# blanked (tools/checks/nocomments.mjs: every line and column kept, the INIT-END marker kept), proved first to be the
# same programs; a comment naming localStorage no longer fails, a call to it still does
# plant: {"file": "build/site/hour.js", "find": "(function () {", "with": "(function () { localStorage.getItem('x');", "why": "a call to localStorage"}
# plant: {"expect": "pass", "file": "build/site/hour.js", "find": "(function () {", "with": "(function () { // localStorage is never read here", "why": "a comment naming localStorage is prose, not code"}
node tools/checks/nocomments.mjs --self-test build/src/*.js build/site/*.js
node tools/checks/nocomments.mjs build/site "$RUNNER_TEMP/nc/site"
node tools/checks/nocomments.mjs build/src "$RUNNER_TEMP/nc/src"
cd "$RUNNER_TEMP/nc/site"
# (the world's five scripts as written, ../src/ (src/ assembled): site/ serves them minified, and "The minified scripts are
# exactly what the script makes" proves site/'s are tools/minify.mjs's build of these; the rules read text)
WORLD=../src/world.js; INK=../src/inkbirds.js
REALMS=$(ls ../src/realm-*.js | tr '\n' ' '); HOUR=hour.js; CSS=style.css
WING=$(ls facetform.js facetpose.js wingmodel.js model.js labbird.js birdwing.js | tr '\n' ' ')   # (the ink birds' wing model, round 3: served as written, not minified)
PLANW=$(ls plan.js 2>/dev/null | head -1)   # (fast500 step 11: the plan's worker, held to the same absences)
SND="../src/sound.js ../src/score.js"   # (2026-11-07: the sound icon's switch; 2026-11-12: the score it plays; as written)
JS="site.js $HOUR $WORLD $REALMS $WING $INK $PLANW $SND"
echo "checking $JS and $CSS"
# The page has none of the internet's body language, and CI fails
# (rather than remembers) if any of it comes back. Scoped to the
# shipped files only — never to CLAUDE.md prose.
fail=0
# (1) chrome: arrows, cookie/analytics vocabulary, loading states, nav roles
if grep -nE '&rarr;|→|cookie|analytics|gtag|Loading|role="navigation"' index.html 404.html; then
  echo "::error::internet body language found in the HTML"
  fail=1
fi
# (2) behaviour: no exit, idle, hover-position, key or title handlers, no storage; the one exception the
# birds' pointer play (the owner, 2026-11-05: "the birds should be more interactive with the mouse"): the
# world's onHoverOut, a pointerout added and removed in hoverSync only (checked below)
if grep -nE 'beforeunload|[^a-z]unload|visibilitychange|pagehide|mouseleave|mouseout|mouseover|mouseenter|pointerover|pointerenter|pointerleave|pointerout|onblur|\bblur\(|document\.title|rel="icon"|mousemove|keydown|keyup|keypress|IdleDetector|sessionStorage|localStorage|indexedDB|document\.cookie' $JS | grep -vE "addEventListener\('pointerout', onHoverOut, \{ capture: true, passive: true \}\)|removeEventListener\('pointerout', onHoverOut, \{ capture: true, passive: true \}\)"; then
  echo "::error::a needy behaviour (exit/idle/title/pointer handler or storage) was introduced"
  fail=1
fi
# a pointer's moves are read by the world alone: the drag's (onMove, added in onDown, removed in endDrag)
# and the birds' play's (onHover, passive, and onHoverOut, the pointer off the window: both added and
# removed in hoverSync only, the owner's 2026-11-05 request); no other file reads them
python3 - "$WORLD" $JS <<'PY' || fail=1
import re, sys
world, files = sys.argv[1], sys.argv[2:]
bad = 0
for f in files:
    s = open(f, encoding='utf-8').read()
    n = s.count('pointermove')
    if f != world and n:
        print('::error::%s reads pointer moves' % f); bad = 1
    if f == world:
        def body(name):
            m = re.search(r'\n  function %s\(.*?\n  function ' % name, s, re.S)
            return m.group(0) if m else ''
        if n != 4 or "window.addEventListener('pointermove', onMove, true)" not in body('onDown') or "window.removeEventListener('pointermove', onMove, true)" not in body('endDrag'):
            print('::error::%s: pointer moves must be read only during a drag (added in onDown, removed in endDrag) and by the birds\' play (hoverSync)' % f); bad = 1
        hs = body('hoverSync'); o = "%sEventListener('%s', %s, { capture: true, passive: true })"
        if s.count('pointerout') != 2 or any((o % (a, e, h)) not in hs for a in ('window.add', 'window.remove') for e, h in (('pointermove', 'onHover'), ('pointerout', 'onHoverOut'))):
            print('::error::%s: the birds\' pointer play: onHover (pointermove) and onHoverOut (pointerout), passive, added and removed in hoverSync only' % f); bad = 1
sys.exit(bad)
PY
# (3) the scripts add no DOM: the canvas, the stack and the lettering are in index.html
if grep -nE 'createElement|innerHTML|outerHTML|insertAdjacentHTML|appendChild|insertBefore|replaceChildren|document\.write' $JS; then
  echo "::error::DOM built in script — the canvas and every element live in index.html"
  fail=1
fi
# (4) the weather (=rand()): ONE entropy read, in the world, above
# INIT-END; no clock but the hour's one read and the world's
# one clockNow (performance.now, for budgets: above INIT-END); never
# Math.random. The realms and the ink birds draw from the world's streams
# and read no clock at all.
for f in $WORLD; do
  if [ "$(grep -o 'getRandomValues(' $f | wc -l)" != "1" ]; then
    echo "::error::$f must draw entropy exactly once (getRandomValues( count != 1)"
    fail=1
  fi
  if grep -nE 'Math\.random|\bDate\b|randomUUID' $f; then
    echo "::error::Math.random or a clock read in $f — the only randomness is the visit seed"
    fail=1
  fi
  if ! grep -q -- '---- INIT-END:' $f; then
    echo "::error::INIT-END marker missing from $f"
    fail=1
  fi
  bad=$(awk '/---- INIT-END:/{p=1;next} p && /getRandomValues|Math\.random|Date|randomUUID|performance\.now/{print NR": "$0}' $f)
  if [ -n "$bad" ]; then
    echo "$bad"
    echo "::error::an entropy or clock read below the INIT-END marker in $f"
    fail=1
  fi
done
if [ "$(grep -o 'performance\.now()' $WORLD | wc -l)" != "1" ]; then
  echo "::error::$WORLD must call performance.now() exactly once (its clockNow)"
  fail=1
fi
if grep -nE 'getRandomValues|Math\.random|Date|randomUUID|performance\.now' $REALMS $WING $INK $PLANW $SND; then
  echo "::error::the realms, the wing model, the ink birds, and the sound icon's switch and score draw no entropy and read no clock (their clock is the audio context's own time; the score's seed is the world's, from WORLD.sky)"
  fail=1
fi
# the hour reads the clock exactly once, and draws no entropy
if [ "$(grep -o 'new Date(' $HOUR | wc -l)" != "1" ] || [ "$(grep -oE '\bDate\b' $HOUR | wc -l)" != "1" ] || grep -nE 'Math\.random|getRandomValues|randomUUID|performance\.now' $HOUR; then
  echo "::error::$HOUR must read the clock exactly once (new Date) and nothing else"
  fail=1
fi
# (5) no URL hook, no sound until the visitor presses the sound icon, no network, no custom cursor: sound only in the
# switch (the owner, 2026-11-07: "bring it back, opt-in"), the one audio context made by it alone, inside its click
# handler (38-sound proves it is made at the press and never before); the score (score.js, 2026-11-12) only builds on
# the context and the sheet the switch hands it: it makes no context and fetches nothing
NOSND=$(echo "$JS" | tr ' ' '\n' | grep -vxF -e ../src/sound.js | tr '\n' ' ')
if grep -nE '\blocation\.|document\.URL|document\.referrer|URLSearchParams' $JS index.html 404.html \
  || grep -nE 'new Audio\(|AudioContext|<audio|speechSynthesis' $NOSND index.html 404.html \
  || grep -nE 'new Audio\(|<audio|speechSynthesis|webkitAudioContext|OfflineAudioContext|AudioWorklet|audioWorklet|MediaElementAudioSource|getUserMedia' $SND; then
  echo "::error::a URL hook or sound was introduced (sound lives in sound.js only)"
  fail=1
fi
if [ "$(grep -o 'new AudioContext(' ../src/sound.js | wc -l)" != "1" ]; then
  echo "::error::the one audio context is the switch's (sound.js, once)"
  fail=1
fi
# (fast500 step 11) the one worker: the plan's, started by the world by its literal name (world_rules.py rule 2b)
NW=$(cat $JS | grep -o 'new Worker(' | wc -l); NP=$(grep -oE "new Worker\(./plan\.js.\)" $WORLD | wc -l)
if [ "$NW" != "$NP" ] || [ "$NP" -gt 1 ]; then
  echo "::error::a worker other than the plan's (the world starts plan.js by name, once)"
  fail=1
fi
# the one fetch: the switch's, of its one sheet of notes, a literal path under /assets/sound/ on this site, made inside
# the press (2026-11-07; 38-sound proves nothing is requested before it)
if grep -nE 'fetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|importScripts|\beval\(|new Function' $NOSND \
  || grep -nE 'XMLHttpRequest|WebSocket|sendBeacon|EventSource|importScripts|\beval\(|new Function' $SND \
  || [ "$(grep -o 'fetch(' ../src/sound.js | wc -l)" != "1" ] || [ "$(grep -o 'fetch(SHEET)' ../src/sound.js | wc -l)" != "1" ] \
  || [ "$(grep -cE "^  var SHEET = '/assets/sound/[a-z0-9-]+\.mp3';" ../src/sound.js)" != "1" ]; then
  echo "::error::the scripts fetch nothing and run no code but their own (but the switch's one fetch, of its literal /assets/sound/ file)"
  fail=1
fi
if grep -nE 'cursor *:' $CSS; then
  echo "::error::a cursor rule in $CSS — OS cursors only"
  fail=1
fi
# (6) no dev or record hooks (the development harness stays out): nothing put
# on or read from window.__*, no console, and of the attributes on <html>
# the scripts read only the hour's data-sky and data-sky-at
if grep -nE 'window\.__|window\.claude|\bconsole\.' $JS; then
  echo "::error::a dev hook, a record or a console call in the shipped scripts"
  fail=1
fi
python3 - $JS <<'PY' || fail=1
import re, sys
ok = {'data-sky', 'data-sky-at', 'src'}
bad = 0
for f in sys.argv[1:]:
    s = open(f, encoding='utf-8').read()
    for m in re.finditer(r'\b(attr|getAttribute|hasAttribute)\(\s*([^)]*?)\)', s):
        arg = m.group(2).strip()
        lit = re.fullmatch(r"'([^']*)'|\"([^\"]*)\"", arg)
        if lit:
            name = lit.group(1) or lit.group(2)
            if name not in ok:
                print('::error::%s reads the attribute %s' % (f, name)); bad = 1
        elif not (m.group(0) in ('attr(n)', 'getAttribute(n)') and 'function attr(n) { return root.getAttribute(n); }' in s):
            print('::error::%s reads an attribute by a computed name: %s' % (f, m.group(0))); bad = 1
    if re.search(r'\.dataset\b', s):
        print('::error::%s reads data attributes through dataset' % f); bad = 1
sys.exit(bad)
PY
# (7) the old 2D birds are retired (the ink birds, in the world, are the birds): no birds.vN.js served or in
# src/ (compgen, no pipeline: the same in either shell, bash -e or -eo pipefail), no bird SVG or script in the
# pages or the headers (a bird class in either quotes, in any class list), no .bird rule or [class=bird]
# selector, nothing naming their hand-over (window.skyAir, the world's SKYAIR, handTo, HASSVG, DISSOLVE_S, the
# record's boot wait and hand-over fields)
if compgen -G 'birds.v*.js' > /dev/null || compgen -G '../src/birds.v*.js' > /dev/null \
  || grep -nE "class=[\"'][^\"']*\\bbird\\b|<polyline|(^|[^a-z-])birds\\.v[0-9]+\\.js" index.html 404.html _headers \
  || grep -nE "\\.bird([^a-zA-Z0-9_-]|\$)|\\[class[~*^|\$]?=[\"']?bird\\b" $CSS \
  || grep -nE '\b(skyAir|SKYAIR|handTo|HASSVG|DISSOLVE_S|bootWaitWhy|handoverToldMs|handover)\b' $JS; then
  echo "::error::the old 2D birds are retired: their script, SVGs, CSS or hand-over came back"
  fail=1
fi
[ "$fail" -eq 0 ] && echo "All absences hold"
exit $fail
