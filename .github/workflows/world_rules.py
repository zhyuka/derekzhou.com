# The world's CI rules, on the site's folder: run from the repository's root by .github/workflows/validate.yml ("The
# world's rules"), or locally: python3 .github/workflows/world_rules.py [the site's folder: site] [the scripts as written: src].
# Exit 1 on any failure. (The world's scripts are served minified: rules 2, 4, 7 and 7b read them as written, in the
# second folder, whose build validate.yml checks site/'s are; the pages, _headers and a worker file are site/'s.)
# Each rule prints OK or the files and lines that break it.
#   1  Rocket Loader: every <script> with a src in index.html and 404.html carries data-cfasync="false" (the JSON-LD
#      block is data, not script), so Rocket Loader leaves the scripts as served, in their order.
#   2  Worker targets: every target of `new Worker(` and `importScripts(` in the world's files exists and has an
#      immutable cache block in _headers (the world starts none today).
#   3  Production blind: every home-scope CSP block in _headers (/, /index.html, /404.html) and 404.html's meta CSP
#      say exactly script-src 'self' https://static.cloudflareinsights.com and connect-src
#      https://cloudflareinsights.com https://derekzhou.com/cdn-cgi/rum (Cloudflare Web Analytics, injected by
#      Cloudflare, reporting to the zone's own /cdn-cgi/rum, that one path; nothing else loads or is reached), and the site carries none of the world's development pages (its diagnostics, control and lab
#      pages: diag.js, control.*, lab80.*, never shipped).
#   4  The world's absences: in world*.v*.js, realm-kit.v*.js, realm-*.v*.js, the ink birds' wing model (facetform,
#      facetpose, wingmodel, model, labbird and birdwing .v*.js) and inkbirds.v*.js: no DOM
#      building; no URL hook, storage or sound; no module, worker, fetch, XHR or Blob but a named worker (rule 2);
#      entropy exactly once in world*.v*.js together, above its INIT-END marker, none in the realm, kit and ink birds'
#      files; no Date, Math.random or randomUUID; performance.now( exactly once in world*.v*.js, inside function
#      clockNow, none elsewhere; listeners only in world*.v*.js and only of the named kinds, exactly one
#      addEventListener('pointermove' with its one removeEventListener (event names in either quotes, every
#      listener's name a literal, no on* handler property in any of the world's files).
#   4b The start file (start.v*.js, fast500 step 5, served as tools/start.mjs makes it): no DOM building, URL hook,
#      storage, sound, module, worker or network; no entropy and no clock (no getRandomValues, Date, Math.random,
#      performance.now, setTimeout or requestAnimationFrame); one listener, webglcontextlost (a context lost before the
#      world adopts it can still be restored); nothing put on window but WORLD_START.
#   5  The script order: index.html loads world, the kit and the realms first, fetchpriority="high", then birds.v*.js,
#      the wing model (facetform, facetpose, wingmodel, model, labbird, birdwing, in that order) and the ink birds last,
#      fetchpriority="low", all deferred (the boot starts once the realms register); the one async script is the start
#      file, fetchpriority="high", the first script after the canvas.
#   6  The realm lint's report is a separate step (node lint_realms.js); the realms predate its API v4, so it reports.
#   7  Nothing darkens, and nothing is done to the world for the words (the owner's rule; the words' lift is
#      gone): no realm or kit file names the ink birds' keep-off (uInkKeep); the ink birds' file names it only to take
#      their own ink off the words' ground (its sampler's declaration and the one line that multiplies the ink's
#      visibility down), which can only leave a pixel lighter; in world*.v*.js the lift's parts (liftWords, LIB_LIFT,
#      uLiftOn, uVeil*, uLinkCore, worldToe, TOE_*, LIFT_FEATHER, VEILK, veilFor) are named nowhere, uInkKeep only in
#      the samplers' unit table, and the composite (FS_COMP) names no words input and declares only its fixed list
#      of uniforms. W7's unit test is its own step (w7_unit.js: the composite's tail is the encode and the dither, every
#      code the reference's, never lower and never higher; --mutate proves it catches a lift, a darkening, a panel).
#   7b Nothing is drawn onto the canvas after the composite but what is named (a panel planted in a pass of its own
#      after the composite would pass rule 7 and W7's unit test): the world's programs are a
#      fixed list (a new pass is a deliberate change here); every place the world targets the default framebuffer
#      (useTarget(null ...), bindFramebuffer(... null)) and then draws within its block names the composite or the blit
#      on that line (render, represent), or is the ink birds' target (the bird host's target()); no 2D canvas, Path2D,
#      Range or OffscreenCanvas in world*.v*.js (the words' glyphs drawn into a field). CI does not render the page:
#      the render check (the canvas read with the words' machinery on and off at the same instant, channel by channel:
#      the W7 twin runs) is part of verifying a change to the world before it ships (CLAUDE.md, Verify).
import json, os, re, sys
root = sys.argv[1] if len(sys.argv) > 1 else 'site'
R = lambda *p: os.path.join(root, *p)
JS = sys.argv[2] if len(sys.argv) > 2 else root   # (the world's scripts as written: src/, beside the minified site/)
fails = []
def fail(rule, msg): fails.append(f'{rule}: {msg}')
def read(p):
    try: return open(R(p), encoding='utf-8').read()
    except FileNotFoundError: return None
html = {p: read(p) for p in ('index.html', '404.html')}
headers = read('_headers') or ''
files = sorted(os.listdir(root))
jsfiles = sorted(os.listdir(JS))
def scripts(fs): return [f for f in fs if re.fullmatch(r'(world[\w-]*|realm-[\w]+|inkbirds)\.v\d+\.js', f)]
if JS != root and scripts(files) != scripts(jsfiles):
    fail('0 sources', f'the world\'s scripts served ({", ".join(scripts(files))}) are not those written in {JS}/ ({", ".join(scripts(jsfiles))})')
world = [f for f in jsfiles if re.fullmatch(r'world[\w-]*\.v\d+\.js', f)]
kit = [f for f in jsfiles if re.fullmatch(r'realm-kit\.v\d+\.js', f)]
realms = [f for f in jsfiles if re.fullmatch(r'realm-(?!kit)[\w]+\.v\d+\.js', f)]
ink = [f for f in jsfiles if re.fullmatch(r'inkbirds\.v\d+\.js', f)]
WING = ('facetform', 'facetpose', 'wingmodel', 'model', 'labbird', 'birdwing')   # (round 3: the ink birds' wing model)
wing = [f for f in files if re.fullmatch(r'(%s)\.v\d+\.js' % '|'.join(WING), f)]   # (the wing model: served as written, site/'s; not minified, not in src/)
gen = [f for f in files if re.fullmatch(r'(gen|plan)\.v\d+\.js', f)]   # (fast500 step 11: plan.vN.js, the plan's worker)   # (a worker file: served as written, site/'s)
def readjs(p):
    try: return open(os.path.join(JS, p), encoding='utf-8').read()
    except FileNotFoundError: return None
src = dict({f: readjs(f) for f in world + kit + realms + ink}, **{f: read(f) for f in wing + gen})

# 1 Rocket Loader
for p, s in html.items():
    if s is None: continue
    for m in re.finditer(r'<script\b[^>]*>', s):
        tag = m.group(0)
        if 'src=' in tag and 'data-cfasync="false"' not in tag:
            fail('1 rocket-loader', f'{p}: {tag}')

# 2 worker targets
def cache_block(name): return re.search(r'(?m)^/' + re.escape(name) + r'\n\s+Cache-Control: public, max-age=31536000, immutable', headers) is not None
for f, s in src.items():
    for m in re.finditer(r'(new Worker|importScripts)\(\s*([^)]*)\)', s or ''):
        targets = re.findall(r"""['"]/?([\w.\-/]+\.js)['"]""", m.group(2))
        if not targets: fail('2 worker-targets', f'{f}: {m.group(0)[:80]} names no literal file'); continue
        for t in targets:
            if not os.path.exists(R(t)): fail('2 worker-targets', f'{f}: {t} does not exist')
            if not cache_block(t): fail('2 worker-targets', f'{f}: /{t} has no immutable cache block in _headers')
    if f in world + kit + realms + ink and 'importScripts(' in (s or ''): fail('2 worker-targets', f'{f}: importScripts( in a page script (a worker file only)')
nw = sum((s or '').count('new Worker(') for f, s in src.items() if f in world)
if nw > 1: fail('2 worker-targets', f'world*.v*.js: {nw} new Worker( (at most one, by its literal file name)')

# 3 production blind (the one exception: Cloudflare Web Analytics, exactly its two origins)
CSP_EXACT = {'script-src': "'self' https://static.cloudflareinsights.com", 'connect-src': 'https://cloudflareinsights.com https://derekzhou.com/cdn-cgi/rum'}
def csp_bad(policy):
    d = {}
    for part in policy.split(';'):
        w = part.split()
        if w: d.setdefault(w[0], []).append(' '.join(w[1:]))
    return [f'{k} {d.get(k)!r} (want exactly {want!r})' for k, want in CSP_EXACT.items() if d.get(k) != [want]]
blocks = {}
cur = None
for line in headers.splitlines():
    if line and not line[0].isspace() and not line.startswith('#'): cur = line.strip(); blocks.setdefault(cur, [])
    elif cur and line.strip(): blocks[cur].append(line.strip())
for path in ('/', '/index.html', '/404.html'):
    csp = [l for l in blocks.get(path, []) if l.startswith('Content-Security-Policy:')]
    if not csp: fail('3 production-blind', f'_headers {path}: no Content-Security-Policy'); continue
    for l in csp:
        for b in csp_bad(l.split(':', 1)[1]): fail('3 production-blind', f'_headers {path}: CSP {b}')
if '/*' in blocks and any(l.startswith('Content-Security-Policy') for l in blocks['/*']): fail('3 production-blind', '_headers: a CSP on /* (it would combine with every page\'s)')
meta = re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', html.get('404.html') or '')
if not meta: fail('3 production-blind', '404.html: no meta CSP')
else:
    for b in csp_bad(meta.group(1)): fail('3 production-blind', f'404.html: meta CSP {b}')
for p in tuple(f for f in files if re.fullmatch(r'(diag\.v\d+\.js|diag\.js|control\.html|control\.js|lab80\.html|lab80\.js)', f)):
    if os.path.exists(R(p)): fail('3 production-blind', f'{p} is in the site (a development page: never shipped)')

# 2b the plan's worker (fast500 step 11; the owner's OK: "Background worker"): the world starts at most one worker,
#    plan.vN.js by its literal name; the worker's own block in _headers is exactly its immutable cache and
#    `default-src 'none'` (a worker's policy is its own response's); the home blocks that start it carry worker-src
#    exactly 'self' (and no other block names another); the worker's code is the world's own: the four spans
#    mkplan.py copies (the angle constants; the maps and the director; MAPS, mapsInit, kitAt; the weights' grids) appear in it verbatim, and
#    its stamp (PLANV) is their md5's first 12 hex and the world's PW_V.
import hashlib
PSP = [('  var PI = Math.PI, DEG = Math.PI / 180;', '\n', True), ('  var CW = (function () {\n', '\n  })();\n', True), ('  var MAPS = {', '    return w.kit(MAPS.mc, MAPS.pc, MAPS.kw);\n  }\n', True), ('  var KN = 256, KSTEP = 64,', '  var KFROWS = FN * FN / KN;', False)]
def plan_spans(s):
    out = []
    for a, e, inc in PSP:
        if s.count(a) != 1: return None
        i = s.index(a); j = s.find(e, i)
        if j < 0: return None
        out.append(s[i:j + (len(e) if inc else 0)])
    return out
def csp_dirs(policy):
    d = {}
    for part in policy.split(';'):
        w = part.split()
        if w: d.setdefault(w[0], []).append(' '.join(w[1:]))
    return d
started = [m.group(1) for f in world for m in re.finditer(r"""new Worker\(\s*['"]/?(plan\.v\d+\.js)['"]\s*\)""", strip_comments(src[f]) if 'strip_comments' in globals() else (src[f] or ''))]
if nw and len(started) != nw: fail('2b plan-worker', f'world*.v*.js: {nw} new Worker( but {len(started)} of the plan\'s worker by its literal name (plan.vN.js)')
for t in started:
    want = ['Cache-Control: public, max-age=31536000, immutable', "Content-Security-Policy: default-src 'none'"]
    if blocks.get('/' + t) != want: fail('2b plan-worker', f'_headers /{t}: {blocks.get("/" + t)!r} (want exactly {want!r})')
    if t not in gen: fail('2b plan-worker', f'{t}: not in the site')
for path, lines_ in blocks.items():
    for l in lines_:
        if not l.startswith('Content-Security-Policy:'): continue
        ws = csp_dirs(l.split(':', 1)[1]).get('worker-src')
        if path in ('/', '/index.html') and started and ws != ["'self'"]: fail('2b plan-worker', f"_headers {path}: worker-src {ws!r} (want exactly ['\\'self\\''])")
        elif ws is not None and ws != ["'self'"]: fail('2b plan-worker', f"_headers {path}: worker-src {ws!r} (only 'self')")
for p in gen:
    if not p.startswith('plan.'): continue
    ps = src[p] or ''; pv = re.findall(r"var PLANV = '([0-9a-f]{12})';", ps)
    if len(pv) != 1: fail('2b plan-worker', f'{p}: PLANV found {len(pv)} times'); continue
    for f in world:
        sp = plan_spans(src[f] or '')
        if sp is None: fail('2b plan-worker', f'{f}: the plan\'s spans not found (mkplan.py\'s anchors; a minified world needs its own check)'); continue
        if any(x not in ps for x in sp): fail('2b plan-worker', f'{p}: not the world\'s plan code verbatim (run mkplan.py on {f})')
        st = hashlib.md5(''.join(sp).encode('utf-8')).hexdigest()[:12]
        wv = re.findall(r"var PW_V = '([0-9a-f]*)';", src[f] or '')
        if pv[0] != st or wv != [st]: fail('2b plan-worker', f'{p}: stamp {pv[0]}, the spans\' {st}, {f}\'s PW_V {wv} (all three the same)')
    if p not in started: fail('2b plan-worker', f'{p}: in the site but started by no world file')

# 4 the world's absences
def lines(s, pat): return [(i + 1, l.strip()[:100]) for i, l in enumerate((s or '').split('\n')) if re.search(pat, l)]
def strip_comments(s):
    s = re.sub(r'/\*[\s\S]*?\*/', lambda m: '\n' * m.group(0).count('\n'), s or '')
    return re.sub(r'(?m)(^|[^:\'"\\])//.*$', r'\1', s)
ALLOWED = {'pointerdown', 'pointerup', 'pointercancel', 'pointermove', 'click', 'touchend', 'dragstart', 'deviceorientation', 'resize', 'scroll', 'change', 'webglcontextlost', 'webglcontextrestored', 'load'}
for f in world + kit + realms + wing + ink:
    s = src[f] or ''; c = strip_comments(s)
    for pat, what in [(r'createElement|innerHTML|appendChild|insertAdjacentHTML|document\.write', 'DOM building'),
                      (r'location\.(search|hash|href)|URLSearchParams|localStorage|sessionStorage|indexedDB|document\.cookie', 'a URL hook or storage'),
                      (r'new Audio\(|AudioContext|speechSynthesis', 'sound'),
                      (r'\bimport\(|\bBlob\(|\bfetch\(|XMLHttpRequest', 'a module, blob or network call'),
                      (r'Math\.random|\bDate\b|randomUUID', 'Math.random or a clock (Date)')]:
        for ln, t in lines(c, pat): fail('4 absences', f'{f}:{ln} {what}: {t}')
    if f not in world and 'getRandomValues' in c: fail('4 absences', f'{f}: entropy outside world*.v*.js')
    if f not in world:
        for ln, t in lines(c, r'performance\.now\('): fail('4 absences', f'{f}:{ln} performance.now( outside world*.v*.js')
        for ln, t in lines(c, r'addEventListener\('): fail('4 absences', f'{f}:{ln} a listener outside world*.v*.js')
gr = sum(strip_comments(src[f]).count('getRandomValues(') for f in world)
if world and gr != 1: fail('4 absences', f'world*.v*.js: getRandomValues( {gr} times (exactly once)')
for f in world:
    s = src[f] or ''; c = strip_comments(s)
    m = re.search(r'---- INIT-END:', s)
    if not m: fail('4 absences', f'{f}: INIT-END marker missing')
    elif 'getRandomValues(' in strip_comments(s[m.end():]): fail('4 absences', f'{f}: entropy below INIT-END')
    pn = c.count('performance.now(')
    if pn != 1: fail('4 absences', f'{f}: performance.now( {pn} times (exactly once, in clockNow)')
    elif not re.search(r'function clockNow\(\)\s*\{\s*return performance\.now\(\);\s*\}', c): fail('4 absences', f'{f}: performance.now( is not inside function clockNow')
    for m2 in re.finditer(r"""addEventListener\(\s*['"]([\w]+)['"]""", c):
        if m2.group(1) in ('message', 'error') and c[max(0, m2.start() - 5):m2.start()] == 'PW.w.': continue   # (fast500 step 11: the plan's worker's answer and its failure, on the worker only; counted below)
        if m2.group(1) not in ALLOWED: fail('4 absences', f"{f}: a listener of a kind not in the named list (ALLOWED): '{m2.group(1)}'")
    for ln, t in lines(c, r"""addEventListener\(\s*[^'"\s]"""): fail('4 absences', f'{f}:{ln} a listener whose kind is not a literal: {t}')
    am, rm = len(re.findall(r"""addEventListener\(\s*['"]pointermove['"]""", c)), len(re.findall(r"""removeEventListener\(\s*['"]pointermove['"]""", c))
    if am != 1 or rm != 1: fail('4 absences', f'{f}: pointermove added {am} and removed {rm} times (exactly one each)')
    for ln, t in lines(c, r"""addEventListener\(\s*['"](mousemove|mouseleave|mouseout|mouseover|mouseenter|keydown|keyup|keypress|blur|focusout|beforeunload|unload|pagehide|visibilitychange)['"]|document\.title"""): fail('4 absences', f'{f}:{ln} a hover, key, blur, exit, idle or title handler: {t}')
for f in world:
    c = strip_comments(src[f])
    for k in ('message', 'error'):
        n = c.count("PW.w.addEventListener('%s'" % k)
        if n != (1 if started else 0): fail('4 absences', f"{f}: PW.w.addEventListener('{k}' {n} times ({1 if started else 0}: the plan's worker only)")
for p in [g for g in gen if g.startswith('plan.')]:   # (fast500 step 11) the plan's worker: pure arithmetic, one message in, one out
    c = strip_comments(src[p])
    for pat, what in [(r'createElement|innerHTML|appendChild|insertAdjacentHTML|document\.|window\.', 'the DOM or the window'),
                      (r'location\.|URLSearchParams|localStorage|sessionStorage|indexedDB|caches\.|cookie', 'a URL hook or storage'),
                      (r'\bimport\(|importScripts|\bBlob\(|\bfetch\(|XMLHttpRequest|WebSocket|EventSource|new Worker|SharedArrayBuffer|Atomics', 'a module, script, network call or another worker'),
                      (r'Math\.random|\bDate\b|randomUUID|getRandomValues|performance\.now', 'entropy or a clock'),
                      (r'\.on[a-z]+\s*=(?!=)', 'an on* handler property')]:
        for ln, t in lines(c, pat): fail('4 absences', f'{p}:{ln} {what}: {t}')
    ks = re.findall(r"""addEventListener\(\s*['"]?([\w]*)""", c)
    if ks != ['message']: fail('4 absences', f'{p}: listeners {ks} (exactly one: message)')
    if c.count('postMessage(') != 2: fail('4 absences', f'{p}: postMessage( {c.count("postMessage(")} times (its answer and its refusal)')
for f in world + kit + realms + wing + ink:
    for ln, t in lines(strip_comments(src[f]), r'\.on[a-z]+\s*=(?!=)'): fail('4 absences', f'{f}:{ln} an on* handler property (listeners are added by name, in world*.v*.js only): {t}')

# 4b the start file (fast500 5)
for f in [f for f in files if re.fullmatch(r'start\.v\d+\.js', f)]:
    c = strip_comments(re.sub(r'(?s)\n  var Q = \[\n.*?\n  \];\n', '\n  var Q = [];\n', read(f) or ''))   # (its code: the table's GLSL is the world's, held by rule 4 there)
    if 'var Q = [];' not in c: fail('4b start', f'{f}: its table (var Q = [...]) not found as tools/start.mjs writes it')
    for pat, what in [(r'createElement|innerHTML|outerHTML|appendChild|insertAdjacentHTML|insertBefore|document\.write', 'DOM building'),
                      (r'location\.|URLSearchParams|localStorage|sessionStorage|indexedDB|document\.cookie', 'a URL hook or storage'),
                      (r'new Audio\(|AudioContext|speechSynthesis', 'sound'),
                      (r'\bimport\(|\bBlob\(|\bfetch\(|XMLHttpRequest|new Worker|importScripts|\beval\(|new Function', 'a module, worker or network call'),
                      (r'getRandomValues|Math\.random|\bDate\b|randomUUID|performance\.|setTimeout|setInterval|requestAnimationFrame|requestIdleCallback', 'entropy or a clock')]:
        for ln, t in lines(c, pat): fail('4b start', f'{f}:{ln} {what}: {t}')
    kinds = re.findall(r"""addEventListener\(\s*['"]([\w]+)['"]""", c)
    if kinds != ['webglcontextlost'] or c.count('addEventListener(') != 1: fail('4b start', f'{f}: listeners {kinds} (exactly one, webglcontextlost)')
    for ln, t in lines(c, r'\.on[a-z]+\s*=(?!=)'): fail('4b start', f'{f}:{ln} an on* handler property: {t}')
    for m in re.finditer(r'\bwindow\.(\w+)\s*=(?!=)', c):
        if m.group(1) != 'WORLD_START': fail('4b start', f'{f}: puts window.{m.group(1)} (only WORLD_START)')

# 7 nothing darkens, and nothing is done to the world for the words (the lift is gone, the owner's word of
# 2026-10-21): the composite takes no words input at all (no mask, keep-off, words' box, floor, gain or toe), its
# uniforms are a fixed list (a new one is a deliberate change here), and the lift's parts are named nowhere; the ink
# birds alone read the keep-off (uInkKeep), only to take their own ink off the words' ground
LIFT_PARTS = r'\b(liftWords|LIB_LIFT|uLiftOn|uVeil\w*|uLinkCore|worldToe|TOE_F|TOE_Y1|TOE_TINT|LIFT_FEATHER|VEILK|veilFor)\b|LIFT-BEGIN'
WORDS_IN = r'\b(uMask\w*|uInkKeep|uKeep\w*|uWords|uLift\w*On|uVeil\w*|uLinkCore|uFloor\w*|mk|mk4|liftWords|worldToe)\b'
COMP_UNIFORMS = {'uScene', 'uCloud', 'uBloom', 'uShaft', 'uLinD', 'uDepth', 'uSceneH', 'uHVP', 'uHC', 'uStb', 'uLay', 'uSc', 'uClS', 'uBlK', 'uShK', 'uShC', 'uLift', 'uGain', 'uOut', 'uPVP', 'uPCam', 'uSSR', 'uMi',
                 'uCeil'}   # (the time of day: the light ceiling on the skies with light words, the world's own light, the same everywhere on the window: no words input)
for f in kit + realms:
    for ln, t in lines(strip_comments(src[f]), r'\b(uMask|uInkKeep)\b'): fail('7 never-darker', f'{f}:{ln} names the words\' keep-off: {t}')
for f in ink:
    for i, l in enumerate(strip_comments(src[f]).split('\n')):
        if not re.search(r'\b(uMask|uInkKeep)\b', l): continue
        l = l.strip()
        l2 = re.sub(r'if \(u\.uInkKeep\) gl\.uniform1i\(u\.uInkKeep, \d+\);', '', l)   # (round 3: the ink birds bind their sampler's unit themselves)
        if not re.search(r'\b(uMask|uInkKeep)\b', l2): continue
        if not (re.match(r'uniform sampler2D\b[^;]*;$', l) or re.search(r'texture\(uInkKeep, [^;]*;\s*vis \*= 1\.0 - smoothstep\(', l)): fail('7 never-darker', f'{f}:{i + 1} names the words\' keep-off beyond taking its own ink off the words: {l[:100]}')
for f in world:
    c = strip_comments(src[f])
    for i, l in enumerate(c.split('\n')):
        t = l.strip()
        m = re.search(LIFT_PARTS, t)
        if m: fail('7 never-darker', f'{f}:{i + 1} names the lift\'s part {m.group(0)} (the lift is gone): {t[:100]}')
        if re.search(r'\b(uMask|uInkKeep)\b', t) and not t.startswith('var UNITS = {'):
            fail('7 never-darker', f'{f}:{i + 1} names the keep-off uniform beyond the samplers\' unit table (the ink birds\' alone): {t[:100]}')
    cm = re.search(r'var FS_COMP = [^`]*`([\s\S]*?)`;', src[f] or '')
    if cm:
        body = strip_comments(cm.group(1))
        for i, l in enumerate(body.split('\n')):
            m = re.search(WORDS_IN, l)
            if m: fail('7 never-darker', f'{f}: FS_COMP names a words input ({m.group(0)}): {l.strip()[:100]}')
        un = set()
        for d in re.findall(r'uniform\s+[\w]+\s+([^;]+);', body):
            for v in d.split(','): un.add(v.strip().split('[')[0])
        extra = sorted(un - COMP_UNIFORMS)
        if extra: fail('7 never-darker', f'{f}: FS_COMP has uniforms beyond its fixed list: {extra} (a words input? if not, add it to COMP_UNIFORMS deliberately)')
        if '// W7-TAIL-BEGIN' not in cm.group(1) or '// W7-TAIL-END' not in cm.group(1): fail('7 never-darker', f'{f}: FS_COMP lacks its W7-TAIL markers (the unit test runs what lies between them)')
    elif 'FS_COMP' in (src[f] or ''): fail('7 never-darker', f'{f}: FS_COMP not found as one template (rule 7 cannot read it)')

# 7b nothing drawn onto the canvas after the composite but what is named
PROGRAMS = {'sky', 'depth', 'inkkeep', 'pre', 'down', 'up', 'smask', 'sblur', 'comp', 'blit', 'vdens', 'vlight', 'vbody', 'occ', 'creature', 'glow', 'beam', 'cacc'}
DRAWS = r'\b(dc|drawArrays|drawElements|drawArraysInstanced|drawElementsInstanced|drawRangeElements|blitFramebuffer)\s*\('
for f in world:
    c = strip_comments(src[f]); L = c.split('\n')
    names = set(re.findall(r"\[\s*'(\w+)'\s*,\s*VS_\w+\s*,\s*FS_\w+\s*\]", c))
    if not names: fail('7b canvas-last', f'{f}: the program table was not found (rule 7b cannot read it)')
    extra = sorted(names - PROGRAMS)
    if extra: fail('7b canvas-last', f'{f}: programs beyond the fixed list: {extra} (a new pass: add it to PROGRAMS deliberately, after the twin runs)')
    for ln, t in lines(c, r'\b(OffscreenCanvas|Path2D|createRange)\b|getContext\(\s*[\'"]2d|CanvasRenderingContext2D'): fail('7b canvas-last', f'{f}:{ln} a 2D canvas, path or range in the world (the words drawn into a field?): {t}')
    for i, l in enumerate(L):
        for m in re.finditer(r'useTarget\(\s*null\b|bindFramebuffer\(\s*gl\.(DRAW_)?FRAMEBUFFER\s*,\s*null\s*\)', l):
            seg = [l[m.end():]]
            for l2 in L[i + 1:i + 14]:
                if re.search(r'\bfunction\b|bindFramebuffer\(|useTarget\(|^\s*\}\s*,?\s*$|^\s*\w+\s*:\s*function', l2): break
                seg.append(l2)
            seg = '\n'.join(seg)
            if not re.search(DRAWS, seg): continue
            if re.search(r'P\s*=\s*EP\.(comp|blit)\b', l[m.end():m.end() + 60]): continue
            if re.search(r'target\s*:\s*function\s*\(\s*\)\s*\{\s*$', l[:m.start()].rstrip() + ' {') or re.search(r'\btarget\s*:\s*function\s*\(\s*\)\s*\{\s*gl\.bindFramebuffer', l): continue
            fail('7b canvas-last', f'{f}:{i + 1} draws onto the canvas with a program not named (the composite, the blit, the ink birds\' target): {l.strip()[:100]}')

# 5 the script order
s = html.get('index.html') or ''
order = re.findall(r'<script\b[^>]*src="/?([^"]+)"[^>]*>', s)
deferred = [x for x in re.findall(r'<script\b[^>]*>', s) if 'defer' in x]
names = [re.search(r'src="/?([^"]+)"', x).group(1) for x in deferred if 'src=' in x]
def kind(n):
    for k, p in (('birds', r'birds\.v\d+\.js'), ('world', r'world[\w-]*\.v\d+\.js'), ('kit', r'realm-kit\.v\d+\.js'), ('realm', r'realm-\w+\.v\d+\.js'), ('wing', r'(%s)\.v\d+\.js' % '|'.join(WING)), ('ink', r'inkbirds\.v\d+\.js'), ('diag', r'diag\.v\d+\.js')):
        if re.fullmatch(p, n): return k
    return 'other'
ks = [kind(n) for n in names if kind(n) != 'diag']
if world:
    want = ['world', 'kit'] + ['realm'] * max(1, ks.count('realm')) + ['birds'] + ['wing'] * len(WING) + ['ink']
    if ks != want: fail('5 script-order', f'index.html deferred scripts {names}: want world, kit, the realms, then birds, the wing model and the ink birds last')
    wn = [re.sub(r'\.v\d+\.js$', '', n) for n in names if kind(n) == 'wing']
    if wn != list(WING): fail('5 script-order', f'index.html: the wing model {wn}: want {list(WING)}')
    PRI = {'world': 'high', 'kit': 'high', 'realm': 'high', 'birds': 'low', 'wing': 'low', 'ink': 'low'}
    for tag in deferred:
        m5 = re.search(r'src="/?([^"]+)"', tag)
        if not m5 or kind(m5.group(1)) not in PRI: continue
        fp = re.findall(r'\bfetchpriority="(\w+)"', tag)
        if fp != [PRI[kind(m5.group(1))]]: fail('5 script-order', f'index.html {m5.group(1)}: fetchpriority {fp}, want "{PRI[kind(m5.group(1))]}"')

tags5 = re.findall(r'<script\b[^>]*>', s)
asyn = [x for x in tags5 if re.search(r'\sasync[\s>]', x)]
st5 = [x for x in asyn if re.search(r'src="/?start\.v\d+\.js"', x)]
if asyn != st5 or len(st5) > 1: fail('5 script-order', f'index.html async scripts {asyn}: the only one is the start file')
for x in st5:
    if 'defer' in x.split() or re.findall(r'\bfetchpriority="(\w+)"', x) != ['high']: fail('5 script-order', f'index.html {x}: async, never defer, fetchpriority "high"')
    i5 = s.find('<canvas class="sky"')
    if i5 < 0 or re.search(r'<script\b', s[i5:s.find(x)]): fail('5 script-order', f'index.html {x}: the first script after the canvas')

print('\n'.join(fails) if fails else 'world rules OK (' + ', '.join(f'{len(x)} {n}' for n, x in (('world', world), ('kit', kit), ('realm', realms), ('wing model', wing), ('ink birds', ink), ('worker', gen))) + ')')
sys.exit(1 if fails else 0)
